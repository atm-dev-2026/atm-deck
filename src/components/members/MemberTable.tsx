"use client";

import { useTranslations } from "next-intl";
import { SquarePen, Zap } from "lucide-react";
import { Avatar } from "../Avatar";
import { GodModeAvatarRing } from "../GodModeToggle";
import { Spinner } from "../Spinner";
import { Switch } from "../Switch";
import { useDateLocale } from "../CalendarProvider";
import { useHydrated } from "@/lib/useHydrated";
import { personLabel, type MemberRow } from "./types";

export function MemberTable({
  rows,
  departmentNames,
  currentUser,
  pendingUserId,
  onEdit,
  onToggleAccess,
}: {
  rows: MemberRow[];
  departmentNames: Map<string, string>;
  currentUser: { id: string; godMode: boolean };
  pendingUserId: string | null;
  onEdit: (row: MemberRow) => void;
  onToggleAccess: (row: MemberRow, next: boolean) => void;
}) {
  const t = useTranslations("Members");
  const locale = useDateLocale();
  const hydrated = useHydrated();

  const th = "px-3 py-2.5 text-left text-[11px] font-medium text-zinc-500 dark:text-zinc-400";
  const td = "px-3 py-3 align-middle";

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-zinc-900/[0.03] dark:bg-white/[0.04]">
            <th className={`${th} w-16 text-center`}>{t("colPhoto")}</th>
            <th className={th}>{t("colName")}</th>
            <th className={`${th} hidden text-center md:table-cell`}>{t("colRole")}</th>
            <th className={`${th} hidden text-center lg:table-cell`}>{t("colPosition")}</th>
            <th className={`${th} hidden text-center lg:table-cell`}>{t("colJoined")}</th>
            <th className={`${th} w-20 text-center`}>{t("colStatus")}</th>
            <th className={`${th} w-12`}>
              <span className="sr-only">{t("edit")}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((u) => {
            const isSelf = u.id === currentUser.id;
            // Only someone in god mode may edit a user who is in god mode (the API refuses too).
            const readOnly = isSelf || (u.godMode && !currentUser.godMode);
            const pending = pendingUserId === u.id;
            const active = u.membership !== null;
            // Role-less rows read as "disabled", like a resigned account.
            const muted = !active;
            const roleName = u.membership ? (departmentNames.get(u.membership.departmentId) ?? "—") : null;

            return (
              <tr
                key={u.id}
                className="border-t border-zinc-900/5 transition-colors hover:bg-zinc-900/[0.02] dark:border-white/5 dark:hover:bg-white/[0.02]"
              >
                <td className={`${td} text-center`}>
                  <span className={`inline-flex ${muted ? "opacity-60 grayscale" : ""}`}>
                    <GodModeAvatarRing active={u.godMode}>
                      <Avatar label={personLabel(u)} image={u.image} size="lg" />
                    </GodModeAvatarRing>
                  </span>
                </td>
                <td className={td}>
                  <p
                    className={`flex items-center gap-1.5 text-sm font-medium ${
                      muted ? "text-red-500 line-through" : "text-zinc-950 dark:text-zinc-50"
                    }`}
                  >
                    <span className="truncate">{u.name ?? u.email}</span>
                    {u.godMode && (
                      <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-rose-600 dark:text-rose-400">
                        <Zap size={9} className="fill-current" />
                        {t("godModeBadge")}
                      </span>
                    )}
                    {isSelf && (
                      <span className="shrink-0 rounded-full bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-accent dark:bg-accent/20">
                        {t("you")}
                      </span>
                    )}
                  </p>
                  {u.name && u.email && <p className="truncate text-xs text-zinc-400">{u.email}</p>}
                  {/* Role column is hidden on narrow screens — show it inline instead. */}
                  <p className={`mt-0.5 text-xs md:hidden ${muted ? "text-red-500" : "text-zinc-500"}`}>
                    {roleName ?? t("noRole")}
                  </p>
                </td>
                <td className={`${td} hidden text-center text-xs md:table-cell`}>
                  {roleName ? (
                    <span className="text-zinc-700 dark:text-zinc-200">{roleName}</span>
                  ) : (
                    <span className="font-medium text-red-500">{t("noRole")}</span>
                  )}
                </td>
                <td className={`${td} hidden text-center text-xs text-zinc-500 lg:table-cell`}>
                  {u.membership ? (u.membership.role === "MANAGER" ? t("deptManager") : t("deptMember")) : "-"}
                </td>
                <td className={`${td} hidden text-center text-xs text-zinc-500 lg:table-cell`}>
                  {u.membership && hydrated ? new Date(u.membership.joinedAt).toLocaleDateString(locale) : "-"}
                </td>
                <td className={`${td} text-center`}>
                  <span className="inline-flex items-center gap-1.5">
                    <Switch
                      checked={active}
                      disabled={readOnly || pending}
                      onChange={(next) => onToggleAccess(u, next)}
                      label={t("accessToggle")}
                    />
                    {pending && <Spinner size={12} />}
                  </span>
                </td>
                <td className={`${td} text-center`}>
                  <button
                    type="button"
                    onClick={() => onEdit(u)}
                    disabled={readOnly || pending}
                    title={t("edit")}
                    className="rounded p-1.5 text-zinc-400 transition-colors hover:bg-zinc-900/5 hover:text-accent disabled:pointer-events-none disabled:opacity-30 dark:hover:bg-white/5"
                  >
                    <SquarePen size={15} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {rows.length === 0 && <p className="px-4 py-10 text-center text-xs text-zinc-400">{t("noMatches")}</p>}
    </div>
  );
}
