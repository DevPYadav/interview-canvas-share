# Integration Tests

Integration tests verify the backend API works correctly with a real PostgreSQL database running in docker-compose.

## Prerequisites

- Docker and Docker Compose installed
- PostgreSQL service running via docker-compose

## Running Integration Tests

### 1. Start docker-compose

```bash
docker-compose up -d
```

This starts:
- PostgreSQL on port 5432 (database: sdip, user: sdip, password: sdip)
- The application on port 8000

### 2. Wait for services to be ready

Give docker-compose a few seconds to start the services. The postgres healthcheck ensures the database is ready before the app starts.

### 3. Run integration tests

```bash
export TEST_DATABASE_URL=postgresql://sdip:sdip@localhost:5432/sdip
export API_BASE_URL=http://localhost:8000
cd backend
uv run pytest test_integration.py -v
```

Or use the Makefile:

```bash
export TEST_DATABASE_URL=postgresql://sdip:sdip@localhost:5432/sdip
export API_BASE_URL=http://localhost:8000
make test-integration
```

## Test Coverage

Integration tests cover the following scenarios:

### 1. Database Connection
- Verify app can connect to PostgreSQL
- Verify database schema is created on startup

### 2. User Management
- Create a new user via API
- Retrieve current user
- Handle duplicate email errors

### 3. Session Lifecycle
- Create a session
- Get all sessions for a user
- Get a specific session
- Update session metadata
- Start a session (state changes to 'live')
- End a session (state changes to 'ended')
- Duplicate a session (copies canvas data)

### 4. Guest Links
- Create a guest link for a session
- Join a session via guest link token
- Revoke a guest link
- Verify revoked link cannot be used

### 5. Participants
- Get participants for a session
- Verify participant is added when joining via guest link
- Verify participant has correct role

### 6. Canvas Operations
- Get canvas for a session
- Update canvas elements
- Verify changes persist in database
- Duplicate session copies canvas elements

### 7. CORS & Security
- Verify frontend origin is allowed
- Verify OPTIONS requests work
- Verify API returns proper error responses

### 8. Complete User Flow
- Create user → Create session → Start session → Update canvas → End session
- Verify all data persists in PostgreSQL

### 9. Guest Join Flow
- Create session → Create guest link → Join via token → Verify participant → Update canvas

### 10. Service Health
- Verify `/health` endpoint works
- Verify app responds after postgres healthcheck passes

## Cleaning Up

After running tests, you can stop docker-compose:

```bash
docker-compose down
```

To also remove the database volume:

```bash
docker-compose down -v
```

## Troubleshooting

### Connection refused
- Ensure docker-compose is running: `docker-compose ps`
- Wait a few more seconds for services to fully start

### Database connection errors
- Verify PostgreSQL is healthy: `docker-compose logs postgres`
- Check DATABASE_URL matches docker-compose configuration

### Test failures
- Run with verbose output: `uv run pytest test_integration.py -v -s`
- Check docker-compose logs: `docker-compose logs app`
