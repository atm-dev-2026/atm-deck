import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

import { GET as getBoard } from "@/app/api/boards/[boardId]/route";
import { POST as postLabel } from "@/app/api/boards/[boardId]/labels/route";
import { POST as postInvite } from "@/app/api/boards/[boardId]/invite/route";
import {
  createUser,
  createBoard,
  mockSessionAs,
  callRoute,
  cleanupFixtures,
} from "./helpers/fixtures";

describe("Board invitation workflow", () => {
  let owner: Awaited<ReturnType<typeof createUser>>;
  let readOnlyUser: Awaited<ReturnType<typeof createUser>>;
  let editUser: Awaited<ReturnType<typeof createUser>>;
  let strangerUser: Awaited<ReturnType<typeof createUser>>;
  let board: Awaited<ReturnType<typeof createBoard>>;

  beforeEach(async () => {
    owner = await createUser();
    readOnlyUser = await createUser();
    editUser = await createUser();
    strangerUser = await createUser();
    board = await createBoard(owner.id, { visibilityType: "PERSONAL" });
  });

  afterEach(async () => {
    await cleanupFixtures();
  });

  it("owner invites a user as READ_ONLY", async () => {
    mockSessionAs(owner.id);
    const res = await callRoute(postInvite, {
      method: "POST",
      params: { boardId: board.id },
      body: { userId: readOnlyUser.id, role: "READ_ONLY" },
    });
    expect(res.status).toBe(201);
  });

  it("READ_ONLY invitee can view but cannot mutate", async () => {
    mockSessionAs(owner.id);
    await callRoute(postInvite, {
      method: "POST",
      params: { boardId: board.id },
      body: { userId: readOnlyUser.id, role: "READ_ONLY" },
    });

    mockSessionAs(readOnlyUser.id);
    const viewRes = await callRoute(getBoard, { params: { boardId: board.id } });
    expect(viewRes.status).toBe(200);

    const mutateRes = await callRoute(postLabel, {
      method: "POST",
      params: { boardId: board.id },
      body: { name: "Blocked", color: "#ff0000" },
    });
    expect(mutateRes.status).toBe(403);
  });

  it("CAN_EDIT invitee can view and mutate", async () => {
    mockSessionAs(owner.id);
    await callRoute(postInvite, {
      method: "POST",
      params: { boardId: board.id },
      body: { userId: editUser.id, role: "CAN_EDIT" },
    });

    mockSessionAs(editUser.id);
    const mutateRes = await callRoute(postLabel, {
      method: "POST",
      params: { boardId: board.id },
      body: { name: "Allowed", color: "#00ff00" },
    });
    expect(mutateRes.status).toBe(201);
  });

  it("a never-invited user is forbidden", async () => {
    mockSessionAs(strangerUser.id);
    const res = await callRoute(getBoard, { params: { boardId: board.id } });
    expect(res.status).toBe(403);
  });

  it("a CAN_EDIT invitee (not owner/admin) cannot invite others", async () => {
    mockSessionAs(owner.id);
    await callRoute(postInvite, {
      method: "POST",
      params: { boardId: board.id },
      body: { userId: editUser.id, role: "CAN_EDIT" },
    });

    mockSessionAs(editUser.id);
    const res = await callRoute(postInvite, {
      method: "POST",
      params: { boardId: board.id },
      body: { userId: strangerUser.id, role: "READ_ONLY" },
    });
    expect(res.status).toBe(403);
  });
});
