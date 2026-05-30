from sqlalchemy import Column
from sqlalchemy import Integer
from sqlalchemy import Float
from sqlalchemy import DateTime

from sqlalchemy.orm import declarative_base

from datetime import datetime

Base = declarative_base()

class Metric(Base):
    __tablename__ = "metrics"

    id = Column(Integer, primary_key=True)

    cpu = Column(Float)
    memory = Column(Float)
    disk = Column(Float)

    created_at = Column(
        DateTime,
        default=datetime.utcnow
    )