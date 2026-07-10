"""initial schema

Revision ID: 0001
Revises:
Create Date: 2025-01-01 00:00:00.000000

Creates the initial schema for the predictive maintenance backend:
    user_profiles, machines, sensors, sensor_data, predictions,
    alerts, maintenance_logs, settings
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ------------------------------------------------------------------
    # 1. user_profiles
    # ------------------------------------------------------------------
    op.create_table(
        "user_profiles",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=False, server_default=""),
        sa.Column("role", sa.String(length=20), nullable=False, server_default="operator"),
        # password_hash is used by AuthService for credential storage. It is
        # nullable so that users created via Supabase auth (without a local
        # password) can still have a profile row.
        sa.Column("password_hash", sa.String(length=255), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint("email", name="uq_user_profiles_email"),
    )

    # ------------------------------------------------------------------
    # 2. machines
    # ------------------------------------------------------------------
    op.create_table(
        "machines",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("location", sa.String(length=255), nullable=False, server_default=""),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="online"),
        sa.Column("rms_min", sa.Float(), nullable=False, server_default=sa.text("0.5")),
        sa.Column("rms_max", sa.Float(), nullable=False, server_default=sa.text("3.0")),
        sa.Column("temp_min", sa.Float(), nullable=False, server_default=sa.text("20.0")),
        sa.Column("temp_max", sa.Float(), nullable=False, server_default=sa.text("85.0")),
        sa.Column("current_min", sa.Float(), nullable=False, server_default=sa.text("0.5")),
        sa.Column("current_max", sa.Float(), nullable=False, server_default=sa.text("5.0")),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("idx_machines_user", "machines", ["user_id"])

    # ------------------------------------------------------------------
    # 3. sensors
    # ------------------------------------------------------------------
    op.create_table(
        "sensors",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column(
            "machine_id",
            sa.String(length=36),
            sa.ForeignKey("machines.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("type", sa.String(length=50), nullable=False, server_default="vibration"),
        sa.Column("channel", sa.String(length=10), nullable=False, server_default="X"),
        sa.Column("unit", sa.String(length=20), nullable=False, server_default="g"),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="active"),
        sa.Column("sampling_rate", sa.Integer(), nullable=False, server_default=sa.text("1000")),
        sa.Column("min_value", sa.Float(), nullable=False, server_default=sa.text("0")),
        sa.Column("max_value", sa.Float(), nullable=False, server_default=sa.text("100")),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index("idx_sensors_machine", "sensors", ["machine_id"])
    op.create_index("idx_sensors_user", "sensors", ["user_id"])

    # ------------------------------------------------------------------
    # 4. sensor_data
    # ------------------------------------------------------------------
    op.create_table(
        "sensor_data",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column(
            "sensor_id",
            sa.String(length=36),
            sa.ForeignKey("sensors.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "machine_id",
            sa.String(length=36),
            sa.ForeignKey("machines.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("value", sa.Float(), nullable=False, server_default=sa.text("0")),
        sa.Column("unit", sa.String(length=20), nullable=False, server_default="g"),
        sa.Column("quality", sa.String(length=20), nullable=False, server_default="good"),
        sa.Column(
            "recorded_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index(
        "idx_sensor_data_sensor_time",
        "sensor_data",
        ["sensor_id", sa.text("recorded_at DESC")],
    )
    op.create_index(
        "idx_sensor_data_machine_time",
        "sensor_data",
        ["machine_id", sa.text("recorded_at DESC")],
    )

    # ------------------------------------------------------------------
    # 5. predictions
    # ------------------------------------------------------------------
    op.create_table(
        "predictions",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column(
            "machine_id",
            sa.String(length=36),
            sa.ForeignKey("machines.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("health_score", sa.Float(), nullable=False, server_default=sa.text("100")),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="healthy"),
        sa.Column("bearing_wear_pct", sa.Float(), nullable=False, server_default=sa.text("0")),
        sa.Column("overheating_risk_pct", sa.Float(), nullable=False, server_default=sa.text("0")),
        sa.Column("failure_risk_pct", sa.Float(), nullable=False, server_default=sa.text("0")),
        sa.Column("rul_hours", sa.Integer(), nullable=False, server_default=sa.text("9999")),
        sa.Column(
            "predicted_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index(
        "idx_predictions_machine_time",
        "predictions",
        ["machine_id", sa.text("predicted_at DESC")],
    )

    # ------------------------------------------------------------------
    # 6. alerts
    # ------------------------------------------------------------------
    op.create_table(
        "alerts",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column(
            "machine_id",
            sa.String(length=36),
            sa.ForeignKey("machines.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("type", sa.String(length=50), nullable=False),
        sa.Column("severity", sa.String(length=20), nullable=False, server_default="warning"),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("is_read", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )
    op.create_index(
        "idx_alerts_machine_created",
        "alerts",
        ["machine_id", sa.text("created_at DESC")],
    )
    op.create_index(
        "idx_alerts_user_unread",
        "alerts",
        ["user_id", "is_read", sa.text("created_at DESC")],
    )

    # ------------------------------------------------------------------
    # 7. maintenance_logs
    # ------------------------------------------------------------------
    op.create_table(
        "maintenance_logs",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column(
            "machine_id",
            sa.String(length=36),
            sa.ForeignKey("machines.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("action", sa.String(length=255), nullable=False),
        sa.Column("notes", sa.Text(), nullable=False, server_default=""),
        sa.Column("performed_by", sa.String(length=255), nullable=False, server_default="System"),
        sa.Column(
            "performed_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("next_maintenance_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("scheduled_by", sa.String(length=255), nullable=False, server_default="System"),
    )
    op.create_index(
        "idx_maint_logs_machine_time",
        "maintenance_logs",
        ["machine_id", sa.text("performed_at DESC")],
    )

    # ------------------------------------------------------------------
    # 8. settings
    # ------------------------------------------------------------------
    op.create_table(
        "settings",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("user_id", sa.String(length=36), nullable=False),
        sa.Column("key", sa.String(length=255), nullable=False),
        sa.Column("value", sa.Text(), nullable=False, server_default=""),
        sa.Column("category", sa.String(length=100), nullable=False, server_default="general"),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.UniqueConstraint("user_id", "key", name="uq_settings_user_id_key"),
    )


def downgrade() -> None:
    # Drop in reverse dependency order to respect foreign keys.
    op.drop_table("settings")
    op.drop_table("maintenance_logs")
    op.drop_table("alerts")
    op.drop_table("predictions")
    op.drop_table("sensor_data")
    op.drop_table("sensors")
    op.drop_table("machines")
    op.drop_table("user_profiles")
