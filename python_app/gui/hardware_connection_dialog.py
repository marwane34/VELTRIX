"""
Hardware Connection Dialog
==========================
Professional dialog for ESP32 serial connection management.
"""

import time
from datetime import datetime
from typing import Optional

from PySide6.QtWidgets import (
    QDialog, QVBoxLayout, QHBoxLayout, QLabel,
    QPushButton, QComboBox, QFrame, QGridLayout,
    QTextEdit, QGroupBox, QSpinBox
)
from PySide6.QtCore import Qt, QTimer, Signal
from PySide6.QtGui import QTextCursor, QColor

from hardware.serial_manager import SerialManager, list_available_ports


class StatusIndicator(QFrame):
    """LED-style status indicator with label."""

    def __init__(self, label: str = "Status", parent=None):
        super().__init__(parent)
        self._setup_ui(label)
        self.set_status("disconnected")

    def _setup_ui(self, label: str):
        lay = QHBoxLayout(self)
        lay.setContentsMargins(0, 0, 0, 0)
        lay.setSpacing(8)

        self._led = QLabel("●")
        self._led.setFixedSize(20, 20)
        self._led.setAlignment(Qt.AlignCenter)
        self._led.setStyleSheet("font-size: 14px;")

        self._lbl = QLabel(label)
        self._lbl.setStyleSheet("color: #94a3b8; font-size: 11px;")

        lay.addWidget(self._led)
        lay.addWidget(self._lbl)
        lay.addStretch()

    def set_status(self, status: str):
        """Set status: 'connected', 'waiting', or 'disconnected'."""
        colors = {
            "connected":  ("#22c55e", "Connected"),
            "waiting":    ("#f97316", "Waiting..."),
            "disconnected": ("#ef4444", "Disconnected"),
        }
        color, text = colors.get(status, ("#64748b", "Unknown"))
        self._led.setStyleSheet(f"font-size: 14px; color: {color};")
        self._lbl.setText(text)


class HardwareConnectionDialog(QDialog):
    """
    Dialog for managing serial connection to ESP32.
    """

    # Signal emitted when a valid sensor packet is received
    sensor_data_received = Signal(dict)
    # Signal for connection state changes
    connection_changed = Signal(bool)

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("Hardware Connection")
        self.setMinimumSize(550, 620)
        self.setWindowFlags(Qt.Dialog | Qt.WindowCloseButtonHint)

        # Serial manager
        self._manager = SerialManager(self)
        self._manager.connected.connect(self._on_connected)
        self._manager.disconnected.connect(self._on_disconnected)
        self._manager.error.connect(self._on_error)
        self._manager.packet_ready.connect(self._on_packet)
        self._manager.stats_updated.connect(self._on_stats)

        # Connection start time
        self._connect_start: Optional[float] = None

        # Timer for connection duration
        self._duration_timer = QTimer(self)
        self._duration_timer.setInterval(1000)
        self._duration_timer.timeout.connect(self._update_duration)

        self._setup_ui()
        self._refresh_ports()

    def _setup_ui(self):
        root = QVBoxLayout(self)
        root.setContentsMargins(0, 0, 0, 0)
        root.setSpacing(0)

        # ── Header ───────────────────────────────────────────────────────
        header = QFrame()
        header.setFixedHeight(42)
        header.setStyleSheet(
            "background: qlineargradient(x1:0,y1:0,x2:0,y2:1,stop:0 #151f33,stop:1 #0f1726);"
            "border-bottom: 1px solid #1e2d45;"
        )
        hl = QHBoxLayout(header)
        hl.setContentsMargins(16, 0, 12, 0)

        icon = QLabel("🔌")
        icon.setStyleSheet("font-size: 16px;")
        title = QLabel("HARDWARE CONNECTION")
        title.setStyleSheet(
            "color: #e2e8f0; font-size: 12px; font-weight: bold; letter-spacing: 2px;"
        )

        hl.addWidget(icon)
        hl.addWidget(title)
        hl.addStretch()

        close_btn = QPushButton("✕")
        close_btn.setFixedSize(28, 28)
        close_btn.setStyleSheet(
            "QPushButton{background:transparent;border:none;color:#64748b;font-size:12px;}"
            "QPushButton:hover{color:#f87171;}"
        )
        close_btn.clicked.connect(self._on_close)
        hl.addWidget(close_btn)

        root.addWidget(header)

        # ── Content ────────────────────────────────────────────────────────
        content = QFrame()
        content.setStyleSheet("background: #0e1726;")
        cl = QVBoxLayout(content)
        cl.setContentsMargins(20, 20, 20, 20)
        cl.setSpacing(16)

        # ── Connection Settings Group ──────────────────────────────────────
        settings_group = QGroupBox("Connection Settings")
        settings_group.setStyleSheet(
            "QGroupBox{color: #94a3b8; font-size: 10px; font-weight: bold; border: 1px solid #1e2d45; "
            "border-radius: 4px; margin-top: 12px; padding-top: 8px;}"
            "QGroupBox::title{subcontrol-origin: margin; left: 10px; padding: 0 4px;}"
        )
        sl = QGridLayout(settings_group)
        sl.setContentsMargins(12, 16, 12, 12)
        sl.setSpacing(10)

        # COM Port selector
        sl.addWidget(QLabel("COM Port:"), 0, 0)
        self._port_combo = QComboBox()
        self._port_combo.setMinimumWidth(120)
        self._port_combo.setStyleSheet(
            "QComboBox{background: #060b14; border: 1px solid #1e2d45; padding: 4px 8px;}"
            "QComboBox::drop-down{border:none;}"
            "QComboBox QAbstractItemView{background: #0d1420; border: 1px solid #1e2d45;}"
        )
        sl.addWidget(self._port_combo, 0, 1)

        refresh_btn = QPushButton("🔄")
        refresh_btn.setFixedSize(32, 28)
        refresh_btn.setToolTip("Refresh ports")
        refresh_btn.clicked.connect(self._refresh_ports)
        sl.addWidget(refresh_btn, 0, 2)

        # Baud Rate
        sl.addWidget(QLabel("Baud Rate:"), 1, 0)
        self._baud_combo = QComboBox()
        self._baud_combo.addItems(["9600", "19200", "38400", "57600", "115200", "230400", "460800"])
        self._baud_combo.setCurrentText("115200")
        self._baud_combo.setStyleSheet(self._port_combo.styleSheet())
        sl.addWidget(self._baud_combo, 1, 1)

        # Connect / Disconnect buttons
        btn_row = QHBoxLayout()
        btn_row.setSpacing(8)

        self._connect_btn = QPushButton("Connect")
        self._connect_btn.setStyleSheet(
            "QPushButton{background: qlineargradient(x1:0,y1:0,x2:0,y2:1,stop:0 #1d4ed8,stop:1 #1e3a8a);"
            "border: 1px solid #3b82f6; color: #e0f2fe; font-weight: bold; padding: 6px 20px;}"
            "QPushButton:hover{background: qlineargradient(x1:0,y1:0,x2:0,y2:1,stop:0 #2563eb,stop:1 #1d4ed8);}"
        )
        self._connect_btn.clicked.connect(self._connect)

        self._disconnect_btn = QPushButton("Disconnect")
        self._disconnect_btn.setEnabled(False)
        self._disconnect_btn.setStyleSheet(
            "QPushButton{background: transparent; border: 1px solid #7f1d1d; color: #f87171; padding: 6px 16px;}"
            "QPushButton:hover{background: rgba(239,68,68,0.1);}"
            "QPushButton:disabled{border-color: #1e2d45; color: #4a5f7a;}"
        )
        self._disconnect_btn.clicked.connect(self._disconnect)

        btn_row.addStretch()
        btn_row.addWidget(self._connect_btn)
        btn_row.addWidget(self._disconnect_btn)
        sl.addLayout(btn_row, 2, 0, 1, 3)

        cl.addWidget(settings_group)

        # ── Status Group ───────────────────────────────────────────────────
        status_group = QGroupBox("Connection Status")
        status_group.setStyleSheet(settings_group.styleSheet())
        stl = QGridLayout(status_group)
        stl.setContentsMargins(12, 16, 12, 12)
        stl.setSpacing(8)

        self._status_indicator = StatusIndicator("Disconnected")
        stl.addWidget(self._status_indicator, 0, 0, 1, 2)

        # Connected port
        stl.addWidget(self._muted_label("Connected Port:"), 1, 0)
        self._connected_port_lbl = QLabel("—")
        self._connected_port_lbl.setStyleSheet("color: #e2e8f0; font-weight: bold;")
        stl.addWidget(self._connected_port_lbl, 1, 1)

        # Connection time
        stl.addWidget(self._muted_label("Duration:"), 2, 0)
        self._duration_lbl = QLabel("—")
        self._duration_lbl.setStyleSheet("color: #22c55e;")
        stl.addWidget(self._duration_lbl, 2, 1)

        # Packet counter
        stl.addWidget(self._muted_label("Packets:"), 3, 0)
        self._packet_count_lbl = QLabel("0")
        self._packet_count_lbl.setStyleSheet("color: #3b82f6; font-weight: bold;")
        stl.addWidget(self._packet_count_lbl, 3, 1)

        cl.addWidget(status_group)

        # ── Last Received Packet Group ──────────────────────────────────────
        packet_group = QGroupBox("Last Received Packet")
        packet_group.setStyleSheet(settings_group.styleSheet())
        pl = QVBoxLayout(packet_group)
        pl.setContentsMargins(12, 16, 12, 12)
        pl.setSpacing(6)

        self._last_packet_lbl = QLabel("No data received yet")
        self._last_packet_lbl.setStyleSheet(
            "color: #94a3b8; font-family: 'Consolas', monospace; font-size: 11px; "
            "background: #060b14; border: 1px solid #1a2540; padding: 8px;"
        )
        self._last_packet_lbl.setWordWrap(True)
        self._last_packet_lbl.setMinimumHeight(50)
        pl.addWidget(self._last_packet_lbl)

        cl.addWidget(packet_group)

        # ── Communication Log ──────────────────────────────────────────────
        log_group = QGroupBox("Communication Log")
        log_group.setStyleSheet(settings_group.styleSheet())
        ll = QVBoxLayout(log_group)
        ll.setContentsMargins(12, 16, 12, 12)
        ll.setSpacing(6)

        self._log_text = QTextEdit()
        self._log_text.setReadOnly(True)
        self._log_text.setStyleSheet(
            "background: #060b14; border: 1px solid #1a2540; color: #94a3b8; "
            "font-family: 'Consolas', monospace; font-size: 10px;"
        )
        self._log_text.setMinimumHeight(120)
        ll.addWidget(self._log_text)

        clear_btn = QPushButton("Clear Log")
        clear_btn.setStyleSheet(
            "QPushButton{background: transparent; border: 1px solid #1e2d45; color: #64748b; padding: 4px 12px;}"
            "QPushButton:hover{border-color: #3b82f6; color: #94a3b8;}"
        )
        clear_btn.clicked.connect(self._clear_log)
        ll.addWidget(clear_btn, alignment=Qt.AlignRight)

        cl.addWidget(log_group, 1)
        cl.addStretch()

        root.addWidget(content, 1)

        # Apply dark dialog style
        self.setStyleSheet(
            "QDialog{background: #0e1726;}"
            "QLabel{background: transparent;}"
            "QGroupBox{background: transparent;}"
        )

    def _muted_label(self, text: str) -> QLabel:
        lbl = QLabel(text)
        lbl.setStyleSheet("color: #64748b; font-size: 11px;")
        return lbl

    def _refresh_ports(self):
        """Refresh list of available COM ports."""
        self._port_combo.clear()
        ports = self._manager.get_available_ports()
        if ports:
            self._port_combo.addItems(ports)
            self._log(f"Found {len(ports)} port(s): {', '.join(ports)}")
        else:
            self._port_combo.addItem("No ports found")
            self._log("No COM ports detected")

    def _connect(self):
        """Initiate serial connection."""
        port = self._port_combo.currentText()
        if not port or port == "No ports found":
            self._log("Error: No port selected")
            return

        baud = int(self._baud_combo.currentText())

        self._log(f"Connecting to {port} @ {baud}...")
        self._status_indicator.set_status("waiting")
        self._connect_btn.setEnabled(False)

        self._manager.connect(port, baud)

    def _disconnect(self):
        """Disconnect from serial port."""
        self._manager.disconnect()
        self._log("Disconnected")

    def _on_connected(self, port: str):
        """Handle successful connection."""
        self._status_indicator.set_status("connected")
        self._connected_port_lbl.setText(port)
        self._connect_start = time.time()
        self._duration_timer.start()
        self._connect_btn.setEnabled(False)
        self._disconnect_btn.setEnabled(True)
        self._log(f"✓ Connected to {port}")
        self.connection_changed.emit(True)

    def _on_disconnected(self):
        """Handle disconnection."""
        self._status_indicator.set_status("disconnected")
        self._connected_port_lbl.setText("—")
        self._duration_timer.stop()
        self._connect_start = None
        self._connect_btn.setEnabled(True)
        self._disconnect_btn.setEnabled(False)
        self.connection_changed.emit(False)

    def _on_error(self, msg: str):
        """Handle error message."""
        self._log(f"⚠ {msg}")
        if self._manager.is_connected:
            self._status_indicator.set_status("waiting")

    def _on_packet(self, packet):
        """Handle received sensor packet."""
        # Format packet for display
        data_str = (
            f"Temperature: {packet.temperature:.2f}°C   "
            f"Current: {packet.current:.2f} A   "
            f"Vibration: {packet.vibration:.3f} g   "
            f"RPM: {packet.rpm}"
        )
        self._last_packet_lbl.setText(data_str)
        self._last_packet_lbl.setStyleSheet(
            self._last_packet_lbl.styleSheet().replace("color: #94a3b8", "color: #e2e8f0")
        )

        # Emit signal with dict for dashboard
        self.sensor_data_received.emit({
            "temperature": packet.temperature,
            "current": packet.current,
            "vibration": packet.vibration,
            "rpm": packet.rpm,
            "timestamp": packet.timestamp,
        })

    def _on_stats(self, packets: int, bytes_count: int, last_raw: str):
        """Handle stats update."""
        self._packet_count_lbl.setText(str(packets))

    def _update_duration(self):
        """Update connection duration display."""
        if self._connect_start:
            elapsed = int(time.time() - self._connect_start)
            h, rem = divmod(elapsed, 3600)
            m, s = divmod(rem, 60)
            self._duration_lbl.setText(f"{h:02d}:{m:02d}:{s:02d}")

    def _log(self, msg: str):
        """Add message to communication log."""
        ts = datetime.now().strftime("%H:%M:%S")
        self._log_text.append(f"[{ts}] {msg}")
        # Auto-scroll to bottom
        cursor = self._log_text.textCursor()
        cursor.movePosition(QTextCursor.End)
        self._log_text.setTextCursor(cursor)

    def _clear_log(self):
        """Clear communication log."""
        self._log_text.clear()
        self._log("Log cleared")

    def _on_close(self):
        """Handle dialog close - don't disconnect, just hide."""
        self.hide()

    def closeEvent(self, event):
        """Override close event to hide instead of close."""
        event.ignore()
        self.hide()

    def get_manager(self) -> SerialManager:
        """Return the serial manager instance."""
        return self._manager
