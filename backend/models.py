from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship, declarative_base
from datetime import datetime

Base = declarative_base()


class User(Base):
	__tablename__ = 'users'
	user_id = Column(Integer, primary_key=True, nullable=False, index=True, autoincrement=True)
	username = Column(String(50), unique=True, nullable=False)
	email = Column(String(50), unique=True, nullable=False)
	hashed_password = Column(String(255), nullable=False)
	created_at = Column(DateTime, default=func.now())
	profile_picture = Column(String(255), nullable=True, default="assets/default_avatar.png")

	# joined_rooms = relationship("ChatRoom", secondary="chat_room_users", back_populates="participants")


class ChatRoom(Base):
	__tablename__ = 'chat_rooms'
	room_id = Column(Integer, primary_key=True, nullable=False, index=True, autoincrement=True)
	created_by = Column(Integer, ForeignKey('users.user_id'), nullable=False)
	recent_message_id = Column(Integer, ForeignKey('messages.message_id'), nullable=True)
	name = Column(String(100), nullable=False)
	password = Column(String(50), nullable=True)
	created_at = Column(DateTime, default=func.now())
	room_picture = Column(String(255), nullable=True)
	


class Message(Base):
	__tablename__ = 'messages'
	message_id = Column(Integer, primary_key=True, nullable=False, index=True, autoincrement=True)
	sender_id = Column(Integer, ForeignKey('users.user_id'), nullable=False)
	room_id = Column(Integer, ForeignKey('chat_rooms.room_id'), nullable=False)
	content = Column(String(500), nullable=True)
	timestamp = Column(DateTime, default=func.now())
	
	sender = relationship("User", foreign_keys=[sender_id])
	room = relationship("ChatRoom", foreign_keys=[room_id])


class ChatRoomUsers(Base):
	__tablename__ = 'chat_room_users'
	user_id = Column(Integer, ForeignKey('users.user_id'), nullable=False, primary_key=True)
	room_id = Column(Integer, ForeignKey('chat_rooms.room_id'), nullable=False, primary_key=True)

	user = relationship("User", foreign_keys=[user_id])
	room = relationship("ChatRoom", foreign_keys=[room_id])