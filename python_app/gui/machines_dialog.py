"""Machine management dialog — add, view, delete machines."""

from PySide6.QtWidgets import (
    QDialog, QVBoxLayout, QHBoxLayout, QLabel, QLineEdit,
    QPushButton, QFrame, QTableWidget, QTableWidgetItem,
    QHeaderView, QMessageBox, QTextEdit
)
from PySide6.QtCore import Qt, Signal
from PySide6.QtGui import QColor


class MachinesDialog(QDialog):
    machine_added   = Signal(str)   # machine_id
    machine_deleted = Signal(str)   # machine_id

    def __init__(self, db_manager, parent=None):
        super().__init__(parent)
        self.db = db_manager
        self.setWindowTitle("Machine Management")
        self.setMinimumSize(700, 500)
        self._setup_ui()
        self._load_machines()

    def _setup_ui(self):
        root = QVBoxLayout(self)
        root.setContentsMargins(0, 0, 0, 0)
        root.setSpacing(0)

        # Header
        hdr = QFrame()
        hdr.setFixedHeight(36)
        hdr.setStyleSheet(
            "background:qlineargradient(x1:0,y1:0,x2:0,y2:1,stop:0 #151f33,stop:1 #0f1726);"
            "border-bottom:1px solid #1e2d45;"
        )
        hl = QHBoxLayout(hdr)
        hl.setContentsMargins(12, 0, 8, 0)
        hl.addWidget(QLabel("⚙  MACHINE MANAGEMENT"))
        hl.addStretch()
        close = QPushButton("✕")
        close.setFixedSize(24, 24)
        close.setStyleSheet("QPushButton{background:transparent;border:none;color:#64748b;}"
                            "QPushButton:hover{color:#f87171;}")
        close.clicked.connect(self.accept)
        hl.addWidget(close)
        root.addWidget(hdr)

        content = QFrame()
        content.setStyleSheet("background:#0e1726;")
        c_lay = QVBoxLayout(content)
        c_lay.setContentsMargins(12, 12, 12, 12)
        c_lay.setSpacing(10)

        # Table
        self.table = QTableWidget()
        self.table.setColumnCount(5)
        self.table.setHorizontalHeaderLabels(["Name", "Location", "Status", "Added", "Actions"])
        self.table.horizontalHeader().setSectionResizeMode(0, QHeaderView.Stretch)
        self.table.horizontalHeader().setSectionResizeMode(1, QHeaderView.Stretch)
        self.table.setSelectionBehavior(QTableWidget.SelectRows)
        self.table.setEditTriggers(QTableWidget.NoEditTriggers)
        self.table.verticalHeader().setVisible(False)
        c_lay.addWidget(self.table, 1)

        # Add machine form
        form = QFrame()
        form.setStyleSheet("background:#0d1420; border:1px solid #1e2d45;")
        fl = QVBoxLayout(form)
        fl.setContentsMargins(12, 10, 12, 10)
        fl.setSpacing(8)

        form_lbl = QLabel("ADD NEW MACHINE")
        form_lbl.setStyleSheet("color:#64748b; font-size:9px; font-weight:bold; letter-spacing:2px;")
        fl.addWidget(form_lbl)

        row1 = QHBoxLayout()
        self.name_input = QLineEdit(); self.name_input.setPlaceholderText("Machine Name *")
        self.loc_input  = QLineEdit(); self.loc_input.setPlaceholderText("Location")
        row1.addWidget(self.name_input)
        row1.addWidget(self.loc_input)
        fl.addLayout(row1)

        self.desc_input = QLineEdit(); self.desc_input.setPlaceholderText("Description (optional)")
        fl.addWidget(self.desc_input)

        btn_row = QHBoxLayout()
        btn_row.addStretch()
        cancel_btn = QPushButton("Cancel")
        cancel_btn.clicked.connect(self._clear_form)
        add_btn = QPushButton("Add Machine")
        add_btn.setStyleSheet(
            "QPushButton{background:qlineargradient(x1:0,y1:0,x2:0,y2:1,stop:0 #1d4ed8,stop:1 #1e3a8a);"
            "border:1px solid #3b82f6; color:#e0f2fe; font-weight:bold; padding:4px 16px;}"
        )
        add_btn.clicked.connect(self._add_machine)
        btn_row.addWidget(cancel_btn)
        btn_row.addWidget(add_btn)
        fl.addLayout(btn_row)
        c_lay.addWidget(form)

        root.addWidget(content, 1)

    def _load_machines(self):
        machines = self.db.get_machines()
        self.table.setRowCount(0)
        for m in machines:
            row = self.table.rowCount()
            self.table.insertRow(row)
            self.table.setItem(row, 0, QTableWidgetItem(m["name"]))
            self.table.setItem(row, 1, QTableWidgetItem(m["location"] or "—"))

            status_item = QTableWidgetItem(m["status"])
            color = {"online":"#22c55e","warning":"#eab308","critical":"#ef4444","offline":"#64748b"}.get(m["status"],"#64748b")
            status_item.setForeground(QColor(color))
            self.table.setItem(row, 2, status_item)

            date_str = m["created_at"][:10] if m["created_at"] else "—"
            self.table.setItem(row, 3, QTableWidgetItem(date_str))

            del_btn = QPushButton("Delete")
            del_btn.setStyleSheet("color:#f87171; border:1px solid #7f1d1d; padding:2px 8px;")
            del_btn.setProperty("machine_id", m["id"])
            del_btn.clicked.connect(self._delete_machine)
            self.table.setCellWidget(row, 4, del_btn)

    def _add_machine(self):
        name = self.name_input.text().strip()
        if not name:
            QMessageBox.warning(self, "Validation", "Machine name is required.")
            return
        mid = self.db.add_machine(name, self.loc_input.text().strip(), self.desc_input.text().strip())
        self._clear_form()
        self._load_machines()
        self.machine_added.emit(mid)

    def _delete_machine(self):
        btn = self.sender()
        mid = btn.property("machine_id")
        if QMessageBox.question(self, "Confirm", "Delete this machine and all its data?") == QMessageBox.Yes:
            self.db.delete_machine(mid)
            self._load_machines()
            self.machine_deleted.emit(mid)

    def _clear_form(self):
        self.name_input.clear()
        self.loc_input.clear()
        self.desc_input.clear()
