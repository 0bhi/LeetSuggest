export type ActionResult = {
  ok: boolean;
  error?: string;
  message?: string;
};

export type RateActionResult =
  | { ok: true; pending: boolean; dueAt: string }
  | { ok: false; error: string };

export type ExportActionResult =
  | { ok: true; filename: string; json: string }
  | { ok: false; error: string };

export type AddBacklogResult = { ok: true } | { ok: false; error: string };
