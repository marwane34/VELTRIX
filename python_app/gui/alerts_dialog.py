"""Alerts history dialog — view, filter, delete alerts."""

from PySide6.QtWidgets import (
    QDialog, QVBoxLayout, QHBoxLayout, QLabel,
    QPushButton, QFrame, QTableWidget, QTableWidgetItem,
    QHeaderView, QComboBox
)
from PySide6.QtCore import Qt
from PySide6.QtGui import QColor


class AlertsDialog(QDialog):
    def __init__(self, db_manager, machines: list, parent=None):
        super().__init__(parent)
        self.db = db_manager
        self.machines = machines
        self.setWindowTitle("Alert History")
        self.setMinimumSize(800, 550)
        self._setup_ui()
        self._load_alerts()

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
        hl.addWidget(QLabel("🔔  ALERT HISTORY"))

        self.machine_filter = QComboBox()
        self.machine_filter.addItem("All Machines", None)
        for m in self.machines:
            self.machine_filter.addItem(m["name"], m["id"])
        self.machine_filter.currentIndexChanged.connect(self._load_alerts)
        hl.addStretch()
        hl.addWidget(QLabel("Filter:"))
        hl.addWidget(self.machine_filter)

        mark_read = QPushButton("Mark All Read")
        mark_read.clicked.connect(self._mark_all_read)
        hl.addWidget(mark_read)

        close = QPushButton("✕")
        close.setFixedSize(24, 24)
        close.setStyleSheet("QPushButton{background:transparent;border:none;color:#64748b;}"
                            "QPushButton:hover{color:#f87171;}")
        close.clicked.connect(self.accept)
        hl.addWidget(close)
        root.addWidget(hdr)

        # Table
        self.table = QTableWidget()
        self.table.setColumnCount(6)
        self.table.setHorizontalHeaderLabels(["Time", "Machine", "Type", "Severity", "Message", ""])
        self.table.horizontalHeader().setSectionResizeMode(4, QHeaderView.Stretch)
        self.table.setSelectionBehavior(QTableWidget.SelectRows)
        self.table.setEditTriggers(QTableWidget.NoEditTriggers)
        self.table.verticalHeader().setVisible(False)
        root.addWidget(self.table, 1)

        # Footer stats
        self.stats_lbl = QLabel("")
        self.stats_lbl.setStyleSheet("color:#64748b; font-size:10px; padding:4px 12px;")
        root.addWidget(self.stats_lbl)

    def _load_alerts(self):
        mid = self.machine_filter.currentData()
        alerts = self.db.get_alerts(machine_id=mid, limit=100)
        self.table.setRowCount(0)
        for a in alerts:
            row = self.table.rowCount()
            self.table.insertRow(row)

            ts = a["created_at"][:19].replace("T", " ")
            self.table.setItem(row, 0, QTableWidgetItem(ts))
            self.table.setItem(row, 1, QTableWidgetItem(a["machine_name"]))
            self.table.setItem(row, 2, QTableWidgetItem(a["type"].replace("_", " ")))

            sev_item = QTableWidgetItem(a["severity"].upper())
            color = {"critical": "#f87171", "warning": "#facc15", "info": "#60a5fa"}.get(a["severity"], "#64748b")
            sev_item.setForeground(QColor(color))
            self.table.setItem(row, 3, sev_item)
            self.table.setItem(row, 4, QTableWidgetItem(a["message"]))

            del_btn = QPushButton("✕")
            del_btn.setFixedSize(22, 20)
            del_btn.setStyleSheet("QPushButton{background:transparent;border:none;color:#64748b;}"
                                  "QPushButton:hover{color:#f87171;}")
            del_btn.setProperty("alert_id", a["id"])
            del_btn.clicked.connect(self._delete_alert)
            self.table.setCellWidget(row, 5, del_btn)

            if not a["is_read"]:
                for col in range(5):
                    item = self.table.item(row, col)
                    if item:
                        item.setBackground(QColor(59, 130, 246, 12))

        total = len(alerts)
        crit  = sum(1 for a in alerts if a["severity"] == "critical")
        warn  = sum(1 for a in alerts if a["severity"] == "warning")
        unread = sum(1 for a in alerts if not a["is_read"])
        self.stats_lbl.setText(
            f"Total: {total}   Critical: {crit}   Warning: {warn}   Unread: {unread}"
        )

    def _mark_all_read(self):
        mid = self.machine_filter.currentData()
        self.db.mark_alerts_read(mid)
        self._load_alerts()

    def _delete_alert(self):
        btn = self.sender()
        aid = btn.property("alert_id")
        self.db.delete_alert(aid)
        self._load_alerts()
