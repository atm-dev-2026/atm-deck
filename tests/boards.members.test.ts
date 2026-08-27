import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

import { GET as getBoard } from "@/app/api/boards/[boardId]/route";
import { POST as postLabel } from "@/app/api/boards/[boardId]/labels/route";
import { PATCH as patchMember, DELETE as deleteMember } from "@/app/api/boards/[boardId]/members/[userId]/route";
import {
  createUser,
  createBoard,
  inviteToBoard,
  mockSessionAs,
  callRoute,
  cleanupFixtures,
} from "./helpers/fixtures";

describe("Board member management", () => {
  let owner: Awaited<ReturnType<typeof createUser>>;
  let member: Awaited<ReturnType<typeof createUser>>;
  let editUser: Awaited<ReturnType<typeof createUser>>;
  let strangerUser: Awaited<ReturnType<typeof createUser>>;
  let board: Awaited<ReturnType<typeof createBoard>>;

  beforeEach(async () => {
    owner = await createUser();
    member = await createUser();
    editUser = await createUser();
    strangerUser = await createUser();
    board = await createBoard(owner.id, { visibilityType: "PERSONAL" });
    await inviteToBoard(board.id, member.id, "READ_ONLY");
  });

  afterEach(async () => {
    await cleanupFixtures();
  });

  it("owner removes a member", async () => {
    mockSessionAs(owner.id);
    const res = await callRoute(deleteMember, {
      method: "DELETE",
      params: { boardId: board.id, userId: member.id },
    });
    expect(res.status).toBe(200);

    mockSessionAs(member.id);
    const viewRes = await callRoute(getBoard, { params: { boardId: board.id } });
    expect(viewRes.status).toBe(403);
  });

  it("owner changes a member's role from READ_ONLY to CAN_EDIT", async () => {
    mockSessionAs(owner.id);
    const res = await callRoute(patchMember, {
      method: "PATCH",
      params: { boardId: board.id, userId: member.id },
      body: { role: "CAN_EDIT" },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.role).toBe("CAN_EDIT");

    mockSessionAs(member.id);
    const mutateRes = await callRoute(postLabel, {
      method: "POST",
      params: { boardId: board.id },
      body: { name: "Now allowed", color: "#00ff00" },
    });
    expect(mutateRes.status).toBe(201);
  });

  it("a CAN_EDIT invitee (not owner/admin) cannot remove members", async () => {
    await inviteToBoard(board.id, editUser.id, "CAN_EDIT");
    mockSessionAs(editUser.id);
    const res = await callRoute(deleteMember, {
      method: "DELETE",
      params: { boardId: board.id, userId: member.id },
    });
    expect(res.status).toBe(403);
  });

  it("a never-invited user cannot change roles", async () => {
    mockSessionAs(strangerUser.id);
    const res = await callRoute(patchMember, {
      method: "PATCH",
      params: { boardId: board.id, userId: member.id },
      body: { role: "CAN_EDIT" },
    });
    expect(res.status).toBe(403);
  });

  it("the board owner cannot be removed", async () => {
    mockSessionAs(owner.id);
    const res = await callRoute(deleteMember, {
      method: "DELETE",
      params: { boardId: board.id, userId: owner.id },
    });
    expect(res.status).toBe(400);
  });

  it("the board owner's role cannot be changed", async () => {
    mockSessionAs(owner.id);
    const res = await callRoute(patchMember, {
      method: "PATCH",
      params: { boardId: board.id, userId: owner.id },
      body: { role: "READ_ONLY" },
    });
    expect(res.status).toBe(400);
  });

  it("removing a non-member returns 404", async () => {
    mockSessionAs(owner.id);
    const res = await callRoute(deleteMember, {
      method: "DELETE",
      params: { boardId: board.id, userId: strangerUser.id },
    });
    expect(res.status).toBe(404);
  });

  it("rejects an invalid role", async () => {
    mockSessionAs(owner.id);
    const res = await callRoute(patchMember, {
      method: "PATCH",
      params: { boardId: board.id, userId: member.id },
      body: { role: "BOGUS" },
    });
    expect(res.status).toBe(400);
  });
});
