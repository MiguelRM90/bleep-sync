import { describe, it } from 'node:test';
import assert from 'node:assert';
import { DutyRotationCalculatorService } from './duty-rotation-calculator.service';
import { Shift } from '../models/shift.model';

describe('DutyRotationCalculatorService', () => {
  const service = new DutyRotationCalculatorService();

  it('should require manual selection if colleague name is empty', () => {
    const result = service.calculateRecommendation([], '');
    assert.strictEqual(result.recommendedRole, null);
    assert.strictEqual(result.requiresManualSelection, true);
  });

  it('should recommend manual selection on first duty with a colleague (empty history)', () => {
    const result = service.calculateRecommendation([], 'Dra. Carmen Navarro');
    assert.strictEqual(result.recommendedRole, null);
    assert.strictEqual(result.requiresManualSelection, true);
    assert.ok(result.reason.includes('Primera guardia'));
  });

  it('should recommend Urgencias if the previous shift was Planta', () => {
    const shifts: Shift[] = [
      {
        id: 'shift_1',
        date: '2026-09-01',
        colleague: 'Dr. Alejandro Ruiz',
        role: 'Planta',
        syncStatus: 'synced',
        createdAt: '2026-09-01T08:00:00.000Z',
      },
    ];

    const result = service.calculateRecommendation(shifts, 'Dr. Alejandro Ruiz');
    assert.strictEqual(result.recommendedRole, 'Urgencias');
    assert.strictEqual(result.requiresManualSelection, false);
    assert.ok(result.reason.includes('URGENCIAS'));
  });

  it('should recommend Planta if the previous shift was Urgencias', () => {
    const shifts: Shift[] = [
      {
        id: 'shift_1',
        date: '2026-09-01',
        colleague: 'Dr. Alejandro Ruiz',
        role: 'Urgencias',
        syncStatus: 'synced',
        createdAt: '2026-09-01T08:00:00.000Z',
      },
    ];

    const result = service.calculateRecommendation(shifts, 'Dr. Alejandro Ruiz');
    assert.strictEqual(result.recommendedRole, 'Planta');
    assert.strictEqual(result.requiresManualSelection, false);
    assert.ok(result.reason.includes('PLANTA'));
  });

  it('should require manual selection if previous shift was Ambos', () => {
    const shifts: Shift[] = [
      {
        id: 'shift_1',
        date: '2026-09-01',
        colleague: 'Dr. Alejandro Ruiz',
        role: 'Ambos',
        syncStatus: 'synced',
        createdAt: '2026-09-01T08:00:00.000Z',
      },
    ];

    const result = service.calculateRecommendation(shifts, 'Dr. Alejandro Ruiz');
    assert.strictEqual(result.recommendedRole, null);
    assert.strictEqual(result.requiresManualSelection, true);
  });

  it('should accurately pick the newest shift when multiple shifts exist out of order', () => {
    const shifts: Shift[] = [
      {
        id: 'old',
        date: '2026-08-15',
        colleague: 'Dra. Carmen',
        role: 'Planta',
        syncStatus: 'synced',
        createdAt: '2026-08-15T08:00:00.000Z',
      },
      {
        id: 'newest',
        date: '2026-09-05',
        colleague: 'Dra. Carmen',
        role: 'Urgencias',
        syncStatus: 'synced',
        createdAt: '2026-09-05T08:00:00.000Z',
      },
      {
        id: 'intermediate',
        date: '2026-08-25',
        colleague: 'Dra. Carmen',
        role: 'Planta',
        syncStatus: 'synced',
        createdAt: '2026-08-25T08:00:00.000Z',
      },
    ];

    const result = service.calculateRecommendation(shifts, 'Dra. Carmen');
    assert.strictEqual(result.recommendedRole, 'Planta');
    assert.strictEqual(result.lastShift?.id, 'newest');
  });
});
