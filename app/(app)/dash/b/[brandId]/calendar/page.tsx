import { BestTimes } from "@/features/calendar/components/BestTimes";
import { CalendarToolbar } from "@/features/calendar/components/CalendarToolbar";
import { MonthGrid } from "@/features/calendar/components/MonthGrid";
import { MONTH_LABEL } from "@/features/calendar/lib/calendar-data";
import { StudioSwitcher } from "@/features/dashboard/components/StudioSwitcher";

const LEGEND = [
  { label: "X / Twitter", color: "#1A1A1A" },
  { label: "LinkedIn", color: "#0A66C2" },
  { label: "Instagram", color: "#E1306C" },
  { label: "Facebook", color: "#1877F2" },
  { label: "TikTok", color: "#25F4EE" },
  { label: "Draft", color: "#B69C5C" },
];

export default function CalendarPage() {
  return (
    <>
      <div className="app-page-head">
        <div>
          <span className="crumbs">Studios / Lumen Botanicals / Calendar</span>
          <h1>
            Plan it <em>once</em>.
          </h1>
        </div>
        <div className="flex gap-8" style={{ flexWrap: "wrap" }}>
          <button type="button" className="btn btn-sm btn-ghost">
            Paste a post
          </button>
          <button type="button" className="btn btn-sm btn-primary btn-arrow">
            New post
          </button>
        </div>
      </div>

      <div className="mt-24">
        <StudioSwitcher />
      </div>

      <CalendarToolbar month={MONTH_LABEL} />

      <div className="flex gap-16 mb-16" style={{ flexWrap: "wrap", padding: "0 4px" }}>
        {LEGEND.map((l) => (
          <span
            key={l.label}
            className="caption mono"
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <span className="pf-dot" style={{ background: l.color }} />
            {l.label}
          </span>
        ))}
      </div>

      <MonthGrid />

      <BestTimes />
    </>
  );
}
