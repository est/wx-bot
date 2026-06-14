import InviteRegister from "@/components/InviteRegister";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <InviteRegister token={token} />;
}
