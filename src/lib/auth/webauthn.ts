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
import { unsealData } from "iron-session";
import { SEAL_SECRET } from "@/lib/seal";

const RP_HOST_ALLOWLIST = ["wx-bot.vercel.app", "wxbot.est.im"];

export function getRpId(origin?: string) {
  if (origin) {
    const host = new URL(origin).hostname;
    if (RP_HOST_ALLOWLIST.includes(host)) return host;
  }
  return RP_HOST_ALLOWLIST[0];
}

export function getOriginFromRequest(req: Request) {
  const url = new URL(req.url);
  return url.origin;
}

export async function generateRegisterOptions(origin: string, userName: string) {
  const webauthnUserId = Buffer.from(randomUUID()).toString("base64url");
  const options = await generateRegistrationOptions({
    rpName: "wx-bot",
    rpID: getRpId(origin),
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
    expectedRPID: getRpId(origin),
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

  return { userId, credentialId: credential.id };
}

export async function generateLoginOptions(origin: string, credentialId?: string) {
  const options = await generateAuthenticationOptions({
    rpID: getRpId(origin),
    userVerification: "preferred",
    ...(credentialId
      ? {
          allowCredentials: [
            {
              id: credentialId,
              transports: ["internal", "hybrid"] as AuthenticatorTransport[],
            },
          ],
        }
      : {}),
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
    expectedRPID: getRpId(origin),
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

  return { userId: passkeyRecord.userId, credentialId: passkeyRecord.id };
}

export async function generateInviteRegisterOptions(origin: string, token: string) {
  const data = await unsealData<{ userId: string; exp?: number }>(token, {
    password: SEAL_SECRET,
  });

  if (data.exp && data.exp < Math.floor(Date.now() / 1000)) {
    throw new Error("Invitation has expired");
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, data.userId),
  });
  if (!user) throw new Error("User not found");

  const existingPasskeys = await db.query.passkeys.findMany({
    where: eq(passkeys.userId, user.id),
  });

  const options = await generateRegistrationOptions({
    rpName: "wx-bot",
    rpID: getRpId(origin),
    userName: user.name,
    attestationType: "none",
    excludeCredentials: existingPasskeys.map((pk) => ({ id: pk.id })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
  });

  const session = await getSession();
  session.challenge = options.challenge;
  session.webauthnUserId = user.webauthnUserId;
  session.userName = user.name;
  session.inviteUserId = data.userId;
  await session.save();

  return { options, userName: user.name };
}

export async function verifyInviteRegister(origin: string, response: RegistrationResponseJSON) {
  const session = await getSession();
  const expectedChallenge = session.challenge;
  const webauthnUserId = session.webauthnUserId;
  const inviteUserId = session.inviteUserId;

  if (!expectedChallenge) throw new Error("Challenge not found");
  if (!webauthnUserId) throw new Error("WebAuthn user ID not found");
  if (!inviteUserId) throw new Error("Invite user ID not found");

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: origin,
    expectedRPID: getRpId(origin),
  });

  if (!verification.verified || !verification.registrationInfo) {
    throw new Error("Registration verification failed");
  }

  const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

  await db.insert(passkeys).values({
    id: credential.id,
    userId: inviteUserId,
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
  session.inviteUserId = undefined;
  session.userId = inviteUserId;
  await session.save();

  return { userId: inviteUserId, credentialId: credential.id };
}
