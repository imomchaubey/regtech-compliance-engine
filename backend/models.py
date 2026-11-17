from sqlalchemy import Column, Integer, String, Text, DateTime
from database import Base
import datetime

class Circular(Base):
    __tablename__ = "circulars"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True, unique=True)
    link = Column(String)
    source = Column(String, default="RBI")
    summary = Column(Text, nullable=True) # Stores the 120B AI checklist
    created_at = Column(DateTime, default=datetime.datetime.utcnow)