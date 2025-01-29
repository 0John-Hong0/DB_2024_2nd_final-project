from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from .models import Base

DATABASE_URL = "mysql+pymysql://root:root@localhost/chat_db"
# DATABASE_URL = "mysql+pymysql://db_project:db_project!@192.168.0.118:3307/DBproject"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base.metadata.create_all(bind=engine)



# from sqlalchemy import create_engine
# from sqlalchemy.ext.declarative import declarative_base
# from sqlalchemy.orm import sessionmaker

# # MySQL 연결 URL: username, password, host, port, database_name
# DATABASE_URL = "mysql+pymysql://root:root@localhost:612/budgetManager"

# # 데이터베이스 엔진 생성
# engine = create_engine(DATABASE_URL)

# # 세션 설정
# SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# # Base 클래스 생성
# Base = declarative_base()

# Base.metadata.create_all(bind=engine)