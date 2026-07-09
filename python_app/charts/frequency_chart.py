"""Vibration Frequency Spectrum Chart — bar graph with fault zone highlighting."""

import numpy as np
import pyqtgraph as pg
from PySide6.QtWidgets import QWidget, QVBoxLayout

BG   = "#0d1420"
AXIS = "#4a5f7a"
GRAY = "#4a5f7a"
BLUE = "#3b82f6"
RED  = "#ef4444"


class FrequencyChart(QWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        self._setup_ui()

    def _setup_ui(self):
        lay = QVBoxLayout(self)
        lay.setContentsMargins(0, 0, 0, 0)

        self.plot = pg.PlotWidget(background=BG)
        self.plot.setMenuEnabled(False)
        self.plot.hideButtons()
        self.plot.setMouseEnabled(x=False, y=False)
        self.plot.showGrid(x=False, y=True, alpha=0.15)
        self.plot.setLabel("left",   "Amplitude", **{"color": AXIS, "font-size": "9px"})
        self.plot.setLabel("bottom", "Frequency", units="Hz", **{"color": AXIS, "font-size": "9px"})
        self.plot.getAxis("left").setPen(pg.mkPen(AXIS))
        self.plot.getAxis("bottom").setPen(pg.mkPen(AXIS))
        self.plot.getAxis("left").setTextPen(pg.mkPen(AXIS))
        self.plot.getAxis("bottom").setTextPen(pg.mkPen(AXIS))
        self.plot.setYRange(0, 1, padding=0.05)
        self.plot.setXRange(0.5, 6.0, padding=0)

        # Annotation text items
        self._rpm1_label = pg.TextItem("1x RPM", color=GRAY, anchor=(0.5, 1))
        self._rpm2_label = pg.TextItem("2x RPM", color=RED,  anchor=(0.5, 1))
        self._fault_label = pg.TextItem("Bearing Fault", color=RED, anchor=(0, 1))
        self._arrow = pg.ArrowItem(angle=-60, tipAngle=30, headLen=12, pen=pg.mkPen(RED), brush=pg.mkBrush(RED))
        self.plot.addItem(self._rpm1_label)
        self.plot.addItem(self._rpm2_label)
        self.plot.addItem(self._fault_label)
        self.plot.addItem(self._arrow)

        self._bars_normal: pg.BarGraphItem = None
        self._bars_fault:  pg.BarGraphItem = None

        lay.addWidget(self.plot)

    def update(self, bars: list):
        """bars: list of (freq, amplitude, is_fault) tuples."""
        if not bars:
            return

        normal_x, normal_h = [], []
        fault_x,  fault_h  = [], []
        for (f, amp, is_fault) in bars:
            if is_fault:
                fault_x.append(f); fault_h.append(amp)
            else:
                normal_x.append(f); normal_h.append(amp)

        # Re-create bar items (fast enough for 25 bars at 5fps)
        if self._bars_normal:
            self.plot.removeItem(self._bars_normal)
        if self._bars_fault:
            self.plot.removeItem(self._bars_fault)

        if normal_x:
            self._bars_normal = pg.BarGraphItem(
                x=normal_x, height=normal_h, width=0.12,
                brush=pg.mkBrush(GRAY), pen=pg.mkPen(None))
            self.plot.addItem(self._bars_normal)

        if fault_x:
            self._bars_fault = pg.BarGraphItem(
                x=fault_x, height=fault_h, width=0.12,
                brush=pg.mkBrush(RED), pen=pg.mkPen(None))
            self.plot.addItem(self._bars_fault)

        # Position annotations
        self._rpm1_label.setPos(1.0, 0.48)
        if fault_h:
            peak_f = fault_x[fault_h.index(max(fault_h))]
            peak_h = max(fault_h)
            self._rpm2_label.setPos(2.05, min(peak_h + 0.06, 0.98))
            self._fault_label.setPos(4.6, 0.98)
            self._arrow.setPos(peak_f, min(peak_h + 0.04, 0.95))
        else:
            self._rpm2_label.setPos(2.0, 0.68)
            self._fault_label.setPos(4.6, 0.60)
            self._arrow.setPos(5.0, 0.56)
