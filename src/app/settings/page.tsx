import { LogOut, Palette, User } from "lucide-react";
import { auth, signOut } from "../../../auth";
import { Avatar } from "@/components/Avatar";
import { ThemeSettings } from "@/components/ThemeSettings";
import { SubmitButton } from "@/components/SubmitButton";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) return null;

  const signOutAction = async () => {
    "use server";
    await signOut({ redirectTo: "/login" });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="glass relative z-10 rounded-none border-x-0 border-t-0 px-5 py-3">
        <h1 className="font-serif text-base font-semibold text-zinc-950 dark:text-zinc-50">Settings</h1>
      </div>

      <div className="mx-auto w-full max-w-xl flex-1 px-6 py-8">
        <section>
          <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            <Palette size={13} />
            Appearance
          </h2>
          <p className="mt-1 text-xs text-zinc-500">Choose how ATM Deck looks on this device.</p>
          <div className="mt-3">
            <ThemeSettings />
          </div>
        </section>

        <section className="mt-8">
          <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            <User size={13} />
            Account
          </h2>
          <div className="glass mt-3 flex items-center gap-3 rounded-lg p-3">
            <Avatar
              label={session.user.name ?? session.user.email ?? "?"}
              image={session.user.image}
              size="lg"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-zinc-950 dark:text-zinc-50">
                {session.user.name ?? "—"}
              </p>
              <p className="truncate text-xs text-zinc-500">{session.user.email}</p>
            </div>
          </div>
          <p className="mt-2 text-xs text-zinc-400">
            Your name, email, and photo are managed by your Google or LINE account.
          </p>
        </section>

        <section className="mt-8 border-t border-zinc-200 pt-6 dark:border-zinc-800">
          <form action={signOutAction}>
            <SubmitButton
              pendingLabel="Signing out…"
              className="glass-field flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-zinc-600 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-glow dark:text-zinc-300"
            >
              <LogOut size={14} />
              Sign out
            </SubmitButton>
          </form>
        </section>
      </div>
    </div>
  );
}
