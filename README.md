# Predictive Maintenance Dashboard

AI-powered industrial predictive maintenance system for monitoring factory machines in real time and predicting failures before they happen.

---

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + custom CSS (dark SCADA theme)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (email/password)
- **Realtime**: Supabase Realtime subscriptions
- **AI**: Client-side anomaly detection engine (rule-based + statistical)
- **Charts**: Custom SVG-based real-time charts

---

## Features

- **Login / Register** — Secure Supabase email/password auth
- **Live Dashboard** — SCADA-style industrial monitoring interface
  - Vibration Time Domain (3-axis waveform)
  - Vibration Frequency Spectrum (with bearing fault detection)
  - Temperature Trend (heat-zone background)
  - Current Trend (real-time line chart)
  - AI Anomaly Detection panel + live alert log
- **Machine Management** — Add, edit, delete machines; configure thresholds
- **Alert History** — Full alert log with severity filtering and bulk read/delete
- **AI Analytics** — Health gauge, risk breakdown, RUL estimate, prediction history
- **Simulation Mode** — Toggles elevated anomaly levels to trigger AI warnings
- **Export** — Download sensor data as CSV or JSON (1h / 24h / 7d / 30d)
- **View History** — Browse alerts, predictions, and maintenance logs per machine
- **Realtime** — Supabase Realtime keeps alert badge + log live across all pages

---

## Database Schema

| Table | Description |
|-------|-------------|
| `machines` | User-owned machines with threshold configuration |
| `sensor_snapshots` | 5-second periodic readings (temp, vibration, current, RPM, voltage) |
| `alerts` | AI-generated warnings / critical events |
| `predictions` | Health score history (bearing wear, overheat risk, failure risk, RUL) |
| `maintenance_logs` | Technician action history |
| `machine_health` | Latest live snapshot per machine (upserted) |

All tables have Row Level Security (RLS) enabled — users only see their own data.

---

## Quick Start

### Prerequisites
- Node.js 18+
- A Supabase project (free tier works)

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
Create `.env` in the project root:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Apply database migration
Run the SQL in `supabase/migrations/predictive_maintenance_schema.sql` via the Supabase SQL editor, or use the Supabase CLI:
```bash
supabase db push
```

### 4. Start the dev server
```bash
npm run dev
```

### 5. Build for production
```bash
npm run build
```
The output is in `dist/` — deploy to any static host (Netlify, Vercel, Cloudflare Pages).

---

## AI Anomaly Detection

The AI engine runs entirely client-side on every sensor tick (200ms):

| Signal | Detection Logic |
|--------|----------------|
| **Bearing Wear** | RMS excess beyond threshold + X/Y axis imbalance ratio |
| **Overheating** | Temperature excess + current load excess |
| **Failure Risk** | Weighted combination: bearing (45%) + overheat (35%) + vibration (20%) |
| **Health Score** | 0–100 inverse of failure risk + per-factor penalties |
| **RUL** | Linear model: Healthy → ~2000h, Warning → ~200–500h, Critical → ~10–50h |

Alerts are written to Supabase with a 60-second cooldown per machine to prevent flood.

---

## ESP32 Integration

See `hardware/esp32_sensor.ino` and `hardware/esp32_mqtt.ino` for example firmware.

### HTTP POST (minimal)
```json
POST /api/sensor-data
{
  "machine_id": "M1",
  "temperature": 78.5,
  "vibration": 2.3,
  "current": 3.2,
  "rpm": 1450
}
```

### MQTT Topic
```
factory/machines/{machine_id}/sensors
```

---

## Project Structure

```
src/
├── components/
│   ├── AddMachineModal.tsx    — Add machine dialog
│   ├── AnomalyPanel.tsx       — Right-side alert log panel
│   ├── AppLayout.tsx          — Non-dashboard page shell with nav
│   ├── CurrentChart.tsx       — SVG current trend chart
│   ├── ExportModal.tsx        — CSV/JSON export dialog
│   ├── FrequencyChart.tsx     — SVG frequency spectrum chart
│   ├── SetLimitsModal.tsx     — Threshold configuration dialog
│   ├── Sidebar.tsx            — Left machine/settings sidebar
│   ├── TemperatureChart.tsx   — SVG temperature heat-zone chart
│   ├── VibrationChart.tsx     — SVG 3-axis vibration chart
│   └── ViewHistoryModal.tsx   — History browser dialog
├── contexts/
│   ├── AuthContext.tsx        — Supabase auth state
│   └── MonitoringContext.tsx  — Machine + sensor state + DB writes
├── hooks/
│   ├── useAI.ts              — AI anomaly detection engine
│   └── useSimulatedData.ts   — Fake sensor data generator
├── lib/
│   └── supabase.ts           — Supabase client singleton
├── pages/
│   ├── AlertsPage.tsx        — Alert history + management
│   ├── AnalyticsPage.tsx     — AI health analytics
│   ├── Dashboard.tsx         — Main SCADA dashboard
│   ├── LoginPage.tsx         — Login screen
│   ├── MachinesPage.tsx      — Machine management
│   └── RegisterPage.tsx      — Registration screen
├── types/
│   └── index.ts              — TypeScript interfaces
└── App.tsx                   — Root + routing + auth guard
```

---

## Build as Desktop App (Electron)

To wrap this web app as a desktop `.exe`:

```bash
npm install --save-dev electron electron-builder concurrently
```

Add to `package.json`:
```json
{
  "main": "electron/main.js",
  "scripts": {
    "electron:dev": "concurrently \"npm run dev\" \"electron .\"",
    "electron:build": "npm run build && electron-builder"
  }
}
```

Create `electron/main.js`:
```js
const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({ width: 1400, height: 900, webPreferences: { nodeIntegration: false } });
  win.loadURL('http://localhost:5173'); // or loadFile for production build
}

app.whenReady().then(createWindow);
```

---

## License
MIT
