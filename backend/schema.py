from typing import Optional
from pydantic import BaseModel
from datetime import date, datetime
from enum import Enum



class UserSchema(BaseModel):
	user_id : Optional[int] = None
	username : Optional[str] = None
	email : Optional[str] = None
	hashed_password : Optional[str] = None
	created_at : Optional[datetime] = None
	profile_picture : Optional[str] = None


class ChatRoomSchema(BaseModel):
	room_id : Optional[int] = None
	created_by : int
	recent_message_id : Optional[int] = None
	name : str
	password : str
	created_at : Optional[datetime] = None
	room_picture : Optional[str] = None


class MessageSchema(BaseModel):
	message_id : Optional[int] = None
	sender_id : int
	room_id : int
	content : Optional[str] = None
	timestamp : Optional[datetime] = None


class ChatRoomUsersSchema(BaseModel):
	user_id : int
	room_id : int