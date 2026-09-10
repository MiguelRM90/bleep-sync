import { Pipe, PipeTransform } from '@angular/core';

/**
 * Pure function to format ISO date string (YYYY-MM-DD) into readable Spanish format
 */
export function formatDutyDate(isoDate: string): string {
  if (!isoDate) return '';
  try {
    const [y, m, d] = isoDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('es-ES', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return isoDate;
  }
}

@Pipe({
  name: 'formatDutyDate',
  standalone: true,
  pure: true,
})
export class DateFormatPipe implements PipeTransform {
  transform(value: string | undefined | null): string {
    if (!value) return '';
    return formatDutyDate(value);
  }
}

