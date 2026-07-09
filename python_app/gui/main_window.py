"""
Main application window.
Orchestrates: simulator/hardware → AI detection → dashboard update → DB persistence.
"""

import os
import time
import logging
from datetime import datetime
from PySide6.QtWidgets import QMainWindow, QMessageBox, QMenuBar
from PySide6.QtGui import QIcon, QAction
from PySide6.QtCore import Qt, QTimer, Signal, QObject

from gui.dashboard_widget import DashboardWidget
from gui.settings_dialog   import SettingsDialog
from gui.machines_dialog   import MachinesDialog
from gui.alerts_dialog     import AlertsDialog
from gui.export_dialog     import ExportDialog
from gui.hardware_connection_dialog import HardwareConnectionDialog
from gui.about_dialog       import AboutDialog
from backend.simulator     import Simulator, generate_vibration_waveform, generate_frequency_bars, generate_current_trend, generate_temp_trend
from ai.anomaly_detector   import analyze, SensorReading, MachineThresholds

logger = logging.getLogger(__name__)

_BASE  = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_ICONS = os.path.join(_BASE, "assets", "icons")


class MainWindow(QMainWindow):
    def __init__(self, db_manager, user: dict, config_path: str = "config.ini"):
        super().__init__()
        self.db = db_manager
        self.user = user
        self.config_path = config_path

        self._selected_machine: dict = {}
        self._monitoring = False
        self._tick = 0
        self._last_snapshot = 0
        self._last_alert_time: dict = {}   # machine_id → timestamp (cooldown)
        self._snapshot_interval = 5        # seconds
        self._last_reading = None

        # Data source mode: 'simulation' or 'hardware'
        self._data_source = "simulation"

        # Simulator
        self._simulator = Simulator(on_reading=self._on_sim_reading)
        self._sim_tick = 0

        # Hardware connection dialog (created lazily)
        self._hardware_dialog: HardwareConnectionDialog = None
        self._hardware_connected = False

        # Waveform data buffers
        self._vib_points  = []
        self._freq_bars   = []
        self._curr_points = []
        self._temp_points = []

        self._setup_window()
        self._load_initial_data()
        self._setup_ui_timer()

    def _setup_window(self):
        self.setWindowTitle("VELTRIX \u2014 Predictive Maintenance Dashboard")
        self.setMinimumSize(1280, 780)
        self.resize(1440, 860)

        # Window icon
        for fname in ("app.ico", "app.png"):
            path = os.path.join(_ICONS, fname)
            if os.path.exists(path):
                self.setWindowIcon(QIcon(path))
                break

        self.dashboard = DashboardWidget()
        self.setCentralWidget(self.dashboard)

        # ── Help menu ─────────────────────────────────────────────────────
        self._build_menu_bar()

        # Connect dashboard signals
        self.dashboard.navigate_to.connect(self._handle_navigate)
        self.dashboard.machine_changed.connect(self._select_machine)
        self.dashboard.start_monitoring.connect(self._start_monitoring)
        self.dashboard.stop_monitoring.connect(self._stop_monitoring)
        self.dashboard.simulate_load.connect(self._set_simulate_load)
        self.dashboard.hardware_connection_clicked.connect(self._show_hardware_dialog)

    def _build_menu_bar(self):
        """Create a minimal menu bar with Help → About."""
        menubar = self.menuBar()
        menubar.setStyleSheet(
            "QMenuBar{background: #060b14; color: #94a3b8; font-size: 10px; "
            "border-bottom: 1px solid #1e2d45;}"
            "QMenuBar::item:selected{background: #1e2d45; color: #e2e8f0;}"
            "QMenu{background: #0d1420; border: 1px solid #1e2d45; color: #e2e8f0;}"
            "QMenu::item:selected{background: #1a2d50;}"
        )

        help_menu = menubar.addMenu("Help")

        about_action = QAction("About VELTRIX", self)
        about_action.triggered.connect(self._show_about)
        help_menu.addAction(about_action)

    def _load_initial_data(self):
        machines = self.db.get_machines()
        if machines:
            first = machines[0]
            self._selected_machine = first
            self.dashboard.sidebar.load_machines(machines, first["id"])
            self.dashboard.update_selected_machine(first)

        unread = self.db.get_unread_count()
        if unread:
            self.dashboard.alert_btn.setText(f"🔔 {unread}")

    def _setup_ui_timer(self):
        """Drives chart updates at ~5fps from buffered data."""
        self._chart_timer = QTimer()
        self._chart_timer.setInterval(200)
        self._chart_timer.timeout.connect(self._update_charts)
        self._chart_timer.start()

    # ── Monitoring control ────────────────────────────────────────────────────

    def _start_monitoring(self):
        self._monitoring = True
        self._tick = 0
        self._sim_tick = 0
        if self._selected_machine:
            self._simulator.start(self._selected_machine["id"])
        self.dashboard.set_connected(True)
        logger.info("Monitoring started")

    def _stop_monitoring(self):
        self._monitoring = False
        self._simulator.stop()
        self.dashboard.set_connected(False)
        logger.info("Monitoring stopped")

    def _set_simulate_load(self, enabled: bool):
        self._simulator.set_anomaly_level(0.75 if enabled else 0.35)

    # ── Data ingestion ────────────────────────────────────────────────────────

    def _on_sim_reading(self, reading):
        """Called by Simulator thread — store latest reading for chart timer."""
        self._last_reading = reading
        self._sim_tick += 1

        al = self._simulator.anomaly_level
        self._vib_points  = generate_vibration_waveform(self._sim_tick, al)
        self._freq_bars   = generate_frequency_bars(al)
        self._curr_points = generate_current_trend(self._sim_tick, reading.current)
        self._temp_points = generate_temp_trend(self._sim_tick, reading.temperature)

    def ingest_hardware_data(self, data: dict):
        """Called from serial/http/mqtt handler with parsed JSON."""
        from backend.simulator import SimulatedReading
        import math
        r = SimulatedReading(
            machine_id   = data.get("machine_id", ""),
            temperature  = float(data.get("temperature", 0)),
            rms_x        = float(data.get("vibration_x", data.get("vibration", 0))),
            rms_y        = float(data.get("vibration_y", data.get("vibration", 0))),
            vibration_rms= float(data.get("vibration", 0)),
            current      = float(data.get("current", 0)),
            rpm          = int(data.get("rpm", 0)),
            voltage      = float(data.get("voltage", 220)),
            timestamp    = time.time(),
        )
        r.vibration_rms = math.sqrt((r.rms_x**2 + r.rms_y**2) / 2)
        self._last_reading = r

    # ── Chart update (runs on main thread via QTimer) ─────────────────────────

    def _update_charts(self):
        if not self._monitoring or not self._last_reading:
            return
        r = self._last_reading

        # Update all charts
        if self._vib_points:
            self.dashboard.vib_chart.update(self._vib_points)
        if self._freq_bars:
            self.dashboard.freq_chart.update(self._freq_bars)
        if self._temp_points:
            self.dashboard.temp_chart.update(self._temp_points, r.temperature)
        if self._curr_points:
            self.dashboard.curr_chart.update(self._curr_points)

        # Update value labels + sidebar
        self.dashboard.update_sensor_display(
            r.temperature, r.rms_x, r.rms_y, r.current, r.rpm
        )

        # Run AI
        if self._selected_machine:
            m = self._selected_machine
            result = analyze(
                SensorReading(r.temperature, r.rms_x, r.rms_y, r.current, r.rpm),
                MachineThresholds(m["rms_min"], m["rms_max"], m["temp_min"], m["temp_max"],
                                  m["current_min"], m["current_max"], m["rpm_min"], m["rpm_max"]),
            )
            self.dashboard.update_ai_panel(result)

            # Persist snapshot every N seconds
            now = time.time()
            if now - self._last_snapshot >= self._snapshot_interval:
                self._last_snapshot = now
                self.db.save_snapshot(
                    m["id"], r.temperature, r.vibration_rms,
                    r.rms_x, r.rms_y, r.current, r.rpm, r.voltage,
                )
                self.db.save_prediction(
                    m["id"], result.health_score, result.status,
                    result.bearing_wear, result.overheat_risk,
                    result.failure_risk, result.rul_hours,
                    result.anomalies, result.recommendation,
                )

            # Fire alert with 60s cooldown per machine
            mid = m["id"]
            last_t = self._last_alert_time.get(mid, 0)
            if result.alert_type and now - last_t > 60:
                self._last_alert_time[mid] = now
                self.db.save_alert(mid, result.alert_type, result.alert_severity, result.anomalies[0])
                ts = datetime.now().strftime("%H:%M:%S")
                self.dashboard.add_alert_to_log(ts, m["name"], result.anomalies[0], result.alert_severity)
                unread = self.db.get_unread_count()
                self.dashboard.alert_btn.setText(f"🔔 {unread}")

    # ── Navigation ────────────────────────────────────────────────────────────

    def _handle_navigate(self, page: str):
        if page == "settings":
            dlg = SettingsDialog(self.config_path, self._selected_machine, self)
            dlg.settings_saved.connect(self._apply_settings)
            dlg.exec()
        elif page == "machines":
            dlg = MachinesDialog(self.db, self)
            dlg.machine_added.connect(self._on_machine_added)
            dlg.machine_deleted.connect(self._on_machine_deleted)
            dlg.exec()
        elif page == "alerts":
            machines = self.db.get_machines()
            dlg = AlertsDialog(self.db, machines, self)
            dlg.exec()
            unread = self.db.get_unread_count()
            self.dashboard.alert_btn.setText(f"🔔 {unread}" if unread else "🔔")
        elif page in ("export", "history"):
            dlg = ExportDialog(self.db, self._selected_machine, self)
            dlg.exec()

    def _select_machine(self, machine_id: str):
        m = self.db.get_machine(machine_id)
        if m:
            self._selected_machine = m
            self.dashboard.update_selected_machine(m)
            machines = self.db.get_machines()
            self.dashboard.sidebar.load_machines(machines, machine_id)
            # Restart simulator for new machine
            if self._monitoring:
                self._simulator.stop()
                self._simulator.start(machine_id)

    def _apply_settings(self, cfg: dict):
        self._snapshot_interval = cfg.get("snapshot_interval_s", 5)
        # Update machine thresholds if machine is selected
        if self._selected_machine:
            self.db.update_machine(
                self._selected_machine["id"],
                rms_min=cfg["rms_min"], rms_max=cfg["rms_max"],
                temp_min=cfg["temp_min"], temp_max=cfg["temp_max"],
                current_min=cfg["current_min"], current_max=cfg["current_max"],
                rpm_min=cfg["rpm_min"], rpm_max=cfg["rpm_max"],
            )
            self._selected_machine = self.db.get_machine(self._selected_machine["id"])
            self.dashboard.update_selected_machine(self._selected_machine)

    def _on_machine_added(self, _mid: str):
        machines = self.db.get_machines()
        self.dashboard.sidebar.load_machines(machines, self._selected_machine.get("id",""))

    def _on_machine_deleted(self, mid: str):
        machines = self.db.get_machines()
        if machines:
            self._select_machine(machines[0]["id"])
            self.dashboard.sidebar.load_machines(machines, machines[0]["id"])

    # ── Hardware Connection ────────────────────────────────────────────────────

    def _show_about(self):
        """Show the VELTRIX About dialog."""
        dlg = AboutDialog(self)
        dlg.exec()

    def _show_hardware_dialog(self):
        """Show hardware connection dialog."""
        if self._hardware_dialog is None:
            self._hardware_dialog = HardwareConnectionDialog(self)
            self._hardware_dialog.sensor_data_received.connect(self._on_hardware_data)
            self._hardware_dialog.connection_changed.connect(self._on_hardware_connection_changed)

        self._hardware_dialog.show()
        self._hardware_dialog.raise_()
        self._hardware_dialog.activateWindow()

    def _on_hardware_connection_changed(self, connected: bool):
        """Handle hardware connection state change."""
        self._hardware_connected = connected
        if connected:
            self._data_source = "hardware"
            # Stop simulator if running
            if self._simulator:
                self._simulator.stop()
            # Update dashboard connection indicator
            self.dashboard.set_connected(True)
            self.dashboard.conn_lbl.setText("Hardware")
            self.dashboard.conn_lbl.setStyleSheet("color:#5eead4; font-size:10px; background:transparent;")
            # Update hardware button style to show connected
            self.dashboard.btn_hardware.setStyleSheet(
                "QPushButton{background: qlineargradient(x1:0,y1:0,x2:0,y2:1,stop:0 #0d5a4a,stop:1 #083828);"
                "border: 2px solid #14b8a6; color: #99f6e4; font-weight: bold;}"
                "QPushButton:hover{background: qlineargradient(x1:0,y1:0,x2:0,y2:1,stop:0 #106464,stop:1 #0a4a4a);}"
            )
            logger.info("Hardware connected - live sensor data active")
        else:
            self._data_source = "simulation"
            self.dashboard.set_connected(False)
            # Restore hardware button style
            self.dashboard.btn_hardware.setStyleSheet(
                "QPushButton{background: qlineargradient(x1:0,y1:0,x2:0,y2:1,stop:0 #0d4a4a,stop:1 #082828);"
                "border: 1px solid #0d9488; color: #5eead4; font-weight: bold;}"
                "QPushButton:hover{background: qlineargradient(x1:0,y1:0,x2:0,y2:1,stop:0 #106464,stop:1 #0a3a3a);}"
            )
            logger.info("Hardware disconnected - switched to simulation mode")

    def _on_hardware_data(self, data: dict):
        """Process live sensor data from ESP32 hardware."""
        import math

        # Convert hardware data to compatible format
        vibration = data.get("vibration", 0)
        # Split vibration into X/Y for display (we only have total RMS from ESP32)
        rms_x = vibration * 0.6  # Approximate distribution
        rms_y = vibration * 0.8
        vibration_rms = vibration

        self._last_reading = type('Reading', (), {
            'temperature': data.get("temperature", 0),
            'rms_x': rms_x,
            'rms_y': rms_y,
            'vibration_rms': vibration_rms,
            'current': data.get("current", 0),
            'rpm': data.get("rpm", 0),
            'voltage': 220,  # Default
        })()

        # Generate waveform data for charts based on actual readings
        self._sim_tick += 1
        al = 0.3  # Normal anomaly level for hardware data

        self._vib_points  = generate_vibration_waveform(self._sim_tick, al)
        self._freq_bars   = generate_frequency_bars(al)
        self._curr_points = generate_current_trend(self._sim_tick, self._last_reading.current)
        self._temp_points = generate_temp_trend(self._sim_tick, self._last_reading.temperature)

    def closeEvent(self, ev):
        self._simulator.stop()
        # Disconnect hardware cleanly
        if self._hardware_dialog:
            self._hardware_dialog.get_manager().disconnect()
        ev.accept()
