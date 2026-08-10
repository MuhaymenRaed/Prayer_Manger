import { Lang } from "../translations";

/**
 * Short, human relative time for the tracker's "last updated" hint —
 * e.g. "just now" / "منذ ٣ أيام". Falls back to a date once it is old
 * enough that a day count stops being useful.
 */
export function formatRelativeTime(
  timestamp: number | undefined,
  lang: Lang,
): string | null {
  if (!timestamp || timestamp <= 0) return null;

  const diffMs = Date.now() - timestamp;
  if (diffMs < 0) return null;

  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (lang === "ar") {
    if (minutes < 1) return "الآن";
    if (minutes < 60) return minutes === 1 ? "قبل دقيقة" : `قبل ${minutes} دقيقة`;
    if (hours < 24) return hours === 1 ? "قبل ساعة" : `قبل ${hours} ساعات`;
    if (days === 1) return "أمس";
    if (days < 30) return `قبل ${days} أيام`;
    return new Date(timestamp).toLocaleDateString("ar");
  }

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  return new Date(timestamp).toLocaleDateString("en-US");
}
