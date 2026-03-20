#!/bin/bash

# ── Azure App Service Startup Script ─────────────────────
# Starts the FastAPI application with gunicorn + uvicorn workers.
# npm dependencies are installed during the build stage, not here.

# Use Azure's PORT env var if set, otherwise default to 8000
PORT="${PORT:-8000}"

echo "Starting Compliance Quest on port $PORT..."
gunicorn backend.main:app \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:$PORT \
    --workers 2 \
    --timeout 120 \
    --access-logfile - \
    --error-logfile -
