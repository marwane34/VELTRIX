"""Vibration Time-Domain Chart — 3-axis waveform (X=blue, Y=green, Z=yellow)."""

import numpy as np
import pyqtgraph as pg
from PySide6.QtWidgets import QWidget, QVBoxLayout, QLabel, QHBoxLayout
from PySide6.QtCore import Qt

pg.setConfigOptions(antialias=True, useOpenGL=False)

BG    = "#0d1420"
GRID  = "#1a2540"
AXIS  = "#4a5f7a"
BLUE  = "#3b82f6"
GREEN = "#22c55e"
YELL  = "#eab308"


class VibrationChart(QWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        self._setup_ui()

    def _setup_ui(self):
        lay = QVBoxLayout(self)
        lay.setContentsMargins(0, 0, 0, 0)
        lay.setSpacing(0)

        self.plot = pg.PlotWidget(background=BG)
        self.plot.setMenuEnabled(False)
        self.plot.hideButtons()
        self.plot.setMouseEnabled(x=False, y=False)
        self.plot.showGrid(x=True, y=True, alpha=0.15)
        self.plot.setLabel("left", "Amplitude", units="g",
                           **{"color": AXIS, "font-size": "9px"})
        self.plot.setLabel("bottom", "Time", units="s",
                           **{"color": AXIS, "font-size": "9px"})
        self.plot.getAxis("left").setPen(pg.mkPen(AXIS))
        self.plot.getAxis("bottom").setPen(pg.mkPen(AXIS))
        self.plot.getAxis("left").setTextPen(pg.mkPen(AXIS))
        self.plot.getAxis("bottom").setTextPen(pg.mkPen(AXIS))
        self.plot.setYRange(-4.5, 4.5, padding=0)
        self.plot.setXRange(0, 6, padding=0)

        self._curve_x = self.plot.plot(pen=pg.mkPen(BLUE,  width=1.2))
        self._curve_y = self.plot.plot(pen=pg.mkPen(GREEN, width=1.2))

        # Legend labels
        legend_row = QHBoxLayout()
        legend_row.setContentsMargins(8, 2, 8, 2)
        legend_row.setSpacing(10)
        for color, label in [(BLUE, "X Axis"), (GREEN, "Y Axis")]:
            dot = QLabel("━━")
            dot.setStyleSheet(f"color:{color}; font-size:9px;")
            lbl = QLabel(label)
            lbl.setStyleSheet(f"color:#64748b; font-size:9px;")
            legend_row.addWidget(dot)
            legend_row.addWidget(lbl)
        legend_row.addStretch()

        from PySide6.QtWidgets import QFrame
        legend_frame = QFrame()
        legend_frame.setLayout(legend_row)
        legend_frame.setStyleSheet("background:#080d14; border-top:1px solid #1a2540;")

        lay.addWidget(self.plot)
        lay.addWidget(legend_frame)

    def update(self, points: list):
        """points: list of (t, x, y) tuples."""
        if not points:
            return
        t_arr = np.array([p[0] for p in points], dtype=np.float32)
        x_arr = np.array([p[1] for p in points], dtype=np.float32)
        y_arr = np.array([p[2] for p in points], dtype=np.float32)
        self._curve_x.setData(t_arr, x_arr)
        self._curve_y.setData(t_arr, y_arr)
