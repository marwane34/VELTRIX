"""Current Trend Chart — white line on dark background with dashed threshold grid."""

import numpy as np
import pyqtgraph as pg
from PySide6.QtWidgets import QWidget, QVBoxLayout

BG   = "#0d1420"
AXIS = "#4a5f7a"
GRID = "#1a2540"


class CurrentChart(QWidget):
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
        self.plot.showGrid(x=True, y=True, alpha=0.12)
        self.plot.setLabel("left",   "Current", units="A", **{"color": AXIS, "font-size": "9px"})
        self.plot.setLabel("bottom", "Time",               **{"color": AXIS, "font-size": "9px"})
        self.plot.getAxis("left").setPen(pg.mkPen(AXIS))
        self.plot.getAxis("bottom").setPen(pg.mkPen(AXIS))
        self.plot.getAxis("left").setTextPen(pg.mkPen(AXIS))
        self.plot.getAxis("bottom").setTextPen(pg.mkPen(AXIS))
        self.plot.setYRange(0, 5, padding=0.05)

        # Main current line (white/light)
        self._curve = self.plot.plot(pen=pg.mkPen("#d1d5db", width=1.5))

        # Max threshold dashed line
        self._threshold_line = pg.InfiniteLine(
            pos=5.0, angle=0, movable=False,
            pen=pg.mkPen("#ef4444", width=1, style=pg.QtCore.Qt.DashLine))
        self.plot.addItem(self._threshold_line)

        lay.addWidget(self.plot)

    def set_max_current(self, max_a: float):
        self._threshold_line.setPos(max_a)
        self.plot.setYRange(0, max_a * 1.15, padding=0.05)

    def update(self, points: list):
        """points: list of (index, value) tuples."""
        if not points:
            return
        xs = np.array([p[0] for p in points], dtype=np.float32)
        ys = np.array([p[1] for p in points], dtype=np.float32)
        self.plot.setXRange(xs[0], xs[-1], padding=0.05)
        self._curve.setData(xs, ys)
