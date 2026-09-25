import { prisma } from "@/lib/prisma";
import type { ActivityAction, ActivityEntityType } from "@/generated/prisma/client";

export type ActivityChange = { field: string; from: string | null; to: string | null };

export function buildChange(field: string, from: string | null, to: string | null): ActivityChange | null {
  return from === to ? null : { field, from, to };
}

export async function logActivity(params: {
  boardId: string;
  entityType: ActivityEntityType;
  entityId: string;
  entityName: string;
  action: ActivityAction;
  actor: { id: string; name: string | null; email: string | null };
  changes?: ActivityChange[] | null;
}): Promise<void> {
  const { boardId, entityType, entityId, entityName, action, actor, changes } = params;

  try {
    await prisma.activityLog.create({
      data: {
        boardId,
        entityType,
        entityId,
        entityName,
        action,
        actorId: actor.id,
        actorName: actor.name ?? actor.email ?? "?",
        changes: changes && changes.length > 0 ? changes : undefined,
      },
    });
  } catch (error) {
    console.error("Failed to write activity log entry", error);
  }
}
