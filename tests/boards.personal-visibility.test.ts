import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

import { GET as getBoard } from "@/app/api/boards/[boardId]/route";
import { GET as listBoards } from "@/app/api/boards/route";
import {
  createUser,
  createDepartment,
  addDepartmentMember,
  createBoard,
  mockSessionAs,
  callRoute,
  cleanupFixtures,
} from "./helpers/fixtures";

describe("PERSONAL board privacy", () => {
  let owner: Awaited<ReturnType<typeof createUser>>;
  let sameDeptUser: Awaited<ReturnType<typeof createUser>>;
  let board: Awaited<ReturnType<typeof createBoard>>;

  beforeEach(async () => {
    owner = await createUser();
    sameDeptUser = await createUser();
    const department = await createDepartment();
    await addDepartmentMember(department.id, owner.id, "MEMBER");
    await addDepartmentMember(department.id, sameDeptUser.id, "MEMBER");
    board = await createBoard(owner.id, { visibilityType: "PERSONAL" });
  });

  afterEach(async () => {
    await cleanupFixtures();
  });

  it("owner can view their personal board", async () => {
    mockSessionAs(owner.id);
    const res = await callRoute(getBoard, { params: { boardId: board.id } });
    expect(res.status).toBe(200);
  });

  it("a same-department, non-invited user cannot view it", async () => {
    mockSessionAs(sameDeptUser.id);
    const res = await callRoute(getBoard, { params: { boardId: board.id } });
    expect(res.status).toBe(403);
  });

  it("an unauthenticated request is rejected", async () => {
    mockSessionAs(null);
    const res = await callRoute(getBoard, { params: { boardId: board.id } });
    expect(res.status).toBe(401);
  });

  it("the board list query excludes it for a non-invited department peer", async () => {
    mockSessionAs(sameDeptUser.id);
    const res = await callRoute(listBoards);
    expect(res.status).toBe(200);
    const boards = (await res.json()) as { id: string }[];
    expect(boards.some((b) => b.id === board.id)).toBe(false);
  });
});
