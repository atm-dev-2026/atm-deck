import Link from "next/link";
import { auth, signOut } from "../../auth";
import { NavRail } from "./NavRail";
import { UserMenu } from "./UserMenu";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) return <>{children}</>;

  const signOutAction = async () => {
    "use server";
    await signOut({ redirectTo: "/login" });
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col sm:flex-row">
      <aside className="hidden w-14 shrink-0 flex-col items-center gap-4 border-r border-zinc-200 bg-surface py-3 dark:border-zinc-800 sm:flex">
        <Link
          href="/"
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent font-serif text-sm italic font-semibold text-accent-foreground shadow-sm"
          title="ATM Deck"
        >
          AD
        </Link>

        <NavRail />

        <div className="flex-1" />

        <UserMenu
          name={session.user.name ?? null}
          email={session.user.email ?? null}
          image={session.user.image ?? null}
          signOutAction={signOutAction}
        />
      </aside>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>

      <div className="flex shrink-0 items-stretch border-t border-zinc-200 bg-surface py-1 dark:border-zinc-800 sm:hidden">
        <NavRail variant="bottom" />
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
