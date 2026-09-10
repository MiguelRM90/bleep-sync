import { Injectable } from '@angular/core';
import { Shift, Recommendation } from '../models/shift.model';
import { formatDutyDate } from '../pipes/date-format.pipe';

@Injectable({
  providedIn: 'root',
})
export class DutyRotationCalculatorService {
  /**
   * Compute rotation recommendation for today's shift based on the colleague's history
   */
  calculateRecommendation(shifts: Shift[], colleagueName: string): Recommendation {
    const trimmed = colleagueName?.trim() ?? '';
    if (!trimmed) {
      return {
        recommendedRole: null,
        reason: 'Selecciona un adjunto de guardia para calcular la rotación recomendada.',
        requiresManualSelection: true,
      };
    }

    // Filter shifts for this colleague and sort descending (newest first)
    const history = shifts
      .filter((s) => s.colleague.trim().toLowerCase() === trimmed.toLowerCase())
      .sort((a, b) => {
        const d = b.date.localeCompare(a.date);
        return d !== 0 ? d : b.createdAt.localeCompare(a.createdAt);
      });

    if (history.length === 0) {
      return {
        recommendedRole: null,
        reason: `Primera guardia con ${trimmed}. Selecciona manualmente tu asignación para iniciar el balance.`,
        requiresManualSelection: true,
      };
    }

    const lastShift = history[0];
    if (lastShift.role === 'Planta') {
      return {
        recommendedRole: 'Urgencias',
        reason: `En la última guardia juntos (${formatDutyDate(lastShift.date)}) estuviste en Planta. Hoy corresponde URGENCIAS para rotar equitativamente.`,
        lastShift,
        requiresManualSelection: false,
      };
    } else if (lastShift.role === 'Urgencias') {
      return {
        recommendedRole: 'Planta',
        reason: `En la última guardia juntos (${formatDutyDate(lastShift.date)}) estuviste en Urgencias. Hoy corresponde PLANTA para rotar equitativamente.`,
        lastShift,
        requiresManualSelection: false,
      };
    } else {
      // 'Ambos' / Joint shift
      return {
        recommendedRole: null,
        reason: 'La guardia anterior fue de asignación mixta (Ambos). Elige manualmente la de hoy.',
        lastShift,
        requiresManualSelection: true,
      };
    }
  }
}

