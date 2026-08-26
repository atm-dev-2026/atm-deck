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
    <div className="flex h-full min-h-0 flex-1">
      <aside className="flex w-14 shrink-0 flex-col items-center gap-4 border-r border-zinc-200 bg-white py-3 dark:border-zinc-800 dark:bg-zinc-950">
        <Link
          href="/"
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-xs font-bold text-white"
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
    </div>
  );
}
