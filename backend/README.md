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

### Unit Tests
```bash
uv run pytest
```

Unit tests use in-memory SQLite and do not require PostgreSQL.

### Integration Tests
Integration tests run against a real PostgreSQL database (docker-compose).

```bash
# Start docker-compose first
docker-compose up -d

# Run integration tests
export TEST_DATABASE_URL=postgresql://sdip:sdip@localhost:5432/sdip
export API_BASE_URL=http://localhost:8000
uv run pytest test_integration.py
```

Integration tests cover:
- Database connection and schema
- User management
- Session lifecycle (create, update, start, end, duplicate)
- Guest links (create, join, revoke)
- Participants management
- Canvas operations
- CORS and security
- Complete user flows
- Guest join flows
- Service health
