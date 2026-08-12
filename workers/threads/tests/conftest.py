"""Konfigurasi pytest untuk tests Threads - memastikan workers/ ada di
sys.path agar import absolut (threads.*, shared.*) berhasil."""

import os
import sys

WORKERS_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if WORKERS_DIR not in sys.path:
    sys.path.insert(0, WORKERS_DIR)


def pytest_configure(config):
    """Aktifkan pytest-asyncio auto mode (async test langsung jalan)."""
    config.option.asyncio_mode = "auto"

