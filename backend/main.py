from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import os

from database import engine, SessionLocal, get_db, init_db, Base, User, InterviewSession, SessionMembership, GuestLink, Participant, CanvasDocument, CanvasElement, SessionState, UserRole, GuestRole

app = FastAPI(title="Interview Canvas API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve frontend static files
frontend_dist_path = os.path.join(os.path.dirname(__file__), "frontend-dist")
HAS_FRONTEND = os.path.isdir(frontend_dist_path)
if HAS_FRONTEND:
    # index.html references /assets/..., so mount the assets folder at /assets
    app.mount(
        "/assets",
        StaticFiles(directory=os.path.join(frontend_dist_path, "assets")),
        name="assets",
    )

    @app.get("/", include_in_schema=False)
    async def serve_frontend():
        return FileResponse(os.path.join(frontend_dist_path, "index.html"))
else:
    @app.get("/")
    async def root():
        return {"message": "Interview Canvas API"}

# Pydantic models for request/response
class UserCreate(BaseModel):
    email: str
    display_name: str
    organization_id: Optional[str] = None

class UserResponse(BaseModel):
    id: str
    email: str
    display_name: str
    organization_id: Optional[str]
    created_at: datetime

class SessionCreate(BaseModel):
    title: str
    prompt: Optional[str] = None

class SessionUpdate(BaseModel):
    title: Optional[str] = None
    prompt: Optional[str] = None
    candidate_editing_enabled: Optional[bool] = None

class SessionResponse(BaseModel):
    id: str
    owner_user_id: str
    title: str
    prompt: Optional[str]
    state: str
    candidate_editing_enabled: bool
    scheduled_at: Optional[datetime]
    started_at: Optional[datetime]
    ended_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

class GuestLinkCreate(BaseModel):
    role: GuestRole

class ParticipantCreate(BaseModel):
    display_name: str

class CanvasElementModel(BaseModel):
    id: str
    type: str
    x: int
    y: int
    width: Optional[int]
    height: Optional[int]
    label: Optional[str]
    description: Optional[str]
    color: Optional[str]
    style: Optional[str]
    connections: Optional[str]
    parent_id: Optional[str]

class CanvasDocumentModel(BaseModel):
    id: str
    session_id: str
    schema_version: str
    elements: List[CanvasElementModel]
    updated_at: datetime

# Dependency to get DB session
def get_db_session():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.on_event("startup")
async def startup_event():
    init_db()

@app.get("/health")
async def health():
    return {"status": "healthy"}

# User endpoints
@app.post("/v1/users", response_model=UserResponse)
async def create_user(user: UserCreate, db: Session = Depends(get_db_session)):
    db_user = User(
        id=f"user-{datetime.utcnow().timestamp()}",
        email=user.email,
        display_name=user.display_name,
        organization_id=user.organization_id
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.get("/v1/users/me", response_model=UserResponse)
async def get_current_user(db: Session = Depends(get_db_session)):
    # For MVP, return a mock user or first user
    user = db.query(User).first()
    if not user:
        # Create default user
        user = User(
            id="user-1",
            email="interviewer@example.com",
            display_name="Interviewer User"
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    return user

# Session endpoints
@app.post("/v1/sessions", response_model=SessionResponse)
async def create_session(session: SessionCreate, db: Session = Depends(get_db_session)):
    current_user = await get_current_user(db)
    db_session = InterviewSession(
        id=f"session-{datetime.utcnow().timestamp()}",
        owner_user_id=current_user.id,
        title=session.title,
        prompt=session.prompt,
        state=SessionState.draft,
        candidate_editing_enabled=True
    )
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    
    # Create canvas document
    canvas = CanvasDocument(
        id=f"canvas-{datetime.utcnow().timestamp()}",
        session_id=db_session.id,
        schema_version="1.0"
    )
    db.add(canvas)
    db.commit()
    
    return db_session

@app.get("/v1/sessions", response_model=List[SessionResponse])
async def get_sessions(db: Session = Depends(get_db_session)):
    current_user = await get_current_user(db)
    sessions = db.query(InterviewSession).filter(
        InterviewSession.owner_user_id == current_user.id
    ).all()
    return sessions

@app.get("/v1/sessions/{session_id}", response_model=SessionResponse)
async def get_session(session_id: str, db: Session = Depends(get_db_session)):
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session

@app.patch("/v1/sessions/{session_id}", response_model=SessionResponse)
async def update_session(session_id: str, updates: SessionUpdate, db: Session = Depends(get_db_session)):
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    for field, value in updates.model_dump(exclude_unset=True).items():
        setattr(session, field, value)
    
    session.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(session)
    return session

@app.post("/v1/sessions/{session_id}/start", response_model=SessionResponse)
async def start_session(session_id: str, db: Session = Depends(get_db_session)):
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session.state = SessionState.live
    session.started_at = datetime.utcnow()
    session.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(session)
    return session

@app.post("/v1/sessions/{session_id}/end", response_model=SessionResponse)
async def end_session(session_id: str, db: Session = Depends(get_db_session)):
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session.state = SessionState.ended
    session.ended_at = datetime.utcnow()
    session.candidate_editing_enabled = False
    session.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(session)
    return session

@app.post("/v1/sessions/{session_id}/duplicate", response_model=SessionResponse)
async def duplicate_session(session_id: str, db: Session = Depends(get_db_session)):
    original = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not original:
        raise HTTPException(status_code=404, detail="Session not found")
    
    current_user = await get_current_user(db)
    new_session = InterviewSession(
        id=f"session-{datetime.utcnow().timestamp()}",
        owner_user_id=current_user.id,
        title=f"{original.title} (Copy)",
        prompt=original.prompt,
        state=SessionState.draft,
        candidate_editing_enabled=True
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    
    # Copy canvas
    original_canvas = db.query(CanvasDocument).filter(
        CanvasDocument.session_id == session_id
    ).first()
    if original_canvas:
        # Copy elements
        new_canvas = CanvasDocument(
            id=f"canvas-{datetime.utcnow().timestamp()}",
            session_id=new_session.id,
            schema_version=original_canvas.schema_version
        )
        db.add(new_canvas)
        db.commit()
        
        for element in original_canvas.elements:
            new_element = CanvasElement(
                id=f"el-{datetime.utcnow().timestamp()}",
                canvas_document_id=new_canvas.id,
                type=element.type,
                x=element.x,
                y=element.y,
                width=element.width,
                height=element.height,
                label=element.label,
                description=element.description,
                color=element.color,
                style=element.style,
                connections=element.connections,
                parent_id=element.parent_id
            )
            db.add(new_element)
        db.commit()
    
    return new_session

# Guest link endpoints
@app.post("/v1/sessions/{session_id}/guest-links")
async def create_guest_link(session_id: str, link: GuestLinkCreate, db: Session = Depends(get_db_session)):
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    import hashlib
    token = hashlib.sha256(os.urandom(32)).hexdigest()
    
    guest_link = GuestLink(
        id=f"link-{datetime.utcnow().timestamp()}",
        session_id=session_id,
        token_hash=hashlib.sha256(token.encode()).hexdigest(),
        role_granted=link.role
    )
    db.add(guest_link)
    db.commit()
    
    return {"token": token, "link_id": guest_link.id}

@app.delete("/v1/sessions/{session_id}/guest-links/{link_id}")
async def revoke_guest_link(session_id: str, link_id: str, db: Session = Depends(get_db_session)):
    link = db.query(GuestLink).filter(
        GuestLink.id == link_id,
        GuestLink.session_id == session_id
    ).first()
    if not link:
        raise HTTPException(status_code=404, detail="Guest link not found")
    
    link.revoked_at = datetime.utcnow()
    db.commit()
    return {"message": "Guest link revoked"}

# Participant endpoints
@app.get("/v1/sessions/{session_id}/participants")
async def get_participants(session_id: str, db: Session = Depends(get_db_session)):
    participants = db.query(Participant).filter(Participant.session_id == session_id).all()
    return participants

@app.post("/v1/join/{token}")
async def join_session(token: str, participant: ParticipantCreate, db: Session = Depends(get_db_session)):
    import hashlib
    
    # Find valid guest link
    guest_link = db.query(GuestLink).filter(
        GuestLink.token_hash == hashlib.sha256(token.encode()).hexdigest(),
        GuestLink.revoked_at.is_(None)
    ).first()
    
    if not guest_link:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    session = db.query(InterviewSession).filter(
        InterviewSession.id == guest_link.session_id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    new_participant = Participant(
        id=f"participant-{datetime.utcnow().timestamp()}",
        session_id=session.id,
        display_name=participant.display_name,
        role=guest_link.role_granted,
        color="#EF444"
    )
    db.add(new_participant)
    db.commit()
    db.refresh(new_participant)
    
    return {"session": session, "participant": new_participant}

# Canvas endpoints
@app.get("/v1/sessions/{session_id}/canvas", response_model=CanvasDocumentModel)
async def get_canvas(session_id: str, db: Session = Depends(get_db_session)):
    canvas = db.query(CanvasDocument).filter(CanvasDocument.session_id == session_id).first()
    if not canvas:
        # Return empty canvas
        return CanvasDocumentModel(
            id=f"canvas-{datetime.utcnow().timestamp()}",
            session_id=session_id,
            schema_version="1.0",
            elements=[],
            updated_at=datetime.utcnow()
        )
    
    elements = db.query(CanvasElement).filter(CanvasElement.canvas_document_id == canvas.id).all()
    return CanvasDocumentModel(
        id=canvas.id,
        session_id=canvas.session_id,
        schema_version=canvas.schema_version,
        elements=elements,
        updated_at=canvas.updated_at
    )

@app.post("/v1/sessions/{session_id}/canvas")
async def update_canvas(session_id: str, canvas_data: CanvasDocumentModel, db: Session = Depends(get_db_session)):
    # Get or create canvas document
    canvas = db.query(CanvasDocument).filter(CanvasDocument.session_id == session_id).first()
    
    if not canvas:
        canvas = CanvasDocument(
            id=canvas_data.id,
            session_id=session_id,
            schema_version=canvas_data.schema_version
        )
        db.add(canvas)
    
    # Update elements
    # Delete existing elements
    db.query(CanvasElement).filter(CanvasElement.canvas_document_id == canvas.id).delete()
    
    # Add/update elements
    for element_data in canvas_data.elements:
        element = CanvasElement(
            id=element_data.id,
            canvas_document_id=canvas.id,
            type=element_data.type,
            x=element_data.x,
            y=element_data.y,
            width=element_data.width,
            height=element_data.height,
            label=element_data.label,
            description=element_data.description,
            color=element_data.color,
            style=element_data.style,
            connections=element_data.connections,
            parent_id=element_data.parent_id
        )
        db.add(element)
    
    canvas.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(canvas)
    
    return canvas


# Serve top-level static files (favicon.svg, icons.svg) from the built frontend.
# Registered last so it never shadows API routes.
if HAS_FRONTEND:
    @app.get("/{filename}", include_in_schema=False)
    async def frontend_file(filename: str):
        candidate = os.path.join(frontend_dist_path, filename)
        if os.path.isfile(candidate):
            return FileResponse(candidate)
        return FileResponse(os.path.join(frontend_dist_path, "index.html"))
