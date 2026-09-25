import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { LogOut, ShieldAlert } from "lucide-react";
import { signOut } from "../../../auth";
import { getSessionUser, hasRole } from "@/lib/current-user";
import { SubmitButton } from "@/components/SubmitButton";

/** Where signed-in users without a role land: they can only wait for an invite or sign out. */
export default async function NoAccessPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (hasRole(user)) redirect("/");

  const t = await getTranslations("NoAccess");

  const signOutAction = async () => {
    "use server";
    await signOut({ redirectTo: "/login" });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="glass-strong w-full max-w-sm rounded-2xl p-8">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/15 text-accent">
          <ShieldAlert size={20} />
        </div>
        <h1 className="mt-5 font-serif text-2xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          {t("heading")}
        </h1>
        <p className="mt-1.5 text-sm text-zinc-500">{t("body", { email: user.email ?? user.name ?? "—" })}</p>

        <form action={signOutAction} className="mt-6">
          <SubmitButton
            pendingLabel={t("signingOut")}
            className="glass-field flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-zinc-600 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-glow dark:text-zinc-300"
          >
            <LogOut size={14} />
            {t("signOut")}
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}
