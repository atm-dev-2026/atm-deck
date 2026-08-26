import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

import { GET as getBoard, DELETE as deleteBoard } from "@/app/api/boards/[boardId]/route";
import { POST as postLabel } from "@/app/api/boards/[boardId]/labels/route";
import {
  createUser,
  createDepartment,
  createBoard,
  mockSessionAs,
  callRoute,
  cleanupFixtures,
} from "./helpers/fixtures";

describe("Global admin override (precedence rule #1)", () => {
  let admin: Awaited<ReturnType<typeof createUser>>;
  let owner: Awaited<ReturnType<typeof createUser>>;
  let personalBoard: Awaited<ReturnType<typeof createBoard>>;
  let departmentBoard: Awaited<ReturnType<typeof createBoard>>;

  beforeEach(async () => {
    admin = await createUser({ globalRole: "ADMIN" });
    owner = await createUser();
    const department = await createDepartment();
    personalBoard = await createBoard(owner.id, { visibilityType: "PERSONAL" });
    departmentBoard = await createBoard(owner.id, {
      visibilityType: "DEPARTMENT",
      departmentId: department.id,
    });
  });

  afterEach(async () => {
    await cleanupFixtures();
  });

  it("admin can view a PERSONAL board they don't own and were never invited to", async () => {
    mockSessionAs(admin.id);
    const res = await callRoute(getBoard, { params: { boardId: personalBoard.id } });
    expect(res.status).toBe(200);
  });

  it("admin can edit that PERSONAL board's contents", async () => {
    mockSessionAs(admin.id);
    const res = await callRoute(postLabel, {
      method: "POST",
      params: { boardId: personalBoard.id },
      body: { name: "Admin label", color: "#000000" },
    });
    expect(res.status).toBe(201);
  });

  it("admin can delete that PERSONAL board", async () => {
    mockSessionAs(admin.id);
    const res = await callRoute(deleteBoard, { params: { boardId: personalBoard.id } });
    expect(res.status).toBe(200);
  });

  it("admin can edit a DEPARTMENT board with no department relationship of their own", async () => {
    mockSessionAs(admin.id);
    const res = await callRoute(postLabel, {
      method: "POST",
      params: { boardId: departmentBoard.id },
      body: { name: "Admin dept label", color: "#111111" },
    });
    expect(res.status).toBe(201);
  });
});
