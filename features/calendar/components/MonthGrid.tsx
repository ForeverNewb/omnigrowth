import { type CalendarEvent, WEEKDAYS, getMonthGrid } from "@/features/calendar/lib/calendar-data";

function eventClass(platform: CalendarEvent["platform"]): string {
  return `cal-event ${platform}`;
}

export function MonthGrid() {
  const cells = getMonthGrid();

  return (
    <div className="cal-grid">
      {WEEKDAYS.map((d) => (
        <div key={d} className="cal-head">
          {d}
        </div>
      ))}
      {cells.map((cell, i) => (
        <div
          key={i}
          className={`cal-cell ${cell.inMonth ? "" : "muted"} ${cell.isToday ? "today" : ""}`}
        >
          <div className="day">
            <span>{cell.date}</span>
            {cell.events.length > 0 && <span className="count">{cell.events.length}</span>}
          </div>
          <div className="events">
            {cell.events.slice(0, 3).map((event) => (
              <button key={event.id} type="button" className={eventClass(event.platform)}>
                {event.time !== "—" && (
                  <span style={{ opacity: 0.85, marginRight: 4 }}>{event.time}</span>
                )}
                {event.title}
              </button>
            ))}
            {cell.events.length > 3 && (
              <button type="button" className="cal-event draft">
                + {cell.events.length - 3} more
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
