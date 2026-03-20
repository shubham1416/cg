# ── Stage 1: Install Python dependencies ─────────────────
FROM python:3.11-slim AS deps

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ── Stage 2: Final runtime image ─────────────────────────
FROM python:3.11-slim

WORKDIR /app

# Install Node.js (for npm/Phaser) and curl (for healthcheck)
RUN apt-get update && \
    apt-get install -y --no-install-recommends nodejs npm curl && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# Copy Python packages from deps stage
COPY --from=deps /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=deps /usr/local/bin /usr/local/bin

# Copy application code
COPY . .

# Install frontend dependencies (Phaser)
RUN npm ci --production 2>/dev/null || npm install --production

# Expose the application port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:8000/api/leaderboard || exit 1

# Run with uvicorn (production settings)
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
