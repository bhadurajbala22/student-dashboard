"""SQLAlchemy engine/session wiring for Postgres (Supabase).

The model layer uses no dialect-specific column types, so this module is the
only place that knows about the connection and the pooler.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from .config import DATABASE_URL

connect_args: dict = {
    "connect_timeout": 10,
    "application_name": "toppersdeck",
}
# Supabase offers three ports. 5432 on `db.<ref>.supabase.co` is a direct
# connection; 5432 on `*.pooler.supabase.com` is session pooling; 6543 is
# the transaction pooler, which hands a different backend to every
# transaction. Server-side prepared statements cannot survive that, and
# psycopg only stops creating them when the threshold is None.
if ":6543" in DATABASE_URL:
    connect_args["prepare_threshold"] = None

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,      # a pooler may have dropped the connection since
    pool_size=5,
    max_overflow=5,
    pool_recycle=1800,       # stay under Supabase's idle timeout
    connect_args=connect_args,
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


_DDL_TYPES = {"DATETIME": "TIMESTAMP", "JSON": "JSONB"}


def ensure_columns() -> list[str]:
    """Add columns introduced after a database was first created.

    SQLAlchemy's create_all() only creates missing *tables*, so a new column on
    an existing install would otherwise blow up at query time. Keep this list
    short-lived — a real deployment should move to Alembic.
    """
    from sqlalchemy import inspect, text

    wanted = {
        "orders": {
            "reminder_sent_at": "DATETIME",
            "annotations": "JSON",
            "annotations_updated_at": "DATETIME",
        },
    }
    added: list[str] = []
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())
    with engine.begin() as conn:
        for table, columns in wanted.items():
            if table not in existing_tables:
                continue
            have = {c["name"] for c in inspector.get_columns(table)}
            for name, ddl in columns.items():
                if name not in have:
                    conn.execute(text(
                        f"ALTER TABLE {table} ADD COLUMN {name} {_DDL_TYPES.get(ddl, ddl)}"))
                    added.append(f"{table}.{name}")
    return added
