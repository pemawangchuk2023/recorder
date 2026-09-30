const TIME = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
const DAY_THIS_YEAR = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" });
const DAY_OTHER_YEAR = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" });

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

// "Today, 14:05", "Yesterday, 09:30", "12 Sep" or "12 Sep 2025".
export function formatRecordedAt(timestamp: number, now = new Date()): string {
  const date = new Date(timestamp);
  const days = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000);
  if (days === 0) {
    return `Today, ${TIME.format(date)}`;
  }
  if (days === 1) {
    return `Yesterday, ${TIME.format(date)}`;
  }
  return (date.getFullYear() === now.getFullYear() ? DAY_THIS_YEAR : DAY_OTHER_YEAR).format(date);
}
