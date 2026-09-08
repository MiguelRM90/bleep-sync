import { Component, inject, signal, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ShiftService } from '../../services/shift.service';
import { DutyRole } from '../../models/shift.model';

@Component({
  selector: 'app-duty-logger',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="clinical-card p-5 transition-all">
      <!-- Section Header -->
      <div class="flex items-center gap-2.5 mb-4">
        <span class="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold text-sm">
          2
        </span>
        <div>
          <h2 class="text-base font-semibold text-slate-100 tracking-tight">Registro de Guardia</h2>
          <p class="text-xs text-slate-400">Guarda la asignación de busca en el parte quirúrgico</p>
        </div>
      </div>

      <form (ngSubmit)="saveShift()" class="space-y-4">
        <!-- Date & Colleague row -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <!-- Date selector -->
          <div>
            <label for="shiftDate" class="block text-xs font-medium text-slate-300 mb-1.5">
              Fecha de la guardia
            </label>
            <input
              type="date"
              id="shiftDate"
              [(ngModel)]="date"
              name="date"
              required
              class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 transition font-medium"
            />
          </div>

          <!-- Colleague display / override -->
          <div>
            <label for="colleagueInput" class="block text-xs font-medium text-slate-300 mb-1.5">
              Adjunto con quien estás
            </label>
            <input
              type="text"
              id="colleagueInput"
              [(ngModel)]="colleague"
              name="colleague"
              placeholder="Ej: Dra. Carmen Navarro"
              required
              class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition font-medium"
            />
          </div>
        </div>

        <!-- Role Assignment - Large tactile touch targets -->
        <div>
          <label class="block text-xs font-medium text-slate-300 mb-2">
            Asignación de Busca / Localizador <span class="text-emerald-400 font-semibold">*</span>
          </label>
          <div class="grid grid-cols-3 gap-2.5">
            <!-- Planta (Ward) Button -->
            <button
              type="button"
              (click)="selectRole('Planta')"
              class="h-14 sm:h-16 rounded-xl flex flex-col items-center justify-center gap-1 transition-all tactile-btn border text-center font-bold cursor-pointer"
              [ngClass]="{
                'bg-sky-500/20 text-sky-200 border-sky-500 ring-2 ring-sky-500/30 shadow-lg shadow-sky-950/40': role() === 'Planta',
                'bg-slate-900/90 text-slate-300 border-slate-700 hover:border-slate-600 hover:bg-slate-800/60': role() !== 'Planta'
              }"
            >
              <div class="flex items-center gap-1.5 text-sm sm:text-base">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path>
                </svg>
                <span>Planta</span>
              </div>
              <span class="text-[10px] font-normal text-slate-400">Hospitalización / Camas</span>
            </button>

            <!-- Urgencias (Emergency) Button -->
            <button
              type="button"
              (click)="selectRole('Urgencias')"
              class="h-14 sm:h-16 rounded-xl flex flex-col items-center justify-center gap-1 transition-all tactile-btn border text-center font-bold cursor-pointer"
              [ngClass]="{
                'bg-emerald-500/20 text-emerald-200 border-emerald-500 ring-2 ring-emerald-500/30 shadow-lg shadow-emerald-950/40': role() === 'Urgencias',
                'bg-slate-900/90 text-slate-300 border-slate-700 hover:border-slate-600 hover:bg-slate-800/60': role() !== 'Urgencias'
              }"
            >
              <div class="flex items-center gap-1.5 text-sm sm:text-base">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                </svg>
                <span>Urgencias</span>
              </div>
              <span class="text-[10px] font-normal text-slate-400">Boxes / Quirófano Urg.</span>
            </button>

            <!-- Ambos (Both/Exception) Button -->
            <button
              type="button"
              (click)="selectRole('Ambos')"
              class="h-14 sm:h-16 rounded-xl flex flex-col items-center justify-center gap-1 transition-all tactile-btn border text-center font-bold cursor-pointer"
              [ngClass]="{
                'bg-purple-500/20 text-purple-200 border-purple-500 ring-2 ring-purple-500/30 shadow-lg shadow-purple-950/40': role() === 'Ambos',
                'bg-slate-900/90 text-slate-300 border-slate-700 hover:border-slate-600 hover:bg-slate-800/60': role() !== 'Ambos'
              }"
            >
              <div class="flex items-center gap-1.5 text-sm sm:text-base">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path>
                </svg>
                <span>Ambos</span>
              </div>
              <span class="text-[10px] font-normal text-slate-400">Mixta / Excepción</span>
            </button>
          </div>
        </div>

        <!-- Notes / Remarks (Swaps, Favors, Coverage) -->
        <div>
          <label for="notesInput" class="block text-xs font-medium text-slate-300 mb-1.5">
            Observaciones o cambios (opcional)
          </label>
          <input
            type="text"
            id="notesInput"
            [(ngModel)]="notes"
            name="notes"
            placeholder="Ej: Cambio de guardia por congreso, favor devuelto, paciente crítico..."
            class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
          />
        </div>

        <!-- Prominent Save Button with Tactile & Visual Confirmation -->
        <button
          type="submit"
          [disabled]="!canSave() || isSubmitting()"
          class="w-full h-13 py-3.5 px-6 rounded-xl font-bold text-white text-base tracking-wide transition-all shadow-lg flex items-center justify-center gap-2.5 tactile-btn cursor-pointer"
          [ngClass]="{
            'bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-950/50 border border-emerald-400/30': canSave() && !isSubmitting(),
            'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed': !canSave() || isSubmitting()
          }"
        >
          @if (isSubmitting()) {
            <span class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            <span>Guardando parte...</span>
          } @else if (justSaved()) {
            <svg class="w-5 h-5 text-emerald-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path>
            </svg>
            <span class="text-emerald-100">¡Guardia Registrada!</span>
          } @else {
            <!-- Medical cross save icon -->
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path>
            </svg>
            <span>Guardar Guardia</span>
          }
        </button>
      </form>
    </section>
  `,
})
export class DutyLoggerComponent {
  readonly shiftService = inject(ShiftService);

  date = new Date().toISOString().split('T')[0];
  colleague = '';
  notes = '';
  readonly role = signal<DutyRole | null>(null);
  readonly isSubmitting = signal<boolean>(false);
  readonly justSaved = signal<boolean>(false);

  canSave(): boolean {
    return !!this.date && !!this.colleague.trim() && this.role() !== null;
  }

  selectRole(newRole: DutyRole): void {
    this.role.set(newRole);
    this.shiftService.triggerHaptic();
  }

  setColleagueFromChecker(name: string): void {
    this.colleague = name;
  }

  setPreselection(colleague: string, role: DutyRole): void {
    this.colleague = colleague;
    this.role.set(role);
  }

  async saveShift(): Promise<void> {
    if (!this.canSave()) return;

    this.isSubmitting.set(true);

    try {
      await this.shiftService.addShift({
        date: this.date,
        colleague: this.colleague,
        role: this.role()!,
        notes: this.notes,
      });

      this.justSaved.set(true);
      this.notes = '';

      setTimeout(() => {
        this.justSaved.set(false);
      }, 2500);
    } catch (err) {
      console.error('Failed to save shift:', err);
    } finally {
      this.isSubmitting.set(false);
    }
  }
}

