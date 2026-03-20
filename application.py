"""
Azure App Service entry point.
Oryx (Azure's build system) looks for 'application:app' by default.
This module re-exports the FastAPI app from backend.main.
"""
from backend.main import app as app  # noqa: F401
