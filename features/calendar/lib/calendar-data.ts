// Mock calendar data for v1. Real data lands when wiring Convex.

export type Platform = "x" | "li" | "ig" | "fb" | "tt" | "yt" | "th" | "pi" | "draft";

export type CalendarEvent = {
  id: string;
  platform: Platform;
  title: string;
  time: string;
};

const TODAY = new Date(2026, 4, 3); // 2026-05-03 — anchor matches design context.

const SEED: Record<number, CalendarEvent[]> = {
  1: [
    { id: "e1", platform: "li", title: "Brand voice launch", time: "09:00" },
    { id: "e2", platform: "x", title: "Tease release", time: "11:30" },
  ],
  3: [
    { id: "e3", platform: "li", title: "Product Hunt live", time: "06:00" },
    { id: "e4", platform: "x", title: "Launch thread", time: "08:00" },
    { id: "e5", platform: "ig", title: "Behind the scenes", time: "13:00" },
    { id: "e6", platform: "draft", title: "FB recap copy", time: "—" },
  ],
  5: [
    { id: "e7", platform: "tt", title: "How drafts arrive", time: "10:00" },
    { id: "e8", platform: "fb", title: "Customer story · Northpine", time: "16:00" },
  ],
  7: [
    { id: "e9", platform: "li", title: "Webinar promo", time: "10:00" },
    { id: "e10", platform: "x", title: "Sign-up nudge", time: "14:30" },
  ],
  9: [{ id: "e11", platform: "ig", title: "Carousel · 4 slides", time: "12:00" }],
  12: [
    { id: "e12", platform: "li", title: "Product update", time: "10:00" },
    { id: "e13", platform: "draft", title: "Q&A draft", time: "—" },
  ],
  14: [{ id: "e14", platform: "tt", title: "Reels concept", time: "17:00" }],
  17: [
    { id: "e15", platform: "x", title: "Tweet thread", time: "09:00" },
    { id: "e16", platform: "li", title: "Founder note", time: "11:00" },
    { id: "e17", platform: "ig", title: "Launch carousel", time: "16:00" },
  ],
  21: [
    { id: "e18", platform: "li", title: "Recap of week", time: "10:00" },
    { id: "e19", platform: "fb", title: "Cross-post", time: "14:00" },
  ],
  24: [
    { id: "e20", platform: "ig", title: "Customer love", time: "12:30" },
    { id: "e21", platform: "draft", title: "TikTok concept", time: "—" },
  ],
  28: [{ id: "e22", platform: "li", title: "Next sprint plan", time: "10:00" }],
};

export function getMonthGrid(): Array<{
  date: number;
  inMonth: boolean;
  isToday: boolean;
  events: CalendarEvent[];
}> {
  const year = TODAY.getFullYear();
  const month = TODAY.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const startWeekday = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();

  const cells: Array<{
    date: number;
    inMonth: boolean;
    isToday: boolean;
    events: CalendarEvent[];
  }> = [];

  for (let i = startWeekday - 1; i >= 0; i--) {
    cells.push({
      date: daysInPrev - i,
      inMonth: false,
      isToday: false,
      events: [],
    });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      date: d,
      inMonth: true,
      isToday: d === TODAY.getDate(),
      events: SEED[d] ?? [],
    });
  }
  while (cells.length % 7 !== 0 || cells.length < 42) {
    const next = cells.length - (startWeekday + daysInMonth) + 1;
    cells.push({
      date: next,
      inMonth: false,
      isToday: false,
      events: [],
    });
    if (cells.length >= 42) break;
  }
  return cells;
}

export const MONTH_LABEL = "May 2026";
export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const BEST_TIMES = [
  { day: "Mon", time: "09:30", platform: "LinkedIn", color: "#0A66C2", hot: false },
  { day: "Tue", time: "10:00", platform: "LinkedIn", color: "#0A66C2", hot: true },
  { day: "Wed", time: "08:30", platform: "X", color: "#1A1A1A", hot: false },
  { day: "Thu", time: "12:30", platform: "Instagram", color: "#E1306C", hot: false },
  { day: "Fri", time: "14:00", platform: "Facebook", color: "#1877F2", hot: false },
  { day: "Sat", time: "11:00", platform: "TikTok", color: "#25F4EE", hot: false },
  { day: "Sun", time: "19:00", platform: "Threads", color: "#101010", hot: false },
];
