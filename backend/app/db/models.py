from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    name = Column(String)
    password_hash = Column(String)
    subscription_status = Column(String, default="free") # free, pro
    quota = Column(Integer, default=10) # credits
    created_at = Column(DateTime, default=datetime.utcnow)

    jobs = relationship("VideoJob", back_populates="owner")
    settings = relationship("Settings", back_populates="owner", uselist=False)


class VideoJob(Base):
    __tablename__ = "video_jobs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    original_video_path = Column(String)
    processed_video_path = Column(String, nullable=True)
    status = Column(String, default="pending") # pending, processing, completed, failed
    task_type = Column(String, default="denoising") # denoising, low_light
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    owner = relationship("User", back_populates="jobs")


class Settings(Base):
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True)
    preferred_model = Column(String, default="wavelet")
    notification_preferences = Column(Boolean, default=True)

    owner = relationship("User", back_populates="settings")
