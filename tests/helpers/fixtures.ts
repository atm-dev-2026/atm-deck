import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import type {
  BoardRole,
  BoardVisibility,
  DepartmentRole,
} from "@/generated/prisma/client";

// Tracks fixture rows created by the current test file so cleanup only ever
// touches data this suite created — never the pre-existing live data.
const createdUserIds: string[] = [];
const createdBoardIds: string[] = [];
const createdDepartmentIds: string[] = [];
// Role-less users are locked out of the app, so fixture users get this
// (otherwise unused) department as their role unless a test opts out.
let defaultRoleDepartmentId: string | null = null;
// Role that may use god mode (and manage users, like the real ones), for
// `createUser({ godMode: true })`.
let godModeRoleDepartmentId: string | null = null;

export async function createUser(
  overrides: { godMode?: boolean; name?: string; withRole?: boolean } = {},
) {
  const user = await prisma.user.create({
    data: {
      email: `rbac-test-${randomUUID()}@example.test`,
      name: overrides.name ?? "RBAC Test User",
      godMode: overrides.godMode ?? false,
    },
  });
  createdUserIds.push(user.id);
  if (overrides.godMode) {
    godModeRoleDepartmentId ??= (
      await createDepartment("RBAC Test God Role", { canManageUsers: true, canUseGodMode: true })
    ).id;
    await addDepartmentMember(godModeRoleDepartmentId, user.id);
  } else if (overrides.withRole ?? true) {
    defaultRoleDepartmentId ??= (await createDepartment("RBAC Test Role")).id;
    await addDepartmentMember(defaultRoleDepartmentId, user.id);
  }
  return user;
}

export async function createDepartment(
  name?: string,
  options: { canManageUsers?: boolean; canUseGodMode?: boolean } = {},
) {
  const department = await prisma.department.create({
    data: {
      name: name ?? `RBAC Test Dept ${randomUUID()}`,
      canManageUsers: options.canManageUsers ?? false,
      canUseGodMode: options.canUseGodMode ?? false,
    },
  });
  createdDepartmentIds.push(department.id);
  return department;
}

export function addDepartmentMember(departmentId: string, userId: string, role: DepartmentRole = "MEMBER") {
  return prisma.departmentMember.create({ data: { departmentId, userId, role } });
}

export async function createBoard(
  ownerId: string,
  overrides: { visibilityType?: BoardVisibility; departmentId?: string; name?: string } = {},
) {
  const board = await prisma.board.create({
    data: {
      name: overrides.name ?? `RBAC Test Board ${randomUUID()}`,
      ownerId,
      visibilityType: overrides.visibilityType ?? "PERSONAL",
      departmentId: overrides.departmentId,
    },
  });
  createdBoardIds.push(board.id);
  return board;
}

export function inviteToBoard(boardId: string, userId: string, role: BoardRole) {
  return prisma.boardMember.create({ data: { boardId, userId, role } });
}

// Columns/tasks/checklist items cascade-delete with their board (see
// prisma/schema.prisma), so they don't need their own cleanup tracking.
export async function createColumn(
  boardId: string,
  overrides: { name?: string; order?: number } = {},
) {
  return prisma.column.create({
    data: {
      boardId,
      name: overrides.name ?? "RBAC Test Column",
      order: overrides.order ?? 0,
    },
  });
}

export async function createTask(
  columnId: string,
  overrides: { title?: string; order?: number; assigneeId?: string; dueDate?: Date; priority?: "NONE" | "LOW" | "MEDIUM" | "HIGH" | "URGENT" } = {},
) {
  return prisma.task.create({
    data: {
      columnId,
      title: overrides.title ?? "RBAC Test Task",
      order: overrides.order ?? 0,
      assigneeId: overrides.assigneeId,
      dueDate: overrides.dueDate,
      priority: overrides.priority,
    },
  });
}

export async function createChecklistItem(
  taskId: string,
  overrides: { text?: string; done?: boolean; order?: number } = {},
) {
  return prisma.checklistItem.create({
    data: {
      taskId,
      text: overrides.text ?? "RBAC Test Item",
      done: overrides.done ?? false,
      order: overrides.order ?? 0,
    },
  });
}

export async function createLabel(
  boardId: string,
  overrides: { name?: string; color?: string } = {},
) {
  return prisma.label.create({
    data: {
      boardId,
      name: overrides.name ?? "RBAC Test Label",
      color: overrides.color ?? "#00ff00",
    },
  });
}

export async function createTaskAttachment(
  taskId: string,
  overrides: { key?: string; fileName?: string; fileType?: string; fileSize?: number } = {},
) {
  return prisma.taskAttachment.create({
    data: {
      taskId,
      key: overrides.key ?? `tasks/${taskId}/${randomUUID()}-test.txt`,
      fileName: overrides.fileName ?? "test.txt",
      fileType: overrides.fileType ?? "text/plain",
      fileSize: overrides.fileSize ?? 1024,
    },
  });
}

// NextAuth's `auth` export is an overloaded function (plain call, middleware
// use, handler-wrapping use) that vi.mocked() can't cleanly infer a single
// signature for — cast to a plain async fn for mocking purposes only.
const mockedAuth = auth as unknown as {
  mockResolvedValue: (value: { user: { id: string } } | null) => void;
};

/** Points the mocked `auth()` at a given user, or at "no session" when null. */
export function mockSessionAs(userId: string | null) {
  mockedAuth.mockResolvedValue(userId ? { user: { id: userId } } : null);
}

type RouteParams = Record<string, string>;
// Route handlers' inferred return type picks up `| undefined` from Next's
// generated route-typing augmentation (.next/types); it never actually
// resolves to undefined at runtime, so callRoute asserts that below.
type RouteHandler<P extends RouteParams = RouteParams> = (
  request: Request,
  ctx: { params: Promise<P> },
) => Promise<Response | undefined>;

export async function callRoute<P extends RouteParams = RouteParams>(
  handler: RouteHandler<P>,
  opts: { method?: string; body?: unknown; params?: P } = {},
): Promise<Response> {
  const request = new Request("http://localhost/api/test", {
    method: opts.method ?? "GET",
    headers: opts.body !== undefined ? { "content-type": "application/json" } : undefined,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const response = await handler(request, { params: Promise.resolve((opts.params ?? {}) as P) });
  if (!response) {
    throw new Error("Route handler returned no response");
  }
  return response;
}

/**
 * Deletes only fixture rows created via the helpers above, in FK-safe order.
 * AppInvites cascade with their department and creator.
 */
export async function cleanupFixtures() {
  if (createdBoardIds.length > 0) {
    await prisma.board.deleteMany({ where: { id: { in: createdBoardIds } } });
    createdBoardIds.length = 0;
  }
  if (createdDepartmentIds.length > 0) {
    await prisma.department.deleteMany({ where: { id: { in: createdDepartmentIds } } });
    createdDepartmentIds.length = 0;
    defaultRoleDepartmentId = null;
    godModeRoleDepartmentId = null;
  }
  if (createdUserIds.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    createdUserIds.length = 0;
  }
}
