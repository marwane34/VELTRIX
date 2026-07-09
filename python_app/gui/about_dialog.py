"""
VELTRIX About Dialog
====================
Displays application branding, version, and credits.
"""

import os
from PySide6.QtWidgets import (
    QDialog, QVBoxLayout, QHBoxLayout, QLabel,
    QPushButton, QFrame
)
from PySide6.QtCore import Qt
from PySide6.QtGui import QPixmap, QFont, QFontMetrics

_BASE  = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_ICONS = os.path.join(_BASE, "assets", "icons")


class AboutDialog(QDialog):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowTitle("About VELTRIX")
        self.setFixedSize(420, 370)
        self.setWindowFlags(Qt.Dialog | Qt.WindowCloseButtonHint)
        self._setup_ui()

    def _setup_ui(self):
        root = QVBoxLayout(self)
        root.setContentsMargins(0, 0, 0, 0)
        root.setSpacing(0)

        # ── Custom header ─────────────────────────────────────────────────
        header = QFrame()
        header.setFixedHeight(42)
        header.setStyleSheet(
            "background: qlineargradient(x1:0,y1:0,x2:0,y2:1,stop:0 #151f33,stop:1 #0f1726);"
            "border-bottom: 1px solid #1e2d45;"
        )
        hl = QHBoxLayout(header)
        hl.setContentsMargins(14, 0, 10, 0)
        title_lbl = QLabel("About VELTRIX")
        title_lbl.setStyleSheet(
            "color: #e2e8f0; font-size: 12px; font-weight: bold; letter-spacing: 1px;"
        )
        close_btn = QPushButton("✕")
        close_btn.setFixedSize(26, 26)
        close_btn.setStyleSheet(
            "QPushButton{background:transparent;border:none;color:#64748b;font-size:12px;}"
            "QPushButton:hover{color:#f87171;}"
        )
        close_btn.clicked.connect(self.accept)
        hl.addWidget(title_lbl)
        hl.addStretch()
        hl.addWidget(close_btn)
        root.addWidget(header)

        # ── Content ───────────────────────────────────────────────────────
        content = QFrame()
        content.setStyleSheet("background: #0e1726;")
        cl = QVBoxLayout(content)
        cl.setContentsMargins(30, 24, 30, 24)
        cl.setSpacing(0)
        cl.setAlignment(Qt.AlignHCenter)

        # Logo
        logo_lbl = QLabel()
        logo_lbl.setAlignment(Qt.AlignCenter)
        logo_loaded = False
        for fname in ("app.png", "logo_small.png"):
            path = os.path.join(_ICONS, fname)
            if os.path.exists(path):
                pix = QPixmap(path).scaled(80, 80, Qt.KeepAspectRatio, Qt.SmoothTransformation)
                if not pix.isNull():
                    logo_lbl.setPixmap(pix)
                    logo_loaded = True
                    break
        if not logo_loaded:
            logo_lbl.setText("V")
            logo_lbl.setStyleSheet("color: #3b82f6; font-size: 52px; font-weight: bold;")

        logo_lbl.setFixedHeight(90)
        cl.addWidget(logo_lbl)
        cl.addSpacing(8)

        # VELTRIX brand name
        brand = QLabel("VELTRIX")
        brand.setAlignment(Qt.AlignCenter)
        brand.setStyleSheet(
            "color: #e2e8f0; font-size: 22px; font-weight: bold; letter-spacing: 6px;"
        )
        cl.addWidget(brand)
        cl.addSpacing(2)

        # Blue separator
        sep = QFrame()
        sep.setFixedSize(80, 2)
        sep.setStyleSheet("background: qlineargradient(x1:0,y1:0,x2:1,y2:0,"
                          "stop:0 transparent,stop:0.3 #3b82f6,stop:0.7 #06b6d4,stop:1 transparent);")
        sep_row = QHBoxLayout()
        sep_row.addStretch()
        sep_row.addWidget(sep)
        sep_row.addStretch()
        cl.addLayout(sep_row)
        cl.addSpacing(14)

        # App title
        app_title = QLabel("Predictive Maintenance Dashboard")
        app_title.setAlignment(Qt.AlignCenter)
        app_title.setStyleSheet("color: #94a3b8; font-size: 12px;")
        cl.addWidget(app_title)
        cl.addSpacing(4)

        # Version
        version_lbl = QLabel("Version 1.0")
        version_lbl.setAlignment(Qt.AlignCenter)
        version_lbl.setStyleSheet("color: #4a5f7a; font-size: 10px;")
        cl.addWidget(version_lbl)
        cl.addSpacing(14)

        # Description
        desc = QLabel("Industrial AI Monitoring System")
        desc.setAlignment(Qt.AlignCenter)
        desc.setStyleSheet("color: #3b82f6; font-size: 10px; letter-spacing: 1px;")
        cl.addWidget(desc)
        cl.addSpacing(18)

        # Divider
        line = QFrame()
        line.setFrameShape(QFrame.HLine)
        line.setStyleSheet("color: #1e2d45;")
        cl.addWidget(line)
        cl.addSpacing(14)

        # Tech stack
        tech_lbl = QLabel(
            "Developed with Python, PySide6 and PyQtGraph.\n"
            "SQLite · FastAPI · scikit-learn · ReportLab"
        )
        tech_lbl.setAlignment(Qt.AlignCenter)
        tech_lbl.setStyleSheet("color: #4a5f7a; font-size: 9px; line-height: 1.6;")
        tech_lbl.setWordWrap(True)
        cl.addWidget(tech_lbl)
        cl.addStretch()

        # OK button
        ok_btn = QPushButton("OK")
        ok_btn.setFixedSize(100, 30)
        ok_btn.setStyleSheet(
            "QPushButton{background: qlineargradient(x1:0,y1:0,x2:0,y2:1,stop:0 #1d4ed8,stop:1 #1e3a8a);"
            "border: 1px solid #3b82f6; color: #e0f2fe; font-weight: bold;}"
            "QPushButton:hover{background: qlineargradient(x1:0,y1:0,x2:0,y2:1,stop:0 #2563eb,stop:1 #1d4ed8);}"
        )
        ok_btn.clicked.connect(self.accept)
        btn_row = QHBoxLayout()
        btn_row.addStretch()
        btn_row.addWidget(ok_btn)
        btn_row.addStretch()
        cl.addLayout(btn_row)

        root.addWidget(content, 1)
