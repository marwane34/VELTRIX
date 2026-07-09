"""Temperature Trend Chart — heat-zone background (green/yellow/red) with line overlay."""

import numpy as np
import pyqtgraph as pg
from PySide6.QtWidgets import QWidget, QVBoxLayout
from PySide6.QtGui import QLinearGradient, QColor, QBrush
from PySide6.QtCore import QRectF

BG   = "#0d1420"
AXIS = "#4a5f7a"


class TemperatureChart(QWidget):
    def __init__(self, parent=None):
        super().__init__(parent)
        self._temp_min = 20.0
        self._temp_max = 85.0
        self._setup_ui()

    def _setup_ui(self):
        lay = QVBoxLayout(self)
        lay.setContentsMargins(0, 0, 0, 0)

        self.plot = pg.PlotWidget(background=BG)
        self.plot.setMenuEnabled(False)
        self.plot.hideButtons()
        self.plot.setMouseEnabled(x=False, y=False)
        self.plot.getAxis("left").setPen(pg.mkPen(AXIS))
        self.plot.getAxis("bottom").setPen(pg.mkPen(AXIS))
        self.plot.getAxis("left").setTextPen(pg.mkPen(AXIS))
        self.plot.getAxis("bottom").setTextPen(pg.mkPen(AXIS))
        self.plot.setLabel("bottom", "Time", **{"color": AXIS, "font-size": "9px"})

        # Zone fills (pyqtgraph 0.13.x: pass pen/brush in constructor)
        for bounds, color, orientation in [
            ((self._temp_min, self._temp_min + (self._temp_max - self._temp_min) * 0.4),
             (34, 197, 94, 60), 'horizontal'),   # green zone
            ((self._temp_min + (self._temp_max - self._temp_min) * 0.4,
              self._temp_min + (self._temp_max - self._temp_min) * 0.7),
             (234, 179, 8, 60), 'horizontal'),   # yellow zone
            ((self._temp_min + (self._temp_max - self._temp_min) * 0.7,
              self._temp_max + (self._temp_max - self._temp_min) * 0.2),
             (239, 68, 68, 60), 'horizontal'),   # red zone
        ]:
            item = pg.LinearRegionItem(
                values=bounds,
                orientation=orientation,
                movable=False,
                pen=None,
                brush=pg.mkBrush(*color),
            )
            self.plot.addItem(item)
            if color[1] == 197:
                self._zone_green = item
            elif color[1] == 179:
                self._zone_yellow = item
            else:
                self._zone_red = item

        # Main temperature line
        self._curve = self.plot.plot(pen=pg.mkPen("#facc15", width=2))

        # Dot markers
        self._dots = pg.ScatterPlotItem(pen=pg.mkPen(None), brush=pg.mkBrush("#facc15"), size=5)
        self.plot.addItem(self._dots)

        # High labels
        self._lbl_high1 = pg.TextItem("High", color=AXIS, anchor=(1, 0.5))
        self._lbl_high2 = pg.TextItem("High", color=AXIS, anchor=(1, 0.5))
        self.plot.addItem(self._lbl_high1)
        self.plot.addItem(self._lbl_high2)

        lay.addWidget(self.plot)
        self._update_zones()

    def set_thresholds(self, temp_min: float, temp_max: float):
        self._temp_min = temp_min
        self._temp_max = temp_max
        self._update_zones()

    def _update_zones(self):
        lo = self._temp_min
        hi = self._temp_max
        mid = lo + (hi - lo) * 0.4
        warn = lo + (hi - lo) * 0.7

        # pyqtgraph 0.13.x: setRegion is still valid
        self._zone_green.setRegion((lo, mid))
        self._zone_yellow.setRegion((mid, warn))
        self._zone_red.setRegion((warn, hi + (hi - lo) * 0.15))
        self.plot.setYRange(lo - 2, hi + (hi - lo) * 0.2, padding=0)

    def update(self, points: list, temperature: float):
        """points: list of (index, value) tuples."""
        if not points:
            return
        xs = np.array([p[0] for p in points], dtype=np.float32)
        ys = np.array([p[1] for p in points], dtype=np.float32)
        self.plot.setXRange(xs[0], xs[-1], padding=0.05)
        self._curve.setData(xs, ys)

        # Scatter dots every N points
        n = max(1, len(points) // 5)
        dot_x = xs[::n]; dot_y = ys[::n]
        self._dots.setData(dot_x, dot_y)

        # Labels
        lo = self._temp_min; hi = self._temp_max
        mid = lo + (hi - lo) * 0.4
        warn = lo + (hi - lo) * 0.7
        x_end = xs[-1] if len(xs) else 0
        self._lbl_high1.setPos(x_end * 0.1, warn + (hi - warn) / 2)
        self._lbl_high2.setPos(x_end * 0.1, mid + (warn - mid) / 2)
