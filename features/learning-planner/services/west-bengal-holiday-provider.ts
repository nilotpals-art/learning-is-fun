import type { ProviderHoliday } from "@/features/learning-planner/services/india-holiday-provider-core";

export const WEST_BENGAL_HOLIDAY_PROVIDER = "SIMPLIANCE_WEST_BENGAL";

const WEST_BENGAL_2026: Array<[string, string]> = [
  ["2026-01-01", "NEW YEAR'S DAY"],
  ["2026-01-12", "BIRTHDAY OF SWAMI VIVEKANANDA"],
  ["2026-01-23", "NETAJI'S BIRTHDAY"],
  ["2026-01-23", "SARASWATI PUJA [SREE PANCHAMI]"],
  ["2026-01-26", "REPUBLIC DAY"],
  ["2026-03-03", "DOLJATRA"],
  ["2026-03-21", "EID-UL-FITR"],
  ["2026-03-26", "RAM NAVAMI"],
  ["2026-03-31", "MAHAVIR JAYANTI"],
  ["2026-04-01", "YEARLY CLOSING OF BANK ACCOUNT"],
  ["2026-04-03", "GOOD FRIDAY"],
  ["2026-04-14", "BIRTHDAY OF DR. B. R. AMBEDKAR"],
  ["2026-04-15", "BENGALI NEW YEAR'S DAY (NABABARSHA)"],
  ["2026-05-01", "BUDDHA PURNIMA"],
  ["2026-05-01", "MAY DAY"],
  ["2026-05-09", "BIRTHDAY OF RABINDRANATH TAGORE"],
  ["2026-05-27", "ID-UD-ZOHA (BAKRID)"],
  ["2026-06-26", "MUHARRAM"],
  ["2026-08-15", "INDEPENDENCE DAY"],
  ["2026-09-04", "JANMASTAMI"],
  ["2026-10-02", "BIRTHDAY OF GANDHIJI"],
  ["2026-10-10", "MAHALAYA"],
  ["2026-10-19", "DURGA PUJA, MAHA ASTAMI"],
  ["2026-10-20", "DURGA PUJA, MAHA NABAMI"],
  ["2026-10-21", "DURGA PUJA, DASAMI"],
  ["2026-11-11", "BHRATRIDWITIYA"],
  ["2026-11-24", "BIRTHDAY OF GURU NANAK"],
  ["2026-12-25", "CHRISTMAS DAY"],
];

export function getWestBengalHolidays(year: number): ProviderHoliday[] | null {
  if (year !== 2026) return null;

  return WEST_BENGAL_2026.map(([date, name]) => ({
    externalId: `${date}:state:IN-WB:${name}`,
    provider: WEST_BENGAL_HOLIDAY_PROVIDER,
    name,
    date,
    scope: "state",
    subdivisionCode: "IN-WB",
  }));
}
