"""
SQLite database manager using SQLAlchemy ORM.
Handles all persistence: machines, snapshots, alerts, predictions, users, maintenance logs.
"""

import os
import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any

from sqlalchemy import (
    create_engine, Column, String, Float, Integer,
    Boolean, DateTime, ForeignKey, Text, JSON, func, desc
)
from sqlalchemy.orm import declarative_base, sessionmaker, Session, relationship

Base = declarative_base()


# ── ORM Models ─────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"
    id = Column(String(36), primary_key=True, default=lambda: secrets.token_hex(16))
    username = Column(String(64), unique=True, nullable=False)
    email = Column(String(128), unique=True, nullable=True)
    password_hash = Column(String(128), nullable=False)
    role = Column(String(32), default="operator")
    created_at = Column(DateTime, default=datetime.utcnow)


class Machine(Base):
    __tablename__ = "machines"
    id = Column(String(36), primary_key=True, default=lambda: secrets.token_hex(16))
    name = Column(String(128), nullable=False)
    location = Column(String(256), default="")
    description = Column(Text, default="")
    status = Column(String(32), default="online")
    rms_min = Column(Float, default=0.5)
    rms_max = Column(Float, default=3.0)
    temp_min = Column(Float, default=20.0)
    temp_max = Column(Float, default=85.0)
    current_min = Column(Float, default=0.5)
    current_max = Column(Float, default=5.0)
    rpm_min = Column(Float, default=1200.0)
    rpm_max = Column(Float, default=1800.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    snapshots = relationship("SensorSnapshot", back_populates="machine", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="machine", cascade="all, delete-orphan")
    predictions = relationship("Prediction", back_populates="machine", cascade="all, delete-orphan")
    health = relationship("MachineHealth", back_populates="machine", uselist=False, cascade="all, delete-orphan")


class SensorSnapshot(Base):
    __tablename__ = "sensor_snapshots"
    id = Column(Integer, primary_key=True, autoincrement=True)
    machine_id = Column(String(36), ForeignKey("machines.id"), nullable=False)
    temperature = Column(Float, default=0.0)
    vibration_rms = Column(Float, default=0.0)
    rms_x = Column(Float, default=0.0)
    rms_y = Column(Float, default=0.0)
    current = Column(Float, default=0.0)
    rpm = Column(Integer, default=0)
    voltage = Column(Float, default=220.0)
    recorded_at = Column(DateTime, default=datetime.utcnow)

    machine = relationship("Machine", back_populates="snapshots")


class Alert(Base):
    __tablename__ = "alerts"
    id = Column(Integer, primary_key=True, autoincrement=True)
    machine_id = Column(String(36), ForeignKey("machines.id"), nullable=False)
    alert_type = Column(String(64), nullable=False)
    severity = Column(String(32), default="warning")
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    resolved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    machine = relationship("Machine", back_populates="alerts")


class Prediction(Base):
    __tablename__ = "predictions"
    id = Column(Integer, primary_key=True, autoincrement=True)
    machine_id = Column(String(36), ForeignKey("machines.id"), nullable=False)
    health_score = Column(Float, default=100.0)
    status = Column(String(32), default="healthy")
    bearing_wear_pct = Column(Float, default=0.0)
    overheating_risk_pct = Column(Float, default=0.0)
    failure_risk_pct = Column(Float, default=0.0)
    rul_hours = Column(Integer, default=9999)
    anomalies = Column(JSON, default=list)
    recommendation = Column(Text, default="")
    predicted_at = Column(DateTime, default=datetime.utcnow)

    machine = relationship("Machine", back_populates="predictions")


class MachineHealth(Base):
    __tablename__ = "machine_health"
    machine_id = Column(String(36), ForeignKey("machines.id"), primary_key=True)
    rms_x = Column(Float, default=0.0)
    rms_y = Column(Float, default=0.0)
    temperature = Column(Float, default=0.0)
    current = Column(Float, default=0.0)
    rpm = Column(Integer, default=0)
    voltage = Column(Float, default=220.0)
    health_score = Column(Float, default=100.0)
    status = Column(String(32), default="healthy")
    updated_at = Column(DateTime, default=datetime.utcnow)

    machine = relationship("Machine", back_populates="health")


class MaintenanceLog(Base):
    __tablename__ = "maintenance_logs"
    id = Column(Integer, primary_key=True, autoincrement=True)
    machine_id = Column(String(36), ForeignKey("machines.id"), nullable=False)
    action = Column(String(256), nullable=False)
    notes = Column(Text, default="")
    performed_by = Column(String(128), default="System")
    performed_at = Column(DateTime, default=datetime.utcnow)


# ── Database Manager ───────────────────────────────────────────────────────────

class DatabaseManager:
    def __init__(self, db_path: str = "data/predictive_maintenance.db"):
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
        self.engine = create_engine(
            f"sqlite:///{db_path}",
            connect_args={"check_same_thread": False},
            echo=False,
        )
        Base.metadata.create_all(self.engine)
        self.SessionLocal = sessionmaker(bind=self.engine, autoflush=False, autocommit=False)
        self._seed_defaults()

    def get_session(self) -> Session:
        return self.SessionLocal()

    def _seed_defaults(self):
        """Create default admin user and sample machines if DB is empty."""
        with self.get_session() as s:
            if s.query(User).count() == 0:
                admin = User(
                    username="admin",
                    email="admin@plant.com",
                    password_hash=self._hash_password("admin123"),
                    role="admin",
                )
                s.add(admin)
                s.commit()

            if s.query(Machine).count() == 0:
                for i, (name, loc) in enumerate([
                    ("Machine 01", "Building A, Line 1"),
                    ("Machine 02", "Building A, Line 2"),
                    ("Machine 03", "Building B, Line 1"),
                ]):
                    m = Machine(name=name, location=loc)
                    s.add(m)
                s.commit()

    # ── Auth ──────────────────────────────────────────────────────────────────

    @staticmethod
    def _hash_password(pw: str) -> str:
        salt = secrets.token_hex(16)
        h = hashlib.sha256((pw + salt).encode()).hexdigest()
        return f"{salt}:{h}"

    @staticmethod
    def _verify_password(pw: str, stored: str) -> bool:
        try:
            salt, h = stored.split(":", 1)
            return hashlib.sha256((pw + salt).encode()).hexdigest() == h
        except Exception:
            return False

    def authenticate(self, username: str, password: str) -> Optional[Dict]:
        with self.get_session() as s:
            user = s.query(User).filter(User.username == username).first()
            if user and self._verify_password(password, user.password_hash):
                return {"id": user.id, "username": user.username, "role": user.role}
        return None

    def create_user(self, username: str, password: str, email: str = "", role: str = "operator") -> bool:
        try:
            with self.get_session() as s:
                u = User(username=username, email=email,
                         password_hash=self._hash_password(password), role=role)
                s.add(u)
                s.commit()
            return True
        except Exception:
            return False

    # ── Machines ──────────────────────────────────────────────────────────────

    def get_machines(self) -> List[Dict]:
        with self.get_session() as s:
            machines = s.query(Machine).order_by(Machine.created_at).all()
            return [self._machine_to_dict(m) for m in machines]

    def get_machine(self, machine_id: str) -> Optional[Dict]:
        with self.get_session() as s:
            m = s.query(Machine).filter(Machine.id == machine_id).first()
            return self._machine_to_dict(m) if m else None

    def add_machine(self, name: str, location: str = "", description: str = "") -> str:
        with self.get_session() as s:
            m = Machine(name=name, location=location, description=description)
            s.add(m)
            s.commit()
            return m.id

    def update_machine(self, machine_id: str, **kwargs) -> bool:
        with self.get_session() as s:
            m = s.query(Machine).filter(Machine.id == machine_id).first()
            if not m:
                return False
            for k, v in kwargs.items():
                if hasattr(m, k):
                    setattr(m, k, v)
            m.updated_at = datetime.utcnow()
            s.commit()
            return True

    def delete_machine(self, machine_id: str) -> bool:
        with self.get_session() as s:
            m = s.query(Machine).filter(Machine.id == machine_id).first()
            if not m:
                return False
            s.delete(m)
            s.commit()
            return True

    @staticmethod
    def _machine_to_dict(m: Machine) -> Dict:
        return {
            "id": m.id, "name": m.name, "location": m.location,
            "description": m.description, "status": m.status,
            "rms_min": m.rms_min, "rms_max": m.rms_max,
            "temp_min": m.temp_min, "temp_max": m.temp_max,
            "current_min": m.current_min, "current_max": m.current_max,
            "rpm_min": m.rpm_min, "rpm_max": m.rpm_max,
            "created_at": m.created_at.isoformat() if m.created_at else "",
        }

    # ── Sensor Data ───────────────────────────────────────────────────────────

    def save_snapshot(self, machine_id: str, temperature: float, vibration_rms: float,
                      rms_x: float, rms_y: float, current: float, rpm: int, voltage: float = 220.0):
        with self.get_session() as s:
            snap = SensorSnapshot(
                machine_id=machine_id, temperature=round(temperature, 2),
                vibration_rms=round(vibration_rms, 4), rms_x=round(rms_x, 4),
                rms_y=round(rms_y, 4), current=round(current, 3),
                rpm=rpm, voltage=round(voltage, 1),
            )
            s.add(snap)

            # Upsert machine_health
            health = s.query(MachineHealth).filter(MachineHealth.machine_id == machine_id).first()
            if health:
                health.rms_x = rms_x; health.rms_y = rms_y
                health.temperature = temperature; health.current = current
                health.rpm = rpm; health.voltage = voltage
                health.updated_at = datetime.utcnow()
            else:
                health = MachineHealth(machine_id=machine_id, rms_x=rms_x, rms_y=rms_y,
                                       temperature=temperature, current=current,
                                       rpm=rpm, voltage=voltage)
                s.add(health)
            s.commit()

    def get_snapshots(self, machine_id: str, hours: int = 24) -> List[Dict]:
        since = datetime.utcnow() - timedelta(hours=hours)
        with self.get_session() as s:
            rows = (s.query(SensorSnapshot)
                    .filter(SensorSnapshot.machine_id == machine_id,
                            SensorSnapshot.recorded_at >= since)
                    .order_by(SensorSnapshot.recorded_at).all())
            return [{"id": r.id, "temperature": r.temperature, "vibration_rms": r.vibration_rms,
                     "rms_x": r.rms_x, "rms_y": r.rms_y, "current": r.current,
                     "rpm": r.rpm, "voltage": r.voltage,
                     "recorded_at": r.recorded_at.isoformat()} for r in rows]

    # ── Alerts ────────────────────────────────────────────────────────────────

    def save_alert(self, machine_id: str, alert_type: str, severity: str, message: str) -> int:
        with self.get_session() as s:
            alert = Alert(machine_id=machine_id, alert_type=alert_type,
                          severity=severity, message=message)
            s.add(alert)
            s.commit()
            return alert.id

    def get_alerts(self, machine_id: Optional[str] = None, limit: int = 100) -> List[Dict]:
        with self.get_session() as s:
            q = s.query(Alert, Machine.name).join(Machine, Alert.machine_id == Machine.id)
            if machine_id:
                q = q.filter(Alert.machine_id == machine_id)
            rows = q.order_by(desc(Alert.created_at)).limit(limit).all()
            return [{"id": a.id, "machine_id": a.machine_id, "machine_name": name,
                     "type": a.alert_type, "severity": a.severity, "message": a.message,
                     "is_read": a.is_read, "created_at": a.created_at.isoformat()} for a, name in rows]

    def mark_alerts_read(self, machine_id: Optional[str] = None):
        with self.get_session() as s:
            q = s.query(Alert).filter(Alert.is_read == False)
            if machine_id:
                q = q.filter(Alert.machine_id == machine_id)
            q.update({"is_read": True})
            s.commit()

    def delete_alert(self, alert_id: int):
        with self.get_session() as s:
            s.query(Alert).filter(Alert.id == alert_id).delete()
            s.commit()

    def get_unread_count(self) -> int:
        with self.get_session() as s:
            return s.query(Alert).filter(Alert.is_read == False).count()

    # ── Predictions ───────────────────────────────────────────────────────────

    def save_prediction(self, machine_id: str, health_score: float, status: str,
                        bearing_wear: float, overheat_risk: float, failure_risk: float,
                        rul_hours: int, anomalies: list, recommendation: str):
        with self.get_session() as s:
            pred = Prediction(
                machine_id=machine_id, health_score=health_score, status=status,
                bearing_wear_pct=bearing_wear, overheating_risk_pct=overheat_risk,
                failure_risk_pct=failure_risk, rul_hours=rul_hours,
                anomalies=anomalies, recommendation=recommendation,
            )
            s.add(pred)
            health = s.query(MachineHealth).filter(MachineHealth.machine_id == machine_id).first()
            if health:
                health.health_score = health_score
                health.status = status
            s.commit()

    def get_predictions(self, machine_id: str, limit: int = 30) -> List[Dict]:
        with self.get_session() as s:
            rows = (s.query(Prediction).filter(Prediction.machine_id == machine_id)
                    .order_by(desc(Prediction.predicted_at)).limit(limit).all())
            return [{"health_score": r.health_score, "status": r.status,
                     "bearing_wear_pct": r.bearing_wear_pct,
                     "overheating_risk_pct": r.overheating_risk_pct,
                     "failure_risk_pct": r.failure_risk_pct,
                     "rul_hours": r.rul_hours, "anomalies": r.anomalies,
                     "recommendation": r.recommendation,
                     "predicted_at": r.predicted_at.isoformat()} for r in rows]

    # ── Maintenance Logs ──────────────────────────────────────────────────────

    def add_maintenance_log(self, machine_id: str, action: str, notes: str = "", performed_by: str = "System"):
        with self.get_session() as s:
            log = MaintenanceLog(machine_id=machine_id, action=action, notes=notes, performed_by=performed_by)
            s.add(log)
            s.commit()

    def get_maintenance_logs(self, machine_id: str, limit: int = 50) -> List[Dict]:
        with self.get_session() as s:
            rows = (s.query(MaintenanceLog).filter(MaintenanceLog.machine_id == machine_id)
                    .order_by(desc(MaintenanceLog.performed_at)).limit(limit).all())
            return [{"id": r.id, "action": r.action, "notes": r.notes,
                     "performed_by": r.performed_by,
                     "performed_at": r.performed_at.isoformat()} for r in rows]

    # ── Cleanup ───────────────────────────────────────────────────────────────

    def prune_old_snapshots(self, days: int = 30):
        """Remove snapshots older than `days` days to keep DB lean."""
        cutoff = datetime.utcnow() - timedelta(days=days)
        with self.get_session() as s:
            s.query(SensorSnapshot).filter(SensorSnapshot.recorded_at < cutoff).delete()
            s.commit()
