"use client";

import { useState } from "react";
import { Trash2, Users } from "lucide-react";
import { Avatar } from "./Avatar";
import { Spinner } from "./Spinner";
import { ConfirmDialog } from "./ConfirmDialog";
import { useToast } from "./Toast";

export type BoardMemberRole = "READ_ONLY" | "CAN_EDIT";

type UserSummary = { id: string; name: string | null; email: string | null; image: string | null };
export type BoardMemberT = { role: BoardMemberRole; user: UserSummary };

export function InviteMembersPanel({
  boardId,
  owner,
  members,
  canManageMembers,
  onInvited,
  onRemoved,
  onRoleChanged,
}: {
  boardId: string;
  owner: UserSummary | null;
  members: BoardMemberT[];
  canManageMembers: boolean;
  onInvited: (member: BoardMemberT) => void;
  onRemoved: (userId: string) => void;
  onRoleChanged: (userId: string, role: BoardMemberRole) => void;
}) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<UserSummary[] | null>(null);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState<BoardMemberRole>("READ_ONLY");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pendingRoleUserId, setPendingRoleUserId] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<BoardMemberT | null>(null);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const changeRole = async (userId: string, role: BoardMemberRole) => {
    setPendingRoleUserId(userId);
    try {
      const res = await fetch(`/api/boards/${boardId}/members/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        onRoleChanged(userId, role);
        toast.success("Role updated.");
      } else {
        toast.error(data?.error ?? "Couldn't update the role.");
      }
    } finally {
      setPendingRoleUserId(null);
    }
  };

  const confirmRemove = async () => {
    if (!removeTarget) return;
    setRemoving(true);
    setRemoveError(null);
    try {
      const res = await fetch(`/api/boards/${boardId}/members/${removeTarget.user.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        onRemoved(removeTarget.user.id);
        setRemoveTarget(null);
      } else {
        const data = await res.json().catch(() => null);
        setRemoveError(data?.error ?? "Couldn't remove this member.");
      }
    } finally {
      setRemoving(false);
    }
  };

  const toggleOpen = () => {
    setOpen((v) => !v);
    setError(null);
    if (users === null) {
      fetch("/api/users")
        .then((res) => res.json())
        .then((data) => setUsers(Array.isArray(data) ? data : []))
        .catch(() => setUsers([]));
    }
  };

  const memberIds = new Set(members.map((m) => m.user.id));
  const invitable = (users ?? []).filter((u) => u.id !== owner?.id && !memberIds.has(u.id));
  const selectedUser = invitable.find((u) => u.id === selectedUserId) ?? null;

  const submitInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/boards/${boardId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUserId, role: selectedRole }),
      });
      const data = await res.json();
      if (res.ok) {
        onInvited(data);
        setSelectedUserId("");
        setSelectedRole("READ_ONLY");
        toast.success("Invite sent.");
      } else {
        setError(data?.error ?? "Couldn't send the invite.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggleOpen}
        className="glass-field flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-zinc-600 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-glow dark:text-zinc-300"
      >
        <Users size={13} />
        Members
        <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
          {members.length + (owner ? 1 : 0)}
        </span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="glass-strong absolute right-0 z-20 mt-1 w-72 max-w-[calc(100vw-2rem)] rounded-lg p-1">
            <div className="max-h-56 overflow-y-auto p-1">
              {owner && (
                <div className="flex items-center gap-2 rounded px-2 py-1.5">
                  <Avatar label={owner.name ?? owner.email ?? "?"} image={owner.image} size="sm" />
                  <p className="min-w-0 flex-1 truncate text-xs font-medium text-zinc-950 dark:text-zinc-50">
                    {owner.name ?? owner.email}
                  </p>
                  <span className="shrink-0 rounded-full bg-accent/10 px-1.5 py-0.5 text-[10px] font-medium text-accent dark:bg-accent/20">
                    Owner
                  </span>
                </div>
              )}
              {members.map((m) => (
                <div key={m.user.id} className="flex items-center gap-2 rounded px-2 py-1.5">
                  <Avatar label={m.user.name ?? m.user.email ?? "?"} image={m.user.image} size="sm" />
                  <p className="min-w-0 flex-1 truncate text-xs font-medium text-zinc-950 dark:text-zinc-50">
                    {m.user.name ?? m.user.email}
                  </p>
                  {canManageMembers ? (
                    <>
                      <select
                        value={m.role}
                        disabled={pendingRoleUserId === m.user.id}
                        onChange={(e) => changeRole(m.user.id, e.target.value as BoardMemberRole)}
                        className="shrink-0 rounded border border-zinc-200 bg-transparent px-1 py-0.5 text-[10px] font-medium text-zinc-500 focus:outline-none focus:ring-1 focus:ring-accent/50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-400"
                      >
                        <option value="READ_ONLY">Read only</option>
                        <option value="CAN_EDIT">Can edit</option>
                      </select>
                      {pendingRoleUserId === m.user.id && <Spinner size={11} />}
                      <button
                        type="button"
                        onClick={() => {
                          setRemoveError(null);
                          setRemoveTarget(m);
                        }}
                        className="shrink-0 rounded p-1 text-zinc-300 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                        aria-label={`Remove ${m.user.name ?? m.user.email}`}
                      >
                        <Trash2 size={12} />
                      </button>
                    </>
                  ) : (
                    <span className="shrink-0 rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                      {m.role === "CAN_EDIT" ? "Can edit" : "Read only"}
                    </span>
                  )}
                </div>
              ))}
              {members.length === 0 && !owner && (
                <p className="px-2 py-2 text-xs text-zinc-400">No members yet.</p>
              )}
            </div>

            {canManageMembers && (
              <div className="mt-1 border-t border-zinc-100 p-1.5 dark:border-zinc-800">
                <form onSubmit={submitInvite} className="flex flex-col gap-1.5">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setPickerOpen((v) => !v)}
                      className="glass-field flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-xs text-zinc-950 focus:outline-none focus:ring-2 focus:ring-accent/40 dark:text-zinc-50"
                    >
                      {selectedUser ? (
                        <>
                          <Avatar
                            label={selectedUser.name ?? selectedUser.email ?? "?"}
                            image={selectedUser.image}
                            size="xs"
                          />
                          <span className="flex-1 truncate">{selectedUser.name ?? selectedUser.email}</span>
                        </>
                      ) : (
                        <span className="flex-1 truncate text-zinc-400">
                          {users === null ? "Loading people…" : "Invite someone…"}
                        </span>
                      )}
                    </button>

                    {pickerOpen && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setPickerOpen(false)} />
                        <div className="glass-strong absolute left-0 z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-md p-1">
                          {invitable.length === 0 && (
                            <p className="px-2 py-2 text-xs text-zinc-400">No one left to invite.</p>
                          )}
                          {invitable.map((u) => (
                            <button
                              key={u.id}
                              type="button"
                              onClick={() => {
                                setSelectedUserId(u.id);
                                setPickerOpen(false);
                              }}
                              className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                                u.id === selectedUserId
                                  ? "bg-zinc-100 font-medium text-zinc-950 dark:bg-zinc-800 dark:text-zinc-50"
                                  : "text-zinc-700 dark:text-zinc-300"
                              }`}
                            >
                              <Avatar label={u.name ?? u.email ?? "?"} image={u.image} size="xs" />
                              <span className="flex-1 truncate">{u.name ?? u.email}</span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  <div className="flex gap-1.5">
                    <select
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value as BoardMemberRole)}
                      className="glass-field flex-1 rounded px-2 py-1 text-xs text-zinc-950 focus:outline-none focus:ring-2 focus:ring-accent/40 dark:text-zinc-50"
                    >
                      <option value="READ_ONLY">Read only</option>
                      <option value="CAN_EDIT">Can edit</option>
                    </select>
                    <button
                      type="submit"
                      disabled={!selectedUserId || submitting}
                      className="flex items-center gap-1 rounded bg-accent px-2 py-1 text-xs font-medium text-accent-foreground hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {submitting && <Spinner size={11} />}
                      Invite
                    </button>
                  </div>
                  {error && <p className="text-[11px] text-red-500">{error}</p>}
                </form>
              </div>
            )}
          </div>
        </>
      )}

      <ConfirmDialog
        open={removeTarget !== null}
        title={`Remove ${removeTarget?.user.name ?? removeTarget?.user.email ?? "this member"}?`}
        description="They'll lose access to this board immediately."
        confirmLabel="Remove"
        pendingLabel="Removing…"
        pending={removing}
        error={removeError}
        onConfirm={confirmRemove}
        onCancel={() => {
          if (!removing) setRemoveTarget(null);
        }}
      />
    </div>
  );
}
