from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship, declarative_base
from datetime import datetime

Base = declarative_base()


class User(Base):
    __tablename__ = 'users'
    user_id = Column(Integer, primary_key=True, nullable=False, index=True, autoincrement=True)
    username = Column(String(50), unique=True, nullable=False)
    created_at = Column(DateTime, default=func.now())


class ChatRoom(Base):
    __tablename__ = 'chat_rooms'
    room_id = Column(Integer, primary_key=True, nullable=False, index=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    created_at = Column(DateTime, default=func.now())


class Message(Base):
    __tablename__ = 'messages'
    id = Column(Integer, primary_key=True, nullable=False, index=True, autoincrement=True)
    sender_id = Column(Integer, ForeignKey('users.id'))
    room_id = Column(Integer, ForeignKey('chat_rooms.id'))
    content = Column(String(500))
    timestamp = Column(DateTime, default=func.now())
	
    sender = relationship("User", foreign_keys=[sender_id])
    room = relationship("ChatRoom", foreign_keys=[room_id])


class ChatRoomUsers(Base):
    __tablename__ = 'chat_room_users'
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    room_id = Column(Integer, ForeignKey('chat_rooms.id'), nullable=False)

    user = relationship("User", foreign_keys=[user_id])
    room = relationship("ChatRoom", foreign_keys=[room_id])
