# Stage 1: Build frontend with Node.js
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./

# Install dependencies
RUN npm ci

# Copy frontend source
COPY frontend/ ./

# Build frontend
RUN npm run build

# Stage 2: Build Python image with backend and frontend static files
FROM python:3.13-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install uv for Python dependency management
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Copy backend files
COPY backend/ ./backend/

# Install Python dependencies
WORKDIR /app/backend
RUN uv sync --frozen

# Install PostgreSQL client (for potential connections)
RUN apt-get update && apt-get install -y \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy frontend build artifacts from stage 1
COPY --from=frontend-builder /app/frontend/dist ./frontend-dist

# Create a symlink for easier serving
RUN ln -s ./frontend-dist ./static

# Copy .env example to .env if not exists
RUN if [ ! -f .env ]; then cp .env.example .env; fi

# Expose port
EXPOSE 8000

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV DATABASE_URL=sqlite:///interview_canvas.db
ENV VITE_USE_MOCK=false

# Run the application
CMD ["uv", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
