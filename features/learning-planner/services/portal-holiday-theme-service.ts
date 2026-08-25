import "server-only";

import type { AuthProfile } from "@/features/auth/types/auth";
import { getHolidayCalendar } from "@/features/learning-planner/services/holiday-service";

export interface PortalHolidayTheme {
  id: string;
  holidayName: string;
  greeting: string;
  emoji: string;
  shellClassName: string;
  bannerClassName: string;
  badgeClassName: string;
}

interface ThemePreset {
  id: string;
  keywords: string[];
  greeting: string;
  emoji: string;
  shellClassName: string;
  bannerClassName: string;
  badgeClassName: string;
}

const THEME_PRESETS: ThemePreset[] = [
  {
    id: "diwali",
    keywords: ["diwali", "deepavali", "deepawali"],
    greeting: "Wishing you light, learning and joy",
    emoji: "🪔",
    shellClassName: "bg-[radial-gradient(circle_at_top_right,_#fde68a_0,_transparent_27%),radial-gradient(circle_at_top_left,_#fed7aa_0,_transparent_31%),linear-gradient(to_bottom_right,_#fff7ed,_#fffbeb_48%,_#fef3c7)]",
    bannerClassName: "border-amber-200 bg-gradient-to-r from-amber-50 via-orange-50 to-yellow-50 text-amber-950",
    badgeClassName: "bg-amber-100 text-amber-900",
  },
  {
    id: "holi",
    keywords: ["holi", "dol jatra", "dol purnima"],
    greeting: "May your day be full of colour and curiosity",
    emoji: "🎨",
    shellClassName: "bg-[radial-gradient(circle_at_top_right,_#fbcfe8_0,_transparent_25%),radial-gradient(circle_at_top_left,_#bfdbfe_0,_transparent_27%),radial-gradient(circle_at_bottom_left,_#bbf7d0_0,_transparent_25%),linear-gradient(to_bottom_right,_#fdf4ff,_#eff6ff_50%,_#f0fdf4)]",
    bannerClassName: "border-fuchsia-200 bg-gradient-to-r from-pink-50 via-blue-50 to-emerald-50 text-slate-900",
    badgeClassName: "bg-fuchsia-100 text-fuchsia-900",
  },
  {
    id: "durga-puja",
    keywords: ["durga puja", "dussehra", "dasara", "vijaya dashami", "vijayadashami", "navratri"],
    greeting: "Celebrating strength, wisdom and new beginnings",
    emoji: "🌺",
    shellClassName: "bg-[radial-gradient(circle_at_top_right,_#fecaca_0,_transparent_27%),radial-gradient(circle_at_top_left,_#fde68a_0,_transparent_30%),linear-gradient(to_bottom_right,_#fff7ed,_#fef2f2_50%,_#fffbeb)]",
    bannerClassName: "border-red-200 bg-gradient-to-r from-red-50 via-orange-50 to-amber-50 text-red-950",
    badgeClassName: "bg-red-100 text-red-900",
  },
  {
    id: "eid",
    keywords: ["eid", "id-ul", "id ul", "ramzan", "ramadan", "bakrid"],
    greeting: "Wishing you peace, kindness and shared happiness",
    emoji: "🌙",
    shellClassName: "bg-[radial-gradient(circle_at_top_right,_#a7f3d0_0,_transparent_28%),radial-gradient(circle_at_top_left,_#d1fae5_0,_transparent_28%),linear-gradient(to_bottom_right,_#f0fdf4,_#ecfdf5_52%,_#f8fafc)]",
    bannerClassName: "border-emerald-200 bg-gradient-to-r from-emerald-50 via-teal-50 to-green-50 text-emerald-950",
    badgeClassName: "bg-emerald-100 text-emerald-900",
  },
  {
    id: "christmas",
    keywords: ["christmas"],
    greeting: "Wishing you warmth, wonder and cheerful learning",
    emoji: "🎄",
    shellClassName: "bg-[radial-gradient(circle_at_top_right,_#fecaca_0,_transparent_27%),radial-gradient(circle_at_top_left,_#bbf7d0_0,_transparent_29%),linear-gradient(to_bottom_right,_#f0fdf4,_#fef2f2_52%,_#ffffff)]",
    bannerClassName: "border-green-200 bg-gradient-to-r from-green-50 via-white to-red-50 text-slate-900",
    badgeClassName: "bg-green-100 text-green-900",
  },
  {
    id: "independence-day",
    keywords: ["independence day"],
    greeting: "Celebrating freedom, responsibility and the joy of learning",
    emoji: "🇮🇳",
    shellClassName: "bg-[radial-gradient(circle_at_top_right,_#fed7aa_0,_transparent_26%),radial-gradient(circle_at_top_left,_#dcfce7_0,_transparent_30%),linear-gradient(to_bottom_right,_#fff7ed,_#ffffff_48%,_#f0fdf4)]",
    bannerClassName: "border-orange-200 bg-gradient-to-r from-orange-50 via-white to-green-50 text-slate-900",
    badgeClassName: "bg-orange-100 text-orange-900",
  },
  {
    id: "republic-day",
    keywords: ["republic day"],
    greeting: "Celebrating our Constitution, our country and our future",
    emoji: "🇮🇳",
    shellClassName: "bg-[radial-gradient(circle_at_top_right,_#fed7aa_0,_transparent_26%),radial-gradient(circle_at_top_left,_#dbeafe_0,_transparent_27%),radial-gradient(circle_at_bottom_left,_#dcfce7_0,_transparent_25%),linear-gradient(to_bottom_right,_#fff7ed,_#ffffff_50%,_#f0fdf4)]",
    bannerClassName: "border-blue-200 bg-gradient-to-r from-orange-50 via-white to-green-50 text-slate-900",
    badgeClassName: "bg-blue-100 text-blue-900",
  },
  {
    id: "gandhi-jayanti",
    keywords: ["gandhi jayanti", "mahatma gandhi"],
    greeting: "Remembering truth, peace and the courage to do what is right",
    emoji: "🕊️",
    shellClassName: "bg-[radial-gradient(circle_at_top_right,_#e2e8f0_0,_transparent_28%),linear-gradient(to_bottom_right,_#ffffff,_#f8fafc_50%,_#f1f5f9)]",
    bannerClassName: "border-slate-200 bg-gradient-to-r from-white via-slate-50 to-stone-50 text-slate-900",
    badgeClassName: "bg-slate-100 text-slate-800",
  },
  {
    id: "janmashtami",
    keywords: ["janmashtami", "krishna jayanti"],
    greeting: "Wishing you joy, wisdom and a playful spirit of discovery",
    emoji: "🪈",
    shellClassName: "bg-[radial-gradient(circle_at_top_right,_#bfdbfe_0,_transparent_27%),radial-gradient(circle_at_top_left,_#fde68a_0,_transparent_28%),linear-gradient(to_bottom_right,_#eff6ff,_#fffbeb_52%,_#f8fafc)]",
    bannerClassName: "border-blue-200 bg-gradient-to-r from-blue-50 via-yellow-50 to-amber-50 text-slate-900",
    badgeClassName: "bg-blue-100 text-blue-900",
  },
  {
    id: "ganesh-chaturthi",
    keywords: ["ganesh chaturthi", "vinayaka chaturthi"],
    greeting: "Wishing you wisdom, confidence and successful new beginnings",
    emoji: "🌼",
    shellClassName: "bg-[radial-gradient(circle_at_top_right,_#fde68a_0,_transparent_28%),radial-gradient(circle_at_top_left,_#fecaca_0,_transparent_28%),linear-gradient(to_bottom_right,_#fffbeb,_#fff7ed_50%,_#fef2f2)]",
    bannerClassName: "border-amber-200 bg-gradient-to-r from-yellow-50 via-orange-50 to-red-50 text-slate-900",
    badgeClassName: "bg-yellow-100 text-yellow-900",
  },
  {
    id: "onam",
    keywords: ["onam"],
    greeting: "Wishing you abundance, togetherness and joyful learning",
    emoji: "🌸",
    shellClassName: "bg-[radial-gradient(circle_at_top_right,_#fef08a_0,_transparent_27%),radial-gradient(circle_at_top_left,_#bbf7d0_0,_transparent_29%),linear-gradient(to_bottom_right,_#fefce8,_#f0fdf4_52%,_#ffffff)]",
    bannerClassName: "border-lime-200 bg-gradient-to-r from-yellow-50 via-lime-50 to-green-50 text-slate-900",
    badgeClassName: "bg-lime-100 text-lime-900",
  },
  {
    id: "pongal",
    keywords: ["pongal", "makar sankranti", "makara sankranti"],
    greeting: "Celebrating gratitude, harvest and bright new beginnings",
    emoji: "🌾",
    shellClassName: "bg-[radial-gradient(circle_at_top_right,_#fde68a_0,_transparent_27%),radial-gradient(circle_at_top_left,_#bbf7d0_0,_transparent_30%),linear-gradient(to_bottom_right,_#fffbeb,_#f0fdf4_52%,_#fff7ed)]",
    bannerClassName: "border-amber-200 bg-gradient-to-r from-amber-50 via-yellow-50 to-green-50 text-slate-900",
    badgeClassName: "bg-amber-100 text-amber-900",
  },
  {
    id: "generic-holiday",
    keywords: [],
    greeting: "Wishing you a meaningful and joyful holiday",
    emoji: "✨",
    shellClassName: "bg-[radial-gradient(circle_at_top_right,_#ddd6fe_0,_transparent_27%),radial-gradient(circle_at_top_left,_#bae6fd_0,_transparent_29%),linear-gradient(to_bottom_right,_#faf5ff,_#f0f9ff_52%,_#ffffff)]",
    bannerClassName: "border-violet-200 bg-gradient-to-r from-violet-50 via-sky-50 to-white text-slate-900",
    badgeClassName: "bg-violet-100 text-violet-900",
  },
];

function indiaDate(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return `${year}-${month}-${day}`;
}

function pickPreset(name: string): ThemePreset {
  const normalized = name.toLowerCase();
  return THEME_PRESETS.find((preset) => preset.keywords.some((keyword) => normalized.includes(keyword))) ?? THEME_PRESETS[THEME_PRESETS.length - 1];
}

export async function getPortalHolidayTheme(profile: AuthProfile): Promise<PortalHolidayTheme | null> {
  const today = indiaDate();

  try {
    const calendar = await getHolidayCalendar(profile, today, today);
    const holiday = calendar.holidays.find((item) => item.source === "external" || item.observedAsHoliday !== false);
    if (!holiday) return null;

    const preset = pickPreset(holiday.name);
    return {
      id: preset.id,
      holidayName: holiday.name,
      greeting: preset.greeting,
      emoji: preset.emoji,
      shellClassName: preset.shellClassName,
      bannerClassName: preset.bannerClassName,
      badgeClassName: preset.badgeClassName,
    };
  } catch {
    return null;
  }
}
