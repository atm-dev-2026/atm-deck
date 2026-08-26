import Link from "next/link";
import { auth, signOut } from "../../auth";

export async function Header() {
  const session = await auth();
  if (!session?.user) return null;

  return (
    <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-3 dark:border-zinc-800 dark:bg-zinc-950">
      <Link
        href="/"
        className="text-sm font-semibold text-zinc-950 dark:text-zinc-50"
      >
        ATM Deck
      </Link>

      <div className="flex items-center gap-3">
        <span className="text-sm text-zinc-600 dark:text-zinc-400">
          {session.user.name ?? session.user.email}
        </span>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/login" });
          }}
        >
          <button
            type="submit"
            className="rounded-md border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Sign out
          </button>
        </form>
      </div>
    </header>
  );
}
