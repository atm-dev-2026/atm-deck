import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

import { prisma } from "@/lib/prisma";
import { POST as toggleGodMode } from "@/app/api/god-mode/route";
import { GET as getBoard } from "@/app/api/boards/[boardId]/route";
import {
  createUser,
  createDepartment,
  addDepartmentMember,
  createBoard,
  mockSessionAs,
  callRoute,
  cleanupFixtures,
} from "./helpers/fixtures";

describe("God mode", () => {
  let eligible: Awaited<ReturnType<typeof createUser>>;
  let owner: Awaited<ReturnType<typeof createUser>>;
  let personalBoard: Awaited<ReturnType<typeof createBoard>>;

  beforeEach(async () => {
    const godRole = await createDepartment(undefined, { canManageUsers: true, canUseGodMode: true });
    eligible = await createUser({ withRole: false });
    await addDepartmentMember(godRole.id, eligible.id);
    owner = await createUser();
    personalBoard = await createBoard(owner.id, { visibilityType: "PERSONAL" });
  });

  afterEach(async () => {
    await cleanupFixtures();
  });

  const toggle = (userId: string, enabled: unknown) => {
    mockSessionAs(userId);
    return callRoute(toggleGodMode, { method: "POST", body: { enabled } });
  };
  const viewBoard = (userId: string) => {
    mockSessionAs(userId);
    return callRoute(getBoard, { params: { boardId: personalBoard.id } });
  };
  const logsFor = (userId: string) =>
    prisma.godModeLog.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { enabled: true },
    });

  it("an eligible user switches it on and off, gaining and losing full board access, and each switch is logged", async () => {
    expect((await viewBoard(eligible.id)).status).not.toBe(200);

    expect((await toggle(eligible.id, true)).status).toBe(200);
    expect((await viewBoard(eligible.id)).status).toBe(200);

    expect((await toggle(eligible.id, false)).status).toBe(200);
    expect((await viewBoard(eligible.id)).status).not.toBe(200);

    expect(await logsFor(eligible.id)).toEqual([{ enabled: true }, { enabled: false }]);
  });

  it("nobody can switch it for someone else — even from god mode, a target user id is ignored", async () => {
    const other = await createUser({ godMode: true });
    await toggle(eligible.id, true);

    mockSessionAs(eligible.id);
    const res = await callRoute(toggleGodMode, { method: "POST", body: { enabled: false, userId: other.id } });
    expect(res.status).toBe(200);

    const { godMode } = await prisma.user.findUniqueOrThrow({ where: { id: other.id } });
    expect(godMode).toBe(true);
    expect(await logsFor(other.id)).toEqual([]);
    // It was the caller's own switch that flipped.
    expect(await logsFor(eligible.id)).toEqual([{ enabled: true }, { enabled: false }]);
  });

  it("switching to the state it's already in is not logged again", async () => {
    await toggle(eligible.id, true);
    const res = await toggle(eligible.id, true);
    expect(res.status).toBe(200);
    expect((await res.json()).changed).toBe(false);
    expect(await logsFor(eligible.id)).toHaveLength(1);
  });

  it("a user whose role doesn't allow it gets 403 and nothing is logged", async () => {
    const plain = await createUser();
    expect((await toggle(plain.id, true)).status).toBe(403);
    expect(await logsFor(plain.id)).toEqual([]);
  });

  it("rejects a non-boolean value", async () => {
    expect((await toggle(eligible.id, "yes")).status).toBe(400);
  });

  it("a leftover flag grants nothing once the role no longer allows god mode", async () => {
    const plain = await createUser();
    await prisma.user.update({ where: { id: plain.id }, data: { godMode: true } });
    expect((await viewBoard(plain.id)).status).not.toBe(200);
  });
});
