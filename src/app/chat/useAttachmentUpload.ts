"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

export type PendingAttachment = {
  tempId: string;
  file: File;
};

export type AttachmentPayload = {
  key: string;
  fileName: string;
  fileType: string;
  fileSize: number;
};

const MAX_FILE_SIZE = 25 * 1024 * 1024;

export function useAttachmentUpload(channelId: string) {
  const t = useTranslations("Chat.upload");
  const [pending, setPending] = useState<PendingAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addFiles = (files: FileList | File[]) => {
    setError(null);
    const accepted: PendingAttachment[] = [];
    for (const file of Array.from(files)) {
      if (file.size > MAX_FILE_SIZE) {
        setError(t("tooBig", { fileName: file.name, maxMb: MAX_FILE_SIZE / (1024 * 1024) }));
        continue;
      }
      accepted.push({ tempId: crypto.randomUUID(), file });
    }
    setPending((prev) => [...prev, ...accepted]);
  };

  const removeFile = (tempId: string) => {
    setPending((prev) => prev.filter((p) => p.tempId !== tempId));
  };

  const uploadAll = async (): Promise<AttachmentPayload[]> => {
    if (pending.length === 0) return [];
    setUploading(true);
    setError(null);
    try {
      const results: AttachmentPayload[] = [];
      for (const { file } of pending) {
        const fileType = file.type || "application/octet-stream";

        const presignRes = await fetch(`/api/channels/${channelId}/attachments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fileName: file.name, fileType, fileSize: file.size }),
        });
        if (!presignRes.ok) throw new Error(t("prepareFailed"));
        const { key, uploadUrl } = await presignRes.json();

        const putRes = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": fileType },
          body: file,
        });
        if (!putRes.ok) throw new Error(t("uploadFailed"));

        results.push({ key, fileName: file.name, fileType, fileSize: file.size });
      }
      setPending([]);
      return results;
    } catch (err) {
      setError(err instanceof Error ? err.message : t("genericFailed"));
      throw err;
    } finally {
      setUploading(false);
    }
  };

  return { pending, uploading, error, addFiles, removeFile, uploadAll };
}
