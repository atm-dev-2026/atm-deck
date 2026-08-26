import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

import { GET as getBoard } from "@/app/api/boards/[boardId]/route";
import { POST as postLabel } from "@/app/api/boards/[boardId]/labels/route";
import {
  createUser,
  createDepartment,
  addDepartmentMember,
  createBoard,
  mockSessionAs,
  callRoute,
  cleanupFixtures,
} from "./helpers/fixtures";

describe("Department vs global fallback rules", () => {
  let owner: Awaited<ReturnType<typeof createUser>>;
  let manager: Awaited<ReturnType<typeof createUser>>;
  let member: Awaited<ReturnType<typeof createUser>>;
  let outsider: Awaited<ReturnType<typeof createUser>>;
  let departmentBoard: Awaited<ReturnType<typeof createBoard>>;
  let globalBoard: Awaited<ReturnType<typeof createBoard>>;

  beforeEach(async () => {
    owner = await createUser();
    manager = await createUser();
    member = await createUser();
    outsider = await createUser();

    const department = await createDepartment();
    await addDepartmentMember(department.id, manager.id, "MANAGER");
    await addDepartmentMember(department.id, member.id, "MEMBER");

    departmentBoard = await createBoard(owner.id, {
      visibilityType: "DEPARTMENT",
      departmentId: department.id,
    });
    globalBoard = await createBoard(owner.id, { visibilityType: "GLOBAL" });
  });

  afterEach(async () => {
    await cleanupFixtures();
  });

  it("department manager gets CAN_EDIT via fallback", async () => {
    mockSessionAs(manager.id);
    const res = await callRoute(postLabel, {
      method: "POST",
      params: { boardId: departmentBoard.id },
      body: { name: "Manager label", color: "#123456" },
    });
    expect(res.status).toBe(201);
  });

  it("department member gets READ_ONLY via fallback", async () => {
    mockSessionAs(member.id);
    const viewRes = await callRoute(getBoard, { params: { boardId: departmentBoard.id } });
    expect(viewRes.status).toBe(200);

    const mutateRes = await callRoute(postLabel, {
      method: "POST",
      params: { boardId: departmentBoard.id },
      body: { name: "Member label", color: "#654321" },
    });
    expect(mutateRes.status).toBe(403);
  });

  it("a user outside the department has no access to the DEPARTMENT board", async () => {
    mockSessionAs(outsider.id);
    const res = await callRoute(getBoard, { params: { boardId: departmentBoard.id } });
    expect(res.status).toBe(403);
  });

  it("an unrelated user can read (but not edit) a GLOBAL board by default", async () => {
    mockSessionAs(outsider.id);
    const viewRes = await callRoute(getBoard, { params: { boardId: globalBoard.id } });
    expect(viewRes.status).toBe(200);

    const mutateRes = await callRoute(postLabel, {
      method: "POST",
      params: { boardId: globalBoard.id },
      body: { name: "Outsider label", color: "#abcdef" },
    });
    expect(mutateRes.status).toBe(403);
  });
});
