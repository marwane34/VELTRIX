"""Left sidebar widget — machine list, live readings, settings summary."""

from PySide6.QtWidgets import (
    QWidget, QVBoxLayout, QHBoxLayout, QLabel,
    QPushButton, QFrame, QScrollArea, QSizePolicy
)
from PySide6.QtCore import Qt, Signal
from PySide6.QtGui import QColor


class MachineItem(QFrame):
    clicked = Signal(str)  # machine_id

    def __init__(self, machine_id: str, name: str, active: bool = False, parent=None):
        super().__init__(parent)
        self.machine_id = machine_id
        self._active = active
        self._setup_ui(name)
        self._apply_style()

    def _setup_ui(self, name: str):
        lay = QHBoxLayout(self)
        lay.setContentsMargins(10 if not self._active else 8, 5, 8, 5)
        lay.setSpacing(6)

        icon = QLabel("≡")
        icon.setStyleSheet(f"color:{'#3b82f6' if self._active else '#4a5f7a'}; font-size:11px;")

        self.name_lbl = QLabel(name)
        self.name_lbl.setStyleSheet(
            f"color:{'#e2e8f0' if self._active else '#94a3b8'};"
            "font-size:11px; background:transparent;"
        )

        lay.addWidget(icon)
        lay.addWidget(self.name_lbl, 1)

        if self._active:
            dot = QLabel("●")
            dot.setStyleSheet("color:#22c55e; font-size:9px;")
            lay.addWidget(dot)

    def _apply_style(self):
        if self._active:
            self.setStyleSheet(
                "background:rgba(34,197,94,0.06);"
                "border-left:2px solid #22c55e;"
                "border-bottom:1px solid #1e2d45;"
            )
        else:
            self.setStyleSheet(
                "background:transparent;"
                "border-left:none;"
                "border-bottom:1px solid #1e2d45;"
            )
        self.setCursor(Qt.PointingHandCursor)

    def mousePressEvent(self, ev):
        if ev.button() == Qt.LeftButton:
            self.clicked.emit(self.machine_id)


class SensorReadingBox(QFrame):
    def __init__(self, label: str, value_style: str = "color:#3b82f6;", parent=None):
        super().__init__(parent)
        self.setStyleSheet(
            "background:#0d1520; border:1px solid #1e2d45; padding:0px;"
        )
        lay = QHBoxLayout(self)
        lay.setContentsMargins(6, 3, 6, 3)
        lay.setSpacing(4)

        self._lbl = QLabel(label + ":")
        self._lbl.setStyleSheet("color:#94a3b8; font-size:10px; background:transparent;")
        self._val = QLabel("—")
        self._val.setStyleSheet(f"{value_style} font-size:10px; font-weight:bold; background:transparent;")
        lay.addWidget(self._lbl)
        lay.addStretch()
        lay.addWidget(self._val)

    def set_value(self, text: str):
        self._val.setText(text)


class SidebarWidget(QWidget):
    machine_selected = Signal(str)
    add_machine_clicked = Signal()
    save_settings_clicked = Signal()

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setFixedWidth(220)
        self.setObjectName("sidebar")
        self._machine_items: dict = {}
        self._setup_ui()

    def _setup_ui(self):
        root = QVBoxLayout(self)
        root.setContentsMargins(0, 0, 0, 0)
        root.setSpacing(0)

        # ── Machine list header ───────────────────────────────────────────────
        hdr = QFrame()
        hdr.setFixedHeight(34)
        hdr.setStyleSheet(
            "background:qlineargradient(x1:0,y1:0,x2:0,y2:1,stop:0 #182030,stop:1 #111827);"
            "border-bottom:1px solid #1e2d45;"
        )
        hdr_lay = QHBoxLayout(hdr)
        hdr_lay.setContentsMargins(10, 0, 10, 0)
        icon = QLabel("☰")
        icon.setStyleSheet("color:#3b82f6; font-size:12px;")
        self.machine_title = QLabel("Machine 01")
        self.machine_title.setStyleSheet(
            "color:#e2e8f0; font-size:12px; font-weight:bold; background:transparent;"
        )
        hdr_lay.addWidget(icon)
        hdr_lay.addWidget(self.machine_title, 1)
        root.addWidget(hdr)

        # ── Machine list (scrollable) ─────────────────────────────────────────
        self._machine_container = QWidget()
        self._machine_container.setStyleSheet("background:transparent;")
        self._machine_layout = QVBoxLayout(self._machine_container)
        self._machine_layout.setContentsMargins(0, 0, 0, 0)
        self._machine_layout.setSpacing(0)
        self._machine_layout.addStretch()

        scroll = QScrollArea()
        scroll.setWidget(self._machine_container)
        scroll.setWidgetResizable(True)
        scroll.setHorizontalScrollBarPolicy(Qt.ScrollBarAlwaysOff)
        scroll.setStyleSheet("QScrollArea{border:none; border-bottom:1px solid #1e2d45;}")
        scroll.setFixedHeight(120)
        root.addWidget(scroll)

        # ── Sensor readings ───────────────────────────────────────────────────
        sensor_frame = QFrame()
        sensor_frame.setStyleSheet("background:transparent; border-bottom:1px solid #1e2d45;")
        sensor_lay = QVBoxLayout(sensor_frame)
        sensor_lay.setContentsMargins(8, 6, 8, 6)
        sensor_lay.setSpacing(4)

        self.rms_box  = SensorReadingBox("RMS",     "color:#3b82f6;")
        self.temp_box = SensorReadingBox("Temp",    "color:#22c55e;")
        self.curr_box = SensorReadingBox("Current", "color:#eab308;")

        sensor_lay.addWidget(self.rms_box)
        sensor_lay.addWidget(self.temp_box)
        sensor_lay.addWidget(self.curr_box)
        root.addWidget(sensor_frame)

        # ── Save Settings button ──────────────────────────────────────────────
        save_frame = QFrame()
        save_frame.setStyleSheet("background:transparent; border-bottom:1px solid #1e2d45;")
        save_lay = QVBoxLayout(save_frame)
        save_lay.setContentsMargins(8, 6, 8, 6)
        save_btn = QPushButton("Save Settings")
        save_btn.setStyleSheet(
            "QPushButton{background:qlineargradient(x1:0,y1:0,x2:0,y2:1,stop:0 #1a2540,stop:1 #111827);"
            "border:1px solid #2a3f60; color:#94a3b8; padding:3px 0;}"
            "QPushButton:hover{border-color:#3b82f6; color:#e2e8f0;}"
        )
        save_btn.clicked.connect(self.save_settings_clicked)
        save_lay.addWidget(save_btn)
        root.addWidget(save_frame)

        # ── General Settings section ──────────────────────────────────────────
        gs_frame = QFrame()
        gs_frame.setStyleSheet("background:transparent;")
        gs_lay = QVBoxLayout(gs_frame)
        gs_lay.setContentsMargins(10, 8, 10, 4)
        gs_lay.setSpacing(4)

        gs_title = QLabel("GENERAL SETTINGS")
        gs_title.setStyleSheet(
            "color:#eab308; font-size:9px; font-weight:bold; letter-spacing:2px; background:transparent;"
        )
        gs_lay.addWidget(gs_title)

        self.gs_rms  = self._settings_row("Vibration RMS", "color:#3b82f6;")
        self.gs_temp = self._settings_row("Temperature:",  "color:#22c55e;")
        self.gs_curr = self._settings_row("Current:",      "color:#eab308;")

        for w in (self.gs_rms, self.gs_temp, self.gs_curr):
            gs_lay.addWidget(w)

        save2 = QPushButton("Save Settings")
        save2.setStyleSheet(
            "QPushButton{background:qlineargradient(x1:0,y1:0,x2:0,y2:1,stop:0 #1a4a1a,stop:1 #0f2e0f);"
            "border:1px solid #22c55e; color:#22c55e; font-weight:bold; padding:4px 0; margin-top:4px;}"
            "QPushButton:hover{color:#86efac;}"
        )
        save2.clicked.connect(self.save_settings_clicked)
        gs_lay.addWidget(save2)
        root.addWidget(gs_frame)

        root.addStretch()

        # ── Add Machine ───────────────────────────────────────────────────────
        add_btn = QPushButton("+ Add Machine")
        add_btn.setStyleSheet(
            "QPushButton{background:transparent; border:none; border-top:1px solid #1e2d45;"
            "color:#64748b; padding:7px 0;}"
            "QPushButton:hover{color:#94a3b8; background:rgba(255,255,255,0.02);}"
        )
        add_btn.clicked.connect(self.add_machine_clicked)
        root.addWidget(add_btn)

    def _settings_row(self, label: str, val_style: str) -> QWidget:
        w = QWidget()
        w.setStyleSheet("background:transparent;")
        lay = QHBoxLayout(w)
        lay.setContentsMargins(0, 0, 0, 0)
        lay.setSpacing(4)
        lbl = QLabel(label)
        lbl.setStyleSheet("color:#64748b; font-size:10px; background:transparent;")
        val = QLabel("—")
        val.setStyleSheet(f"{val_style} font-size:10px; font-weight:bold; background:transparent;")
        lay.addWidget(lbl)
        lay.addStretch()
        lay.addWidget(val)
        w._val_lbl = val
        return w

    def load_machines(self, machines: list, active_id: str):
        # Clear existing
        while self._machine_layout.count() > 1:
            item = self._machine_layout.takeAt(0)
            if item.widget():
                item.widget().deleteLater()
        self._machine_items.clear()

        for m in machines:
            item = MachineItem(m["id"], m["name"], active=(m["id"] == active_id))
            item.clicked.connect(self._on_machine_click)
            self._machine_layout.insertWidget(self._machine_layout.count() - 1, item)
            self._machine_items[m["id"]] = item

        if machines and active_id:
            m = next((x for x in machines if x["id"] == active_id), machines[0])
            self.machine_title.setText(m["name"])

    def _on_machine_click(self, machine_id: str):
        self.machine_selected.emit(machine_id)

    def update_readings(self, temp: float, rms_x: float, rms_y: float, current: float):
        self.rms_box.set_value(f"X:{rms_x:.2f}g  Y:{rms_y:.2f}g")
        self.temp_box.set_value(f"{temp:.1f}°C")
        self.curr_box.set_value(f"{current:.2f} A")

    def update_thresholds(self, machine: dict):
        self.gs_rms._val_lbl.setText(f"{machine['rms_min']}-{machine['rms_max']} g")
        self.gs_temp._val_lbl.setText(f"{machine['temp_min']}-{machine['temp_max']}°C")
        self.gs_curr._val_lbl.setText(f"{machine['current_min']}-{machine['current_max']} A")
