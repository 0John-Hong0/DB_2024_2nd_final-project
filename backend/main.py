from fastapi import FastAPI, File, Form, HTTPException, UploadFile, WebSocket, WebSocketDisconnect, Depends, Request
from sqlalchemy.orm import Session
from .models import User, ChatRoom, Message, ChatRoomUsers
from .schema import UserSchema, ChatRoomSchema, MessageSchema, ChatRoomUsersSchema
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from .database import SessionLocal
import os
import json


BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
print(BASE_DIR)

FRONTEND_DIR = os.path.join(BASE_DIR,'frontend')
STATIC_DIR = os.path.join(FRONTEND_DIR,'static')
ASSET_DIR = os.path.join(FRONTEND_DIR,'assets')


app = FastAPI()
# uvicorn backend.main:app --reload

templates = Jinja2Templates(directory=FRONTEND_DIR)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="/")
app.mount("/assets", StaticFiles(directory=ASSET_DIR), name="/")



@app.get("/")
def home(request: Request):
	return templates.TemplateResponse("index.html", {"request": request})	



def get_db():
	db = SessionLocal()
	try:
		yield db
	finally:
		db.close()




@app.post("/users", tags=["users"])
def add_user(user: str = Form(...), image:UploadFile = File(None), db: Session = Depends(get_db)):
	  
	try:
		user_data = json.loads(user)  # Parse the string into a dictionary
	except json.JSONDecodeError:
		raise HTTPException(status_code=400, detail="Invalid JSON in 'user' field")
	
	user_schema = UserSchema(**user_data)
	_user = db.query(User).where(User.username == user_schema.username).first()
	if _user:
		raise HTTPException(status_code=409, detail="User already exists")
	
	_user = db.query(User).where(User.email == user_schema.email).first()
	if _user:
		raise HTTPException(status_code=409, detail="User already exists")

	db_user = User(**user_schema.model_dump())
	db.add(db_user)


	contents = image.file.read()
	image_name = f"{db_user.username}.jpg"
	with open(os.path.join(ASSET_DIR, "uploaded_images", image_name), 'wb') as file:
		file.write(contents)

	image.file.close()


	db_user.profile_picture = os.path.join("assets", "uploaded_images", image_name)

	db.commit()
	db.refresh(db_user)
	return db_user


@app.get("/user", tags=["users"])
def get_user(user_id: int = None, username: str = None, email: str = None, db: Session = Depends(get_db)):
	
	if user_id is not None:
		user = db.query(User).where(User.user_id == user_id).first()
	elif username is not None:
		user = db.query(User).where(User.username == username).first()
	elif email is not None:
		user = db.query(User).where(User.email == email).first()
	else:
		raise HTTPException(status_code=400, detail="Must provide one of ['user_id', 'username', 'email'].")
	
	if not user:
		raise HTTPException(status_code=404, detail="User not found")
	
	return user


@app.get("/login", tags=["users"])
def login(email: str, password: str, db: Session = Depends(get_db)):
	user = db.query(User).where(User.email == email).where(User.hashed_password == password).first()
	return user

@app.get("/user/rooms", tags=["users"])
def get_user_rooms(user_id: int, db: Session = Depends(get_db)):
	user = db.query(User).where(User.user_id == user_id).first()
	return user.joined_rooms
	rooms = db.query(ChatRoom).join(ChatRoomUsers).filter(ChatRoomUsers.user_id == user_id).all()
	return rooms


@app.post("/rooms/", tags=["rooms"])
def create_room(chat_room: ChatRoomSchema, db: Session = Depends(get_db)):
	db_chat_room = ChatRoom(**chat_room.model_dump())
	db.add(db_chat_room)
	db.commit()
	db.refresh(db_chat_room)
	return db_chat_room


@app.get("/room/{room_id}", tags=["rooms"])
def get_room_messages(
	room_id: int, 
	user_id:int,
	limit:int = 20,
	offset:int = 0,
	db: Session = Depends(get_db)
	):

	room = db.query(ChatRoomUsers).where(ChatRoomUsers.room_id == room_id).where(ChatRoomUsers.user_id == user_id).first()
	if not room:
		raise HTTPException(status_code=400, detail="can't access")

	messages = db.query(Message).filter_by(room_id=room_id).limit(limit).offset(offset)
	return messages


@app.post("/room/{room_id}", tags=["rooms"])
def get_room_messages(
	room_id: int, 
	user_id:int,
	password:str,
	db: Session = Depends(get_db)
	):

	room = db.query(ChatRoom).where(ChatRoom.room_id == room_id).first()
	if not room:
		raise HTTPException(status_code=404, detail="no room found")
	
	if room.password != password:
		raise HTTPException(status_code=400, detail="password incorrect")

	db_ChatRoomUsers = ChatRoomUsers(user_id=user_id, room_id=room_id)
	db.add(db_ChatRoomUsers)
	db.commit()
	return {"message": f"User {user_id} joined room {room_id}"}
	


# Store active WebSocket connections
connections = {}

@app.websocket("/ws/{user_id}/{room_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: int, room_id: int, db: Session = Depends(get_db)):
	# Check if user is in room
	membership = db.query(ChatRoomUsers).filter_by(user_id=user_id, room_id=room_id).first()
	if not membership:
		await websocket.close(code=1003)  # Close if not a member
		return
	
	await websocket.accept()
	connections[user_id] = websocket

	# Send previous messages when the user joins the room
	messages = db.query(Message).filter_by(room_id=room_id).all()
	for message in messages:
		await websocket.send_text(f"{message.sender.username}: {message.content}")
	
	try:
		while True:
			data = await websocket.receive_text()
			message = Message(sender_id=user_id, room_id=room_id, content=data)
			db.add(message)
			db.commit()

			# Broadcast message to other users in the room
			for user_id, conn in connections.items():
				if user_id != user_id:
					await conn.send_text(f"{user_id}: {data}")
	except WebSocketDisconnect:
		del connections[user_id]