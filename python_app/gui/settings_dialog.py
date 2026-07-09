"""Settings dialog — configure connection, thresholds, intervals."""

from PySide6.QtWidgets import (
    QDialog, QVBoxLayout, QHBoxLayout, QLabel, QLineEdit,
    QPushButton, QFrame, QGroupBox, QDoubleSpinBox, QSpinBox,
    QComboBox, QTabWidget, QWidget, QFormLayout
)
from PySide6.QtCore import Qt, Signal
import configparser, os


class SettingsDialog(QDialog):
    settings_saved = Signal(dict)

    def __init__(self, config_path: str = "config.ini", machine: dict = None, parent=None):
        super().__init__(parent)
        self.config_path = config_path
        self.machine = machine or {}
        self.setWindowTitle("Settings")
        self.setFixedSize(480, 520)
        self._setup_ui()
        self._load_config()

    def _setup_ui(self):
        root = QVBoxLayout(self)
        root.setContentsMargins(0, 0, 0, 0)
        root.setSpacing(0)

        # Header
        hdr = QFrame()
        hdr.setFixedHeight(36)
        hdr.setStyleSheet(
            "background:qlineargradient(x1:0,y1:0,x2:0,y2:1,stop:0 #151f33,stop:1 #0f1726);"
            "border-bottom:1px solid #1e2d45;"
        )
        hl = QHBoxLayout(hdr)
        hl.setContentsMargins(12, 0, 8, 0)
        hl.addWidget(QLabel("⚙  SETTINGS"))
        root.addWidget(hdr)

        # Tabs
        tabs = QTabWidget()
        root.addWidget(tabs, 1)

        # ── Connection tab ────────────────────────────────────────────────────
        conn_tab = QWidget()
        fl = QFormLayout(conn_tab)
        fl.setContentsMargins(16, 16, 16, 16)
        fl.setSpacing(10)

        self.esp32_ip   = QLineEdit(); self.esp32_ip.setPlaceholderText("192.168.1.100")
        self.esp32_port = QSpinBox(); self.esp32_port.setRange(1, 65535); self.esp32_port.setValue(80)
        self.com_port   = QLineEdit(); self.com_port.setPlaceholderText("COM3 or /dev/ttyUSB0")
        self.baud_rate  = QComboBox()
        self.baud_rate.addItems(["9600","19200","57600","115200","230400"])
        self.baud_rate.setCurrentText("115200")
        self.mqtt_host  = QLineEdit(); self.mqtt_host.setPlaceholderText("broker.hivemq.com")
        self.mqtt_port  = QSpinBox(); self.mqtt_port.setRange(1, 65535); self.mqtt_port.setValue(1883)
        self.mqtt_topic = QLineEdit(); self.mqtt_topic.setPlaceholderText("factory/machines/+/sensors")
        self.api_port   = QSpinBox(); self.api_port.setRange(1024, 65535); self.api_port.setValue(8765)

        fl.addRow("ESP32 IP:", self.esp32_ip)
        fl.addRow("ESP32 Port:", self.esp32_port)
        fl.addRow("COM Port:", self.com_port)
        fl.addRow("Baud Rate:", self.baud_rate)
        fl.addRow("MQTT Broker:", self.mqtt_host)
        fl.addRow("MQTT Port:", self.mqtt_port)
        fl.addRow("MQTT Topic:", self.mqtt_topic)
        fl.addRow("API Port:", self.api_port)
        tabs.addTab(conn_tab, "Connection")

        # ── Thresholds tab ────────────────────────────────────────────────────
        thr_tab = QWidget()
        tfl = QFormLayout(thr_tab)
        tfl.setContentsMargins(16, 16, 16, 16)
        tfl.setSpacing(10)

        def dbl(lo, hi, val, dec=2):
            w = QDoubleSpinBox(); w.setRange(lo, hi); w.setValue(val); w.setDecimals(dec); return w

        self.rms_min     = dbl(0, 20, self.machine.get("rms_min", 0.5))
        self.rms_max     = dbl(0, 20, self.machine.get("rms_max", 3.0))
        self.temp_min    = dbl(-50, 300, self.machine.get("temp_min", 20))
        self.temp_max    = dbl(-50, 300, self.machine.get("temp_max", 85))
        self.current_min = dbl(0, 100, self.machine.get("current_min", 0.5))
        self.current_max = dbl(0, 100, self.machine.get("current_max", 5.0))
        self.rpm_min     = dbl(0, 50000, self.machine.get("rpm_min", 1200), 0)
        self.rpm_max     = dbl(0, 50000, self.machine.get("rpm_max", 1800), 0)

        tfl.addRow("Vib RMS Min (g):", self.rms_min)
        tfl.addRow("Vib RMS Max (g):", self.rms_max)
        tfl.addRow("Temp Min (°C):", self.temp_min)
        tfl.addRow("Temp Max (°C):", self.temp_max)
        tfl.addRow("Current Min (A):", self.current_min)
        tfl.addRow("Current Max (A):", self.current_max)
        tfl.addRow("RPM Min:", self.rpm_min)
        tfl.addRow("RPM Max:", self.rpm_max)
        tabs.addTab(thr_tab, "Thresholds")

        # ── Monitoring tab ────────────────────────────────────────────────────
        mon_tab = QWidget()
        mfl = QFormLayout(mon_tab)
        mfl.setContentsMargins(16, 16, 16, 16)
        mfl.setSpacing(10)

        self.update_interval = QSpinBox(); self.update_interval.setRange(100, 5000); self.update_interval.setValue(200); self.update_interval.setSuffix(" ms")
        self.snapshot_interval = QSpinBox(); self.snapshot_interval.setRange(1, 300); self.snapshot_interval.setValue(5); self.snapshot_interval.setSuffix(" s")
        self.data_source = QComboBox(); self.data_source.addItems(["simulation", "serial", "http", "mqtt"])

        mfl.addRow("UI Update Interval:", self.update_interval)
        mfl.addRow("Snapshot Interval:", self.snapshot_interval)
        mfl.addRow("Data Source:", self.data_source)
        tabs.addTab(mon_tab, "Monitoring")

        # ── Buttons ───────────────────────────────────────────────────────────
        btn_row = QHBoxLayout()
        btn_row.setContentsMargins(12, 8, 12, 12)
        cancel = QPushButton("Cancel"); cancel.clicked.connect(self.reject)
        save   = QPushButton("Save"); save.setObjectName("btn_primary"); save.clicked.connect(self._save)
        save.setStyleSheet(
            "QPushButton{background:qlineargradient(x1:0,y1:0,x2:0,y2:1,stop:0 #1d4ed8,stop:1 #1e3a8a);"
            "border:1px solid #3b82f6; color:#e0f2fe; font-weight:bold; padding:5px 20px;}"
        )
        btn_row.addStretch()
        btn_row.addWidget(cancel)
        btn_row.addWidget(save)
        root.addLayout(btn_row)

    def _load_config(self):
        if not os.path.exists(self.config_path):
            return
        cfg = configparser.ConfigParser()
        cfg.read(self.config_path)
        self.esp32_ip.setText(cfg.get("network", "esp32_ip", fallback="192.168.1.100"))
        self.esp32_port.setValue(cfg.getint("network", "esp32_port", fallback=80))
        self.com_port.setText(cfg.get("serial", "port", fallback="COM3"))
        self.baud_rate.setCurrentText(cfg.get("serial", "baud_rate", fallback="115200"))
        self.mqtt_host.setText(cfg.get("network", "mqtt_broker", fallback="broker.hivemq.com"))
        self.mqtt_port.setValue(cfg.getint("network", "mqtt_port", fallback=1883))
        self.mqtt_topic.setText(cfg.get("network", "mqtt_topic", fallback="factory/machines/+/sensors"))
        self.api_port.setValue(cfg.getint("network", "api_port", fallback=8765))
        self.update_interval.setValue(cfg.getint("monitoring", "update_interval_ms", fallback=200))
        self.snapshot_interval.setValue(cfg.getint("monitoring", "snapshot_interval_s", fallback=5))
        self.data_source.setCurrentText(cfg.get("monitoring", "data_source", fallback="simulation"))

    def _save(self):
        cfg = configparser.ConfigParser()
        cfg.read(self.config_path)

        def ensure(section):
            if not cfg.has_section(section):
                cfg.add_section(section)

        ensure("network"); ensure("serial"); ensure("monitoring"); ensure("thresholds")

        cfg.set("network", "esp32_ip",    self.esp32_ip.text())
        cfg.set("network", "esp32_port",  str(self.esp32_port.value()))
        cfg.set("network", "api_port",    str(self.api_port.value()))
        cfg.set("network", "mqtt_broker", self.mqtt_host.text())
        cfg.set("network", "mqtt_port",   str(self.mqtt_port.value()))
        cfg.set("network", "mqtt_topic",  self.mqtt_topic.text())
        cfg.set("serial", "port",         self.com_port.text())
        cfg.set("serial", "baud_rate",    self.baud_rate.currentText())
        cfg.set("monitoring", "update_interval_ms", str(self.update_interval.value()))
        cfg.set("monitoring", "snapshot_interval_s", str(self.snapshot_interval.value()))
        cfg.set("monitoring", "data_source", self.data_source.currentText())

        with open(self.config_path, "w") as f:
            cfg.write(f)

        self.settings_saved.emit({
            "esp32_ip":     self.esp32_ip.text(),
            "esp32_port":   self.esp32_port.value(),
            "com_port":     self.com_port.text(),
            "baud_rate":    int(self.baud_rate.currentText()),
            "mqtt_broker":  self.mqtt_host.text(),
            "mqtt_port":    self.mqtt_port.value(),
            "mqtt_topic":   self.mqtt_topic.text(),
            "api_port":     self.api_port.value(),
            "data_source":  self.data_source.currentText(),
            "rms_min":      self.rms_min.value(),
            "rms_max":      self.rms_max.value(),
            "temp_min":     self.temp_min.value(),
            "temp_max":     self.temp_max.value(),
            "current_min":  self.current_min.value(),
            "current_max":  self.current_max.value(),
            "rpm_min":      self.rpm_min.value(),
            "rpm_max":      self.rpm_max.value(),
        })
        self.accept()
