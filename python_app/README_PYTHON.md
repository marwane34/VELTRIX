# Predictive Maintenance Dashboard — Python Desktop App

Native Windows desktop application built with PySide6. Runs completely offline without a browser or Node.js.

---

## Quick Start

### Requirements
- Windows 10/11 (64-bit) OR Linux/macOS
- Python 3.10 or newer

### 1. Install dependencies
```bash
pip install -r requirements.txt
```

### 2. Run the application
```bash
python main.py
```

Default login: **admin** / **admin123**

---

## Build Standalone .exe

```bat
build.bat
```

Or manually:
```bash
pyinstaller app.spec --noconfirm --clean
```

Output: `dist/PredictiveMaintenance/PredictiveMaintenance.exe`

---

## Project Structure

```
python_app/
├── main.py                    Entry point
├── requirements.txt           Python dependencies
├── build.bat                  Windows build script
├── app.spec                   PyInstaller configuration
├── config.ini                 Default settings
│
├── database/
│   └── db_manager.py          SQLite + SQLAlchemy ORM
│                              Tables: users, machines, sensor_snapshots,
│                                      alerts, predictions, maintenance_logs, machine_health
│
├── ai/
│   └── anomaly_detector.py    AI engine — health score, bearing wear,
│                              overheat risk, failure risk, RUL estimate
│
├── hardware/
│   ├── serial_handler.py      COM port / USB serial → ESP32
│   └── wifi_handler.py        HTTP polling + MQTT subscriber → ESP32
│
├── backend/
│   ├── api_server.py          FastAPI server (ESP32 POST endpoint)
│   └── simulator.py           Fake sensor data generator
│
├── charts/
│   ├── vibration_chart.py     PyQtGraph 3-axis waveform
│   ├── frequency_chart.py     PyQtGraph frequency spectrum
│   ├── temperature_chart.py   PyQtGraph heat-zone temperature trend
│   └── current_chart.py       PyQtGraph current trend
│
├── gui/
│   ├── styles.py              QSS dark SCADA stylesheet
│   ├── login_dialog.py        Login screen
│   ├── main_window.py         App controller + monitoring orchestration
│   ├── dashboard_widget.py    Full SCADA dashboard (charts, panels, toolbar)
│   ├── sidebar_widget.py      Left sidebar (machine list, readings)
│   ├── settings_dialog.py     Connection + threshold settings
│   ├── machines_dialog.py     Machine management (add/delete)
│   ├── alerts_dialog.py       Alert history viewer
│   └── export_dialog.py       CSV / PDF export
│
├── assets/icons/              App icons (place app.ico here)
├── data/                      SQLite database (auto-created)
├── exports/                   Default export output directory
└── logs/                      Application logs
```

---

## Data Source Modes

| Mode | Description | Config |
|------|-------------|--------|
| **Simulation** | Built-in fake data generator | `data_source=simulation` |
| **Serial** | ESP32 via USB/COM port | `data_source=serial`, set `port=COM3` |
| **HTTP** | Poll ESP32 JSON endpoint | `data_source=http`, set `esp32_ip` |
| **MQTT** | Subscribe to MQTT broker | `data_source=mqtt`, set `mqtt_broker` |

Switch modes in Settings → Connection tab.

---

## ESP32 Integration

The app accepts JSON from ESP32 via:

### HTTP POST (to local API server)
```
POST http://<your-pc-ip>:8765/api/sensor-data
Content-Type: application/json

{
  "machine_id": "M1",
  "temperature": 78.5,
  "vibration": 2.3,
  "vibration_x": 1.8,
  "vibration_y": 2.1,
  "current": 3.2,
  "rpm": 1450,
  "voltage": 220
}
```

### MQTT
Topic: `factory/machines/M1/sensors`
Payload: same JSON as above

See `hardware/esp32_http_sensor.ino` and `hardware/esp32_mqtt_sensor.ino` for complete firmware.

---

## AI Detection

The AI engine runs on every 200ms tick:

| Metric | Formula |
|--------|---------|
| **Bearing Wear** | RMS excess × 0.55 + axis imbalance × 0.30 + current excess × 0.15 |
| **Overheat Risk** | Temp excess × 0.70 + current excess × 0.30 |
| **Failure Risk** | Bearing × 0.45 + Overheat × 0.35 + RMS excess × 0.20 |
| **Health Score** | 100 − (failure_risk×45 + rms_excess×25 + temp_excess×20 + curr_excess×10) |
| **RUL** | Linear model: Healthy ~2000h → Critical ~10h |

---

## Export

- **CSV**: All sensor snapshots for selected time range
- **PDF**: Formatted report with thresholds table + data table (via ReportLab)

---

## Default Credentials

| Username | Password | Role  |
|----------|----------|-------|
| admin    | admin123 | admin |

Change password via Settings after first login.

---

## System Requirements (packaged .exe)

- Windows 10/11 x64
- 4 GB RAM minimum
- 200 MB disk space
- No Python installation required (all dependencies bundled)
