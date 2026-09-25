import { useTranslations } from "next-intl";
import { Avatar } from "./Avatar";
import { formatDueDateLogValue } from "@/lib/dueDate";
import { useDateLocale } from "@/components/CalendarProvider";

export type ActivityEntityTypeT = "BOARD" | "COLUMN" | "TASK" | "LABEL" | "BOARD_MEMBER";
export type ActivityActionT = "CREATED" | "UPDATED" | "DELETED" | "INVITED" | "ROLE_CHANGED" | "REMOVED";
export type ActivityChangeT = { field: string; from: string | null; to: string | null };
export type ActivityActorT = { id: string; name: string | null; email: string | null; image: string | null } | null;
export type ActivityEntryT = {
  id: string;
  entityType: ActivityEntityTypeT;
  entityId: string;
  entityName: string;
  action: ActivityActionT;
  actorName: string;
  actor: ActivityActorT;
  changes: ActivityChangeT[] | null;
  createdAt: string;
};

const DESCRIPTION_PREVIEW_LENGTH = 120;

function truncate(value: string, max: number) {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

export function ActivityFeedItem({ entry }: { entry: ActivityEntryT }) {
  const t = useTranslations("Boards.activity");
  const locale = useDateLocale();
  const tPriority = useTranslations("Boards.priority");
  const tVisibility = useTranslations("Boards.visibility");
  const tMembers = useTranslations("Boards.members");

  const entityLabel = entry.entityType === "BOARD_MEMBER" ? "" : t(`entityLabels.${entry.entityType}`);

  const actionText = (() => {
    switch (entry.action) {
      case "CREATED":
        return t("created", { entityLabel, entityName: entry.entityName });
      case "UPDATED":
        return t("updated", { entityLabel, entityName: entry.entityName });
      case "DELETED":
        return t("deleted", { entityLabel, entityName: entry.entityName });
      case "INVITED":
        return t("invited", { entityName: entry.entityName });
      case "ROLE_CHANGED":
        return t("roleChanged", { entityName: entry.entityName });
      case "REMOVED":
        return t("removed", { entityName: entry.entityName });
      default:
        return entry.action;
    }
  })();

  const formatValue = (field: string, value: string | null) => {
    if (value === null) return t("noValue");
    switch (field) {
      case "priority":
        return tPriority(value.toLowerCase());
      case "visibility":
        return tVisibility(value.toLowerCase());
      case "role":
        return value === "CAN_EDIT" ? tMembers("canEdit") : tMembers("readOnly");
      case "dueDate":
        return formatDueDateLogValue(value, locale);
      case "description":
        return truncate(value, DESCRIPTION_PREVIEW_LENGTH);
      default:
        return value;
    }
  };

  return (
    <div className="flex gap-2.5 py-2">
      <Avatar label={entry.actorName} image={entry.actor?.image ?? null} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-1.5">
          <span className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">{entry.actorName}</span>
          <span className="text-sm text-zinc-600 dark:text-zinc-400">{actionText}</span>
          <span className="text-xs text-zinc-400">{new Date(entry.createdAt).toLocaleString(locale)}</span>
        </div>
        {entry.changes && entry.changes.length > 0 && (
          <div className="mt-1 flex flex-col gap-0.5">
            {entry.changes.map((change, i) => (
              <div key={i} className="text-xs text-zinc-500 dark:text-zinc-400">
                <span className="font-medium">{t(`fields.${change.field}`)}: </span>
                {formatValue(change.field, change.from)} → {formatValue(change.field, change.to)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
