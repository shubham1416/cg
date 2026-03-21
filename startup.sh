#!/bin/bash
# ── Azure App Service Startup Script ─────────────────────
# Installs Python packages and starts the FastAPI application.
# This handles cases where Oryx build didn't create the venv.

set -e

APP_DIR="/home/site/wwwroot"
cd "$APP_DIR"

echo "=== Installing Python dependencies ==="
pip install --quiet --no-cache-dir -r requirements.txt

echo "=== Starting Compliance Quest ==="
gunicorn application:app \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:${PORT:-8000} \
    --workers 2 \
    --timeout 120 \
    --access-logfile - \
    --error-logfile -
