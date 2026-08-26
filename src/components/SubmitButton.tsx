"use client";

import { useFormStatus } from "react-dom";
import { Spinner } from "./Spinner";

export function SubmitButton({
  children,
  pendingLabel,
  className,
}: {
  children: React.ReactNode;
  pendingLabel?: React.ReactNode;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} className={`${className} disabled:cursor-wait disabled:opacity-70`}>
      {pending ? (
        <span className="flex items-center justify-center gap-2">
          <Spinner size={14} />
          {pendingLabel ?? children}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
