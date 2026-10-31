import { COMPANY_PROBLEMS, SHEET_PROBLEMS } from "@/data/problems";
import { SheetBrowser } from "@/components/sheet-browser";
import { requireUser } from "@/lib/auth";
import { getSettings, getSheetData } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function SheetPage() {
  const user = await requireUser();
  const [{ problems, sheetSlugs, cards }, settings] = await Promise.all([
    getSheetData(user.id),
    getSettings(user.id),
  ]);
  const sheetCompleted = cards.filter((card) => card.source === "sheet").length;
  const extrasAttempted = cards.filter((card) => card.source === "company").length;
  const known = cards.filter((card) => card.known).length;

  return (
    <div className="mx-auto w-full max-w-[1180px]">
      <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Question bank</p>
          <h1 className="mt-2 font-serif text-[clamp(2.8rem,6vw,4.2rem)] leading-[0.92] tracking-tight">
            The sheet, with <span className="italic text-lime-deep">memory</span>.
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
            Every LeetCode problem from Striver&apos;s SDE sheet, plus company extras. Mark what you
            already know; let the planner handle the rest.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:min-w-[330px]">
          <div className="rounded-2xl border border-line bg-surface px-3 py-2.5">
            <p className="text-[9px] font-bold uppercase tracking-[0.13em] text-faint">Sheet</p>
            <p className="mt-1 font-serif text-xl leading-none">
              {sheetCompleted}
              <span className="text-xs text-muted">/{SHEET_PROBLEMS.length}</span>
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-surface px-3 py-2.5">
            <p className="text-[9px] font-bold uppercase tracking-[0.13em] text-faint">Extras</p>
            <p className="mt-1 font-serif text-xl leading-none">
              {extrasAttempted}
              <span className="text-xs text-muted">/{COMPANY_PROBLEMS.length}</span>
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-surface px-3 py-2.5">
            <p className="text-[9px] font-bold uppercase tracking-[0.13em] text-faint">Known</p>
            <p className="mt-1 font-serif text-xl leading-none">{known}</p>
          </div>
        </div>
      </header>

      <div className="mt-7">
        <SheetBrowser
          problems={problems}
          sheetSlugs={sheetSlugs}
          cards={cards}
          timezone={settings.timezone}
        />
      </div>
    </div>
  );
}
