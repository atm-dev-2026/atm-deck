"use client";

import { Download, Paperclip, X } from "lucide-react";
import { ChatAttachment } from "./types";
import { PendingAttachment } from "./useAttachmentUpload";

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentView({ attachment }: { attachment: ChatAttachment }) {
  const url = `/api/attachments/${attachment.id}`;

  if (attachment.fileType.startsWith("image/")) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1 block max-w-xs overflow-hidden rounded-md border border-zinc-200 dark:border-zinc-800"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={attachment.fileName} className="max-h-64 w-auto object-cover" />
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-1 flex max-w-xs items-center gap-2 rounded-md border border-zinc-200 px-2.5 py-2 text-sm hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
    >
      <Paperclip size={14} className="shrink-0 text-zinc-400" />
      <span className="min-w-0 flex-1 truncate">{attachment.fileName}</span>
      <span className="shrink-0 text-xs text-zinc-400">{formatSize(attachment.fileSize)}</span>
      <Download size={12} className="shrink-0 text-zinc-400" />
    </a>
  );
}

export function PendingAttachmentList({
  pending,
  onRemove,
}: {
  pending: PendingAttachment[];
  onRemove: (tempId: string) => void;
}) {
  if (pending.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 border-t border-zinc-200 px-3 pt-2 dark:border-zinc-800">
      {pending.map(({ tempId, file }) => (
        <span
          key={tempId}
          className="flex items-center gap-1.5 rounded-full border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
        >
          <Paperclip size={11} className="shrink-0" />
          <span className="max-w-[10rem] truncate">{file.name}</span>
          <span className="shrink-0 text-zinc-400">{formatSize(file.size)}</span>
          <button
            type="button"
            onClick={() => onRemove(tempId)}
            className="shrink-0 text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-100"
            aria-label={`Remove ${file.name}`}
          >
            <X size={11} />
          </button>
        </span>
      ))}
    </div>
  );
}
