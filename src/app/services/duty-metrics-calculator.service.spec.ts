import { describe, it } from 'node:test';
import assert from 'node:assert';
import { DutyMetricsCalculatorService } from './duty-metrics-calculator.service';
import { Shift } from '../models/shift.model';

describe('DutyMetricsCalculatorService', () => {
  const service = new DutyMetricsCalculatorService();

  it('should extract unique colleagues sorted alphabetically in Spanish locale', () => {
    const shifts: Shift[] = [
      { id: '1', date: '2026-09-01', colleague: 'Dr. Santos', role: 'Planta', syncStatus: 'synced', createdAt: '' },
      { id: '2', date: '2026-09-02', colleague: 'Dra. Álvarez', role: 'Urgencias', syncStatus: 'synced', createdAt: '' },
      { id: '3', date: '2026-09-03', colleague: 'Dr. Santos', role: 'Planta', syncStatus: 'synced', createdAt: '' },
    ];

    const colleagues = service.extractColleagues(shifts);
    assert.deepStrictEqual(colleagues, ['Dr. Santos', 'Dra. Álvarez']);
  });

  it('should calculate counts, percentages and identify equity correctly', () => {
    const shifts: Shift[] = [
      { id: '1', date: '2026-09-01', colleague: 'Dra. Navarro', role: 'Planta', syncStatus: 'synced', createdAt: '' },
      { id: '2', date: '2026-09-02', colleague: 'Dra. Navarro', role: 'Urgencias', syncStatus: 'synced', createdAt: '' },
    ];

    const metrics = service.calculateMetrics(shifts);
    assert.strictEqual(metrics.length, 1);
    assert.strictEqual(metrics[0].totalShifts, 2);
    assert.strictEqual(metrics[0].plantaCount, 1);
    assert.strictEqual(metrics[0].urgenciasCount, 1);
    assert.strictEqual(metrics[0].plantaPercentage, 50);
    assert.strictEqual(metrics[0].urgenciasPercentage, 50);
    assert.strictEqual(metrics[0].imbalanceWarning, false);
  });

  it('should trigger imbalanceWarning if 3 or more shifts and difference >= 40%', () => {
    const shifts: Shift[] = [
      { id: '1', date: '2026-09-01', colleague: 'Dr. Ruiz', role: 'Planta', syncStatus: 'synced', createdAt: '' },
      { id: '2', date: '2026-09-02', colleague: 'Dr. Ruiz', role: 'Planta', syncStatus: 'synced', createdAt: '' },
      { id: '3', date: '2026-09-03', colleague: 'Dr. Ruiz', role: 'Planta', syncStatus: 'synced', createdAt: '' },
      { id: '4', date: '2026-09-04', colleague: 'Dr. Ruiz', role: 'Urgencias', syncStatus: 'synced', createdAt: '' },
    ];

    const metrics = service.calculateMetrics(shifts);
    assert.strictEqual(metrics.length, 1);
    assert.strictEqual(metrics[0].totalShifts, 4);
    assert.strictEqual(metrics[0].plantaCount, 3);
    assert.strictEqual(metrics[0].urgenciasCount, 1);
    // planta = 75%, urgencias = 25%, diff = 50% >= 40%
    assert.strictEqual(metrics[0].imbalanceWarning, true);
  });
});
