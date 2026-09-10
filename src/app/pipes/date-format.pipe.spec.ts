import { describe, it } from 'node:test';
import assert from 'node:assert';
import { DateFormatPipe, formatDutyDate } from './date-format.pipe';

describe('DateFormatPipe and formatDutyDate', () => {
  const pipe = new DateFormatPipe();

  it('should return empty string for null, undefined or empty input', () => {
    assert.strictEqual(pipe.transform(''), '');
    assert.strictEqual(pipe.transform(null), '');
    assert.strictEqual(pipe.transform(undefined), '');
  });

  it('should format ISO YYYY-MM-DD into Spanish human readable date', () => {
    const formatted = formatDutyDate('2026-09-10');
    // Expect day 10, sep or sept, 2026
    assert.ok(formatted.includes('10'));
    assert.ok(formatted.includes('2026'));
  });
});
