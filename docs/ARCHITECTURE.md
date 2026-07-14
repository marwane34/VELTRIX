# VELTRIX Predictive Maintenance SCADA — Architecture

## Overview

The VELTRIX SCADA system has been refactored from a monolithic PySide6 desktop application into a clean, modular architecture with separated concerns.

## New Architecture

```
project/
├── frontend/          # React + Vite + TypeScript (the ONLY UI)
│   ├── src/
│   │   ├── components/ # 13 React components
│   │   ├── contexts/   # Auth, Monitoring, Communication
│   │   ├── hooks/      # useSimulatedData
│   │   ├── lib/        # supabase client, export utilities
│   │   ├── pages/      # 8 pages (Login, Register, Dashboard, Machines, Alerts, Analytics, Communication, ExportHistory)
│   │   ├── types/      # TypeScript type definitions
│   │   ├── App.tsx    # Root component with routing
│   │   ├── main.tsx   # React entry point
│   │   └── index.css  # SCADA dark theme
│   ├── package.json   # Electron + Vite config
│   ├── vite.config.ts
│   └── tsconfig.json
│
├── backend/           # FastAPI REST API
│   ├── app/
│   │   ├── main.py     # FastAPI app with CORS, WebSocket
│   │   ├── routers/    # health, machines, alerts, analytics, communication, reports
│   │   ├── services/   # supabase_client singleton
│   │   └── models/     # Pydantic schemas
│   ├── requirements.txt
│   └── run.py          # Entry point (uvicorn)
│
├── hardware/          # Hardware communication modules (Python)
│   ├── serial_comm.py     # USB Serial (ESP32)
│   ├── wifi_comm.py       # Wi-Fi TCP
│   ├── mqtt_comm.py       # MQTT
│   ├── modbus_comm.py     # Modbus TCP
│   └── protocol_manager.py # Routes to correct protocol
│
├── ai/                # AI prediction modules (Python)
│   ├── prediction.py       # Bearing wear, overheat risk, failure risk, RUL
│   ├── anomaly_detection.py # Threshold-based anomaly detection
│   ├── recommendations.py  # Maintenance recommendations
│   └── simulator.py        # Data simulator for testing
│
├── electron/          # Electron desktop wrapper
│   ├── main.js        # Frameless window, tray, IPC, auto-update
│   └── preload.js     # Context bridge (secure IPC)
│
├── assets/            # Shared assets
│   ├── veltrix-logo.svg
│   └── icon.svg
│
└── docs/              # Documentation
    └── ARCHITECTURE.md
```

## Data Flow

1. **Frontend** (React) renders the UI and handles user interaction
2. **Frontend** talks to **Supabase** directly for auth and real-time data
3. **Frontend** can optionally talk to **FastAPI backend** for complex operations
4. **Backend** (FastAPI) proxies to **Supabase/PostgreSQL** for data persistence
5. **Hardware** modules communicate with ESP32/sensors via USB, Wi-Fi, MQTT, Modbus
6. **AI** modules process sensor data for predictions, anomaly detection, recommendations
7. **Electron** wraps the React frontend as a desktop application

## Key Decisions

- **PySide6 UI removed**: All UI logic now lives in React. No Qt/Python GUI code remains.
- **Business logic preserved**: Hardware communication, AI prediction, anomaly detection, and data simulation modules are preserved as clean Python packages.
- **No duplicate code**: Functionality that existed in both PySide6 and React (e.g., data display, charts, export) is kept only in the React frontend.
- **Supabase remains**: PostgreSQL via Supabase is the database. Auth, RLS, and real-time subscriptions work as before.
- **Electron ready**: The desktop wrapper is configured but optional. The app runs as a web app or Electron desktop app.
