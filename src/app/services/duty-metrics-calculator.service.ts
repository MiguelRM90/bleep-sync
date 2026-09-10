import { Injectable } from '@angular/core';
import { Shift, ColleagueMetrics } from '../models/shift.model';

@Injectable({
  providedIn: 'root',
})
export class DutyMetricsCalculatorService {
  /**
   * Extract sorted unique list of colleague names
   */
  extractColleagues(shifts: Shift[]): string[] {
    const list = new Set<string>();
    for (const shift of shifts) {
      if (shift.colleague?.trim()) {
        list.add(shift.colleague.trim());
      }
    }
    return Array.from(list).sort((a, b) => a.localeCompare(b, 'es'));
  }

  /**
   * Calculate aggregated metrics and equity balance per colleague
   */
  calculateMetrics(shifts: Shift[]): ColleagueMetrics[] {
    const map = new Map<string, Shift[]>();
    for (const shift of shifts) {
      const name = shift.colleague.trim();
      if (!name) continue;
      if (!map.has(name)) {
        map.set(name, []);
      }
      map.get(name)!.push(shift);
    }

    const result: ColleagueMetrics[] = [];
    for (const [colleague, colleagueShifts] of map.entries()) {
      // Sort shifts descending to find last
      const sorted = [...colleagueShifts].sort((a, b) => {
        const d = b.date.localeCompare(a.date);
        return d !== 0 ? d : (b.createdAt || '').localeCompare(a.createdAt || '');
      });

      const total = colleagueShifts.length;
      const planta = colleagueShifts.filter((s) => s.role === 'Planta').length;
      const urgencias = colleagueShifts.filter((s) => s.role === 'Urgencias').length;
      const ambos = colleagueShifts.filter((s) => s.role === 'Ambos').length;

      const plantaPct = total > 0 ? Math.round((planta / total) * 100) : 0;
      const urgenciasPct = total > 0 ? Math.round((urgencias / total) * 100) : 0;

      // Flag imbalance if 3 or more shifts and difference between planta and urgencias >= 40%
      const imbalanceWarning = total >= 3 && Math.abs(plantaPct - urgenciasPct) >= 40;

      result.push({
        colleague,
        totalShifts: total,
        plantaCount: planta,
        urgenciasCount: urgencias,
        ambosCount: ambos,
        lastShiftDate: sorted[0]?.date,
        lastRole: sorted[0]?.role,
        plantaPercentage: plantaPct,
        urgenciasPercentage: urgenciasPct,
        imbalanceWarning,
      });
    }

    return result.sort((a, b) => b.totalShifts - a.totalShifts);
  }
}

