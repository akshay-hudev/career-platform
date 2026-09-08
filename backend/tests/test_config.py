import pytest

from backend.config import Settings, _INSECURE_SECRET_KEYS
from backend.database import normalize_database_url


def test_cors_origins_accepts_comma_separated_value():
    config = Settings(
        _env_file=None,
        CORS_ORIGINS="https://app.example.com, https://preview.example.com",
    )

    assert config.parse_cors_origins() == [
        "https://app.example.com",
        "https://preview.example.com",
    ]


def test_cors_origins_accepts_json_list():
    config = Settings(
        _env_file=None,
        CORS_ORIGINS='["https://app.example.com", "https://preview.example.com"]',
    )

    assert config.parse_cors_origins() == [
        "https://app.example.com",
        "https://preview.example.com",
    ]


def test_documented_production_defaults_are_not_safe():
    config = Settings(_env_file=None)

    assert config.SECRET_KEY in _INSECURE_SECRET_KEYS
    assert "*" in config.parse_cors_origins()


@pytest.mark.parametrize(
    ("url", "expected"),
    [
        (
            "postgresql://user:pass@host/db?sslmode=require",
            "postgresql+psycopg://user:pass@host/db?sslmode=require",
        ),
        (
            "postgres://user:pass@host/db",
            "postgresql+psycopg://user:pass@host/db",
        ),
        ("sqlite:///test.db", "sqlite:///test.db"),
    ],
)
def test_database_url_uses_psycopg_v3(url, expected):
    assert normalize_database_url(url) == expected
