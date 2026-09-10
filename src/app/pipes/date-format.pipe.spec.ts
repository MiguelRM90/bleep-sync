import { describe, it } from 'node:test';
import assert from 'node:assert';
import { DateFormatPipe, formatDutyDate, normalizeDateToIso } from './date-format.pipe';

describe('DateFormatPipe and formatDutyDate', () => {
  const pipe = new DateFormatPipe();

  it('should return empty string for null, undefined or empty input', () => {
    assert.strictEqual(pipe.transform(''), '');
    assert.strictEqual(pipe.transform(null), '');
    assert.strictEqual(pipe.transform(undefined), '');
  });

  it('should format ISO YYYY-MM-DD into Spanish human readable date', () => {
    const formatted = formatDutyDate('2026-09-10');
    assert.ok(formatted.includes('10'));
    assert.ok(formatted.includes('2026'));
  });

  it('should handle Google Sheets serial dates (e.g. 46275) without throwing Invalid Date', () => {
    const iso = normalizeDateToIso(46275);
    assert.strictEqual(iso, '2026-09-10');

    const formatted = formatDutyDate(46275);
    assert.ok(!formatted.includes('Invalid Date'));
    assert.ok(formatted.includes('10'));
    assert.ok(formatted.includes('2026'));
  });

  it('should handle ISO timestamp strings (e.g. 2026-09-10T14:30:00.000Z)', () => {
    const iso = normalizeDateToIso('2026-09-10T14:30:00.000Z');
    assert.strictEqual(iso, '2026-09-10');

    const formatted = formatDutyDate('2026-09-10T14:30:00.000Z');
    assert.ok(!formatted.includes('Invalid Date'));
    assert.ok(formatted.includes('10'));
  });
});
