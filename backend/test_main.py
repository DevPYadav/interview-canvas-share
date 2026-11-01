import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database import Base, get_db, init_db
from main import app

# Use in-memory SQLite for testing
TEST_DATABASE_URL = "sqlite:///:memory:"

@pytest.fixture(scope="function")
def db():
    engine = create_engine(TEST_DATABASE_URL)
    TestingSessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    Base.metadata.create_all(bind=engine)
    
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)

@pytest.fixture
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client

def test_root(client):
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Interview Canvas API"}

def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}

def test_create_session(client):
    response = client.post("/v1/users", json={
        "email": "test@example.com",
        "display_name": "Test User"
    })
    assert response.status_code == 200
    
    response = client.post("/v1/sessions", json={
        "title": "Test Session",
        "prompt": "Test prompt"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Test Session"
    assert data["state"] == "draft"

def test_get_sessions(client):
    response = client.get("/v1/sessions")
    assert response.status_code == 200
    assert isinstance(response.json(), list)
