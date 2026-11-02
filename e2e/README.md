# End-to-End Tests

End-to-end tests verify the complete user flow using Playwright to automate browser interactions against the docker-compose environment.

## Prerequisites

- Docker and Docker Compose installed
- Node.js and npm installed

## Setup

Install Playwright dependencies:

```bash
npm install
```

Install Playwright browsers:

```bash
npx playwright install
```

## Running E2E Tests

### Start docker-compose

The Playwright config automatically starts docker-compose, but you can also start it manually:

```bash
docker-compose up -d
```

### Run E2E tests

```bash
npm run e2e
```

### Run E2E tests with UI (debug mode)

```bash
npm run e2e:ui
```

### Run E2E tests with headed browser (visible)

```bash
npm run e2e:headed
```

## Test Coverage

### 1. Complete Interview Flow
- **Scenario**: Interviewer creates session, candidate joins via guest link, candidate updates canvas
- **Steps**:
  1. Interviewer navigates to dashboard
  2. Creates a new interview session
  3. Generates a guest link via API
  4. Candidate joins using the guest link token
  5. Candidate adds an element to the canvas
  6. Interviewer verifies session state

**Note**: Real-time canvas sync via WebSocket is not fully implemented yet (httpApi uses NoopSocket). This test verifies the flow works up to the point where real-time sync would occur.

### 2. Candidate Joins via Token
- **Scenario**: Candidate joins a session using a guest link token
- **Steps**:
  1. Create session via API
  2. Generate guest link
  3. Navigate to join page with token
  4. Enter candidate name
  5. Verify session loads

### 3. Interviewer Session Management
- **Scenario**: Interviewer creates and manages a session
- **Steps**:
  1. Navigate to dashboard
  2. Create session
  3. Enter session
  4. Start session
  5. Add canvas element
  6. End session

## Configuration

Playwright is configured in `playwright.config.ts`:

- **Base URL**: `http://localhost:8000` (docker-compose app service)
- **Browser**: Chromium
- **Workers**: 1 (sequential execution for coordination between browser contexts)
- **Web Server**: Automatically starts docker-compose before tests
- **Timeout**: 2 minutes for docker-compose startup

## Environment Variables

- `CI`: Set to true for CI environments (retries enabled, no server reuse)

## Cleaning Up

After running tests, stop docker-compose:

```bash
docker-compose down
```

To also remove the database volume:

```bash
docker-compose down -v
```

## Troubleshooting

### Tests timeout waiting for docker-compose
- Ensure Docker is running
- Check docker-compose logs: `docker-compose logs`
- Increase timeout in playwright.config.ts if needed

### Browser fails to load page
- Verify app is running: `curl http://localhost:8000`
- Check docker-compose status: `docker-compose ps`
- Check app logs: `docker-compose logs app`

### Tests fail to find elements
- The UI may have changed - update selectors in test file
- Run with headed mode to see what's happening: `npm run e2e:headed`
- Use UI mode to debug: `npm run e2e:ui`

### Playwright browsers not installed
- Run: `npx playwright install`
- For CI: `npx playwright install --with-deps`
