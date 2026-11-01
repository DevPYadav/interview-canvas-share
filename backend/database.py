from sqlalchemy import create_engine, Column, String, DateTime, Integer, Text, Boolean, ForeignKey, Enum as SQLEnum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import os
from dotenv import load_dotenv

load_dotenv()

# Database configuration - database-agnostic
DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///interview_canvas.db')

# Create engine - database-agnostic (works with SQLite, Postgres, etc.)
engine = create_engine(DATABASE_URL, echo=False)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)

Base = declarative_base()

# Enums
SessionState = SQLEnum('draft', 'live', 'ended', 'archived', name='sessionstate')
UserRole = SQLEnum('owner', 'interviewer', 'candidate', 'observer', name='userrole')
GuestRole = SQLEnum('candidate', 'observer', name='guestrole')

class User(Base):
    __tablename__ = 'users'
    
    id = Column(String, primary_key=True)
    email = Column(String(255), unique=True, nullable=False)
    display_name = Column(String(255), nullable=False)
    organization_id = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    owned_sessions = relationship('InterviewSession', back_populates='owner')
    memberships = relationship('SessionMembership', back_populates='user')

class InterviewSession(Base):
    __tablename__ = 'interview_sessions'
    
    id = Column(String, primary_key=True)
    owner_user_id = Column(String, ForeignKey('users.id'), nullable=False)
    title = Column(String(255), nullable=False)
    prompt = Column(Text, nullable=True)
    state = Column(SessionState, default='draft', nullable=False)
    candidate_editing_enabled = Column(Boolean, default=True, nullable=False)
    scheduled_at = Column(DateTime, nullable=True)
    started_at = Column(DateTime, nullable=True)
    ended_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    owner = relationship('User', back_populates='owned_sessions')
    memberships = relationship('SessionMembership', back_populates='session')
    canvas_document = relationship('CanvasDocument', back_populates='session', uselist=False)
    guest_links = relationship('GuestLink', back_populates='session')

class SessionMembership(Base):
    __tablename__ = 'session_memberships'
    
    session_id = Column(String, ForeignKey('interview_sessions.id'), primary_key=True)
    user_id = Column(String, ForeignKey('users.id'), primary_key=True, nullable=True)
    guest_participant_id = Column(String, ForeignKey('participants.id'), primary_key=True, nullable=True)
    role = Column(UserRole, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    session = relationship('InterviewSession', back_populates='memberships')
    user = relationship('User', back_populates='memberships')

class GuestLink(Base):
    __tablename__ = 'guest_links'
    
    id = Column(String, primary_key=True)
    session_id = Column(String, ForeignKey('interview_sessions.id'), nullable=False)
    token_hash = Column(String(255), nullable=False)
    role_granted = Column(GuestRole, nullable=False)
    expires_at = Column(DateTime, nullable=True)
    max_uses = Column(Integer, nullable=True)
    revoked_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    session = relationship('InterviewSession', back_populates='guest_links')

class Participant(Base):
    __tablename__ = 'participants'
    
    id = Column(String, primary_key=True)
    session_id = Column(String, ForeignKey('interview_sessions.id'), nullable=False)
    user_id = Column(String, ForeignKey('users.id'), nullable=True)
    display_name = Column(String(255), nullable=False)
    role = Column(UserRole, nullable=False)
    joined_at = Column(DateTime, default=datetime.utcnow)
    left_at = Column(DateTime, nullable=True)
    color = Column(String(7), nullable=False)  # Hex color code
    is_online = Column(Boolean, default=True, nullable=False)

class CanvasDocument(Base):
    __tablename__ = 'canvas_documents'
    
    id = Column(String, primary_key=True)
    session_id = Column(String, ForeignKey('interview_sessions.id'), nullable=False)
    schema_version = Column(String(50), default='1.0', nullable=False)
    latest_snapshot_id = Column(String(255), nullable=True)
    latest_operation_cursor = Column(String(255), nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    session = relationship('InterviewSession', back_populates='canvas_document')
    elements = relationship('CanvasElement', back_populates='canvas_document', cascade='all, delete-orphan')

class CanvasElement(Base):
    __tablename__ = 'canvas_elements'
    
    id = Column(String, primary_key=True)
    canvas_document_id = Column(String, ForeignKey('canvas_documents.id'), nullable=False)
    type = Column(String(50), nullable=False)
    x = Column(Integer, nullable=False)
    y = Column(Integer, nullable=False)
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    label = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    color = Column(String(50), nullable=True)
    style = Column(String(50), nullable=True)
    connections = Column(Text, nullable=True)  # JSON array of element IDs
    parent_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    canvas_document = relationship('CanvasDocument', back_populates='elements')

def init_db():
    """Create all tables in the database"""
    Base.metadata.create_all(bind=engine)

def get_db():
    """Get database session"""
    db = SessionLocal()
    try:
        return db
    finally:
        pass  # Let the caller handle session lifecycle
