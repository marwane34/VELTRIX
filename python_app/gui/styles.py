"""
QSS Stylesheets — Dark Industrial SCADA Theme.
Matches the reference dashboard image exactly.
"""

# Colour palette
C_BG0          = "#04070f"   # deepest bg
C_BG1          = "#060b14"   # main bg
C_BG2          = "#0d1420"   # panel bg
C_BG3          = "#0e1726"   # panel header bg
C_BG4          = "#111827"   # slightly lighter
C_BORDER       = "#1e2d45"   # standard border
C_BORDER2      = "#2a3f60"   # brighter border
C_TEXT         = "#e2e8f0"   # main text
C_TEXT_DIM     = "#94a3b8"   # secondary text
C_TEXT_MUTED   = "#64748b"   # muted text
C_TEXT_DARK    = "#4a5f7a"   # very muted
C_BLUE         = "#3b82f6"   # neon blue accent
C_BLUE_DARK    = "#1d4ed8"
C_GREEN        = "#22c55e"   # healthy / connected
C_YELLOW       = "#eab308"   # warning
C_RED          = "#ef4444"   # critical
C_ORANGE       = "#f97316"
C_CYAN         = "#06b6d4"

MAIN_STYLESHEET = f"""
/* ── Global ─────────────────────────────────────────────────────────────── */
* {{
    font-family: "Segoe UI", "Consolas", monospace;
    font-size: 11px;
    color: {C_TEXT};
    selection-background-color: {C_BLUE_DARK};
    selection-color: {C_TEXT};
}}

QMainWindow, QDialog, QWidget {{
    background-color: {C_BG1};
}}

/* ── QLabel ──────────────────────────────────────────────────────────────── */
QLabel {{
    color: {C_TEXT};
    background: transparent;
}}
QLabel#label_title {{
    font-size: 16px;
    font-weight: bold;
    color: {C_TEXT};
    letter-spacing: 2px;
}}
QLabel#label_section {{
    font-size: 10px;
    font-weight: bold;
    color: {C_YELLOW};
    letter-spacing: 2px;
}}
QLabel#label_muted {{
    color: {C_TEXT_MUTED};
}}
QLabel#label_val_blue {{
    color: {C_BLUE};
    font-weight: bold;
}}
QLabel#label_val_green {{
    color: {C_GREEN};
    font-weight: bold;
}}
QLabel#label_val_yellow {{
    color: {C_YELLOW};
    font-weight: bold;
}}
QLabel#label_val_red {{
    color: {C_RED};
    font-weight: bold;
}}
QLabel#label_val_cyan {{
    color: {C_CYAN};
    font-weight: bold;
}}

/* ── QPushButton ─────────────────────────────────────────────────────────── */
QPushButton {{
    background-color: transparent;
    color: {C_TEXT_DIM};
    border: 1px solid {C_BORDER};
    padding: 4px 12px;
    font-size: 11px;
}}
QPushButton:hover {{
    background-color: rgba(59,130,246,0.08);
    border-color: {C_BLUE};
    color: {C_TEXT};
}}
QPushButton:pressed {{
    background-color: rgba(59,130,246,0.15);
}}
QPushButton:disabled {{
    color: {C_TEXT_DARK};
    border-color: {C_BG4};
}}

/* Green "Start Monitoring" style */
QPushButton#btn_monitor {{
    background: qlineargradient(x1:0,y1:0,x2:0,y2:1, stop:0 #1a4a1a, stop:1 #0f2e0f);
    border: 1px solid {C_GREEN};
    color: {C_GREEN};
    font-weight: bold;
    padding: 4px 16px;
}}
QPushButton#btn_monitor:hover {{
    background: qlineargradient(x1:0,y1:0,x2:0,y2:1, stop:0 #226a22, stop:1 #16401a);
    color: #86efac;
}}

/* Blue primary action */
QPushButton#btn_primary {{
    background: qlineargradient(x1:0,y1:0,x2:0,y2:1, stop:0 {C_BLUE_DARK}, stop:1 #1e3a8a);
    border: 1px solid {C_BLUE};
    color: #e0f2fe;
    font-weight: bold;
    padding: 5px 18px;
}}
QPushButton#btn_primary:hover {{
    background: qlineargradient(x1:0,y1:0,x2:0,y2:1, stop:0 #2563eb, stop:1 #1d4ed8);
}}

/* Red danger */
QPushButton#btn_danger {{
    border: 1px solid #7f1d1d;
    color: #f87171;
}}
QPushButton#btn_danger:hover {{
    background: rgba(239,68,68,0.1);
    border-color: {C_RED};
}}

/* Small icon toolbar button */
QPushButton#btn_toolbar {{
    background: transparent;
    border: 1px solid transparent;
    padding: 3px 6px;
    color: {C_TEXT_DARK};
}}
QPushButton#btn_toolbar:hover {{
    border-color: {C_BORDER};
    color: {C_TEXT_DIM};
    background: rgba(255,255,255,0.03);
}}

/* ── QLineEdit / QTextEdit ───────────────────────────────────────────────── */
QLineEdit, QTextEdit, QSpinBox, QDoubleSpinBox {{
    background: {C_BG0};
    border: 1px solid {C_BORDER};
    color: {C_TEXT};
    padding: 3px 6px;
    selection-background-color: {C_BLUE_DARK};
}}
QLineEdit:focus, QTextEdit:focus, QSpinBox:focus, QDoubleSpinBox:focus {{
    border-color: {C_BLUE};
}}
QSpinBox::up-button, QSpinBox::down-button,
QDoubleSpinBox::up-button, QDoubleSpinBox::down-button {{
    background: {C_BG3};
    border: none;
    width: 14px;
}}

/* ── QComboBox ───────────────────────────────────────────────────────────── */
QComboBox {{
    background: {C_BG0};
    border: 1px solid {C_BORDER};
    color: {C_TEXT};
    padding: 3px 6px;
    min-width: 100px;
}}
QComboBox:focus {{ border-color: {C_BLUE}; }}
QComboBox::drop-down {{
    border: none;
    width: 18px;
}}
QComboBox QAbstractItemView {{
    background: {C_BG3};
    border: 1px solid {C_BORDER};
    selection-background-color: {C_BLUE_DARK};
    color: {C_TEXT};
}}

/* ── QScrollBar ──────────────────────────────────────────────────────────── */
QScrollBar:vertical {{
    background: {C_BG0};
    width: 6px;
    margin: 0;
}}
QScrollBar::handle:vertical {{
    background: {C_BORDER2};
    min-height: 20px;
}}
QScrollBar::handle:vertical:hover {{ background: {C_BLUE}; }}
QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical {{ height: 0; }}

QScrollBar:horizontal {{
    background: {C_BG0};
    height: 6px;
}}
QScrollBar::handle:horizontal {{
    background: {C_BORDER2};
    min-width: 20px;
}}
QScrollBar::handle:horizontal:hover {{ background: {C_BLUE}; }}
QScrollBar::add-line:horizontal, QScrollBar::sub-line:horizontal {{ width: 0; }}

/* ── QTableWidget ────────────────────────────────────────────────────────── */
QTableWidget {{
    background: {C_BG1};
    border: 1px solid {C_BORDER};
    gridline-color: {C_BORDER};
    color: {C_TEXT};
    font-size: 11px;
}}
QTableWidget::item {{
    padding: 4px 6px;
    border-bottom: 1px solid {C_BG4};
}}
QTableWidget::item:selected {{
    background: rgba(59,130,246,0.2);
    color: {C_TEXT};
}}
QHeaderView::section {{
    background: qlineargradient(x1:0,y1:0,x2:0,y2:1, stop:0 #151f33, stop:1 #0f1726);
    border: none;
    border-bottom: 1px solid {C_BORDER};
    border-right: 1px solid {C_BORDER};
    padding: 4px 8px;
    color: {C_TEXT_DIM};
    font-size: 10px;
    font-weight: bold;
    letter-spacing: 1px;
}}

/* ── QGroupBox ───────────────────────────────────────────────────────────── */
QGroupBox {{
    border: 1px solid {C_BORDER};
    margin-top: 12px;
    padding: 8px;
    color: {C_TEXT_DIM};
    font-size: 10px;
}}
QGroupBox::title {{
    subcontrol-origin: margin;
    left: 8px;
    padding: 0 4px;
    color: {C_BLUE};
    font-weight: bold;
    letter-spacing: 1px;
}}

/* ── QSplitter ───────────────────────────────────────────────────────────── */
QSplitter::handle {{
    background: {C_BORDER};
}}
QSplitter::handle:horizontal {{ width: 1px; }}
QSplitter::handle:vertical   {{ height: 1px; }}

/* ── QTabWidget ──────────────────────────────────────────────────────────── */
QTabWidget::pane {{
    border: 1px solid {C_BORDER};
    background: {C_BG2};
}}
QTabBar::tab {{
    background: {C_BG3};
    border: 1px solid {C_BORDER};
    border-bottom: none;
    padding: 4px 14px;
    color: {C_TEXT_MUTED};
    font-size: 10px;
    margin-right: 1px;
}}
QTabBar::tab:selected {{
    background: {C_BG2};
    color: {C_TEXT};
    border-bottom: 2px solid {C_BLUE};
}}
QTabBar::tab:hover {{ color: {C_TEXT}; }}

/* ── QCheckBox ───────────────────────────────────────────────────────────── */
QCheckBox {{
    spacing: 6px;
    color: {C_TEXT_DIM};
}}
QCheckBox::indicator {{
    width: 12px;
    height: 12px;
    border: 1px solid {C_BORDER};
    background: {C_BG0};
}}
QCheckBox::indicator:checked {{
    background: {C_BLUE};
    border-color: {C_BLUE};
}}

/* ── QFrame (panels) ─────────────────────────────────────────────────────── */
QFrame#panel {{
    background: {C_BG2};
    border: 1px solid {C_BORDER};
}}
QFrame#panel_header {{
    background: qlineargradient(x1:0,y1:0,x2:0,y2:1, stop:0 #151f33, stop:1 #0f1726);
    border-bottom: 1px solid {C_BORDER};
}}
QFrame#sidebar {{
    background: {C_BG2};
    border-right: 1px solid {C_BORDER};
}}
QFrame#status_bar {{
    background: #07090f;
    border-top: 1px solid {C_BORDER};
}}
QFrame#tool_bar {{
    background: qlineargradient(x1:0,y1:0,x2:0,y2:1, stop:0 #0f1726, stop:1 #080d14);
    border-top: 1px solid {C_BORDER};
}}
QFrame#top_bar {{
    background: qlineargradient(x1:0,y1:0,x2:0,y2:1, stop:0 #131c2e, stop:1 #0d1220);
    border-bottom: 1px solid {C_BORDER};
}}

/* ── Machine list item ───────────────────────────────────────────────────── */
QFrame#machine_item {{
    border-bottom: 1px solid {C_BORDER};
    background: transparent;
    padding: 0px;
}}
QFrame#machine_item_active {{
    border-left: 2px solid {C_GREEN};
    background: rgba(34,197,94,0.06);
    border-bottom: 1px solid {C_BORDER};
}}

/* ── Anomaly box ─────────────────────────────────────────────────────────── */
QFrame#anomaly_warning {{
    background: qlineargradient(x1:0,y1:0,x2:1,y2:1, stop:0 #1a1500, stop:1 #2a1f00);
    border: 1px solid #ca8a04;
    border-left: 3px solid {C_YELLOW};
}}
QFrame#anomaly_critical {{
    background: qlineargradient(x1:0,y1:0,x2:1,y2:1, stop:0 #1a0000, stop:1 #2a0a0a);
    border: 1px solid #7f1d1d;
    border-left: 3px solid {C_RED};
}}
QFrame#anomaly_ok {{
    background: qlineargradient(x1:0,y1:0,x2:1,y2:1, stop:0 #001a00, stop:1 #0a1a0a);
    border: 1px solid #14532d;
    border-left: 3px solid {C_GREEN};
}}

/* ── Progress bars (health score) ────────────────────────────────────────── */
QProgressBar {{
    background: {C_BG4};
    border: none;
    height: 6px;
    text-align: center;
    color: transparent;
}}
QProgressBar::chunk {{ background: {C_BLUE}; }}
QProgressBar#pb_green::chunk  {{ background: {C_GREEN}; }}
QProgressBar#pb_yellow::chunk {{ background: {C_YELLOW}; }}
QProgressBar#pb_red::chunk    {{ background: {C_RED}; }}
QProgressBar#pb_orange::chunk {{ background: {C_ORANGE}; }}

/* ── QMessageBox ─────────────────────────────────────────────────────────── */
QMessageBox {{
    background: {C_BG3};
    color: {C_TEXT};
}}
QMessageBox QPushButton {{
    min-width: 70px;
    padding: 4px 12px;
}}

/* ── QToolTip ────────────────────────────────────────────────────────────── */
QToolTip {{
    background: {C_BG3};
    border: 1px solid {C_BORDER};
    color: {C_TEXT};
    padding: 4px;
    font-size: 10px;
}}
"""


def severity_color(severity: str) -> str:
    return {
        "critical": C_RED,
        "warning": C_YELLOW,
        "info": C_BLUE,
        "healthy": C_GREEN,
    }.get(severity, C_TEXT_MUTED)
