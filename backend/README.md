# Interview Canvas Backend

FastAPI backend for the Interview Canvas application.

## Database Configuration

The backend supports both SQLite (default) and PostgreSQL. Configure via the `DATABASE_URL` environment variable:

### SQLite (default)
```bash
DATABASE_URL=sqlite:///interview_canvas.db
```

### PostgreSQL
```bash
DATABASE_URL=postgresql://user:password@localhost:5432/interview_canvas
```

### PostgreSQL with connection pooling (recommended for production)
```bash
DATABASE_URL=postgresql+psycopg://user:password@localhost:5432/interview_canvas
```

## Development

### With SQLite (default)
```bash
cp .env.example .env
uv sync
uv run uvicorn main:app --reload
```

### With PostgreSQL
```bash
cp .env.example .env
# Edit .env to set DATABASE_URL for PostgreSQL
uv sync
uv run uvicorn main:app --reload
```

### Using Docker Compose (with PostgreSQL)
```bash
docker-compose up --build
```

## Testing

```bash
uv run pytest
```

Tests use in-memory SQLite and do not require PostgreSQL.
