import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

import { PATCH as patchBoard } from "@/app/api/boards/[boardId]/route";
import {
  createUser,
  createDepartment,
  addDepartmentMember,
  createBoard,
  inviteToBoard,
  mockSessionAs,
  callRoute,
  cleanupFixtures,
} from "./helpers/fixtures";

describe("Board update (rename + visibility)", () => {
  let owner: Awaited<ReturnType<typeof createUser>>;
  let editUser: Awaited<ReturnType<typeof createUser>>;
  let readOnlyUser: Awaited<ReturnType<typeof createUser>>;
  let strangerUser: Awaited<ReturnType<typeof createUser>>;
  let board: Awaited<ReturnType<typeof createBoard>>;

  beforeEach(async () => {
    owner = await createUser();
    editUser = await createUser();
    readOnlyUser = await createUser();
    strangerUser = await createUser();
    board = await createBoard(owner.id, { visibilityType: "PERSONAL" });
  });

  afterEach(async () => {
    await cleanupFixtures();
  });

  it("owner renames the board", async () => {
    mockSessionAs(owner.id);
    const res = await callRoute(patchBoard, {
      method: "PATCH",
      params: { boardId: board.id },
      body: { name: "Renamed board" },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.name).toBe("Renamed board");
  });

  it("a CAN_EDIT invitee can rename and change visibility", async () => {
    await inviteToBoard(board.id, editUser.id, "CAN_EDIT");
    mockSessionAs(editUser.id);
    const res = await callRoute(patchBoard, {
      method: "PATCH",
      params: { boardId: board.id },
      body: { name: "Edited by invitee", visibilityType: "GLOBAL" },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.name).toBe("Edited by invitee");
    expect(data.visibilityType).toBe("GLOBAL");
  });

  it("a READ_ONLY invitee cannot rename the board", async () => {
    await inviteToBoard(board.id, readOnlyUser.id, "READ_ONLY");
    mockSessionAs(readOnlyUser.id);
    const res = await callRoute(patchBoard, {
      method: "PATCH",
      params: { boardId: board.id },
      body: { name: "Should not apply" },
    });
    expect(res.status).toBe(403);
  });

  it("a never-invited user cannot rename the board", async () => {
    mockSessionAs(strangerUser.id);
    const res = await callRoute(patchBoard, {
      method: "PATCH",
      params: { boardId: board.id },
      body: { name: "Should not apply" },
    });
    expect(res.status).toBe(403);
  });

  it("rejects an empty name", async () => {
    mockSessionAs(owner.id);
    const res = await callRoute(patchBoard, {
      method: "PATCH",
      params: { boardId: board.id },
      body: { name: "   " },
    });
    expect(res.status).toBe(400);
  });

  it("changing to DEPARTMENT visibility without a departmentId is rejected", async () => {
    mockSessionAs(owner.id);
    const res = await callRoute(patchBoard, {
      method: "PATCH",
      params: { boardId: board.id },
      body: { visibilityType: "DEPARTMENT" },
    });
    expect(res.status).toBe(400);
  });

  it("changing to DEPARTMENT visibility without membership in that department is rejected", async () => {
    const department = await createDepartment();
    mockSessionAs(owner.id);
    const res = await callRoute(patchBoard, {
      method: "PATCH",
      params: { boardId: board.id },
      body: { visibilityType: "DEPARTMENT", departmentId: department.id },
    });
    expect(res.status).toBe(403);
  });

  it("changing to DEPARTMENT visibility with membership succeeds", async () => {
    const department = await createDepartment();
    await addDepartmentMember(department.id, owner.id, "MEMBER");
    mockSessionAs(owner.id);
    const res = await callRoute(patchBoard, {
      method: "PATCH",
      params: { boardId: board.id },
      body: { visibilityType: "DEPARTMENT", departmentId: department.id },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.visibilityType).toBe("DEPARTMENT");
    expect(data.departmentId).toBe(department.id);
  });
});
