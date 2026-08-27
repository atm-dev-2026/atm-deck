import Link from "next/link";
import { auth, signOut } from "../../auth";
import { prisma } from "@/lib/prisma";
import { NavRail } from "./NavRail";
import { UserMenu } from "./UserMenu";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) return <>{children}</>;

  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { globalRole: true },
  });
  const isAdmin = dbUser?.globalRole === "ADMIN";

  const signOutAction = async () => {
    "use server";
    await signOut({ redirectTo: "/login" });
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col sm:flex-row">
      <aside className="glass relative z-20 hidden w-16 shrink-0 flex-col items-center gap-4 py-4 sm:flex">
        <Link
          href="/"
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent font-serif text-sm italic font-semibold text-accent-foreground shadow-glow"
          title="ATM Deck"
        >
          AD
        </Link>

        <NavRail isAdmin={isAdmin} />

        <div className="flex-1" />

        <UserMenu
          name={session.user.name ?? null}
          email={session.user.email ?? null}
          image={session.user.image ?? null}
          signOutAction={signOutAction}
        />
      </aside>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>

      <div className="glass relative z-20 flex shrink-0 items-stretch py-1 sm:hidden">
        <NavRail variant="bottom" isAdmin={isAdmin} />
        <UserMenu
          name={session.user.name ?? null}
          email={session.user.email ?? null}
          image={session.user.image ?? null}
          signOutAction={signOutAction}
          placement="top"
        />
      </div>
    </div>
  );
}
