# 🏥 BleepSync

> **Intelligent, offline-first on-call surgical pager synchronization and duty balance Progressive Web App (PWA).**

BleepSync is tailored for on-call surgical teams (such as General Surgery in Spain) who rotate duties between **Planta** (Ward / Hospitalization) and **Urgencias** (Emergency Department / Urgent ORs). It ensures equitable duty rotation among attending surgeons ("Adjuntos"), functions seamlessly in lead-lined surgical blocks and basement emergency wards without network connectivity, and syncs automatically with a private Google Sheet via a Google Apps Script Web App.

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
5. **Private Serverless Backend (Google Sheets & Apps Script)**:
   - Zero recurring server costs, private data ownership, and instant spreadsheet analysis.
   - Built-in CORS and HTTP redirect resilience (`redirect: 'follow'` with `text/plain` JSON payload).

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                       Client Device                         │
│  ┌──────────────────────┐        ┌────────────────────────┐ │
│  │ Angular 19 PWA       │        │ Angular Service Worker │ │
│  │ (Signals + CSS vars) │◄───────┤ (ngsw-worker.js cache) │ │
│  └──────────┬───────────┘        └────────────────────────┘ │
│             │                                               │
│             ├───────────────► LocalStorage (Resilient Cache)│
│             ▼                                               │
│    ShiftService (State & Queue)                             │
└─────────────┬───────────────────────────────────────────────┘
              │ (Online / Background Sync)
              │ POST / GET (text/plain, redirect: 'follow')
              ▼
┌─────────────────────────────────────────────────────────────┐
│               Google Cloud Platform / Workspace             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Google Apps Script (Web App: gas/Code.gs)             │  │
│  │ - doGet(e)   -> Reads rows from Sheet                 │  │
│  │ - doPost(e)  -> Upserts single or batch shifts        │  │
│  └──────────────────────────┬────────────────────────────┘  │
│                             │                               │
│                             ▼                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Private Google Sheet ("Guardias")                     │  │
│  │ Columns: ID | Date | Colleague | Role | Notes | ...   │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+ or 22+
- npm 10+

### Local Development Setup

```bash
# 1. Clone the repository
git clone https://github.com/MiguelRM90/BleepSync.git
cd BleepSync

# 2. Install dependencies
npm install

# 3. Launch local development server
npm start
```

Navigate to `http://localhost:4200` in your browser.

---

## 📊 Google Sheets & Apps Script Backend Deployment

Follow these steps to link BleepSync to your private Google Sheet:

### Step 1: Create the Google Sheet
1. Open [Google Sheets](https://sheets.new) and create a new spreadsheet named **BleepSync - Control de Guardias**.
2. Rename the first sheet tab to **`Guardias`** (or let the script create it automatically).

### Step 2: Add the Google Apps Script Code
1. In your Google Sheet, click **Extensions** > **Apps Script** (*Extensiones* > *Apps Script*).
2. Delete any boilerplate code in `Code.gs`.
3. Open [`gas/Code.gs`](gas/Code.gs) from this repository, copy its entire content, and paste it into the Apps Script editor.
4. **Seguridad (Recomendado)**: Define una clave secreta en la variable `const SECRET_API_KEY = 'TuClaveSecreta';` en la parte superior del archivo (o agrégala en *Configuración del proyecto* > *Propiedades de la secuencia de comandos* con la propiedad `API_KEY`). Esto garantizará que nadie pueda acceder ni modificar tus guardias sin dicha clave.
5. Click **Save** (💾 icon).
6. (Optional) Select `setupSheet` from the function dropdown and click **Run** to format the headers.

### Step 3: Deploy as a Web App
1. Click the blue **Deploy** button (top right) > **New deployment** (*Nueva implementación*).
2. Click the gear icon ⚙️ next to "Select type" and select **Web app**.
3. Fill in the deployment details:
   - **Description**: `BleepSync API v1`
   - **Execute as**: `Me (your_email@gmail.com)`
   - **Who has access**: `Anyone` (*Cualquiera*)
     > **Note**: Choosing *Anyone* allows your PWA client to communicate with the endpoint without complex OAuth login flows. Tu Google Sheet permanece 100% privado en tu Google Drive; además, con la clave secreta `SECRET_API_KEY`, cualquier intento de acceso sin autorización es rechazado.
4. Click **Deploy**.
5. Grant permissions when prompted by Google (click *Advanced* > *Go to BleepSync (unsafe)* > *Allow*).
6. Copy the generated **Web app URL** (format: `https://script.google.com/macros/s/AKfycb.../exec`).

### Step 4: Configure BleepSync
1. Open the BleepSync PWA in your browser.
2. Tap the **Settings icon (⚙️)** in the top navigation bar.
3. Paste your Web App URL into the **URL del Web App (Google Apps Script)** field.
4. If you configured a `SECRET_API_KEY`, enter it in the **Clave de Seguridad (API Key / Token)** field.
5. Tap **Guardar Ajustes**.
6. Tap **Descargar de Google Sheet** to verify connectivity!

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
   https://<your-username>.github.io/BleepSync/
   ```

To test the GitHub Pages build locally:
```bash
npm run build:gh-pages
```

---

## 🛡️ Technical Highlights & CORS Resilience

- **No CORS Preflights**: Google Apps Script endpoints do not respond to HTTP `OPTIONS` preflight requests. BleepSync sends payloads using `Content-Type: text/plain;charset=utf-8` containing `JSON.stringify(payload)`. This bypasses browser preflight checks while still allowing JSON deserialization in Google Apps Script.
- **HTTP 302 Follow**: Google Apps Script redirects API calls to `script.googleusercontent.com` with a `302 Found` status. All requests in `ShiftService` use `redirect: 'follow'`.
- **Zero NgModules**: 100% built with modern Angular standalone components and Signals (`signal`, `computed`, `effect`).

---

## 📄 License
MIT License. Created for surgical healthcare teams.
