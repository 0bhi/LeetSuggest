"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CircleAlert, Download, LoaderCircle, RefreshCw, Trash } from "lucide-react";
import {
  exportDataAction,
  resetEverythingAction,
  resetProgressAction,
} from "@/app/actions";

export function DangerZone() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function reset(action: () => Promise<{ ok: boolean; error?: string; message?: string }>, confirmation: string) {
    if (!window.confirm(confirmation)) return;
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error ?? "Something went wrong.");
        return;
      }
      setMessage(result.message ?? "Done.");
      router.refresh();
    });
  }

  function download() {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await exportDataAction();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const blob = new Blob([result.json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = result.filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setMessage("Export downloaded.");
    });
  }

  return (
    <section className="card-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Your data</p>
          <h2 className="mt-1 font-serif text-2xl leading-none">Data &amp; reset</h2>
        </div>
        <span className="pill bg-paper-deep text-muted">Account</span>
      </div>

      <div className="mt-4 divide-y divide-line/70">
        <div className="flex items-start justify-between gap-3 py-3 first:pt-0">
          <div>
            <p className="text-xs font-semibold text-ink">Export everything</p>
            <p className="mt-0.5 text-[10px] leading-relaxed text-muted">
              Settings, cards, reviews, and plan history as JSON.
            </p>
          </div>
          <button
            type="button"
            onClick={download}
            disabled={pending}
            className="btn btn-ghost shrink-0 px-2.5 py-1.5 text-[10px]"
          >
            {pending ? <LoaderCircle className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
            Export
          </button>
        </div>

        <div className="flex items-start justify-between gap-3 py-3">
          <div>
            <p className="text-xs font-semibold text-ink">Reset progress</p>
            <p className="mt-0.5 text-[10px] leading-relaxed text-muted">
              Clears cards, reviews, and plans. Keeps your settings.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              reset(resetProgressAction, "Reset all progress? Your settings will be kept.")
            }
            disabled={pending}
            className="btn btn-ghost shrink-0 px-2.5 py-1.5 text-[10px]"
          >
            <RefreshCw className="h-3 w-3" /> Reset
          </button>
        </div>

        <div className="flex items-start justify-between gap-3 pt-3">
          <div>
            <p className="text-xs font-semibold text-coral">Reset everything</p>
            <p className="mt-0.5 text-[10px] leading-relaxed text-muted">
              Deletes all your progress and returns to onboarding.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              reset(
                resetEverythingAction,
                "Delete everything and start over? This cannot be undone."
              )
            }
            disabled={pending}
            className="btn shrink-0 bg-coral-soft px-2.5 py-1.5 text-[10px] text-coral hover:bg-coral hover:text-paper"
          >
            <Trash className="h-3 w-3" /> Delete
          </button>
        </div>
      </div>

      {message ? (
        <p className="mt-3 rounded-xl bg-lime-soft px-3 py-2 text-[11px] font-medium text-lime-deep" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="mt-3 flex items-start gap-1.5 rounded-xl bg-coral-soft px-3 py-2 text-[11px] font-medium text-coral" role="alert">
          <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {error}
        </p>
      ) : null}
    </section>
  );
}
