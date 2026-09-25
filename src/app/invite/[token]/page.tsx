import { redirect } from "next/navigation";
import { getSessionUser, hasRole } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { hashInviteToken, inviteStatus } from "@/lib/roles";
import { InviteAccept, type InviteView } from "./InviteAccept";

/**
 * Landing page for an app invite link. Signed-out visitors never reach this:
 * the proxy sends them to /login?callbackUrl=/invite/<token> and back.
 */
export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const { token } = await params;
  const invite = await prisma.appInvite.findUnique({
    where: { tokenHash: hashInviteToken(token) },
    select: {
      expiresAt: true,
      acceptedAt: true,
      department: { select: { name: true } },
      createdBy: { select: { name: true, email: true } },
    },
  });

  let view: InviteView;
  if (!invite) {
    view = { state: "notFound" };
  } else if (hasRole(user)) {
    view = { state: "alreadyMember" };
  } else {
    const status = inviteStatus(invite);
    view =
      status === "active"
        ? {
            state: "active",
            roleName: invite.department.name,
            inviterName: invite.createdBy.name ?? invite.createdBy.email ?? "—",
            expiresAt: invite.expiresAt.toISOString(),
          }
        : { state: status === "accepted" ? "used" : "expired" };
  }

  return <InviteAccept token={token} view={view} email={user.email ?? user.name ?? ""} />;
}
