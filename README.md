# Interview Canvas Application

A collaborative system design interview platform with real-time canvas editing.

## Structure

- `/backend` - FastAPI backend with Python/uv
- `/frontend` - React + TypeScript frontend with Vite
- `/docs` - Supporting documentation
- `openapi.yaml` - API specification

## Getting Started

### Backend
```bash
cd backend
uv sync
uv run uvicorn main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Testing

### Backend
```bash
cd backend
uv run pytest
```

### Frontend
```bash
cd frontend
npm test
```

## Services Layer

The frontend uses a centralized services layer with a mock implementation that allows the app to run without a real backend. See `frontend/src/services/` for details.
