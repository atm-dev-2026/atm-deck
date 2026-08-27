import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

import { PATCH as patchUserRole } from "@/app/api/admin/users/[userId]/route";
import { createUser, mockSessionAs, callRoute, cleanupFixtures } from "./helpers/fixtures";

describe("Admin global role management", () => {
  let admin: Awaited<ReturnType<typeof createUser>>;
  let plainUser: Awaited<ReturnType<typeof createUser>>;

  beforeEach(async () => {
    admin = await createUser({ globalRole: "ADMIN" });
    plainUser = await createUser({ globalRole: "USER" });
  });

  afterEach(async () => {
    await cleanupFixtures();
  });

  it("an admin promotes another user to ADMIN", async () => {
    mockSessionAs(admin.id);
    const res = await callRoute(patchUserRole, {
      method: "PATCH",
      params: { userId: plainUser.id },
      body: { globalRole: "ADMIN" },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.globalRole).toBe("ADMIN");
  });

  it("an admin demotes another admin to USER", async () => {
    const otherAdmin = await createUser({ globalRole: "ADMIN" });
    mockSessionAs(admin.id);
    const res = await callRoute(patchUserRole, {
      method: "PATCH",
      params: { userId: otherAdmin.id },
      body: { globalRole: "USER" },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.globalRole).toBe("USER");
  });

  it("a non-admin cannot change roles", async () => {
    mockSessionAs(plainUser.id);
    const res = await callRoute(patchUserRole, {
      method: "PATCH",
      params: { userId: admin.id },
      body: { globalRole: "USER" },
    });
    expect(res.status).toBe(403);
  });

  it("an admin cannot change their own role", async () => {
    mockSessionAs(admin.id);
    const res = await callRoute(patchUserRole, {
      method: "PATCH",
      params: { userId: admin.id },
      body: { globalRole: "USER" },
    });
    expect(res.status).toBe(400);
  });

  it("rejects an invalid role", async () => {
    mockSessionAs(admin.id);
    const res = await callRoute(patchUserRole, {
      method: "PATCH",
      params: { userId: plainUser.id },
      body: { globalRole: "SUPERUSER" },
    });
    expect(res.status).toBe(400);
  });

  it("updating a non-existent user returns 404", async () => {
    mockSessionAs(admin.id);
    const res = await callRoute(patchUserRole, {
      method: "PATCH",
      params: { userId: "nonexistent-id" },
      body: { globalRole: "ADMIN" },
    });
    expect(res.status).toBe(404);
  });
});
