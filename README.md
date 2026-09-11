# 🏥 BleepSync

> **Intelligent, offline-first on-call surgical pager synchronization and duty balance Progressive Web App (PWA).**

BleepSync is tailored for on-call surgical teams (such as General Surgery in Spain) who rotate duties between **Planta** (Ward / Hospitalization) and **Urgencias** (Emergency Department / Urgent ORs). It ensures equitable duty rotation among attending surgeons ("Adjuntos"), functions seamlessly in lead-lined surgical blocks and basement emergency wards without network connectivity, and syncs automatically with a private Google Sheet in the user's personal Google Drive via native Google OAuth 2.0.

---

## 🌟 Key Features

1. **Hospital Aesthetic & Mobile-First UX**:
   - Clean slate and emerald clinical palette designed for low eye strain during 24-hour on-call shifts.
   - Large tactile touch targets (min 48px) for fast mobile duty assignment (`Planta`, `Urgencias`, `Ambos`).
   - Tactile haptic feedback (`navigator.vibrate`) upon selecting and saving shifts.
2. **Offline-First Resilience**:
   - Angular Service Worker (`@angular/pwa`) caches app shell, assets, and icons for instant offline launch.
   - Signal-driven state backed by persistent LocalStorage cache.
   - Works 100% offline in Faraday cages, lead-lined X-ray rooms, and basement trauma bays.
   - Automatic background re-synchronization queue whenever network connectivity is restored.
3. **Smart Rotation & Recommendation Engine**:
   - Select an attending surgeon (*Adjunto de guardia*).
   - Instant calculation:
     - If the previous shift together was **Planta** ➡️ Recommends **Urgencias**.
     - If the previous shift together was **Urgencias** ➡️ Recommends **Planta**.
     - If the previous shift was **Ambos** or no prior history ➡️ Prompts manual selection.
   - One-tap "Aplicar recomendación" button to autofill the duty logger.
4. **Duty Balance & Imbalance Flags**:
   - Visual Planta vs. Urgencias ratio bar for each colleague.
   - Imbalance alerts when one colleague has carried a skewed percentage of emergency or ward duties.
5. **Native Google Drive & Sheets Backup (OAuth 2.0)**:
   - Zero recurring server costs, zero middleman databases, and private data sovereignty.
   - 1-Click mobile connection via Google Identity Services (GIS).
   - Automatic creation and background synchronization of the `Guardias BleepSync` spreadsheet.
   - Sandboxed with minimum-privilege `drive.file` scope (the app cannot read personal emails, photos, or documents).

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                       Client Device                         │
│  ┌──────────────────────┐        ┌────────────────────────┐ │
│  │ Angular 22 PWA       │        │ Angular Service Worker │ │
│  │ (Signals + CSS vars) │◄───────┤ (ngsw-worker.js cache) │ │
│  └──────────┬───────────┘        └────────────────────────┘ │
│             │                                               │
│             ├───────────────► LocalStorage (Resilient Cache)│
│             ▼                                               │
│    ShiftService (State & Queue)                             │
│             │                                               │
│             ├───────────────► GoogleAuthService (GIS OAuth) │
│             ▼                                               │
│    GoogleDriveSyncService                                   │
└─────────────┬───────────────────────────────────────────────┘
              │ (HTTPS / Bearer Access Token)
              │ Direct Google Sheets API v4 & Drive API v3
              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Google Cloud Platform                   │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Private User Google Drive                             │  │
│  │ └── Spreadsheet: "Guardias BleepSync"                 │  │
│  │     └── Tab: "Guardias" (ID, Fecha, Adjunto, Rol...) │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 22+ or 24+
- npm 10+ or 11+

### Local Development Setup

```bash
# 1. Clone the repository
git clone https://github.com/MiguelRM90/bleep-sync.git
cd bleep-sync

# 2. Install dependencies
npm install

# 3. Launch local development server
npm start
```

Navigate to `http://localhost:4200` in your browser.

---

## 📊 Google Drive Cloud Backup (1-Click OAuth Setup)

> 💡 **Looking for a non-technical step-by-step setup tutorial?** Check out the **[Google Drive Setup Guide (in Spanish)](docs/GUIA_GOOGLE_DRIVE.md)** designed with clear explanations for non-technical users.

BleepSync connects directly to Google Drive without intermediate servers or manual script pasting:

1. Open BleepSync on your mobile phone or browser.
2. Tap the **Settings icon (⚙️)** in the top navigation bar.
3. Under **Copia de Seguridad en Google Drive**, tap **Conectar con Google Drive**.
4. Authorize with your Google account.
5. That's it! BleepSync automatically creates the `Guardias BleepSync` spreadsheet in your private Google Drive and synchronizes your duty shifts.

---

## 📱 PWA Installation on Mobile

### iOS (Safari)
1. Open the deployed BleepSync URL in Safari.
2. Tap the **Share** button (box with an upward arrow) at the bottom.
3. Scroll down and select **Add to Home Screen** (*Añadir a pantalla de inicio*).
4. Tap **Add**. BleepSync will now run as a full-screen standalone application with offline support.

### Android (Chrome)
1. Open the deployed BleepSync URL in Chrome.
2. Tap the banner **Instalar App** or tap the 3 vertical dots menu in the top right.
3. Select **Install app** or **Add to Home screen**.

---

## 🚢 Deploying to GitHub Pages

This repository includes an automated GitHub Actions workflow in [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

### Setup in GitHub:
1. Push this repository to GitHub (`main` branch).
2. Go to your repository **Settings** > **Pages**.
3. Under **Build and deployment** > **Source**, select **GitHub Actions**.
4. Every push to `main` will automatically build the standalone Angular application and deploy it to:
   ```
   https://<your-username>.github.io/bleep-sync/
   ```

To test the GitHub Pages build locally:
```bash
npm run build:gh-pages
```

---

## 🛡️ Technical Highlights & CORS Resilience

- **Google Identity Services (GIS) & Sheets API v4**: Direct client-to-Google communication via short-lived, encrypted OAuth 2.0 access tokens. No intermediate server or third-party storage.
- **Sandboxed Security**: Minimum privilege `drive.file` scope sandboxes access strictly to `Guardias BleepSync` created by the app.
- **Zero NgModules**: 100% built with modern Angular standalone components and Signals (`signal`, `computed`, `effect`).

---

## 🔒 Privacy Policy
Read our full [Privacy Policy (Política de Privacidad)](docs/PRIVACY_POLICY.md). BleepSync adheres to Google API Services User Data Policy, including Limited Use requirements.

---

## 📄 License
MIT License. Created for surgical healthcare teams.

