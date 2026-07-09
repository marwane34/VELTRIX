"""
Main dashboard widget — full SCADA layout matching reference image.
Contains: top toolbar, 4 charts, anomaly panel, right alert log, control buttons, status bar.
"""

from datetime import datetime
from PySide6.QtWidgets import (
    QWidget, QHBoxLayout, QVBoxLayout, QSplitter, QLabel,
    QPushButton, QFrame, QScrollArea, QSizePolicy
)
from PySide6.QtCore import Qt, Signal, QTimer
from PySide6.QtGui import QFont

from charts.vibration_chart   import VibrationChart
from charts.frequency_chart   import FrequencyChart
from charts.temperature_chart import TemperatureChart
from charts.current_chart     import CurrentChart
from gui.sidebar_widget       import SidebarWidget


# ── Small reusable helpers ────────────────────────────────────────────────────

def _panel_header(title: str, right_widget: QWidget = None) -> QFrame:
    f = QFrame()
    f.setObjectName("panel_header")
    f.setFixedHeight(28)
    f.setStyleSheet(
        "background:qlineargradient(x1:0,y1:0,x2:0,y2:1,stop:0 #151f33,stop:1 #0f1726);"
        "border-bottom:1px solid #1e2d45;"
    )
    lay = QHBoxLayout(f)
    lay.setContentsMargins(8, 0, 8, 0)
    lbl = QLabel(title)
    lbl.setStyleSheet("color:#e2e8f0; font-size:11px; font-weight:bold; background:transparent;")
    lay.addWidget(lbl)
    if right_widget:
        lay.addStretch()
        lay.addWidget(right_widget)
    return f


def _wrap_chart(chart_widget: QWidget, title: str, right_widget: QWidget = None) -> QFrame:
    f = QFrame()
    f.setStyleSheet("background:#0d1420; border:none;")
    lay = QVBoxLayout(f)
    lay.setContentsMargins(0, 0, 0, 0)
    lay.setSpacing(0)
    lay.addWidget(_panel_header(title, right_widget))
    lay.addWidget(chart_widget, 1)
    return f


def _separator(vertical: bool = True) -> QFrame:
    f = QFrame()
    f.setStyleSheet("background:#1e2d45;")
    if vertical:
        f.setFixedWidth(1)
        f.setSizePolicy(QSizePolicy.Fixed, QSizePolicy.Expanding)
    else:
        f.setFixedHeight(1)
        f.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Fixed)
    return f


class AlertLogEntry(QFrame):
    def __init__(self, time_str: str, machine_name: str, message: str,
                 severity: str, parent=None):
        super().__init__(parent)
        lay = QHBoxLayout(self)
        lay.setContentsMargins(6, 4, 6, 4)
        lay.setSpacing(4)
        self.setStyleSheet("border-bottom:1px solid #1a2540; background:transparent;")

        t_lbl = QLabel(time_str)
        t_lbl.setStyleSheet("color:#4a5f7a; font-size:9px; background:transparent;")
        t_lbl.setFixedWidth(42)

        icon_color = {"critical": "#f87171", "warning": "#facc15", "info": "#60a5fa"}.get(severity, "#64748b")
        icon = QLabel("▲" if severity in ("critical","warning") else "✓")
        icon.setStyleSheet(f"color:{icon_color}; font-size:9px; background:transparent;")
        icon.setFixedWidth(12)

        msg = QLabel(f"{machine_name}: {message[:22]}")
        msg.setStyleSheet("color:#94a3b8; font-size:9px; background:transparent;")
        msg.setWordWrap(False)

        lay.addWidget(t_lbl)
        lay.addWidget(icon)
        lay.addWidget(msg, 1)


class DashboardWidget(QWidget):
    navigate_to = Signal(str)       # 'machines' | 'alerts' | 'analytics' | 'settings' | 'hardware'
    machine_changed = Signal(str)   # machine_id
    start_monitoring = Signal()
    stop_monitoring = Signal()
    simulate_load   = Signal(bool)  # True=on, False=off
    hardware_connection_clicked = Signal()  # Open hardware dialog

    def __init__(self, parent=None):
        super().__init__(parent)
        self._monitoring = False
        self._simulating = False
        self._setup_ui()

    def _setup_ui(self):
        root = QVBoxLayout(self)
        root.setContentsMargins(0, 0, 0, 0)
        root.setSpacing(0)

        # ── Title bar ─────────────────────────────────────────────────────────
        title_bar = QFrame()
        title_bar.setFixedHeight(28)
        title_bar.setStyleSheet(
            "background:qlineargradient(x1:0,y1:0,x2:0,y2:1,stop:0 #131c2e,stop:1 #0b0f1a);"
            "border-bottom:1px solid #1e2d45;"
        )
        tb_lay = QHBoxLayout(title_bar)
        tb_lay.setContentsMargins(0, 0, 0, 0)
        tb_lay.setSpacing(0)

        title_lbl = QLabel("Predictive Maintenance Dashboard")
        title_lbl.setAlignment(Qt.AlignCenter)
        title_lbl.setStyleSheet("color:#e2e8f0; font-size:13px; font-weight:bold; background:transparent;")
        tb_lay.addWidget(title_lbl)

        # Win chrome buttons
        for icon, handler in [("─", None), ("□", None), ("✕", self._on_close)]:
            btn = QPushButton(icon)
            btn.setFixedSize(36, 28)
            btn.setStyleSheet(
                "QPushButton{background:transparent;border:none;color:#64748b;font-size:11px;}"
                "QPushButton:hover{background:#2a1818;color:#f87171;}"
                if icon == "✕" else
                "QPushButton{background:transparent;border:none;color:#64748b;font-size:11px;}"
                "QPushButton:hover{background:rgba(255,255,255,0.05);}"
            )
            if handler:
                btn.clicked.connect(handler)
            tb_lay.addWidget(btn)

        root.addWidget(title_bar)

        # ── Main splitter (sidebar | content) ─────────────────────────────────
        main_splitter = QSplitter(Qt.Horizontal)
        main_splitter.setHandleWidth(1)
        main_splitter.setStyleSheet("QSplitter::handle{background:#1e2d45;}")

        # Sidebar
        self.sidebar = SidebarWidget()
        self.sidebar.machine_selected.connect(self.machine_changed)
        self.sidebar.add_machine_clicked.connect(lambda: self.navigate_to.emit("machines"))
        self.sidebar.save_settings_clicked.connect(lambda: self.navigate_to.emit("settings"))
        main_splitter.addWidget(self.sidebar)

        # Content column
        content = QWidget()
        content.setStyleSheet("background:#0b0f1a;")
        c_lay = QVBoxLayout(content)
        c_lay.setContentsMargins(0, 0, 0, 0)
        c_lay.setSpacing(0)

        # ── Top toolbar ───────────────────────────────────────────────────────
        top_bar = QFrame()
        top_bar.setFixedHeight(36)
        top_bar.setObjectName("top_bar")
        top_bar_lay = QHBoxLayout(top_bar)
        top_bar_lay.setContentsMargins(8, 0, 8, 0)
        top_bar_lay.setSpacing(6)

        # Machine selector pill
        self.machine_selector = QFrame()
        self.machine_selector.setStyleSheet(
            "background:qlineargradient(x1:0,y1:0,x2:0,y2:1,stop:0 #1a2540,stop:1 #0f1a2e);"
            "border:1px solid #2a3f60;"
        )
        ms_lay = QHBoxLayout(self.machine_selector)
        ms_lay.setContentsMargins(8, 0, 8, 0)
        ms_lay.setSpacing(4)
        plus = QLabel("+")
        plus.setStyleSheet("color:#64748b; font-size:11px; background:transparent;")
        self.selected_machine_lbl = QLabel("No Machine")
        self.selected_machine_lbl.setStyleSheet(
            "color:#e2e8f0; font-size:11px; font-weight:bold; background:transparent;"
        )
        ms_lay.addWidget(plus)
        ms_lay.addWidget(self.selected_machine_lbl)
        top_bar_lay.addWidget(self.machine_selector)

        top_bar_lay.addStretch()

        # Alert bell
        self.alert_btn = QPushButton("🔔")
        self.alert_btn.setFixedSize(28, 24)
        self.alert_btn.setStyleSheet(
            "QPushButton{background:transparent;border:1px solid transparent;color:#64748b;font-size:11px;}"
            "QPushButton:hover{border-color:#1e2d45;color:#e2e8f0;}"
        )
        self.alert_btn.clicked.connect(lambda: self.navigate_to.emit("alerts"))
        top_bar_lay.addWidget(self.alert_btn)

        for icon in ["↑", "≡", "⊡", "↺"]:
            btn = QPushButton(icon)
            btn.setFixedSize(24, 24)
            btn.setObjectName("btn_toolbar")
            top_bar_lay.addWidget(btn)

        c_lay.addWidget(top_bar)

        # ── Charts + right panel splitter ──────────────────────────────────────
        charts_right = QSplitter(Qt.Horizontal)
        charts_right.setHandleWidth(1)
        charts_right.setStyleSheet("QSplitter::handle{background:#1e2d45;}")

        # Charts column
        charts_col = QWidget()
        charts_col.setStyleSheet("background:#0b0f1a;")
        charts_lay = QVBoxLayout(charts_col)
        charts_lay.setContentsMargins(0, 0, 0, 0)
        charts_lay.setSpacing(0)

        # TOP ROW: 3 charts
        top_charts = QWidget()
        top_charts.setStyleSheet("background:#0b0f1a;")
        top_lay = QHBoxLayout(top_charts)
        top_lay.setContentsMargins(0, 0, 0, 0)
        top_lay.setSpacing(0)

        self.vib_chart  = VibrationChart()
        self.freq_chart = FrequencyChart()
        self.temp_chart = TemperatureChart()

        self.temp_val_lbl = QLabel("78.5°C")
        self.temp_val_lbl.setStyleSheet("color:#eab308; font-size:11px; font-weight:bold; background:transparent;")

        top_lay.addWidget(_wrap_chart(self.vib_chart, "Vibration Time Domain"), 3)
        top_lay.addWidget(_separator())
        top_lay.addWidget(_wrap_chart(self.freq_chart, "Vibration Frequency Spectrum"), 3)
        top_lay.addWidget(_separator())
        top_lay.addWidget(_wrap_chart(self.temp_chart, "Temperature Trend", self.temp_val_lbl), 2)

        charts_lay.addWidget(top_charts, 1)
        charts_lay.addWidget(_separator(vertical=False))

        # BOTTOM ROW: current trend + anomaly warning
        bot_charts = QWidget()
        bot_charts.setStyleSheet("background:#0b0f1a;")
        bot_lay = QHBoxLayout(bot_charts)
        bot_lay.setContentsMargins(0, 0, 0, 0)
        bot_lay.setSpacing(0)

        self.curr_chart = CurrentChart()
        curr_hdr_right = QHBoxLayout()
        self.curr_val_lbl = QLabel("2.9 A")
        self.curr_val_lbl.setStyleSheet("color:#e2e8f0; font-size:11px; font-weight:bold; background:transparent;")
        curr_hdr_right.addWidget(self.curr_val_lbl)
        curr_hdr_rw = QWidget()
        curr_hdr_rw.setLayout(curr_hdr_right)
        curr_hdr_rw.setStyleSheet("background:transparent;")
        bot_lay.addWidget(_wrap_chart(self.curr_chart, "Current Trend", curr_hdr_rw), 4)
        bot_lay.addWidget(_separator())

        # Anomaly warning panel
        self.anomaly_warn_frame = self._build_anomaly_warning()
        bot_lay.addWidget(self.anomaly_warn_frame, 3)

        charts_lay.addWidget(bot_charts, 1)

        # ── Control buttons ───────────────────────────────────────────────────
        ctrl_bar = QFrame()
        ctrl_bar.setFixedHeight(40)
        ctrl_bar.setStyleSheet(
            "background:qlineargradient(x1:0,y1:0,x2:0,y2:1,stop:0 #0f1726,stop:1 #080d14);"
            "border-top:1px solid #1e2d45;"
        )
        ctrl_lay = QHBoxLayout(ctrl_bar)
        ctrl_lay.setContentsMargins(8, 4, 8, 4)
        ctrl_lay.setSpacing(6)

        self.btn_monitor = QPushButton("Start Monitoring")
        self.btn_monitor.setObjectName("btn_monitor")
        self.btn_monitor.clicked.connect(self._toggle_monitoring)

        self.btn_simulate = QPushButton("Simulate Load")
        self.btn_simulate.clicked.connect(self._toggle_simulate)

        self.btn_hardware = QPushButton("Hardware Connection")
        self.btn_hardware.setStyleSheet(
            "QPushButton{background: qlineargradient(x1:0,y1:0,x2:0,y2:1,stop:0 #0d4a4a,stop:1 #082828);"
            "border: 1px solid #0d9488; color: #5eead4; font-weight: bold;}"
            "QPushButton:hover{background: qlineargradient(x1:0,y1:0,x2:0,y2:1,stop:0 #106464,stop:1 #0a3a3a);}"
        )
        self.btn_hardware.clicked.connect(self.hardware_connection_clicked)

        btn_export  = QPushButton("Export Data")
        btn_history = QPushButton("View History")
        btn_limits  = QPushButton("Set Machine Limits")

        btn_export.clicked.connect(lambda: self.navigate_to.emit("export"))
        btn_history.clicked.connect(lambda: self.navigate_to.emit("history"))
        btn_limits.clicked.connect(lambda: self.navigate_to.emit("settings"))

        for btn in (self.btn_monitor, self.btn_simulate, self.btn_hardware, btn_export, btn_history, btn_limits):
            ctrl_lay.addWidget(btn)

        charts_lay.addWidget(ctrl_bar)

        # ── Status bar ────────────────────────────────────────────────────────
        status_bar = QFrame()
        status_bar.setFixedHeight(24)
        status_bar.setObjectName("status_bar")
        status_lay = QHBoxLayout(status_bar)
        status_lay.setContentsMargins(8, 0, 8, 0)
        status_lay.setSpacing(12)

        self.ts_lbl        = QLabel("Timestamp: 00:00:00")
        self.motor_id_lbl  = QLabel("Motor ID: —")
        self.sampling_lbl  = QLabel("Sampling Rate: 1 kHz")
        self.conn_dot      = QLabel("●")
        self.conn_lbl      = QLabel("Disconnected")

        for lbl in (self.ts_lbl, self.motor_id_lbl, self.sampling_lbl):
            lbl.setStyleSheet("color:#64748b; font-size:10px; background:transparent;")
            status_lay.addWidget(lbl)
            sep = QLabel("|")
            sep.setStyleSheet("color:#1e2d45; background:transparent;")
            status_lay.addWidget(sep)

        self.conn_dot.setStyleSheet("color:#4a5f7a; font-size:8px; background:transparent;")
        self.conn_lbl.setStyleSheet("color:#64748b; font-size:10px; background:transparent;")
        status_lay.addStretch()
        status_lay.addWidget(self.conn_dot)
        status_lay.addWidget(self.conn_lbl)

        charts_lay.addWidget(status_bar)

        # ── Bottom icon toolbar ───────────────────────────────────────────────
        icon_bar = QFrame()
        icon_bar.setFixedHeight(28)
        icon_bar.setObjectName("tool_bar")
        icon_lay = QHBoxLayout(icon_bar)
        icon_lay.setContentsMargins(6, 0, 6, 0)
        icon_lay.setSpacing(2)
        for icon in ["⊞", "≡", "↕", "⊕", "▤", "⚙"]:
            b = QPushButton(icon)
            b.setFixedSize(24, 22)
            b.setObjectName("btn_toolbar")
            icon_lay.addWidget(b)
        icon_lay.addStretch()
        icon_lay.addWidget(QLabel("■ ■"))

        charts_lay.addWidget(icon_bar)
        charts_right.addWidget(charts_col)

        # ── Right: Anomaly log panel ───────────────────────────────────────────
        self.anomaly_log_panel = self._build_anomaly_log()
        charts_right.addWidget(self.anomaly_log_panel)
        charts_right.setSizes([999, 250])
        charts_right.setStretchFactor(0, 1)
        charts_right.setStretchFactor(1, 0)

        c_lay.addWidget(charts_right, 1)
        main_splitter.addWidget(content)
        main_splitter.setSizes([220, 999])
        main_splitter.setStretchFactor(0, 0)
        main_splitter.setStretchFactor(1, 1)

        root.addWidget(main_splitter, 1)

    def _build_anomaly_warning(self) -> QFrame:
        f = QFrame()
        f.setStyleSheet("background:#0d1420;")
        lay = QVBoxLayout(f)
        lay.setContentsMargins(0, 0, 0, 0)
        lay.setSpacing(0)

        lay.addWidget(_panel_header("Anomaly Detection"))

        inner = QWidget()
        inner.setStyleSheet("background:transparent;")
        inner_lay = QVBoxLayout(inner)
        inner_lay.setContentsMargins(8, 8, 8, 8)
        inner_lay.setSpacing(6)

        # Status box
        self.anomaly_box = QFrame()
        self.anomaly_box.setObjectName("anomaly_warning")
        ab_lay = QHBoxLayout(self.anomaly_box)
        ab_lay.setContentsMargins(8, 6, 8, 6)
        ab_lay.setSpacing(8)
        self.anomaly_icon = QLabel("⚠")
        self.anomaly_icon.setStyleSheet("color:#facc15; font-size:16px; background:transparent;")
        self.anomaly_msg  = QLabel("System Operating Normally")
        self.anomaly_msg.setStyleSheet("color:#fde047; font-size:11px; font-weight:bold; background:transparent;")
        self.anomaly_msg.setWordWrap(True)
        ab_lay.addWidget(self.anomaly_icon)
        ab_lay.addWidget(self.anomaly_msg, 1)
        inner_lay.addWidget(self.anomaly_box)

        # Details grid
        for attr, lbl_text, default in [
            ("status_lbl",   "Status:",         "Healthy"),
            ("vib_alert_lbl","Vibration Alert:", "Normal"),
            ("temp_lbl",     "Temperature:",     "Normal"),
            ("rpm_lbl",      "RPM:",             "1450 RPM"),
        ]:
            row = QHBoxLayout()
            row.setSpacing(4)
            l = QLabel(lbl_text)
            l.setStyleSheet("color:#64748b; font-size:10px; background:transparent;")
            l.setFixedWidth(90)
            v = QLabel(default)
            v.setStyleSheet("color:#e2e8f0; font-size:10px; font-weight:bold; background:transparent;")
            row.addWidget(l)
            row.addWidget(v, 1)
            inner_lay.addLayout(row)
            setattr(self, attr, v)

        inner_lay.addStretch()
        lay.addWidget(inner, 1)
        return f

    def _build_anomaly_log(self) -> QFrame:
        f = QFrame()
        f.setFixedWidth(252)
        f.setStyleSheet("background:#0e1420; border-left:1px solid #1e2d45;")
        lay = QVBoxLayout(f)
        lay.setContentsMargins(0, 0, 0, 0)
        lay.setSpacing(0)

        lay.addWidget(_panel_header("Anomaly Detection"))

        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setHorizontalScrollBarPolicy(Qt.ScrollBarAlwaysOff)
        scroll.setStyleSheet("QScrollArea{border:none;}")

        self._log_container = QWidget()
        self._log_container.setStyleSheet("background:transparent;")
        self._log_layout = QVBoxLayout(self._log_container)
        self._log_layout.setContentsMargins(0, 0, 0, 0)
        self._log_layout.setSpacing(0)
        self._log_layout.addStretch()

        scroll.setWidget(self._log_container)
        lay.addWidget(scroll, 1)
        return f

    # ── Public update methods ─────────────────────────────────────────────────

    def update_selected_machine(self, machine: dict):
        if not machine:
            return
        name = machine["name"]
        mid  = machine["id"][:4].upper()
        self.selected_machine_lbl.setText(name)
        self.motor_id_lbl.setText(f"Motor ID: {mid}")
        self.sidebar.update_thresholds(machine)
        self.curr_chart.set_max_current(machine["current_max"])
        self.temp_chart.set_thresholds(machine["temp_min"], machine["temp_max"])

    def update_sensor_display(self, temp: float, rms_x: float, rms_y: float,
                               current: float, rpm: int):
        now = datetime.now().strftime("%H:%M:%S")
        self.ts_lbl.setText(f"Timestamp: {now}")
        self.temp_val_lbl.setText(f"{temp:.1f}°C")
        self.curr_val_lbl.setText(f"{current:.1f} A")
        self.rpm_lbl.setText(f"{rpm} RPM")
        self.sidebar.update_readings(temp, rms_x, rms_y, current)

    def update_ai_panel(self, result):
        """result: AIResult dataclass."""
        status = result.status
        if status == "critical":
            self.anomaly_box.setObjectName("anomaly_critical")
            self.anomaly_icon.setText("⛔")
            self.anomaly_icon.setStyleSheet("color:#f87171; font-size:16px; background:transparent;")
            self.anomaly_msg.setStyleSheet("color:#fca5a5; font-size:11px; font-weight:bold; background:transparent;")
            icon_c = "#f87171"
        elif status == "warning":
            self.anomaly_box.setObjectName("anomaly_warning")
            self.anomaly_icon.setText("⚠")
            self.anomaly_icon.setStyleSheet("color:#facc15; font-size:16px; background:transparent;")
            self.anomaly_msg.setStyleSheet("color:#fde047; font-size:11px; font-weight:bold; background:transparent;")
            icon_c = "#facc15"
        else:
            self.anomaly_box.setObjectName("anomaly_ok")
            self.anomaly_icon.setText("✓")
            self.anomaly_icon.setStyleSheet("color:#4ade80; font-size:16px; background:transparent;")
            self.anomaly_msg.setStyleSheet("color:#86efac; font-size:11px; font-weight:bold; background:transparent;")
            icon_c = "#4ade80"

        self.anomaly_box.style().unpolish(self.anomaly_box)
        self.anomaly_box.style().polish(self.anomaly_box)

        msg = result.anomalies[0] if result.anomalies else ("System operating normally" if status == "healthy" else "Anomaly detected")
        self.anomaly_msg.setText(msg[:45])

        sc = "#f87171" if status == "critical" else "#facc15" if status == "warning" else "#4ade80"
        self.status_lbl.setText(status.capitalize())
        self.status_lbl.setStyleSheet(f"color:{sc}; font-size:10px; font-weight:bold; background:transparent;")
        self.vib_alert_lbl.setText("2x RPM Detected" if result.bearing_wear > 35 else "Normal")
        tc = "#f87171" if result.overheat_risk > 30 else "#4ade80"
        self.temp_lbl.setText("Elevated" if result.overheat_risk > 30 else "Normal")
        self.temp_lbl.setStyleSheet(f"color:{tc}; font-size:10px; font-weight:bold; background:transparent;")

    def add_alert_to_log(self, time_str: str, machine_name: str, message: str, severity: str):
        entry = AlertLogEntry(time_str, machine_name, message, severity)
        self._log_layout.insertWidget(0, entry)
        # Keep only last 15 entries
        while self._log_layout.count() > 16:
            item = self._log_layout.takeAt(self._log_layout.count() - 1)
            if item.widget():
                item.widget().deleteLater()

    def set_connected(self, connected: bool):
        if connected:
            self.conn_dot.setStyleSheet("color:#22c55e; font-size:8px; background:transparent;")
            self.conn_lbl.setText("Connected")
            self.conn_lbl.setStyleSheet("color:#94a3b8; font-size:10px; background:transparent;")
        else:
            self.conn_dot.setStyleSheet("color:#4a5f7a; font-size:8px; background:transparent;")
            self.conn_lbl.setText("Disconnected")
            self.conn_lbl.setStyleSheet("color:#64748b; font-size:10px; background:transparent;")

    def _toggle_monitoring(self):
        if not self._monitoring:
            self._monitoring = True
            self.btn_monitor.setText("Stop Monitoring")
            self.btn_monitor.setStyleSheet(
                "QPushButton{background:qlineargradient(x1:0,y1:0,x2:0,y2:1,stop:0 #3b1818,stop:1 #250f0f);"
                "border:1px solid #ef4444; color:#f87171; font-weight:bold; padding:4px 16px;}"
                "QPushButton:hover{color:#fca5a5;}"
            )
            self.start_monitoring.emit()
        else:
            self._monitoring = False
            self.btn_monitor.setText("Start Monitoring")
            self.btn_monitor.setObjectName("btn_monitor")
            self.btn_monitor.setStyleSheet("")
            self.stop_monitoring.emit()

    def _toggle_simulate(self):
        self._simulating = not self._simulating
        if self._simulating:
            self.btn_simulate.setStyleSheet(
                "QPushButton{background:qlineargradient(x1:0,y1:0,x2:0,y2:1,stop:0 #1a3a6a,stop:1 #0f2040);"
                "border:1px solid #3b82f6; color:#93c5fd; font-weight:bold; padding:4px 16px;}"
            )
        else:
            self.btn_simulate.setStyleSheet("")
        self.simulate_load.emit(self._simulating)

    def _on_close(self):
        from PySide6.QtWidgets import QApplication
        QApplication.quit()
