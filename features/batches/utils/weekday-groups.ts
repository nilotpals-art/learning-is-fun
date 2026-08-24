export const WEEKDAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

export interface WeekdayBatchOption {
  id: string;
  label: string;
  weekdays?: number[] | null;
}

export interface WeekdayBatchGroup<T> {
  key: string;
  label: string;
  weekdays: number[];
  items: T[];
}

export function normalizeWeekdays(days: number[] | null | undefined): number[] {
  return [...new Set((days ?? []).filter((day) => Number.isInteger(day) && day >= 1 && day <= 7))].sort((a, b) => a - b);
}

export function weekdayGroupLabel(days: number[] | null | undefined): string {
  const normalized = normalizeWeekdays(days);
  if (!normalized.length) return "Schedule not assigned";
  return normalized.map((day) => WEEKDAY_NAMES[day - 1]).join(" & ");
}

export function groupBatchesByWeekdays<T extends { weekdays?: number[] | null }>(items: T[]): WeekdayBatchGroup<T>[] {
  const groups = new Map<string, WeekdayBatchGroup<T>>();

  for (const item of items) {
    const weekdays = normalizeWeekdays(item.weekdays);

    if (!weekdays.length) {
      const current = groups.get("unscheduled") ?? {
        key: "unscheduled",
        label: "Schedule not assigned",
        weekdays: [],
        items: [],
      };
      current.items.push(item);
      groups.set("unscheduled", current);
      continue;
    }

    for (const day of weekdays) {
      const key = String(day);
      const current = groups.get(key) ?? {
        key,
        label: WEEKDAY_NAMES[day - 1],
        weekdays: [day],
        items: [],
      };
      current.items.push(item);
      groups.set(key, current);
    }
  }

  return [...groups.values()].sort((a, b) => {
    if (!a.weekdays.length) return 1;
    if (!b.weekdays.length) return -1;
    return a.weekdays[0] - b.weekdays[0];
  });
}
