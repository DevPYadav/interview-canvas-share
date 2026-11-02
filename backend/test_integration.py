import pytest
import httpx
import time
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Integration test configuration - uses PostgreSQL from docker-compose
TEST_DATABASE_URL = os.getenv("TEST_DATABASE_URL", "postgresql://sdip:sdip@localhost:5432/sdip")
API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000")

@pytest.fixture(scope="session")
def db_engine():
    """Create a database engine for PostgreSQL"""
    engine = create_engine(TEST_DATABASE_URL)
    yield engine
    engine.dispose()

@pytest.fixture(scope="function")
def db_session(db_engine):
    """Create a clean database session for each test"""
    Session = sessionmaker(bind=db_engine)
    session = Session()
    
    # Clean up any existing data
    session.execute(text("DELETE FROM canvas_elements"))
    session.execute(text("DELETE FROM canvas_documents"))
    session.execute(text("DELETE FROM participants"))
    session.execute(text("DELETE FROM guest_links"))
    session.execute(text("DELETE FROM session_memberships"))
    session.execute(text("DELETE FROM interview_sessions"))
    session.execute(text("DELETE FROM users"))
    session.commit()
    
    yield session
    
    # Cleanup after test
    session.rollback()
    session.close()

@pytest.fixture(scope="function")
def client():
    """HTTP client for API requests"""
    with httpx.Client(base_url=API_BASE_URL, timeout=30.0) as c:
        yield c

# ============================================================================
# 1. Database Connection Tests
# ============================================================================

def test_database_connection(db_engine):
    """Verify app can connect to PostgreSQL"""
    with db_engine.connect() as conn:
        result = conn.execute(text("SELECT 1"))
        assert result.scalar() == 1

def test_database_schema_exists(db_engine):
    """Verify database schema is created"""
    with db_engine.connect() as conn:
        # Check that all tables exist
        tables = ["users", "interview_sessions", "session_memberships", 
                  "guest_links", "participants", "canvas_documents", "canvas_elements"]
        for table in tables:
            result = conn.execute(text(f"""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = '{table}'
                )
            """))
            assert result.scalar() is True, f"Table {table} does not exist"

# ============================================================================
# 2. User Management Tests
# ============================================================================

def test_create_user(client, db_session):
    """Create a new user via API"""
    response = client.post("/v1/users", json={
        "email": "integration-test@example.com",
        "display_name": "Integration Test User"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "integration-test@example.com"
    assert data["display_name"] == "Integration Test User"
    assert "id" in data
    
    # Verify user exists in database
    from database import User
    user = db_session.query(User).filter(User.email == "integration-test@example.com").first()
    assert user is not None

def test_get_current_user(client, db_session):
    """Retrieve current user"""
    # First create a user
    response = client.post("/v1/users", json={
        "email": "current-user@example.com",
        "display_name": "Current User"
    })
    assert response.status_code == 200
    
    # Get current user
    response = client.get("/v1/users/me")
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "current-user@example.com"

def test_duplicate_email_error(client):
    """Handle duplicate email errors"""
    email = "duplicate@example.com"
    
    # Create first user
    response = client.post("/v1/users", json={
        "email": email,
        "display_name": "First User"
    })
    assert response.status_code == 200
    
    # Try to create duplicate
    response = client.post("/v1/users", json={
        "email": email,
        "display_name": "Second User"
    })
    # Should either succeed (returning existing) or error
    # Implementation dependent - just check it doesn't crash
    assert response.status_code in [200, 400, 409]

# ============================================================================
# 3. Session Lifecycle Tests
# ============================================================================

def test_create_session(client, db_session):
    """Create a session"""
    # Create user first
    client.post("/v1/users", json={
        "email": "session-test@example.com",
        "display_name": "Session Test User"
    })
    
    response = client.post("/v1/sessions", json={
        "title": "Integration Test Session",
        "prompt": "Test prompt for integration"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Integration Test Session"
    assert data["prompt"] == "Test prompt for integration"
    assert data["state"] == "draft"
    assert "id" in data

def test_get_sessions(client):
    """Get all sessions for a user"""
    # Create user
    client.post("/v1/users", json={
        "email": "list-sessions@example.com",
        "display_name": "List Sessions User"
    })
    
    # Create multiple sessions
    client.post("/v1/sessions", json={"title": "Session 1", "prompt": "Prompt 1"})
    client.post("/v1/sessions", json={"title": "Session 2", "prompt": "Prompt 2"})
    
    response = client.get("/v1/sessions")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 2

def test_get_specific_session(client):
    """Get a specific session"""
    # Create user and session
    client.post("/v1/users", json={
        "email": "get-session@example.com",
        "display_name": "Get Session User"
    })
    create_response = client.post("/v1/sessions", json={
        "title": "Specific Session",
        "prompt": "Specific prompt"
    })
    session_id = create_response.json()["id"]
    
    response = client.get(f"/v1/sessions/{session_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == session_id
    assert data["title"] == "Specific Session"

def test_update_session(client):
    """Update session metadata"""
    # Create user and session
    client.post("/v1/users", json={
        "email": "update-session@example.com",
        "display_name": "Update Session User"
    })
    create_response = client.post("/v1/sessions", json={
        "title": "Original Title",
        "prompt": "Original prompt"
    })
    session_id = create_response.json()["id"]
    
    # Update session
    response = client.patch(f"/v1/sessions/{session_id}", json={
        "title": "Updated Title"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Updated Title"
    assert data["prompt"] == "Original prompt"  # Unchanged

def test_start_session(client):
    """Start a session (state changes to 'live')"""
    # Create user and session
    client.post("/v1/users", json={
        "email": "start-session@example.com",
        "display_name": "Start Session User"
    })
    create_response = client.post("/v1/sessions", json={
        "title": "Startable Session",
        "prompt": "Prompt"
    })
    session_id = create_response.json()["id"]
    
    # Start session
    response = client.post(f"/v1/sessions/{session_id}/start")
    assert response.status_code == 200
    data = response.json()
    assert data["state"] == "live"
    assert data["started_at"] is not None

def test_end_session(client):
    """End a session (state changes to 'ended')"""
    # Create user and session
    client.post("/v1/users", json={
        "email": "end-session@example.com",
        "display_name": "End Session User"
    })
    create_response = client.post("/v1/sessions", json={
        "title": "Endable Session",
        "prompt": "Prompt"
    })
    session_id = create_response.json()["id"]
    
    # Start then end session
    client.post(f"/v1/sessions/{session_id}/start")
    response = client.post(f"/v1/sessions/{session_id}/end")
    assert response.status_code == 200
    data = response.json()
    assert data["state"] == "ended"
    assert data["ended_at"] is not None
    assert data["candidate_editing_enabled"] is False

def test_duplicate_session(client):
    """Duplicate a session (copies canvas data)"""
    # Create user and session
    client.post("/v1/users", json={
        "email": "duplicate-session@example.com",
        "display_name": "Duplicate Session User"
    })
    create_response = client.post("/v1/sessions", json={
        "title": "Original Session",
        "prompt": "Original prompt"
    })
    original_id = create_response.json()["id"]
    
    # Add canvas elements
    canvas_response = client.get(f"/v1/sessions/{original_id}/canvas")
    canvas_id = canvas_response.json()["id"]
    
    # Update canvas with elements
    client.post(f"/v1/sessions/{original_id}/canvas", json={
        "id": canvas_id,
        "session_id": original_id,
        "schema_version": "1.0",
        "elements": [
            {
                "id": "test-element",
                "type": "rectangle",
                "x": 100,
                "y": 100,
                "width": 120,
                "height": 80,
                "label": "Test Element",
                "created_at": "2024-01-01T00:00:00Z",
                "updated_at": "2024-01-01T00:00:00Z"
            }
        ],
        "updated_at": "2024-01-01T00:00:00Z"
    })
    
    # Duplicate session
    response = client.post(f"/v1/sessions/{original_id}/duplicate")
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Original Session (Copy)"
    assert data["id"] != original_id
    
    # Verify canvas was copied
    new_canvas = client.get(f"/v1/sessions/{data['id']}/canvas")
    assert len(new_canvas.json()["elements"]) == 1

# ============================================================================
# 4. Guest Links Tests
# ============================================================================

def test_create_guest_link(client):
    """Create a guest link for a session"""
    # Create user and session
    client.post("/v1/users", json={
        "email": "guest-link@example.com",
        "display_name": "Guest Link User"
    })
    create_response = client.post("/v1/sessions", json={
        "title": "Guest Session",
        "prompt": "Prompt"
    })
    session_id = create_response.json()["id"]
    
    # Create guest link
    response = client.post(f"/v1/sessions/{session_id}/guest-links", json={
        "role": "candidate"
    })
    assert response.status_code == 200
    data = response.json()
    assert "token" in data
    assert "link_id" in data

def test_join_via_guest_link(client):
    """Join a session via guest link token"""
    # Create user and session
    client.post("/v1/users", json={
        "email": "join-link@example.com",
        "display_name": "Join Link User"
    })
    create_response = client.post("/v1/sessions", json={
        "title": "Joinable Session",
        "prompt": "Prompt"
    })
    session_id = create_response.json()["id"]
    
    # Create guest link
    link_response = client.post(f"/v1/sessions/{session_id}/guest-links", json={
        "role": "observer"
    })
    token = link_response.json()["token"]
    
    # Join via token
    response = client.post(f"/v1/join/{token}", json={
        "display_name": "Guest Participant"
    })
    assert response.status_code == 200
    data = response.json()
    assert "session" in data
    assert "participant" in data
    assert data["participant"]["role"] == "observer"

def test_revoke_guest_link(client):
    """Revoke a guest link"""
    # Create user and session
    client.post("/v1/users", json={
        "email": "revoke-link@example.com",
        "display_name": "Revoke Link User"
    })
    create_response = client.post("/v1/sessions", json={
        "title": "Revokable Session",
        "prompt": "Prompt"
    })
    session_id = create_response.json()["id"]
    
    # Create guest link
    link_response = client.post(f"/v1/sessions/{session_id}/guest-links", json={
        "role": "candidate"
    })
    link_id = link_response.json()["link_id"]
    
    # Revoke link
    response = client.delete(f"/v1/sessions/{session_id}/guest-links/{link_id}")
    assert response.status_code == 200

def test_revoked_link_cannot_be_used(client):
    """Verify revoked link cannot be used"""
    # Create user and session
    client.post("/v1/users", json={
        "email": "revoked-test@example.com",
        "display_name": "Revoked Test User"
    })
    create_response = client.post("/v1/sessions", json={
        "title": "Revoked Link Session",
        "prompt": "Prompt"
    })
    session_id = create_response.json()["id"]
    
    # Create and revoke guest link
    link_response = client.post(f"/v1/sessions/{session_id}/guest-links", json={
        "role": "candidate"
    })
    token = link_response.json()["token"]
    link_id = link_response.json()["link_id"]
    
    client.delete(f"/v1/sessions/{session_id}/guest-links/{link_id}")
    
    # Try to join with revoked token
    response = client.post(f"/v1/join/{token}", json={
        "display_name": "Guest Participant"
    })
    assert response.status_code == 401

# ============================================================================
# 5. Participants Tests
# ============================================================================

def test_get_participants(client):
    """Get participants for a session"""
    # Create user and session
    client.post("/v1/users", json={
        "email": "participants@example.com",
        "display_name": "Participants User"
    })
    create_response = client.post("/v1/sessions", json={
        "title": "Participants Session",
        "prompt": "Prompt"
    })
    session_id = create_response.json()["id"]
    
    # Get participants
    response = client.get(f"/v1/sessions/{session_id}/participants")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)

def test_participant_added_on_join(client):
    """Verify participant is added when joining via guest link"""
    # Create user and session
    client.post("/v1/users", json={
        "email": "participant-join@example.com",
        "display_name": "Participant Join User"
    })
    create_response = client.post("/v1/sessions", json={
        "title": "Participant Join Session",
        "prompt": "Prompt"
    })
    session_id = create_response.json()["id"]
    
    # Create guest link and join
    link_response = client.post(f"/v1/sessions/{session_id}/guest-links", json={
        "role": "candidate"
    })
    token = link_response.json()["token"]
    
    client.post(f"/v1/join/{token}", json={
        "display_name": "New Participant"
    })
    
    # Verify participant was added
    response = client.get(f"/v1/sessions/{session_id}/participants")
    participants = response.json()
    assert len(participants) >= 1
    assert any(p["display_name"] == "New Participant" for p in participants)

def test_participant_has_correct_role(client):
    """Verify participant has correct role"""
    # Create user and session
    client.post("/v1/users", json={
        "email": "participant-role@example.com",
        "display_name": "Participant Role User"
    })
    create_response = client.post("/v1/sessions", json={
        "title": "Participant Role Session",
        "prompt": "Prompt"
    })
    session_id = create_response.json()["id"]
    
    # Create guest link with observer role
    link_response = client.post(f"/v1/sessions/{session_id}/guest-links", json={
        "role": "observer"
    })
    token = link_response.json()["token"]
    
    # Join as observer
    join_response = client.post(f"/v1/join/{token}", json={
        "display_name": "Observer Participant"
    })
    participant = join_response.json()["participant"]
    assert participant["role"] == "observer"

# ============================================================================
# 6. Canvas Operations Tests
# ============================================================================

def test_get_canvas(client):
    """Get canvas for a session"""
    # Create user and session
    client.post("/v1/users", json={
        "email": "get-canvas@example.com",
        "display_name": "Get Canvas User"
    })
    create_response = client.post("/v1/sessions", json={
        "title": "Canvas Session",
        "prompt": "Prompt"
    })
    session_id = create_response.json()["id"]
    
    response = client.get(f"/v1/sessions/{session_id}/canvas")
    assert response.status_code == 200
    data = response.json()
    assert "id" in data
    assert "session_id" in data
    assert "elements" in data
    assert isinstance(data["elements"], list)

def test_update_canvas_elements(client):
    """Update canvas elements"""
    # Create user and session
    client.post("/v1/users", json={
        "email": "update-canvas@example.com",
        "display_name": "Update Canvas User"
    })
    create_response = client.post("/v1/sessions", json={
        "title": "Update Canvas Session",
        "prompt": "Prompt"
    })
    session_id = create_response.json()["id"]
    
    # Get canvas
    canvas_response = client.get(f"/v1/sessions/{session_id}/canvas")
    canvas = canvas_response.json()
    
    # Update with elements
    response = client.post(f"/v1/sessions/{session_id}/canvas", json={
        "id": canvas["id"],
        "session_id": session_id,
        "schema_version": "1.0",
        "elements": [
            {
                "id": "element-1",
                "type": "rectangle",
                "x": 50,
                "y": 50,
                "width": 100,
                "height": 80,
                "label": "Updated Element",
                "created_at": "2024-01-01T00:00:00Z",
                "updated_at": "2024-01-01T00:00:00Z"
            }
        ],
        "updated_at": "2024-01-01T00:00:00Z"
    })
    assert response.status_code == 200

def test_canvas_persists_in_database(client, db_session):
    """Verify changes persist in database"""
    # Create user and session
    client.post("/v1/users", json={
        "email": "persist-canvas@example.com",
        "display_name": "Persist Canvas User"
    })
    create_response = client.post("/v1/sessions", json={
        "title": "Persist Canvas Session",
        "prompt": "Prompt"
    })
    session_id = create_response.json()["id"]
    
    # Get canvas and update
    canvas_response = client.get(f"/v1/sessions/{session_id}/canvas")
    canvas = canvas_response.json()
    
    client.post(f"/v1/sessions/{session_id}/canvas", json={
        "id": canvas["id"],
        "session_id": session_id,
        "schema_version": "1.0",
        "elements": [
            {
                "id": "persist-element",
                "type": "database",
                "x": 200,
                "y": 200,
                "width": 120,
                "height": 80,
                "label": "Persistent Element",
                "created_at": "2024-01-01T00:00:00Z",
                "updated_at": "2024-01-01T00:00:00Z"
            }
        ],
        "updated_at": "2024-01-01T00:00:00Z"
    })
    
    # Verify in database
    from database import CanvasElement
    elements = db_session.query(CanvasElement).filter(
        CanvasElement.canvas_document_id == canvas["id"]
    ).all()
    assert len(elements) == 1
    assert elements[0].label == "Persistent Element"

# ============================================================================
# 7. CORS & Security Tests
# ============================================================================

def test_cors_preflight(client):
    """Verify OPTIONS requests work"""
    response = client.options("/v1/sessions", headers={
        "Origin": "http://localhost:5173",
        "Access-Control-Request-Method": "POST"
    })
    # Should either allow or reject based on CORS config
    assert response.status_code in [200, 204, 405]

def test_api_error_responses(client):
    """Verify API returns proper error responses"""
    # Test 404 for non-existent session
    response = client.get("/v1/sessions/non-existent-id")
    assert response.status_code == 404
    
    # Test 401 for invalid token
    response = client.post("/v1/join/invalid-token", json={
        "display_name": "Test"
    })
    assert response.status_code == 401

# ============================================================================
# 8. Complete User Flow Test
# ============================================================================

def test_complete_user_flow(client, db_session):
    """Create user → Create session → Start session → Update canvas → End session"""
    # Create user
    user_response = client.post("/v1/users", json={
        "email": "complete-flow@example.com",
        "display_name": "Complete Flow User"
    })
    assert user_response.status_code == 200
    
    # Create session
    session_response = client.post("/v1/sessions", json={
        "title": "Complete Flow Session",
        "prompt": "Complete flow prompt"
    })
    assert session_response.status_code == 200
    session_id = session_response.json()["id"]
    
    # Start session
    start_response = client.post(f"/v1/sessions/{session_id}/start")
    assert start_response.status_code == 200
    assert start_response.json()["state"] == "live"
    
    # Update canvas
    canvas_response = client.get(f"/v1/sessions/{session_id}/canvas")
    canvas = canvas_response.json()
    
    update_response = client.post(f"/v1/sessions/{session_id}/canvas", json={
        "id": canvas["id"],
        "session_id": session_id,
        "schema_version": "1.0",
        "elements": [
            {
                "id": "flow-element",
                "type": "rectangle",
                "x": 100,
                "y": 100,
                "width": 120,
                "height": 80,
                "label": "Flow Element",
                "created_at": "2024-01-01T00:00:00Z",
                "updated_at": "2024-01-01T00:00:00Z"
            }
        ],
        "updated_at": "2024-01-01T00:00:00Z"
    })
    assert update_response.status_code == 200
    
    # End session
    end_response = client.post(f"/v1/sessions/{session_id}/end")
    assert end_response.status_code == 200
    assert end_response.json()["state"] == "ended"
    
    # Verify all data persists in database
    from database import User, InterviewSession, CanvasElement
    user = db_session.query(User).filter(User.email == "complete-flow@example.com").first()
    assert user is not None
    
    session = db_session.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    assert session is not None
    assert session.state == "ended"
    
    elements = db_session.query(CanvasElement).filter(
        CanvasElement.canvas_document_id == canvas["id"]
    ).all()
    assert len(elements) == 1

# ============================================================================
# 9. Guest Join Flow Test
# ============================================================================

def test_guest_join_flow(client, db_session):
    """Create session → Create guest link → Join via token → Verify participant → Update canvas"""
    # Create user and session
    client.post("/v1/users", json={
        "email": "guest-flow@example.com",
        "display_name": "Guest Flow User"
    })
    session_response = client.post("/v1/sessions", json={
        "title": "Guest Flow Session",
        "prompt": "Guest flow prompt"
    })
    session_id = session_response.json()["id"]
    
    # Create guest link
    link_response = client.post(f"/v1/sessions/{session_id}/guest-links", json={
        "role": "candidate"
    })
    token = link_response.json()["token"]
    
    # Join via token
    join_response = client.post(f"/v1/join/{token}", json={
        "display_name": "Guest Flow Participant"
    })
    assert join_response.status_code == 200
    participant = join_response.json()["participant"]
    
    # Verify participant added
    participants_response = client.get(f"/v1/sessions/{session_id}/participants")
    participants = participants_response.json()
    assert any(p["id"] == participant["id"] for p in participants)
    
    # Update canvas
    canvas_response = client.get(f"/v1/sessions/{session_id}/canvas")
    canvas = canvas_response.json()
    
    client.post(f"/v1/sessions/{session_id}/canvas", json={
        "id": canvas["id"],
        "session_id": session_id,
        "schema_version": "1.0",
        "elements": [
            {
                "id": "guest-flow-element",
                "type": "rectangle",
                "x": 150,
                "y": 150,
                "width": 120,
                "height": 80,
                "label": "Guest Element",
                "created_at": "2024-01-01T00:00:00Z",
                "updated_at": "2024-01-01T00:00:00Z"
            }
        ],
        "updated_at": "2024-01-01T00:00:00Z"
    })
    
    # Verify in database
    from database import Participant, CanvasElement
    participant_db = db_session.query(Participant).filter(
        Participant.id == participant["id"]
    ).first()
    assert participant_db is not None
    assert participant_db.display_name == "Guest Flow Participant"
    
    elements = db_session.query(CanvasElement).filter(
        CanvasElement.canvas_document_id == canvas["id"]
    ).all()
    assert len(elements) == 1

# ============================================================================
# 10. Service Health Test
# ============================================================================

def test_health_endpoint(client):
    """Verify /health endpoint works"""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}

def test_app_responds_after_postgres_healthcheck(client):
    """Verify app responds after postgres healthcheck passes"""
    # Start docker-compose first, then this test verifies the app is ready
    response = client.get("/health")
    assert response.status_code == 200
    
    # Try to query database through API
    client.post("/v1/users", json={
        "email": "healthcheck@example.com",
        "display_name": "Healthcheck User"
    })
    
    response = client.get("/v1/sessions")
    assert response.status_code == 200
