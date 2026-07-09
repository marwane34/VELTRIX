"""Export dialog — CSV and PDF report generation."""

import os
import csv
from datetime import datetime
from PySide6.QtWidgets import (
    QDialog, QVBoxLayout, QHBoxLayout, QLabel, QLineEdit,
    QPushButton, QFrame, QComboBox, QProgressBar, QFileDialog, QMessageBox
)
from PySide6.QtCore import Qt, Signal, QThread, QObject


class ExportWorker(QObject):
    finished = Signal(str)
    error    = Signal(str)

    def __init__(self, db, machine: dict, fmt: str, hours: int, out_dir: str):
        super().__init__()
        self.db = db
        self.machine = machine
        self.fmt = fmt
        self.hours = hours
        self.out_dir = out_dir

    def run(self):
        try:
            os.makedirs(self.out_dir, exist_ok=True)
            name_safe = self.machine["name"].replace(" ", "_")
            ts = datetime.now().strftime("%Y%m%d_%H%M%S")
            snapshots = self.db.get_snapshots(self.machine["id"], self.hours)

            if self.fmt == "CSV":
                path = os.path.join(self.out_dir, f"{name_safe}_{ts}.csv")
                self._export_csv(snapshots, path)
            else:
                path = os.path.join(self.out_dir, f"{name_safe}_{ts}.pdf")
                self._export_pdf(snapshots, path)

            self.finished.emit(path)
        except Exception as e:
            self.error.emit(str(e))

    def _export_csv(self, snapshots: list, path: str):
        fields = ["recorded_at", "temperature", "vibration_rms", "rms_x", "rms_y",
                  "current", "rpm", "voltage"]
        with open(path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fields)
            writer.writeheader()
            for s in snapshots:
                writer.writerow({k: s.get(k, "") for k in fields})

    def _export_pdf(self, snapshots: list, path: str):
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Table, TableStyle, Spacer
        from reportlab.lib import colors
        from reportlab.lib.units import mm

        doc = SimpleDocTemplate(path, pagesize=A4,
                                leftMargin=15*mm, rightMargin=15*mm,
                                topMargin=15*mm, bottomMargin=15*mm)
        styles = getSampleStyleSheet()
        story  = []

        # Title
        story.append(Paragraph(
            f"<b>Predictive Maintenance Report</b>",
            styles["Title"]
        ))
        story.append(Paragraph(
            f"Machine: {self.machine['name']}  |  "
            f"Location: {self.machine.get('location','—')}  |  "
            f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            styles["Normal"]
        ))
        story.append(Spacer(1, 8*mm))

        # Thresholds
        story.append(Paragraph("<b>Configured Thresholds</b>", styles["Heading2"]))
        thr_data = [
            ["Parameter", "Min", "Max"],
            ["Vibration RMS (g)", self.machine["rms_min"], self.machine["rms_max"]],
            ["Temperature (°C)",  self.machine["temp_min"],  self.machine["temp_max"]],
            ["Current (A)",       self.machine["current_min"], self.machine["current_max"]],
        ]
        tbl = Table(thr_data, colWidths=[80*mm, 40*mm, 40*mm])
        tbl.setStyle(TableStyle([
            ("BACKGROUND", (0,0), (-1,0), colors.HexColor("#1e2d45")),
            ("TEXTCOLOR",  (0,0), (-1,0), colors.white),
            ("ALIGN",      (0,0), (-1,-1), "CENTER"),
            ("GRID",       (0,0), (-1,-1), 0.5, colors.HexColor("#1e2d45")),
        ]))
        story.append(tbl)
        story.append(Spacer(1, 6*mm))

        # Data table (last 50 rows)
        story.append(Paragraph("<b>Sensor Data (Recent)</b>", styles["Heading2"]))
        headers = ["Timestamp", "Temp (°C)", "Vib RMS", "Current (A)", "RPM"]
        rows = [headers]
        for s in snapshots[-50:]:
            rows.append([
                s["recorded_at"][:19].replace("T", " "),
                f"{s['temperature']:.1f}",
                f"{s['vibration_rms']:.3f}",
                f"{s['current']:.2f}",
                str(s["rpm"]),
            ])
        data_tbl = Table(rows, colWidths=[55*mm, 30*mm, 25*mm, 30*mm, 25*mm])
        data_tbl.setStyle(TableStyle([
            ("BACKGROUND", (0,0), (-1,0), colors.HexColor("#0d1f3c")),
            ("TEXTCOLOR",  (0,0), (-1,0), colors.white),
            ("ALIGN",      (0,0), (-1,-1), "CENTER"),
            ("FONTSIZE",   (0,0), (-1,-1), 7),
            ("GRID",       (0,0), (-1,-1), 0.25, colors.HexColor("#1e2d45")),
            ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.HexColor("#080d14"), colors.HexColor("#0d1420")]),
        ]))
        story.append(data_tbl)

        doc.build(story)


class ExportDialog(QDialog):
    def __init__(self, db_manager, machine: dict, parent=None):
        super().__init__(parent)
        self.db = db_manager
        self.machine = machine
        self.setWindowTitle("Export Data")
        self.setFixedSize(420, 320)
        self._setup_ui()

    def _setup_ui(self):
        root = QVBoxLayout(self)
        root.setContentsMargins(0, 0, 0, 0)
        root.setSpacing(0)

        hdr = QFrame()
        hdr.setFixedHeight(36)
        hdr.setStyleSheet(
            "background:qlineargradient(x1:0,y1:0,x2:0,y2:1,stop:0 #151f33,stop:1 #0f1726);"
            "border-bottom:1px solid #1e2d45;"
        )
        hl = QHBoxLayout(hdr)
        hl.setContentsMargins(12, 0, 8, 0)
        hl.addWidget(QLabel("⬇  EXPORT DATA"))
        root.addWidget(hdr)

        content = QFrame()
        content.setStyleSheet("background:#0e1726;")
        cl = QVBoxLayout(content)
        cl.setContentsMargins(20, 20, 20, 20)
        cl.setSpacing(12)

        name = self.machine["name"] if self.machine else "No machine"
        cl.addWidget(QLabel(f"Machine: <b>{name}</b>"))

        row1 = QHBoxLayout()
        row1.addWidget(QLabel("Format:"))
        self.fmt = QComboBox(); self.fmt.addItems(["CSV", "PDF"])
        row1.addWidget(self.fmt)
        cl.addLayout(row1)

        row2 = QHBoxLayout()
        row2.addWidget(QLabel("Time Range:"))
        self.range_cb = QComboBox()
        self.range_cb.addItems(["Last 1 hour","Last 24 hours","Last 7 days","Last 30 days"])
        self.range_cb.setCurrentIndex(1)
        row2.addWidget(self.range_cb)
        cl.addLayout(row2)

        row3 = QHBoxLayout()
        row3.addWidget(QLabel("Output Dir:"))
        self.out_dir = QLineEdit("exports")
        browse = QPushButton("Browse")
        browse.clicked.connect(self._browse)
        row3.addWidget(self.out_dir, 1)
        row3.addWidget(browse)
        cl.addLayout(row3)

        self.progress = QProgressBar()
        self.progress.setRange(0, 0)
        self.progress.hide()
        cl.addWidget(self.progress)

        btn_row = QHBoxLayout()
        btn_row.addStretch()
        cancel = QPushButton("Cancel"); cancel.clicked.connect(self.reject)
        self.export_btn = QPushButton("Export")
        self.export_btn.setStyleSheet(
            "QPushButton{background:qlineargradient(x1:0,y1:0,x2:0,y2:1,stop:0 #1d4ed8,stop:1 #1e3a8a);"
            "border:1px solid #3b82f6; color:#e0f2fe; font-weight:bold; padding:5px 20px;}"
        )
        self.export_btn.clicked.connect(self._do_export)
        btn_row.addWidget(cancel)
        btn_row.addWidget(self.export_btn)
        cl.addLayout(btn_row)
        cl.addStretch()
        root.addWidget(content, 1)

    def _browse(self):
        d = QFileDialog.getExistingDirectory(self, "Select Output Directory")
        if d:
            self.out_dir.setText(d)

    def _do_export(self):
        if not self.machine:
            QMessageBox.warning(self, "Error", "No machine selected.")
            return
        hours_map = {0: 1, 1: 24, 2: 168, 3: 720}
        hours = hours_map[self.range_cb.currentIndex()]

        self.export_btn.setEnabled(False)
        self.progress.show()

        worker = ExportWorker(
            self.db, self.machine,
            self.fmt.currentText(), hours, self.out_dir.text()
        )
        self._thread = QThread()
        worker.moveToThread(self._thread)
        self._thread.started.connect(worker.run)
        worker.finished.connect(self._on_done)
        worker.error.connect(self._on_error)
        worker.finished.connect(self._thread.quit)
        worker.error.connect(self._thread.quit)
        self._thread.start()
        self._worker = worker

    def _on_done(self, path: str):
        self.progress.hide()
        self.export_btn.setEnabled(True)
        QMessageBox.information(self, "Export Complete", f"File saved:\n{path}")
        self.accept()

    def _on_error(self, msg: str):
        self.progress.hide()
        self.export_btn.setEnabled(True)
        QMessageBox.critical(self, "Export Error", msg)
