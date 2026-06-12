import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import type {
  AuthenticatorTransport,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from "@simplewebauthn/types";
import { db } from "@/lib/db";
import { users, passkeys } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getSession } from "./session";

export function getRpId() {
  return process.env.VERCEL_URL || process.env.RP_ID || "localhost";
}

export function getOriginFromRequest(req: Request) {
  const url = new URL(req.url);
  return url.origin;
}

export async function generateRegisterOptions(origin: string, userName: string) {
  const webauthnUserId = Buffer.from(randomUUID()).toString("base64url");
  const options = await generateRegistrationOptions({
    rpName: "wx-bot",
    rpID: getRpId(),
    userName,
    attestationType: "none",
    excludeCredentials: [],
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
  });

  const session = await getSession();
  session.challenge = options.challenge;
  session.webauthnUserId = webauthnUserId;
  session.userName = userName;
  await session.save();

  return { options, webauthnUserId };
}

export async function verifyRegister(origin: string, response: RegistrationResponseJSON) {
  const session = await getSession();
  const expectedChallenge = session.challenge;
  const webauthnUserId = session.webauthnUserId;
  const userName = session.userName;

  if (!expectedChallenge) throw new Error("Challenge not found");
  if (!webauthnUserId) throw new Error("WebAuthn user ID not found");
  if (!userName) throw new Error("User name not found");

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: getRpId(),
  });

  if (!verification.verified || !verification.registrationInfo) {
    throw new Error("Registration verification failed");
  }

  const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;
  const userId = randomUUID();

  await db.insert(users).values({
    id: userId,
    name: userName,
    webauthnUserId,
  });

  await db.insert(passkeys).values({
    id: credential.id,
    userId,
    webauthnUserId,
    publicKey: Buffer.from(credential.publicKey),
    counter: credential.counter,
    deviceType: credentialDeviceType,
    backedUp: credentialBackedUp,
    transports: credential.transports?.join(",") ?? "",
  });

  session.challenge = undefined;
  session.webauthnUserId = undefined;
  session.userName = undefined;
  session.userId = userId;
  await session.save();

  return userId;
}

export async function generateLoginOptions() {
  const options = await generateAuthenticationOptions({
    rpID: getRpId(),
    userVerification: "preferred",
  });

  const session = await getSession();
  session.challenge = options.challenge;
  await session.save();

  return options;
}

export async function verifyLogin(origin: string, response: AuthenticationResponseJSON) {
  const session = await getSession();
  const expectedChallenge = session.challenge;
  if (!expectedChallenge) throw new Error("Challenge not found");

  const passkeyRecord = await db.query.passkeys.findFirst({
    where: eq(passkeys.id, response.id),
  });
  if (!passkeyRecord) throw new Error("Passkey not found");

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: getRpId(),
    credential: {
      id: passkeyRecord.id,
      publicKey: new Uint8Array(passkeyRecord.publicKey),
      counter: passkeyRecord.counter,
      transports: passkeyRecord.transports
        ?.split(",")
        .filter((t): t is AuthenticatorTransport =>
          ["ble", "internal", "nfc", "usb", "hybrid"].includes(t)
        ) ?? [],
    },
  });

  if (!verification.verified) {
    throw new Error("Login verification failed");
  }

  await db
    .update(passkeys)
    .set({ counter: verification.authenticationInfo.newCounter })
    .where(eq(passkeys.id, passkeyRecord.id));

  session.challenge = undefined;
  session.userId = passkeyRecord.userId;
  await session.save();

  return passkeyRecord.userId;
}
