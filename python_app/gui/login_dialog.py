"""Login dialog — dark SCADA theme. Default credentials: admin / admin123."""

from PySide6.QtWidgets import (
    QDialog, QVBoxLayout, QHBoxLayout, QLabel,
    QLineEdit, QPushButton, QCheckBox, QFrame, QMessageBox
)
from PySide6.QtCore import Qt, Signal
from PySide6.QtGui import QFont


class LoginDialog(QDialog):
    login_success = Signal(dict)   # emits user dict on success

    def __init__(self, db_manager, parent=None):
        super().__init__(parent)
        self.db = db_manager
        self.setWindowTitle("Predictive Maintenance System — Login")
        self.setFixedSize(400, 460)
        self.setWindowFlags(Qt.Dialog | Qt.FramelessWindowHint)
        self._drag_pos = None
        self._setup_ui()

    def mousePressEvent(self, ev):
        if ev.button() == Qt.LeftButton:
            self._drag_pos = ev.globalPosition().toPoint()

    def mouseMoveEvent(self, ev):
        if self._drag_pos and ev.buttons() == Qt.LeftButton:
            self.move(self.pos() + ev.globalPosition().toPoint() - self._drag_pos)
            self._drag_pos = ev.globalPosition().toPoint()

    def mouseReleaseEvent(self, ev):
        self._drag_pos = None

    def _setup_ui(self):
        root = QVBoxLayout(self)
        root.setContentsMargins(0, 0, 0, 0)
        root.setSpacing(0)

        # ── Custom title bar ──────────────────────────────────────────────────
        title_bar = QFrame()
        title_bar.setFixedHeight(32)
        title_bar.setStyleSheet(
            "background: qlineargradient(x1:0,y1:0,x2:0,y2:1,stop:0 #151f33,stop:1 #0f1726);"
            "border-bottom: 1px solid #1e2d45;"
        )
        tb_lay = QHBoxLayout(title_bar)
        tb_lay.setContentsMargins(10, 0, 6, 0)
        lbl = QLabel("PREDICTIVE MAINTENANCE SYSTEM")
        lbl.setStyleSheet("color:#94a3b8; font-size:10px; font-weight:bold; letter-spacing:2px;")
        close_btn = QPushButton("✕")
        close_btn.setFixedSize(22, 22)
        close_btn.setStyleSheet(
            "QPushButton{background:transparent;border:none;color:#64748b;font-size:11px;}"
            "QPushButton:hover{color:#f87171;}"
        )
        close_btn.clicked.connect(self.reject)
        tb_lay.addWidget(lbl)
        tb_lay.addStretch()
        tb_lay.addWidget(close_btn)
        root.addWidget(title_bar)

        # ── Content ───────────────────────────────────────────────────────────
        content = QFrame()
        content.setStyleSheet("background:#0e1726;")
        c_lay = QVBoxLayout(content)
        c_lay.setContentsMargins(32, 28, 32, 28)
        c_lay.setSpacing(14)

        # Logo / title
        logo = QLabel("⚙")
        logo.setAlignment(Qt.AlignCenter)
        logo.setStyleSheet("font-size:38px; color:#3b82f6; background:transparent;")
        c_lay.addWidget(logo)

        title = QLabel("PREDICTIVE MAINTENANCE")
        title.setAlignment(Qt.AlignCenter)
        title.setStyleSheet("font-size:15px; font-weight:bold; color:#c8d6ea; letter-spacing:2px;")
        c_lay.addWidget(title)

        sub = QLabel("Industrial AI Monitoring System")
        sub.setAlignment(Qt.AlignCenter)
        sub.setStyleSheet("font-size:10px; color:#4a5f7a; letter-spacing:1px;")
        c_lay.addWidget(sub)

        # Divider
        sep = QFrame(); sep.setFrameShape(QFrame.HLine)
        sep.setStyleSheet("color:#1e2d45; margin: 4px 0;")
        c_lay.addWidget(sep)

        # Username
        u_lbl = QLabel("USERNAME")
        u_lbl.setStyleSheet("color:#64748b; font-size:9px; letter-spacing:2px;")
        c_lay.addWidget(u_lbl)
        self.username = QLineEdit()
        self.username.setPlaceholderText("admin")
        self.username.setFixedHeight(32)
        c_lay.addWidget(self.username)

        # Password
        p_lbl = QLabel("PASSWORD")
        p_lbl.setStyleSheet("color:#64748b; font-size:9px; letter-spacing:2px;")
        c_lay.addWidget(p_lbl)
        self.password = QLineEdit()
        self.password.setPlaceholderText("••••••••")
        self.password.setEchoMode(QLineEdit.Password)
        self.password.setFixedHeight(32)
        self.password.returnPressed.connect(self._do_login)
        c_lay.addWidget(self.password)

        # Remember me
        self.remember = QCheckBox("Remember this device")
        c_lay.addWidget(self.remember)

        # Error label
        self.error_lbl = QLabel("")
        self.error_lbl.setStyleSheet(
            "color:#f87171; background:#1a0808; border:1px solid #7f1d1d; padding:4px 8px;"
        )
        self.error_lbl.setWordWrap(True)
        self.error_lbl.hide()
        c_lay.addWidget(self.error_lbl)

        # Login button
        self.login_btn = QPushButton("LOGIN")
        self.login_btn.setObjectName("btn_primary")
        self.login_btn.setFixedHeight(36)
        self.login_btn.setStyleSheet(
            "QPushButton{background:qlineargradient(x1:0,y1:0,x2:0,y2:1,stop:0 #1d4ed8,stop:1 #1e3a8a);"
            "border:1px solid #3b82f6; color:#e0f2fe; font-weight:bold; font-size:12px;"
            "letter-spacing:2px;}"
            "QPushButton:hover{background:qlineargradient(x1:0,y1:0,x2:0,y2:1,stop:0 #2563eb,stop:1 #1d4ed8);}"
        )
        self.login_btn.clicked.connect(self._do_login)
        c_lay.addWidget(self.login_btn)

        # Status
        status_row = QHBoxLayout()
        dot = QLabel("●")
        dot.setStyleSheet("color:#22c55e; font-size:8px;")
        status_lbl = QLabel("System Online  ·  AI Engine Ready")
        status_lbl.setStyleSheet("color:#4a5f7a; font-size:9px;")
        status_row.addStretch()
        status_row.addWidget(dot)
        status_row.addWidget(status_lbl)
        status_row.addStretch()
        c_lay.addLayout(status_row)

        c_lay.addStretch()
        root.addWidget(content)

    def _do_login(self):
        username = self.username.text().strip()
        password = self.password.text()
        if not username or not password:
            self._show_error("Please enter username and password.")
            return
        self.login_btn.setEnabled(False)
        self.login_btn.setText("AUTHENTICATING...")
        user = self.db.authenticate(username, password)
        self.login_btn.setEnabled(True)
        self.login_btn.setText("LOGIN")
        if user:
            self.login_success.emit(user)
            self.accept()
        else:
            self._show_error("Invalid credentials. Please try again.")

    def _show_error(self, msg: str):
        self.error_lbl.setText(msg)
        self.error_lbl.show()
