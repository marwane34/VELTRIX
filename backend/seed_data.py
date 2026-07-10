"""
Seed data script for the Predictive Maintenance backend.

Creates a demo user, machines, sensors, sensor readings, predictions,
alerts, maintenance logs, and settings so the application has realistic
data to display on first launch.

Usage (from the backend/ directory):

    python -m seed_data
    # or
    python seed_data.py

The script is idempotent-ish: it clears existing rows (for the demo user)
before inserting fresh data so re-running won't produce duplicates.
"""
from __future__ import annotations

import os
import sys
import uuid
from datetime import datetime, timedelta, timezone

# Ensure the backend directory is on sys.path when run as `python seed_data.py`
# (so `import app...` works regardless of the invocation style).
_BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)

from sqlalchemy.orm import Session  # noqa: E402

from app.database import Base, SessionLocal, engine  # noqa: E402
from app.models import (  # noqa: E402
    Alert,
    Machine,
    MaintenanceLog,
    Prediction,
    Sensor,
    SensorData,
    Setting,
    UserProfile,
)
from app.core.security import get_password_hash  # noqa: E402


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
DEMO_USER_ID = str(uuid.uuid4())
DEMO_EMAIL = "demo@predictive-maintenance.com"
DEMO_PASSWORD = "demo123456"
DEMO_FULL_NAME = "Demo Operator"
DEMO_ROLE = "admin"

READINGS_PER_SENSOR = 20


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _now() -> datetime:
    """Return the current UTC time (timezone-aware)."""
    return datetime.now(timezone.utc)


def _print(message: str) -> None:
    """Print a progress message to stdout."""
    print(f"  → {message}")


def _clear_existing(db: Session) -> None:
    """Delete all rows so the seed can be re-run without duplicates."""
    print("Clearing existing data...")
    # Order matters: children first, then parents.
    for model in (
        SensorData,
        Alert,
        MaintenanceLog,
        Prediction,
        Sensor,
        Setting,
        Machine,
        UserProfile,
    ):
        deleted = db.query(model).delete()
        db.commit()
        _print(f"Deleted {deleted} rows from {model.__tablename__}")
    print()


# ---------------------------------------------------------------------------
# Seeders
# ---------------------------------------------------------------------------
def seed_user(db: Session) -> UserProfile:
    """Create the demo user with a hashed password."""
    print("Seeding demo user...")
    user = UserProfile(
        id=DEMO_USER_ID,
        email=DEMO_EMAIL,
        full_name=DEMO_FULL_NAME,
        role=DEMO_ROLE,
    )
    # Store the bcrypt-hashed password on the profile row so the AuthService
    # login flow can verify credentials for the demo account.
    user.password_hash = get_password_hash(DEMO_PASSWORD)
    db.add(user)
    db.commit()
    db.refresh(user)
    _print(f"Created user: {user.email} (role={user.role}, id={user.id})")
    _print(f"Password hash set for: {DEMO_PASSWORD}")
    print()
    return user


def seed_machines(db: Session) -> list[Machine]:
    """Create three machines with different statuses and thresholds."""
    print("Seeding machines...")
    machines_data = [
        {
            "id": str(uuid.uuid4()),
            "name": "Compressor Unit 01",
            "location": "Building A — Room 101",
            "description": "Primary air compressor for the main production line.",
            "status": "online",
            "rms_min": 0.5,
            "rms_max": 3.0,
            "temp_min": 20.0,
            "temp_max": 85.0,
            "current_min": 0.5,
            "current_max": 5.0,
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Motor Assembly B",
            "location": "Building A — Room 204",
            "description": "High-speed motor driving the conveyor system.",
            "status": "warning",
            "rms_min": 0.3,
            "rms_max": 2.5,
            "temp_min": 15.0,
            "temp_max": 80.0,
            "current_min": 1.0,
            "current_max": 6.0,
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Pump Station C",
            "location": "Building B — Basement",
            "description": "Centrifugal pump for the cooling-water circuit.",
            "status": "critical",
            "rms_min": 0.4,
            "rms_max": 2.8,
            "temp_min": 18.0,
            "temp_max": 75.0,
            "current_min": 0.8,
            "current_max": 4.5,
        },
    ]

    machines: list[Machine] = []
    for data in machines_data:
        machine = Machine(user_id=DEMO_USER_ID, **data)
        db.add(machine)
        machines.append(machine)

    db.commit()
    for m in machines:
        db.refresh(m)
        _print(f"Created machine: {m.name} (status={m.status}, id={m.id})")
    print()
    return machines


def seed_sensors(db: Session, machines: list[Machine]) -> list[Sensor]:
    """Create two sensors (vibration + temperature) per machine."""
    print("Seeding sensors...")
    sensors: list[Sensor] = []
    sensor_pairs = [
        (
            "vibration",
            "X",
            "g",
            0,
            10,
            "Vibration (RMS) sensor on the X axis.",
        ),
        (
            "temperature",
            "T",
            "°C",
            -20,
            150,
            "Surface temperature sensor.",
        ),
    ]

    for machine in machines:
        for sensor_type, channel, unit, min_val, max_val, description in sensor_pairs:
            sensor = Sensor(
                id=str(uuid.uuid4()),
                machine_id=machine.id,
                user_id=DEMO_USER_ID,
                name=f"{machine.name} — {sensor_type.capitalize()}",
                type=sensor_type,
                channel=channel,
                unit=unit,
                status="active",
                sampling_rate=1000,
                min_value=float(min_val),
                max_value=float(max_val),
                description=description,
            )
            db.add(sensor)
            sensors.append(sensor)

    db.commit()
    for s in sensors:
        db.refresh(s)
        _print(f"Created sensor: {s.name} (type={s.type}, machine={s.machine_id})")
    print()
    return sensors


def seed_sensor_data(db: Session, machines: list[Machine], sensors: list[Sensor]) -> None:
    """Create 20 readings per sensor, spread over the last 20 hours."""
    print(f"Seeding sensor data ({READINGS_PER_SENSOR} readings per sensor)...")
    total = 0
    base_time = _now()

    # Group sensors by machine for realistic machine_id tagging.
    for sensor in sensors:
        for i in range(READINGS_PER_SENSOR):
            # Generate a plausible reading based on sensor type.
            if sensor.type == "vibration":
                # Vibration RMS values between 0.5 and 4.5 g, with some noise.
                value = round(0.5 + (i * 0.15) + (i % 3) * 0.2, 3)
            elif sensor.type == "temperature":
                # Temperature values between 35 and 90 °C.
                value = round(35.0 + (i * 2.1) + (i % 5) * 0.8, 2)
            else:
                value = round(float(i), 2)

            reading = SensorData(
                id=str(uuid.uuid4()),
                sensor_id=sensor.id,
                machine_id=sensor.machine_id,
                user_id=DEMO_USER_ID,
                value=value,
                unit=sensor.unit,
                quality="good",
                recorded_at=base_time - timedelta(hours=READINGS_PER_SENSOR - i),
            )
            db.add(reading)
            total += 1

    db.commit()
    _print(f"Inserted {total} sensor_data rows across {len(sensors)} sensors")
    print()


def seed_predictions(db: Session, machines: list[Machine]) -> None:
    """Create one prediction per machine reflecting its status."""
    print("Seeding predictions...")
    prediction_specs = [
        # (health_score, status, bearing_wear, overheating, failure, rul_hours)
        (92.5, "healthy", 5.0, 2.0, 1.0, 8500),
        (68.0, "warning", 35.0, 22.0, 12.0, 3200),
        (41.0, "critical", 72.0, 58.0, 45.0, 480),
    ]

    for machine, spec in zip(machines, prediction_specs):
        health, status, bearing, overheat, failure, rul = spec
        prediction = Prediction(
            id=str(uuid.uuid4()),
            machine_id=machine.id,
            user_id=DEMO_USER_ID,
            health_score=health,
            status=status,
            bearing_wear_pct=bearing,
            overheating_risk_pct=overheat,
            failure_risk_pct=failure,
            rul_hours=rul,
            predicted_at=_now() - timedelta(minutes=15),
        )
        db.add(prediction)
        _print(
            f"Prediction for {machine.name}: health={health}, status={status}, "
            f"RUL={rul}h"
        )

    db.commit()
    print()


def seed_alerts(db: Session, machines: list[Machine]) -> None:
    """Create 3–5 alerts across the machines."""
    print("Seeding alerts...")
    alerts_data = [
        {
            "machine": machines[1],  # Motor Assembly B (warning)
            "type": "bearing_wear",
            "severity": "warning",
            "message": "Bearing wear detected on Motor Assembly B. Vibration RMS trending upward.",
            "is_read": False,
            "resolved_at": None,
            "created_at": _now() - timedelta(hours=5),
        },
        {
            "machine": machines[1],  # Motor Assembly B
            "type": "abnormal_vibration",
            "severity": "warning",
            "message": "Abnormal vibration detected on Motor Assembly B. RMS exceeded 2.5 g.",
            "is_read": False,
            "resolved_at": None,
            "created_at": _now() - timedelta(hours=3),
        },
        {
            "machine": machines[2],  # Pump Station C (critical)
            "type": "overheating",
            "severity": "critical",
            "message": "Critical overheating detected on Pump Station C. Temperature exceeded 75 °C.",
            "is_read": False,
            "resolved_at": None,
            "created_at": _now() - timedelta(hours=2),
        },
        {
            "machine": machines[2],  # Pump Station C
            "type": "failure_risk",
            "severity": "critical",
            "message": "High failure risk (45%) predicted for Pump Station C. RUL estimated at 480 hours.",
            "is_read": False,
            "resolved_at": None,
            "created_at": _now() - timedelta(hours=1),
        },
        {
            "machine": machines[0],  # Compressor Unit 01 (online)
            "type": "abnormal_vibration",
            "severity": "info",
            "message": "Minor vibration fluctuation on Compressor Unit 01. Within acceptable range.",
            "is_read": True,
            "resolved_at": _now() - timedelta(hours=8),
            "created_at": _now() - timedelta(hours=12),
        },
    ]

    for data in alerts_data:
        machine = data.pop("machine")
        created_at = data.pop("created_at")
        alert = Alert(
            id=str(uuid.uuid4()),
            machine_id=machine.id,
            user_id=DEMO_USER_ID,
            created_at=created_at,
            **data,
        )
        db.add(alert)
        _print(
            f"Alert on {machine.name}: type={alert.type}, severity={alert.severity}, "
            f"is_read={alert.is_read}"
        )

    db.commit()
    print()


def seed_maintenance_logs(db: Session, machines: list[Machine]) -> None:
    """Create 2–3 maintenance log entries per machine."""
    print("Seeding maintenance logs...")
    logs_per_machine = {
        machines[0].id: [
            {
                "action": "Routine inspection",
                "notes": "Monthly inspection completed. All systems nominal.",
                "performed_by": "Jane Technician",
                "performed_at": _now() - timedelta(days=30),
                "next_maintenance_at": _now() + timedelta(days=60),
                "scheduled_by": "Maintenance Scheduler",
            },
            {
                "action": "Filter replacement",
                "notes": "Replaced intake air filter. Old filter showed moderate wear.",
                "performed_by": "John Engineer",
                "performed_at": _now() - timedelta(days=15),
                "next_maintenance_at": _now() + timedelta(days=75),
                "scheduled_by": "Maintenance Scheduler",
            },
        ],
        machines[1].id: [
            {
                "action": "Bearing lubrication",
                "notes": "Lubricated drive-end bearing. Vibration reduced temporarily.",
                "performed_by": "Jane Technician",
                "performed_at": _now() - timedelta(days=10),
                "next_maintenance_at": _now() + timedelta(days=20),
                "scheduled_by": "Maintenance Scheduler",
            },
            {
                "action": "Alignment check",
                "notes": "Checked shaft alignment. Found slight misalignment, corrected.",
                "performed_by": "John Engineer",
                "performed_at": _now() - timedelta(days=5),
                "next_maintenance_at": _now() + timedelta(days=25),
                "scheduled_by": "Maintenance Scheduler",
            },
            {
                "action": "Vibration analysis",
                "notes": "Performed detailed vibration spectrum analysis. Bearing wear signature detected.",
                "performed_by": "Jane Technician",
                "performed_at": _now() - timedelta(days=2),
                "next_maintenance_at": _now() + timedelta(days=7),
                "scheduled_by": "Maintenance Scheduler",
            },
        ],
        machines[2].id: [
            {
                "action": "Emergency shutdown inspection",
                "notes": "Inspected after emergency shutdown. Seal damage found.",
                "performed_by": "John Engineer",
                "performed_at": _now() - timedelta(days=7),
                "next_maintenance_at": _now() + timedelta(days=3),
                "scheduled_by": "Maintenance Scheduler",
            },
            {
                "action": "Seal replacement",
                "notes": "Replaced damaged mechanical seal. Recommended full overhaul soon.",
                "performed_by": "Jane Technician",
                "performed_at": _now() - timedelta(days=3),
                "next_maintenance_at": _now() + timedelta(days=1),
                "scheduled_by": "Maintenance Scheduler",
            },
        ],
    }

    total = 0
    for machine_id, entries in logs_per_machine.items():
        machine_name = next(m.name for m in machines if m.id == machine_id)
        for entry in entries:
            performed_at = entry.pop("performed_at")
            log = MaintenanceLog(
                id=str(uuid.uuid4()),
                machine_id=machine_id,
                user_id=DEMO_USER_ID,
                performed_at=performed_at,
                **entry,
            )
            db.add(log)
            total += 1
            _print(f"Log for {machine_name}: action={log.action} by {log.performed_by}")

    db.commit()
    _print(f"Inserted {total} maintenance log entries")
    print()


def seed_settings(db: Session) -> None:
    """Create default application settings for the demo user."""
    print("Seeding settings...")
    settings_data = [
        # Monitoring
        {
            "key": "monitoring_interval",
            "value": "5",
            "category": "monitoring",
        },
        {
            "key": "data_sampling_rate",
            "value": "1000",
            "category": "monitoring",
        },
        {
            "key": "enable_real_time_monitoring",
            "value": "true",
            "category": "monitoring",
        },
        # Alert thresholds
        {
            "key": "alert_threshold_vibration_rms",
            "value": "3.0",
            "category": "alert_thresholds",
        },
        {
            "key": "alert_threshold_temperature",
            "value": "85.0",
            "category": "alert_thresholds",
        },
        {
            "key": "alert_threshold_current",
            "value": "5.0",
            "category": "alert_thresholds",
        },
        {
            "key": "alert_threshold_health_score",
            "value": "60.0",
            "category": "alert_thresholds",
        },
        # Notifications
        {
            "key": "notification_email_enabled",
            "value": "true",
            "category": "notifications",
        },
        {
            "key": "notification_sms_enabled",
            "value": "false",
            "category": "notifications",
        },
        {
            "key": "notification_webhook_url",
            "value": "",
            "category": "notifications",
        },
        # Prediction
        {
            "key": "prediction_model_version",
            "value": "v2.1.0",
            "category": "prediction",
        },
        {
            "key": "prediction_confidence_threshold",
            "value": "0.75",
            "category": "prediction",
        },
        # General
        {
            "key": "timezone",
            "value": "UTC",
            "category": "general",
        },
        {
            "key": "language",
            "value": "en",
            "category": "general",
        },
        {
            "key": "theme",
            "value": "dark",
            "category": "general",
        },
    ]

    for entry in settings_data:
        setting = Setting(
            id=str(uuid.uuid4()),
            user_id=DEMO_USER_ID,
            key=entry["key"],
            value=entry["value"],
            category=entry["category"],
        )
        db.add(setting)
        _print(f"Setting: [{entry['category']}] {entry['key']} = {entry['value']}")

    db.commit()
    _print(f"Inserted {len(settings_data)} settings")
    print()


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def run_seed() -> None:
    """Run the full seed pipeline."""
    print("=" * 60)
    print("  PREDICTIVE MAINTENANCE — DATABASE SEED SCRIPT")
    print("=" * 60)
    print()

    # Create tables if they don't exist (so the seed can run even before
    # `alembic upgrade head` has been executed in a dev environment).
    print("Ensuring tables exist...")
    Base.metadata.create_all(bind=engine)
    _print("All tables are present")
    print()

    db: Session = SessionLocal()
    try:
        _clear_existing(db)
        user = seed_user(db)
        machines = seed_machines(db)
        sensors = seed_sensors(db, machines)
        seed_sensor_data(db, machines, sensors)
        seed_predictions(db, machines)
        seed_alerts(db, machines)
        seed_maintenance_logs(db, machines)
        seed_settings(db)

        print("=" * 60)
        print("  SEED COMPLETE ✓")
        print("=" * 60)
        print()
        print(f"  Demo user : {user.email}")
        print(f"  Password  : {DEMO_PASSWORD}")
        print(f"  Machines  : {len(machines)}")
        print(f"  Sensors   : {len(sensors)}")
        print(f"  Readings  : {len(sensors) * READINGS_PER_SENSOR}")
        print()
    except Exception:
        db.rollback()
        print()
        print("  SEED FAILED — transaction rolled back.")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run_seed()
