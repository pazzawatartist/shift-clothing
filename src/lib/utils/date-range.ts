export type RangePreset = "today" | "week" | "month" | "year" | "custom";

export function getDateRangeFromPreset(preset: RangePreset, from?: string, to?: string) {
  const now = new Date();
  const toDate = (d: Date) => d.toISOString().slice(0, 10);

  if (preset === "custom" && from && to) return { from, to };

  const end = toDate(now);
  switch (preset) {
    case "today":
      return { from: end, to: end };
    case "week": {
      const start = new Date(now);
      start.setDate(start.getDate() - 6);
      return { from: toDate(start), to: end };
    }
    case "year": {
      const start = new Date(now.getFullYear(), 0, 1);
      return { from: toDate(start), to: end };
    }
    case "month":
    default: {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: toDate(start), to: end };
    }
  }
}
