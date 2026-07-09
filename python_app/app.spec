# -*- mode: python ; coding: utf-8 -*-
"""
VELTRIX — Predictive Maintenance Dashboard
PyInstaller spec.
Build with: pyinstaller app.spec --noconfirm
"""

import sys
import os
from pathlib import Path

block_cipher = None
HERE = os.path.dirname(os.path.abspath(SPEC))


# ── Collect PySide6 and pyqtgraph data files ──────────────────────────────────
from PyInstaller.utils.hooks import collect_data_files, collect_submodules

pyside6_data    = collect_data_files("PySide6")
pyqtgraph_data  = collect_data_files("pyqtgraph")
sklearn_data    = collect_data_files("sklearn")
reportlab_data  = collect_data_files("reportlab")

all_data = pyside6_data + pyqtgraph_data + sklearn_data + reportlab_data

# Include local assets and config
if os.path.exists(os.path.join(HERE, "assets")):
    all_data.append((os.path.join(HERE, "assets"), "assets"))


a = Analysis(
    [os.path.join(HERE, "main.py")],
    pathex=[HERE],
    binaries=[],
    datas=all_data,
    hiddenimports=[
        # PySide6
        "PySide6.QtCore",
        "PySide6.QtGui",
        "PySide6.QtWidgets",
        "PySide6.QtOpenGL",
        "PySide6.QtNetwork",
        # pyqtgraph
        "pyqtgraph",
        "pyqtgraph.graphicsItems",
        "pyqtgraph.graphicsItems.PlotItem",
        "pyqtgraph.graphicsItems.BarGraphItem",
        # SQLAlchemy
        "sqlalchemy.dialects.sqlite",
        "sqlalchemy.orm",
        # FastAPI / uvicorn
        "fastapi",
        "uvicorn",
        "uvicorn.logging",
        "uvicorn.loops",
        "uvicorn.loops.asyncio",
        "uvicorn.protocols",
        "uvicorn.protocols.http",
        "uvicorn.protocols.http.auto",
        "uvicorn.lifespan",
        "uvicorn.lifespan.on",
        # paho-mqtt
        "paho.mqtt.client",
        # scikit-learn
        "sklearn",
        "sklearn.ensemble",
        "sklearn.utils._weight_vector",
        # scipy
        "scipy.signal",
        # reportlab
        "reportlab.platypus",
        "reportlab.lib",
        # pyserial
        "serial",
        "serial.tools",
        "serial.tools.list_ports",
        # misc
        "numpy",
        "requests",
        "httpx",
        "pydantic",
        # Project modules
        "database.db_manager",
        "ai.anomaly_detector",
        "hardware.serial_handler",
        "hardware.wifi_handler",
        "hardware.serial_manager",
        "gui.hardware_connection_dialog",
        "backend.api_server",
        "backend.simulator",
        "charts.vibration_chart",
        "charts.frequency_chart",
        "charts.temperature_chart",
        "charts.current_chart",
        "gui.styles",
        "gui.login_dialog",
        "gui.sidebar_widget",
        "gui.dashboard_widget",
        "gui.main_window",
        "gui.settings_dialog",
        "gui.machines_dialog",
        "gui.alerts_dialog",
        "gui.export_dialog",
        "gui.splash_screen",
        "gui.about_dialog",
    ],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=["tkinter", "matplotlib", "IPython", "jupyter"],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

_icon_path = os.path.join(HERE, "assets", "icons", "app.ico")
_icon = _icon_path if os.path.exists(_icon_path) else None

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="VELTRIX",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,   # No console window (set True for debug)
    disable_windowed_traceback=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=_icon,
    version_file=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name="VELTRIX",
)
