import Link from "next/link";
import { signOut } from "../../auth";
import { getCurrentUser } from "@/lib/current-user";
import { NavRail } from "./NavRail";
import { UserMenu } from "./UserMenu";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) return <>{children}</>;

  const isAdmin = user.globalRole === "ADMIN";

  const signOutAction = async () => {
    "use server";
    await signOut({ redirectTo: "/login" });
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col sm:flex-row">
      <aside className="glass relative z-20 hidden w-18 shrink-0 flex-col items-center gap-5 py-5 sm:flex">
        <Link
          href="/"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent font-serif text-sm italic font-semibold text-accent-foreground shadow-glow transition-transform duration-300 hover:-translate-y-0.5 hover:scale-105"
          title="ATM Deck"
        >
          AD
        </Link>

        <NavRail isAdmin={isAdmin} />

        <div className="flex-1" />

        <div className="h-px w-8 bg-zinc-900/10 dark:bg-white/10" />

        <UserMenu
          name={user.name}
          email={user.email}
          image={user.image}
          signOutAction={signOutAction}
        />
      </aside>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>

      <div className="glass relative z-20 flex shrink-0 items-stretch py-1 sm:hidden">
        <NavRail variant="bottom" isAdmin={isAdmin} />
        <UserMenu
          name={user.name}
          email={user.email}
          image={user.image}
          signOutAction={signOutAction}
          placement="top"
        />
      </div>
    </div>
  );
}
