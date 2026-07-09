"""
VELTRIX — Predictive Maintenance Dashboard
==========================================
Entry point.  Shows VELTRIX splash screen → login → main monitoring window.
Run:   python main.py
Build: build.bat
"""

import sys
import os
import logging

# ── Ensure project root is in path (critical for PyInstaller) ─────────────────
BASE = os.path.dirname(os.path.abspath(__file__))
if BASE not in sys.path:
    sys.path.insert(0, BASE)

# ── Logging ───────────────────────────────────────────────────────────────────
os.makedirs(os.path.join(BASE, "logs"), exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-8s %(name)s  %(message)s",
    handlers=[
        logging.FileHandler(os.path.join(BASE, "logs", "app.log"), encoding="utf-8"),
        logging.StreamHandler(sys.stdout),
    ],
)
logger = logging.getLogger(__name__)

# ── Qt Application ────────────────────────────────────────────────────────────
from PySide6.QtWidgets import QApplication
from PySide6.QtGui import QFont, QIcon
from PySide6.QtCore import Qt, QTimer

from database.db_manager import DatabaseManager
from gui.styles           import MAIN_STYLESHEET
from gui.login_dialog     import LoginDialog
from gui.main_window      import MainWindow
from gui.splash_screen    import SplashScreen


def _load_icon() -> QIcon:
    """Load application icon from assets, return empty QIcon if missing."""
    for fname in ("app.ico", "app.png"):
        path = os.path.join(BASE, "assets", "icons", fname)
        if os.path.exists(path):
            return QIcon(path)
    return QIcon()


def _show_main(app: QApplication, db: DatabaseManager, user: dict):
    """Show login dialog then main window."""
    login = LoginDialog(db)
    user_info = {}

    def on_login_success(u):
        nonlocal user_info
        user_info = u

    login.login_success.connect(on_login_success)
    result = login.exec()

    if result != LoginDialog.Accepted or not user_info:
        logger.info("Login cancelled — exiting")
        app.quit()
        return

    logger.info(f"User '{user_info['username']}' logged in (role: {user_info['role']})")

    window = MainWindow(db, user_info)
    window.show()
    window.raise_()
    window.activateWindow()


def main():
    # ── High-DPI ──────────────────────────────────────────────────────────
    QApplication.setHighDpiScaleFactorRoundingPolicy(
        Qt.HighDpiScaleFactorRoundingPolicy.PassThrough
    )
    app = QApplication(sys.argv)
    app.setApplicationName("VELTRIX — Predictive Maintenance Dashboard")
    app.setOrganizationName("Veltrix Industrial AI")
    app.setApplicationVersion("1.0")

    # ── Global stylesheet ─────────────────────────────────────────────────
    app.setStyleSheet(MAIN_STYLESHEET)

    # ── Default font ───────────────────────────────────────────────────────
    app.setFont(QFont("Segoe UI", 9))

    # ── App icon (taskbar + titlebar + .exe) ───────────────────────────────
    icon = _load_icon()
    app.setWindowIcon(icon)

    # ── Initialize database (fast — done during splash) ───────────────────
    db_path = os.path.join(BASE, "data", "predictive_maintenance.db")
    db = DatabaseManager(db_path)
    logger.info("Database initialized")

    # ── Splash screen ──────────────────────────────────────────────────────
    splash = SplashScreen()
    splash.show()
    app.processEvents()

    # When splash finishes, show login → main window
    def on_splash_done():
        splash.deleteLater()
        _show_main(app, db, {})

    splash.finished.connect(on_splash_done)

    sys.exit(app.exec())


if __name__ == "__main__":
    main()
