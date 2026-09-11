# BleepSync — Project Guidelines & Rules

## 1. Project Overview & Architecture
**BleepSync** is an offline-first Progressive Web Application (PWA) designed for surgical teams to record, track, and balance hospital on-call shifts ("Guardias de Cirugía").

- **Framework**: Angular 22+ (Strict TypeScript, Standalone Components, Signal-based reactivity)
- **Styling**: Tailwind CSS v4 (`@import "tailwindcss";`), custom dark clinical theme with CSS variables in `src/styles.css`
- **Reactivity Model**: Zoneless-ready, 100% Angular Signals (`signal`, `computed`, `effect`, `linkedSignal`, Resource APIs)
- **Data Persistence**: Offline-first via `LocalStorage` (`bleepsync_shifts_v1`, `bleepsync_config_v1`, `bleepsync_colleagues_v1`, `bleepsync_duty_session_v1`) + optional Cloud Sync via Google Drive API v3 and Google Sheets API v4 (OAuth2 Token Client / GIS).

---

## 2. Angular 22 Standards & Modern Best Practices

### A. Reactivity & Resource APIs
Always prioritize Angular's native Signal primitives and Resource APIs over manual Observable subscriptions:
- **`resource()`**: Use for async promise-based queries linked to signals.
  ```typescript
  readonly query = signal('...');
  readonly dataResource = resource({
    request: () => ({ q: this.query() }),
    loader: async ({ request, abortSignal }) => {
      const res = await fetch(`/api/search?q=${request.q}`, { signal: abortSignal });
      return res.json();
    }
  });
  // Exposes: .value(), .isLoading(), .status(), .error(), .reload()
  ```
- **`rxResource()`** (`@angular/core/rxjs-interop`): Bridge RxJS streams into signals declaratively without manual `.subscribe()` or `takeUntilDestroyed()`.
- **`httpResource()`** (`@angular/common/http`): Use for declarative HTTP fetching directly bound to signal state.
- **`linkedSignal()`**: Use when a signal needs to track a parent signal but remain locally writable (e.g. form fields resetting when a selection changes).

### B. Modern Services & Dependency Injection (`@Service` / `@Injectable`)
- Services must use `inject(...)` instead of constructor parameters.
- Provide services at root via `@Injectable({ providedIn: 'root' })` (or the Angular 22 `@Service` paradigm when applicable).
- Keep services signal-native: expose readonly signals (`readonly shifts = signal<Shift[]>([])`) and computed projections (`readonly pendingCount = computed(...)`).
- Avoid exposing mutable signals directly if external mutations should be constrained; use private writable signals and expose `asReadonly()` when strict encapsulation is needed.

### C. Components & Templates
- **Standalone Only**: All components, directives, and pipes must be standalone (`standalone: true` or default in v22).
- **Modern Control Flow**: Always use `@if`, `@for` (with explicit `track`), and `@switch`. Never use legacy structural directives (`*ngIf`, `*ngFor`).
- **Signal Inputs & Outputs**:
  - Inputs: `input<string>()`, `input.required<number>()`
  - Two-way binding: `model<boolean>()`
  - Outputs: `output<T>()` instead of `@Output() EventEmitter`
  - View Queries: `viewChild()`, `viewChildren()`, `contentChild()`, `contentChildren()`

---

## 3. BleepSync Domain Rules & Logic

### A. Shift & Duty Roles
There are 3 surgical shift roles:
1. `'Planta'` (Ward / Inpatient)
2. `'Urgencias'` (Emergency room / Acute surgeries)
3. `'Ambos'` (Combined / Both)

### B. Fairness & Equity Algorithm (`Recommendation`)
The app calculates parity between colleagues. When suggesting roles:
- If a colleague has done significantly more `'Planta'`, suggest `'Urgencias'` next.
- Flag imbalance warnings when total shifts $\ge 3$ and $|Planta\% - Urgencias\%| \ge 40\%$.
- Pre-existing history support: Colleagues can be initialized with baseline shifts (`initialPlanta`, `initialUrgencias`) so equity calculations reflect past rotations.

### C. Offline-First & Google Drive / Sheets Sync
- **Local first**: Never block UI operations waiting for network calls. Save immediately to `LocalStorage` and mark shift as `syncStatus: 'pending'`.
- **Google OAuth**: Uses Google Identity Services (GIS) token client (`initTokenClient`) without backend secrets. Scopes are strictly `https://www.googleapis.com/auth/drive.file`, `https://www.googleapis.com/auth/userinfo.email`, `https://www.googleapis.com/auth/userinfo.profile`, and `openid`.
- **Spreadsheet Storage**: Syncs duty shifts directly with a dedicated Google Spreadsheet titled `Guardias BleepSync` (tab `Guardias`) using Google Sheets API v4.
- **Conflict Resolution**: Merge strategies preserve local offline edits while resolving remote updates by `updatedAt` / `createdAt` timestamps.
- **Data Erasure**: Supports complete local and remote data wipe (resetting device storage and clearing all rows `A2:Z` in the remote spreadsheet).

---

## 4. UI/UX & Design Guidelines
- **Palette**: Dark clinical aesthetic (`#090d16` background, `#0f172a` surface cards, emerald `#10b981` primary accents, cyan `#0284c7` secondary, rose `#f43f5e` for emergency/danger).
- **Mobile First & PWA**: Mobile viewport ergonomics, safe-area insets (`env(safe-area-inset-top)` / `env(safe-area-inset-bottom)`), touch targets $\ge 44\text{px}$.
- **Haptic Feedback**: Invoke `navigator.vibrate(10)` on critical action confirmations (supported via `ShiftService.triggerHaptic()`).

---

## 5. Development & Verification Commands
Always verify changes inside the workspace:
- Build: `npm run build`
- Tests: `npm test`
- Watch / Dev: `npm start`

