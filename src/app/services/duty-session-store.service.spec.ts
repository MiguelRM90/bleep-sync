import { describe, it } from 'node:test';
import assert from 'node:assert';
import { DutySessionStoreService } from './duty-session-store.service';

describe('DutySessionStoreService', () => {
  it('should initialize with empty active colleague, null role, and today date', () => {
    const store = new DutySessionStoreService();
    assert.strictEqual(store.activeColleague(), '');
    assert.strictEqual(store.activeRole(), null);
    assert.strictEqual(store.activeNotes(), '');
    assert.strictEqual(typeof store.activeDate(), 'string');
    assert.ok(store.activeDate().length > 0);
  });

  it('should update active colleague, role, date and notes', () => {
    const store = new DutySessionStoreService();
    store.setActiveColleague('Dr. House');
    store.setActiveRole('Urgencias');
    store.setActiveDate('2026-10-01');
    store.setActiveNotes('Night shift note');

    assert.strictEqual(store.activeColleague(), 'Dr. House');
    assert.strictEqual(store.activeRole(), 'Urgencias');
    assert.strictEqual(store.activeDate(), '2026-10-01');
    assert.strictEqual(store.activeNotes(), 'Night shift note');
  });

  it('should reset state cleanly on reset()', () => {
    const store = new DutySessionStoreService();
    store.setActiveColleague('Dr. Strange');
    store.setActiveRole('Planta');
    store.setActiveNotes('Some notes');

    store.reset();

    assert.strictEqual(store.activeColleague(), '');
    assert.strictEqual(store.activeRole(), null);
    assert.strictEqual(store.activeNotes(), '');
    assert.strictEqual(typeof store.activeDate(), 'string');
  });

  it('should reset after save preserving active date', () => {
    const store = new DutySessionStoreService();
    store.setActiveColleague('Dr. Strange');
    store.setActiveRole('Planta');
    store.setActiveNotes('Some notes');
    store.setActiveDate('2026-12-25');

    store.resetAfterSave();

    assert.strictEqual(store.activeColleague(), 'Dr. Strange');
    assert.strictEqual(store.activeRole(), null);
    assert.strictEqual(store.activeNotes(), '');
    assert.strictEqual(store.activeDate(), '2026-12-25');
  });
});

