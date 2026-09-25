"use client";

import { useState } from "react";
import { InviteLinkPanel } from "./InviteLinkPanel";
import { MemberList } from "./MemberList";
import { InviteHistory } from "./InviteHistory";
import type { DepartmentOption, InviteRow, MemberRow } from "./types";

export function MemberManagementPanel({
  currentUser,
  initialDepartments,
  initialUsers,
  initialInvites,
}: {
  currentUser: { id: string; isAdmin: boolean };
  initialDepartments: DepartmentOption[];
  initialUsers: MemberRow[];
  initialInvites: InviteRow[];
}) {
  // Shared so a role added in the invite panel is immediately assignable in the member list.
  const [departments, setDepartments] = useState(initialDepartments);
  const [invites, setInvites] = useState(initialInvites);

  return (
    <>
      <InviteLinkPanel
        departments={departments}
        onDepartmentCreated={(d) =>
          setDepartments((prev) => [...prev, d].sort((a, b) => a.name.localeCompare(b.name)))
        }
        onInviteCreated={(invite) => setInvites((prev) => [invite, ...prev])}
      />
      <MemberList currentUser={currentUser} departments={departments} initialUsers={initialUsers} />
      <InviteHistory invites={invites} />
    </>
  );
}
