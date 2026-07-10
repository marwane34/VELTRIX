"""
VELTRIX Splash Screen
=====================
Animated splash screen with fade-in/fade-out and cycling status messages.
Shown for ~2.5 seconds before the main window appears.
"""

import os
from PySide6.QtWidgets import QWidget, QLabel, QVBoxLayout, QHBoxLayout, QProgressBar, QApplication
from PySide6.QtCore import Qt, QTimer, Signal, QPropertyAnimation, QEasingCurve
from PySide6.QtGui import (
    QPixmap, QPainter, QLinearGradient, QColor, QPen, QBrush,
    QFont, QFontMetrics, QPainterPath
)

# Asset paths (resolved relative to this file's directory)
_BASE  = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_ICONS = os.path.join(_BASE, "assets", "icons")

_STATUS_MESSAGES = [
    "Loading modules...",
    "Initializing database...",
    "Starting AI engine...",
    "Initializing dashboard...",
    "Connecting services...",
    "Ready.",
]

# Total display duration ms
_DISPLAY_MS   = 2600
_FADE_IN_MS   = 500
_FADE_OUT_MS  = 500
_HOLD_MS      = _DISPLAY_MS - _FADE_IN_MS - _FADE_OUT_MS


class SplashScreen(QWidget):
    """
    Frameless, animated VELTRIX splash screen.
    Emits `finished` when it has fully faded out.
    """
    finished = Signal()

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setWindowFlags(Qt.FramelessWindowHint | Qt.WindowStaysOnTopHint | Qt.SplashScreen)
        self.setAttribute(Qt.WA_TranslucentBackground)
        self.setFixedSize(540, 360)

        # Center on screen
        screen = QApplication.primaryScreen().geometry()
        self.move(
            (screen.width() - self.width()) // 2,
            (screen.height() - self.height()) // 2,
        )

        self._progress = 0         # 0–100
        self._status_idx = 0
        self._status_text = _STATUS_MESSAGES[0]
        self._logo_pix: QPixmap = None
        self._opacity = 0.0

        self._load_logo()
        self._setup_fade_in()

    def _load_logo(self):
        """Load logo pixmap from assets, fall back to None if missing."""
        for fname in ("logo_full.png", "app.png"):
            path = os.path.join(_ICONS, fname)
            if os.path.exists(path):
                pix = QPixmap(path)
                if not pix.isNull():
                    self._logo_pix = pix
                    return

    # ── Animation lifecycle ────────────────────────────────────────────────

    def _setup_fade_in(self):
        self.setWindowOpacity(0.0)
        self._fade_anim = QPropertyAnimation(self, b"windowOpacity")
        self._fade_anim.setDuration(_FADE_IN_MS)
        self._fade_anim.setStartValue(0.0)
        self._fade_anim.setEndValue(1.0)
        self._fade_anim.setEasingCurve(QEasingCurve.OutCubic)
        self._fade_anim.finished.connect(self._on_fade_in_done)

        # Progress ticker
        self._prog_timer = QTimer(self)
        self._prog_timer.setInterval(80)
        self._prog_timer.timeout.connect(self._tick_progress)

        self._fade_anim.start()
        self._prog_timer.start()

    def _on_fade_in_done(self):
        """Schedule fade-out after hold period."""
        QTimer.singleShot(_HOLD_MS, self._start_fade_out)

    def _start_fade_out(self):
        self._prog_timer.stop()
        self._progress = 100
        self.update()

        self._fade_out_anim = QPropertyAnimation(self, b"windowOpacity")
        self._fade_out_anim.setDuration(_FADE_OUT_MS)
        self._fade_out_anim.setStartValue(1.0)
        self._fade_out_anim.setEndValue(0.0)
        self._fade_out_anim.setEasingCurve(QEasingCurve.InCubic)
        self._fade_out_anim.finished.connect(self._on_fade_out_done)
        self._fade_out_anim.start()

    def _on_fade_out_done(self):
        self.close()
        self.finished.emit()

    def _tick_progress(self):
        """Advance progress bar and cycle status messages."""
        # Map elapsed time to progress 0-95 (100 set at fade-out start)
        total_ticks = (_FADE_IN_MS + _HOLD_MS) // 80
        self._progress = min(95, self._progress + int(95 / total_ticks) + 1)

        # Cycle status messages
        idx = min(
            len(_STATUS_MESSAGES) - 1,
            int(self._progress / 95 * (len(_STATUS_MESSAGES) - 1))
        )
        if idx != self._status_idx:
            self._status_idx = idx
            self._status_text = _STATUS_MESSAGES[idx]

        self.update()

    # ── Custom painting ────────────────────────────────────────────────────

    def paintEvent(self, event):
        p = QPainter(self)
        p.setRenderHint(QPainter.Antialiasing)

        w, h = self.width(), self.height()
        r = 16  # corner radius

        # ── Rounded dark background ──────────────────────────────────────
        path = QPainterPath()
        path.addRoundedRect(0, 0, w, h, r, r)
        p.setClipPath(path)

        grad = QLinearGradient(0, 0, 0, h)
        grad.setColorAt(0.00, QColor("#0f1726"))
        grad.setColorAt(0.55, QColor("#0a1020"))
        grad.setColorAt(1.00, QColor("#060b14"))
        p.fillPath(path, QBrush(grad))

        # ── Subtle grid / scan-line texture ───────────────────────────────
        p.setPen(QPen(QColor(255, 255, 255, 8), 1))
        for y in range(0, h, 16):
            p.drawLine(0, y, w, y)

        # ── Top accent bar ─────────────────────────────────────────────────
        accent = QLinearGradient(0, 0, w, 0)
        accent.setColorAt(0.0, QColor(0, 0, 0, 0))
        accent.setColorAt(0.4, QColor("#3b82f6"))
        accent.setColorAt(0.7, QColor("#06b6d4"))
        accent.setColorAt(1.0, QColor(0, 0, 0, 0))
        p.setPen(Qt.NoPen)
        p.setBrush(QBrush(accent))
        p.drawRect(0, 0, w, 3)

        # ── Logo ───────────────────────────────────────────────────────────
        logo_h = 130
        logo_y = 30
        if self._logo_pix and not self._logo_pix.isNull():
            scaled = self._logo_pix.scaledToHeight(logo_h, Qt.SmoothTransformation)
            logo_x = (w - scaled.width()) // 2
            p.drawPixmap(logo_x, logo_y, scaled)
        else:
            # Fallback: draw "V" text
            p.setPen(QColor("#3b82f6"))
            p.setFont(QFont("Arial", 64, QFont.Bold))
            p.drawText(0, logo_y, w, logo_h, Qt.AlignCenter, "V")

        # ── VELTRIX wordmark ───────────────────────────────────────────────
        wm_y = logo_y + logo_h + 4

        # "VELTRIX" in large, bold, spaced letters
        p.setPen(QColor("#e2e8f0"))
        f_wm = QFont("Segoe UI", 22, QFont.Bold)
        f_wm.setLetterSpacing(QFont.AbsoluteSpacing, 6)
        p.setFont(f_wm)
        p.drawText(0, wm_y, w, 36, Qt.AlignHCenter, "VELTR")

        # Blue "IX" after VELTR
        f_pre = QFont("Segoe UI", 22, QFont.Bold)
        f_pre.setLetterSpacing(QFont.AbsoluteSpacing, 6)
        p.setFont(f_pre)
        fm = QFontMetrics(f_pre)
        pre_w = fm.horizontalAdvance("VELTR") + 6 * 4  # letter spacing
        wm_x = (w - fm.horizontalAdvance("VELTRIX") - 6 * 7) // 2
        p.setPen(QColor("#3b82f6"))
        p.drawText(wm_x + fm.horizontalAdvance("VELTR") + 6*5, wm_y, w, 36, Qt.AlignLeft, "IX")
        p.setPen(QColor("#e2e8f0"))
        p.drawText(wm_x, wm_y, w, 36, Qt.AlignLeft, "VELTR")

        # ── Blue underline accent under wordmark ──────────────────────────
        ul_y = wm_y + 34
        ul_w = 120
        ul_x = (w - ul_w) // 2
        ul_grad = QLinearGradient(ul_x, 0, ul_x + ul_w, 0)
        ul_grad.setColorAt(0.0, QColor(59, 130, 246, 0))
        ul_grad.setColorAt(0.5, QColor("#3b82f6"))
        ul_grad.setColorAt(1.0, QColor(59, 130, 246, 0))
        p.setPen(Qt.NoPen)
        p.setBrush(QBrush(ul_grad))
        p.drawRect(ul_x, ul_y, ul_w, 2)

        # ── Dashboard title ────────────────────────────────────────────────
        title_y = ul_y + 14
        p.setPen(QColor("#94a3b8"))
        f_title = QFont("Segoe UI", 11)
        p.setFont(f_title)
        p.drawText(0, title_y, w, 22, Qt.AlignCenter, "Predictive Maintenance Dashboard")

        # ── Subtitle ───────────────────────────────────────────────────────
        sub_y = title_y + 22
        p.setPen(QColor("#4a5f7a"))
        f_sub = QFont("Segoe UI", 9)
        p.setFont(f_sub)
        p.drawText(0, sub_y, w, 18, Qt.AlignCenter, "Industrial AI Monitoring System")

        # ── Version ────────────────────────────────────────────────────────
        ver_y = sub_y + 18
        p.setPen(QColor("#2a3f60"))
        f_ver = QFont("Segoe UI", 8)
        p.setFont(f_ver)
        p.drawText(0, ver_y, w, 16, Qt.AlignCenter, "Version 1.0")

        # ── Progress bar ───────────────────────────────────────────────────
        pb_h  = 3
        pb_y  = h - 40
        pb_x  = 50
        pb_w  = w - 100
        bar_w = int(pb_w * self._progress / 100)

        # Track
        p.setPen(Qt.NoPen)
        p.setBrush(QColor("#1a2540"))
        p.drawRoundedRect(pb_x, pb_y, pb_w, pb_h, pb_h//2, pb_h//2)

        # Fill
        if bar_w > 0:
            bar_grad = QLinearGradient(pb_x, 0, pb_x + bar_w, 0)
            bar_grad.setColorAt(0.0, QColor("#1d4ed8"))
            bar_grad.setColorAt(1.0, QColor("#06b6d4"))
            p.setBrush(QBrush(bar_grad))
            p.drawRoundedRect(pb_x, pb_y, bar_w, pb_h, pb_h//2, pb_h//2)

        # ── Status text ────────────────────────────────────────────────────
        status_y = pb_y + pb_h + 6
        p.setPen(QColor("#4a5f7a"))
        f_status = QFont("Consolas", 8)
        p.setFont(f_status)
        p.drawText(0, status_y, w, 18, Qt.AlignCenter, self._status_text)

        # ── Bottom border glow ─────────────────────────────────────────────
        glow = QLinearGradient(0, 0, w, 0)
        glow.setColorAt(0.0, QColor(0, 0, 0, 0))
        glow.setColorAt(0.5, QColor("#3b82f6"))
        glow.setColorAt(1.0, QColor(0, 0, 0, 0))
        p.setBrush(QBrush(glow))
        p.drawRect(0, h - 3, w, 3)

        p.end()
