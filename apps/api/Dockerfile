# apps/api/Dockerfile

# ────────────────────────────────────────────────
# Builder Stage: Install dependencies & build wheels
# ────────────────────────────────────────────────
FROM python:3.12-slim AS builder

WORKDIR /build

# Install build dependencies (minimal set)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Create isolated virtualenv
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Upgrade pip & install requirements (cache-friendly)
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip setuptools wheel && \
    pip install --no-cache-dir -r requirements.txt

# ────────────────────────────────────────────────
# Final Runtime Stage: Minimal, secure image
# ────────────────────────────────────────────────
FROM python:3.12-slim

# Create non-root user & group (security best practice)
RUN groupadd -r appgroup && \
    useradd -r -g appgroup -u 1000 -m -s /bin/bash appuser && \
    mkdir -p /app && \
    chown -R appuser:appgroup /app

WORKDIR /app

# Copy only the virtualenv from builder (no build tools remain)
COPY --from=builder --chown=appuser:appgroup /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy application code (last, for best layer caching)
COPY --chown=appuser:appgroup . .

# Ensure correct permissions
RUN chmod +x /app && \
    chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Expose port (Render/Fly/Railway use $PORT env var)
EXPOSE 8000

# Healthcheck (used by orchestrators like Kubernetes/Render)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8000}/health || exit 1

# Run Uvicorn with production-grade settings
# - Bind to 0.0.0.0:$PORT (Render/Fly/Railway set $PORT)
# - Workers: dynamic based on CPU (2-4 safe default)
# - Proxy headers (for Render/Fly load balancers)
# - No access log (use structured logging instead)
# - Graceful shutdown timeout
CMD ["sh", "-c", "\
    uvicorn app.main:app \
    --host 0.0.0.0 \
    --port ${PORT:-8000} \
    --workers ${UVICORN_WORKERS:-4} \
    --log-level info \
    --proxy-headers \
    --forwarded-allow-ips '*' \
    --no-access-log \
    --timeout-graceful-shutdown 30 \
    --timeout-keep-alive 5 \
"]
