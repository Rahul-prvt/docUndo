FROM python:3.11-slim

WORKDIR /app

# Copy project files
COPY backend/requirements.txt .
COPY backend/app ./app
COPY backend/tests ./tests

# Install dependencies
RUN python -m pip install --no-cache-dir -r requirements.txt

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD python -c "import requests; requests.get('http://localhost:8000/health', timeout=5)"

# Run app
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
