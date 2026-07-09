"""
PredictiveMaintenanceDashboard — Entry Point
============================================
Launches login dialog then main monitoring window.
Run:  python main.py
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
os.makedirs("logs", exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-8s %(name)s  %(message)s",
    handlers=[
        logging.FileHandler("logs/app.log", encoding="utf-8"),
        logging.StreamHandler(sys.stdout),
    ],
)
logger = logging.getLogger(__name__)

# ── Qt Application ────────────────────────────────────────────────────────────
from PySide6.QtWidgets import QApplication
from PySide6.QtGui import QFont, QIcon
from PySide6.QtCore import Qt

from database.db_manager import DatabaseManager
from gui.styles import MAIN_STYLESHEET
from gui.login_dialog import LoginDialog
from gui.main_window import MainWindow


def main():
    # High DPI support
    QApplication.setHighDpiScaleFactorRoundingPolicy(
        Qt.HighDpiScaleFactorRoundingPolicy.PassThrough
    )
    app = QApplication(sys.argv)
    app.setApplicationName("Predictive Maintenance Dashboard")
    app.setOrganizationName("IndustrialAI")
    app.setApplicationVersion("1.0.0")

    # Apply dark SCADA stylesheet
    app.setStyleSheet(MAIN_STYLESHEET)

    # Default monospace font for dense data display
    font = QFont("Segoe UI", 9)
    app.setFont(font)

    # Icon (if assets/icons/app.ico exists)
    icon_path = os.path.join(BASE, "assets", "icons", "app.ico")
    if os.path.exists(icon_path):
        app.setWindowIcon(QIcon(icon_path))

    # Initialize database
    db_path = os.path.join(BASE, "data", "predictive_maintenance.db")
    db = DatabaseManager(db_path)
    logger.info("Database initialized")

    # Show login dialog
    login = LoginDialog(db)
    user_info = {}

    def on_login_success(user):
        nonlocal user_info
        user_info = user

    login.login_success.connect(on_login_success)
    result = login.exec()

    if result != LoginDialog.Accepted or not user_info:
        logger.info("Login cancelled or failed — exiting")
        sys.exit(0)

    logger.info(f"User '{user_info['username']}' logged in (role: {user_info['role']})")

    # Show main monitoring window
    window = MainWindow(db, user_info)
    window.show()

    sys.exit(app.exec())


if __name__ == "__main__":
    main()
