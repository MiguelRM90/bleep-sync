import { Pipe, PipeTransform } from '@angular/core';

/**
 * Normalizes any date representation (ISO YYYY-MM-DD, ISO timestamp, Google Sheets serial number, or Date)
 * into a standardized YYYY-MM-DD string.
 */
export function normalizeDateToIso(dateVal: unknown): string {
  if (!dateVal) return '';

  const str = String(dateVal).trim();

  // 1. Google Sheets / Excel serial number (e.g. 46275)
  if (/^\d{4,6}(\.\d+)?$/.test(str)) {
    const serial = Number(str);
    const d = new Date(Math.round((serial - 25569) * 86400 * 1000));
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  }

  // 2. ISO String or YYYY-MM-DD
  if (str.includes('-')) {
    const datePart = str.split('T')[0];
    const parts = datePart.split('-');
    if (parts.length === 3 && parts[0].length === 4) {
      return datePart;
    }
  }

  // 3. Fallback date parse
  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  } catch {
    // Fallthrough to raw string
  }

  return str;
}

/**
 * Pure function to format any date representation (ISO, timestamp, Google Sheets serial number)
 * into readable Spanish format (e.g. "jue, 10 sept 2026")
 */
export function formatDutyDate(dateVal: unknown): string {
  if (!dateVal) return '';

  const iso = normalizeDateToIso(dateVal);
  try {
    if (iso.includes('-')) {
      const parts = iso.split('-').map(Number);
      if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
        const [y, m, d] = parts;
        const date = new Date(y, m - 1, d);
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString('es-ES', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          });
        }
      }
    }

    const fallback = new Date(iso);
    if (!isNaN(fallback.getTime())) {
      return fallback.toLocaleDateString('es-ES', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    }

    return iso;
  } catch {
    return String(dateVal);
  }
}

@Pipe({
  name: 'formatDutyDate',
  standalone: true,
  pure: true,
})
export class DateFormatPipe implements PipeTransform {
  transform(value: string | number | undefined | null): string {
    return formatDutyDate(value);
  }
}
