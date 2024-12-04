from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from .models import Base

# DATABASE_URL = "mysql+pymysql://root:root@localhost/chat_db"
DATABASE_URL = "mysql+pymysql://db_project:db_project!@192.168.0.118:3307/DBproject"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)

