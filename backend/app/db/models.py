from sqlalchemy import Column, Integer, String, DateTime, Float, Enum, ForeignKey, Vector
from sqlalchemy.dialects.postgresql import UUID, INET
from sqlalchemy.orm import declarative_base
import enum

Base = declarative_base()

class AccessStatus(enum.Enum):
    SUCCESS = "SUCCESS"
    FACE_MISMATCH = "FACE_MISMATCH"
    INVALID_QR = "INVALID_QR"
    NO_FACE = "NO_FACE"
    TAMPERING_DETECTED = "TAMPERING_DETECTED"

class Employee(Base):
    __tablename__ = "employees"
    
    id = Column(Integer, primary_key=True)
    full_name = Column(String, nullable=False)
    # Dla pgvector w SQLAlchemy wymagana jest biblioteka pgvector-python
    face_encoding = Column(Vector(128)) 
    qr_token = Column(UUID(as_uuid=True), unique=True, nullable=False)
    qr_valid_until = Column(DateTime(timezone=True), nullable=False)
    reference_photo = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True))

class AccessLog(Base):
    __tablename__ = "access_logs"
    
    log_id = Column(Integer, primary_key=True)
    timestamp = Column(DateTime(timezone=True))
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="SET NULL"))
    status = Column(Enum(AccessStatus), nullable=False)
    confidence = Column(Float)
    device_ip = Column(INET)

class Admin(Base):
    __tablename__ = "admins"

    id = Column(Integer, primary_key=True)
    username = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="admin")
    last_login = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True))
