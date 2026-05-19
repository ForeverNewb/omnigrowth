"use client";

import { useState } from "react";

const VIEWS = ["Month", "Week", "Day"] as const;

export function CalendarToolbar({ month }: { month: string }) {
  const [view, setView] = useState<(typeof VIEWS)[number]>("Month");

  return (
    <div className="cal-toolbar">
      <div className="cal-nav">
        <button type="button" className="btn btn-sm btn-ghost" aria-label="Previous month">
          ‹
        </button>
        <h2 className="cal-month">{month}</h2>
        <button type="button" className="btn btn-sm btn-ghost" aria-label="Next month">
          ›
        </button>
        <button type="button" className="btn btn-sm btn-ghost">
          Today
        </button>
      </div>
      <div className="seg">
        {VIEWS.map((v) => (
          <button
            type="button"
            key={v}
            className={view === v ? "on" : ""}
            onClick={() => setView(v)}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}
