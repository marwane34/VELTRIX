"""
Alembic migration environment.

This module configures Alembic to use the application's SQLAlchemy settings
and declarative Base so that `alembic revision --autogenerate` discovers all
models registered in app.models.
"""
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool

from alembic import context

# --- Application imports -----------------------------------------------------
# Import settings so we can pull the synchronous database URL at runtime.
from app.config import settings

# Import Base so target_metadata points at the real declarative metadata.
from app.database import Base

# Importing the models package registers every model with Base.metadata.
# This is required for `alembic revision --autogenerate` to detect the tables.
from app.models import (  # noqa: F401  (imported for side effects)
    UserProfile,
    Machine,
    Sensor,
    SensorData,
    Prediction,
    Alert,
    MaintenanceLog,
    Setting,
)

# --- Alembic config ----------------------------------------------------------
config = context.config

# Interpret the config file for Python logging.
# This line sets up loggers declared in alembic.ini.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Override the placeholder sqlalchemy.url in alembic.ini with the real
# synchronous URL from application settings.
config.set_main_option("sqlalchemy.url", settings.sync_database_url)

# Target metadata for autogenerate support.
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """
    Run migrations in 'offline' mode.

    This configures the context with just a URL and not an Engine, though an
    Engine is acceptable here as well. By skipping the Engine creation we
    don't even need a DBAPI to be available — calls to context.execute() emit
    the given string to the script output.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        compare_server_default=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """
    Run migrations in 'online' mode.

    In this scenario we create an Engine and associate a connection with the
    context. The connection is established within a context manager so that
    transactions are automatically committed/rolled back.
    """
    # Build the connectable from the [alembic] section of alembic.ini, but
    # with the URL we injected above.
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            compare_server_default=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
