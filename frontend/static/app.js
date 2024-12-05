const roomList = document.getElementById("room_list");
const createRoomBtn = document.getElementById("new_room");
const userBtn = document.getElementById("user");
const newRoomBtn = document.getElementById("new_room");
const chatList = document.getElementById("messages");
const roomTitle = document.getElementById("room_name");

const login_form = document.getElementById("login_form");
const new_room_form = document.getElementById("new_room_form");

let currentRoom = null;
let socket = null;

var userData = {
	user_id: null,
	username: null,
	email: null,
	hashed_password: null,
	created_at: null,
	profile_picture: null,
};

// https://geraintluff.github.io/sha256/
var sha256 = function sha256(ascii) {
	function rightRotate(value, amount) {
		return (value >>> amount) | (value << (32 - amount));
	}

	var mathPow = Math.pow;
	var maxWord = mathPow(2, 32);
	var lengthProperty = "length";
	var i, j; // Used as a counter across the whole file
	var result = "";

	var words = [];
	var asciiBitLength = ascii[lengthProperty] * 8;

	//* caching results is optional - remove/add slash from front of this line to toggle
	// Initial hash value: first 32 bits of the fractional parts of the square roots of the first 8 primes
	// (we actually calculate the first 64, but extra values are just ignored)
	var hash = (sha256.h = sha256.h || []);
	// Round constants: first 32 bits of the fractional parts of the cube roots of the first 64 primes
	var k = (sha256.k = sha256.k || []);
	var primeCounter = k[lengthProperty];
	/*/
    var hash = [], k = [];
    var primeCounter = 0;
    //*/

	var isComposite = {};
	for (var candidate = 2; primeCounter < 64; candidate++) {
		if (!isComposite[candidate]) {
			for (i = 0; i < 313; i += candidate) {
				isComposite[i] = candidate;
			}
			hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
			k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
		}
	}

	ascii += "\x80"; // Append Ƈ' bit (plus zero padding)
	while ((ascii[lengthProperty] % 64) - 56) ascii += "\x00"; // More zero padding
	for (i = 0; i < ascii[lengthProperty]; i++) {
		j = ascii.charCodeAt(i);
		if (j >> 8) return; // ASCII check: only accept characters in range 0-255
		words[i >> 2] |= j << (((3 - i) % 4) * 8);
	}
	words[words[lengthProperty]] = (asciiBitLength / maxWord) | 0;
	words[words[lengthProperty]] = asciiBitLength;

	// process each chunk
	for (j = 0; j < words[lengthProperty]; ) {
		var w = words.slice(j, (j += 16)); // The message is expanded into 64 words as part of the iteration
		var oldHash = hash;
		// This is now the undefinedworking hash", often labelled as variables a...g
		// (we have to truncate as well, otherwise extra entries at the end accumulate
		hash = hash.slice(0, 8);

		for (i = 0; i < 64; i++) {
			var i2 = i + j;
			// Expand the message into 64 words
			// Used below if
			var w15 = w[i - 15],
				w2 = w[i - 2];

			// Iterate
			var a = hash[0],
				e = hash[4];
			var temp1 =
				hash[7] +
				(rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) + // S1
				((e & hash[5]) ^ (~e & hash[6])) + // ch
				k[i] +
				// Expand the message schedule if needed
				(w[i] =
					i < 16
						? w[i]
						: (w[i - 16] +
								(rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) + // s0
								w[i - 7] +
								(rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) | // s1
						  0);
			// This is only used once, so *could* be moved below, but it only saves 4 bytes and makes things unreadble
			var temp2 =
				(rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) + // S0
				((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2])); // maj

			hash = [(temp1 + temp2) | 0].concat(hash); // We don't bother trimming off the extra ones, they're harmless as long as we're truncating when we do the slice()
			hash[4] = (hash[4] + temp1) | 0;
		}

		for (i = 0; i < 8; i++) {
			hash[i] = (hash[i] + oldHash[i]) | 0;
		}
	}

	for (i = 0; i < 8; i++) {
		for (j = 3; j + 1; j--) {
			var b = (hash[i] >> (j * 8)) & 255;
			result += (b < 16 ? 0 : "") + b.toString(16);
		}
	}
	return result;
};

/*********************login*********************/

async function login() {
	const register_elements = document.querySelectorAll(".register");
	const login_elements = document.querySelectorAll(".login");
	if (window.getComputedStyle(register_elements[0]).display == "block") {
		register_elements.forEach((element) => {
			element.style.display = "none";
		});

		login_elements.forEach((element) => {
			element.style.display = "block";
		});

		document.getElementById("login_top").childNodes[0].nodeValue = "Login";
		return;
	}
	let email = login_form.querySelector('input[name="email"]').value;
	let password = login_form.querySelector('input[name="password"]').value;

	if (!email.trim() || !password.trim()) {
		alert("Email and Password fields cannot be empty!");
		return;
	}

	let response = await fetch(`/user?email=${email}&password=${sha256(password)}`);
	let user = await response.json();

	if (user.user_id) {
		userData = user;
		const LoginForm = document.getElementById("LoginForm");
		LoginForm.style.display = "none";

		document.getElementById("new_room").style.display = "block";
		document.getElementById("room_name").innerHTML = "No Room Selected";
		document.querySelector("#messages > div.box").innerHTML = "No Room Selected";

		if (userData.profile_picture) {
			userBtn.innerHTML = `<img src="${userData.profile_picture}" height="50" width="50"/>`;
		} else {
			userBtn.innerHTML = `<img src="assets/default_avatar.png" height="50" width="50"/>`;
		}

		fetchRooms();
	} else {
		console.error("Error:", response);
		alert("user not found\ncheck if email/password is incorrect"); // Show a user-friendly error message
	}
}

async function handleRegister() {
	const register_elements = document.querySelectorAll(".register");
	const login_elements = document.querySelectorAll(".login");
	if (window.getComputedStyle(register_elements[0]).display == "none") {
		login_elements.forEach((element) => {
			element.style.display = "none";
		});

		register_elements.forEach((element) => {
			element.style.display = "block";
		});

		document.getElementById("login_top").childNodes[0].nodeValue = "Sign up";

		return;
	}
	let profilePicture = login_form.querySelector('input[name="profile_picture"]').files[0]; // File input
	let username = login_form.querySelector('input[name="username"]').value;
	let email = login_form.querySelector('input[name="email"]').value;
	let password = login_form.querySelector('input[name="password"]').value;
	let rePassword = login_form.querySelector('input[name="repassword"]').value;

	if (!username.trim() || !email.trim() || !password.trim()) {
		alert("username, Email and Password fields cannot be empty!");
		return;
	} else if (password != rePassword) {
		alert("Passwords are different!");
		return;
	}

	const myHeaders = new Headers();
	myHeaders.append("accept", "application/json");
	

	let raw;
	let requestOptions;
	if (profilePicture) {
		raw = JSON.stringify({
			username: username,
			email: email,
			hashed_password: sha256(password),
		});

		const formdata = new FormData();
		formdata.append("user", raw);
		formdata.append("image", profilePicture);

		requestOptions = {
			method: "POST",
			headers: myHeaders,
			body: formdata,
			redirect: "follow",
		};
	} else {
		raw = JSON.stringify({
			username: username,
			email: email,
			hashed_password: sha256(password),
		});

		var form_data = new FormData();
		form_data.append("user", raw);

		requestOptions = {
			method: "POST",
			headers: myHeaders,
			body: form_data,
			redirect: "follow",
		};
	}

	fetch("/users", requestOptions)
		.then((response) => {
			if (!response.ok) {
				return response.json().then((err) => {
					throw new Error(err.detail || `HTTP error! Status: ${response.status}`);
				});
			}
			return response.json();
		})
		.then((result) => {
			userData = result;

			if (!userData.user_id) return;

			const LoginForm = document.getElementById("LoginForm");
			LoginForm.style.display = "none";

			document.getElementById("new_room").style.display = "block";

			document.getElementById("room_name").innerHTML = "No Room Selected";
			document.querySelector("#messages > div.box").innerHTML = "No Room Selected";

			if (userData.profile_picture) {
				userBtn.innerHTML = `<img src="${userData.profile_picture}" height="50" width="50"/>`;
			} else {
				userBtn.innerHTML = `<img src="assets/default_avatar.png" height="50" width="50"/>`;
			}

			fetchRooms();
		})
		.catch((error) => {
			console.error("Error:", error.message);
			alert(error.message); // Show a user-friendly error message
		});
}

function closeForm(form_id) {
	const Form = document.getElementById(form_id);
	Form.style.display = "none";
}

userBtn.addEventListener("click", async () => {
	if (userData.user_id) {
		console.log("user found");
	} else {
		const LoginForm = document.getElementById("LoginForm");
		LoginForm.style.display = "block";
	}
});

/*********************login*********************/
/*********************rooms*********************/

newRoomBtn.addEventListener("click", async () => {
	const NewRoomForm = document.getElementById("NewRoomForm");
	NewRoomForm.style.display = "block";
});

function make_room() {
	const new_room_elements = document.querySelectorAll(".new_room");
	const join_room_elements = document.querySelectorAll(".join_room");
	if (window.getComputedStyle(new_room_elements[0]).display == "none") {
		join_room_elements.forEach((element) => {
			element.style.display = "none";
		});

		new_room_elements.forEach((element) => {
			element.style.display = "block";
		});

		document.getElementById("new_room_top").childNodes[0].nodeValue = "new room";

		return;
	}

	let room_picture = new_room_form.querySelector('input[name="room_picture"]').files[0]; // File input
	let roomname = new_room_form.querySelector('input[name="name"]').value;
	let password = new_room_form.querySelector('input[name="password"]').value;
	let rePassword = new_room_form.querySelector('input[name="repassword"]').value;

	if (!roomname.trim() || !password.trim()) {
		alert("room name and password fields cannot be empty!");
		return;
	} else if (password != rePassword) {
		alert("Passwords are different!");
		return;
	}

	const myHeaders = new Headers();
	myHeaders.append("accept", "application/json");
	

	let raw;
	let requestOptions;
	// console.log(room_picture);
	if (room_picture) {
		raw = JSON.stringify({
			created_by: userData.user_id,
			name: roomname,
			password: password,
		});

		const formdata = new FormData();
		formdata.append("chat_room", raw);
		formdata.append("image", room_picture);

		requestOptions = {
			method: "POST",
			headers: myHeaders,
			body: formdata,
			redirect: "follow",
		};
	} else {
		raw = JSON.stringify({
			created_by: userData.user_id,
			name: roomname,
			password: password,
		});

		var form_data = new FormData();
		form_data.append("chat_room", raw);

		requestOptions = {
			method: "POST",
			headers: myHeaders,
			body: form_data,
			redirect: "follow",
		};
	}

	fetch("/rooms", requestOptions)
		.then((response) => {
			if (!response.ok) {
				return response.json().then((err) => {
					throw new Error(err.detail || `HTTP error! Status: ${response.status}`);
				});
			}

			return response.json();
		})
		.then((result) => {
			const newRoom = result;

			if (!newRoom.room_id) return;

			if (!newRoom.recent_message) {
				newRoom.recent_message = {
					content: "no recent message",
				};
			}

			const div_to_add = `
			<div class="room" id="room${newRoom.room_id}">
				<img height="30px"/>
				<div>
					<h6>${newRoom.name}</h6>
					<p>${newRoom.recent_message.content}</p>
				</div>
				<p class="interval"></p>
			</div>
			`;

			roomList.insertAdjacentHTML("beforeend", div_to_add);
			const addedRoom = document.getElementById(`room${newRoom.room_id}`);

			if (newRoom.room_picture) {
				addedRoom.querySelector("img").src = newRoom.room_picture;
			} else {
				addedRoom.querySelector("img").src = "assets/chat_room.svg";
			}

			addedRoom.addEventListener("click", () => joinRoom(newRoom));

			joinRoom(newRoom);

			const NewRoomForm = document.getElementById("NewRoomForm");
			NewRoomForm.style.display = "none";
			new_room_form.reset();
		})
		.catch((error) => {
			console.error("Error:", error.message);
			alert(error.message);
		});
}

function join_room() {
	const new_room_elements = document.querySelectorAll(".new_room");
	const join_room_elements = document.querySelectorAll(".join_room");
	if (window.getComputedStyle(join_room_elements[0]).display == "none") {
		new_room_elements.forEach((element) => {
			element.style.display = "none";
		});

		join_room_elements.forEach((element) => {
			element.style.display = "block";
		});

		document.getElementById("new_room_top").childNodes[0].nodeValue = "join room";

		return;
	}

	
	let room_id = new_room_form.querySelector('input[name="room_id"]').value;
	let password = new_room_form.querySelector('input[name="password"]').value;

	if (!room_id.trim() || !password.trim()) {
		alert("room ID and password fields cannot be empty!");
		return;
	}

	const myHeaders = new Headers();
	myHeaders.append("accept", "application/json");
	
	let requestOptions;
	requestOptions = {
		method: "POST",
		headers: myHeaders,
		redirect: "follow",
	};


	fetch(`/room/${room_id}/${userData.user_id}?password=${password}`, requestOptions)
		.then((response) => {
			if (!response.ok) {
				return response.json().then((err) => {
					throw new Error(err.detail || `HTTP error! Status: ${response.status}`);
				});
			}

			return response.json();
		})
		.then((result) => {
			const newRoom = result;

			if (!newRoom.room_id) return;

			if (!newRoom.recent_message) {
				newRoom.recent_message = {
					content: "no recent message",
				};
			}

			const div_to_add = `
		<div class="room" id="room${newRoom.room_id}">
			<img height="30px"/>
			<div>
				<h6>${newRoom.name}</h6>
				<p>${newRoom.recent_message.content}</p>
			</div>
			<p class="interval"></p>
		</div>
		`;

			roomList.insertAdjacentHTML("beforeend", div_to_add);
			const addedRoom = document.getElementById(`room${newRoom.room_id}`);

			if (newRoom.room_picture) {
				addedRoom.querySelector("img").src = newRoom.room_picture;
			} else {
				addedRoom.querySelector("img").src = "assets/chat_room.svg";
			}

			addedRoom.addEventListener("click", () => joinRoom(newRoom));

			joinRoom(newRoom);

			const NewRoomForm = document.getElementById("NewRoomForm");
			NewRoomForm.style.display = "none";
			new_room_form.reset();
		})
		.catch((error) => {
			console.error("Error:", error.message);
			alert(error.message);
		});
}

Date.prototype.getInterval = function (otherDate) {
	var interval;

	if (this > otherDate) interval = this.getTime() - otherDate.getTime();
	else interval = otherDate.getTime() - this.getTime();

	return Math.floor(interval / (1000 * 60 * 60 * 24));
};

// Fetch chat rooms
async function fetchRooms() {
	const response = await fetch(`/user/rooms?user_id=${userData.user_id}`);
	const rooms = await response.json();
	// console.log(rooms);
	// const rooms = [];

	// for (var i = 0; i < 25; i++) {
	// 	rooms.push({
	// 		room_id: i + 1,
	// 		created_by: i + 1,
	// 		recent_message: {
	// 			message_id: i + 1,
	// 			sender_id: i + 1,
	// 			room_id: i + 1,
	// 			content: `asdffdsa${Math.floor(Math.random() * 100)}`,
	// 			timestamp: new Date(`2024-11-${29 - i} 10:20:30`),
	// 		},
	// 		name: `Dummy Room ${i + 1}`,
	// 		password: null,
	// 		created_at: null,
	// 		room_picture: null,
	// 	});
	// }

	rooms.forEach((room) => {
		// console.log(room.recent_message);
		if (!room.recent_message) {
			room.recent_message = {
				content: "no recent message",
			};
		}

		const div_to_add = `
		<div class="room" id="room${room.room_id}">
			<img height="30px"/>
			<div>
				<h6>${room.name}</h6>
				<p>${room.recent_message.content}</p>
			</div>
			<p class="interval"></p>
		</div>
		`;

		roomList.insertAdjacentHTML("beforeend", div_to_add);
		const addedRoom = document.getElementById(`room${room.room_id}`);

		if (room.room_picture) {
			addedRoom.querySelector("img").src = room.room_picture;
		} else {
			addedRoom.querySelector("img").src = "assets/chat_room.svg";
		}

		if (!room.recent_message) {
			// console.log(room.recent_message.timestamp);
			var time_passed = new Date().getInterval(room.recent_message.timestamp);
			if (time_passed == 0) {
				addedRoom.querySelectorAll("p")[1].textContent = "today";
			} else if (time_passed == 1) {
				addedRoom.querySelectorAll("p")[1].textContent = time_passed + "day ago";
			} else {
				addedRoom.querySelectorAll("p")[1].textContent = time_passed + "days ago";
			}
		}

		addedRoom.addEventListener("click", () => joinRoom(room));
	});
}

async function fetchRoomData(room_id) {
	const response = await fetch(`/room/${room_id}?user_id=${userData.user_id}`);
	const chats = await response.json();

	chatList.innerHTML = "";
	chats.forEach((chat) => {
		add_message(chat.sender, chat.content);
	});
}

// Join a chat room
function joinRoom(room) {
	fetchRoomData(room.room_id);
	if (socket) socket.close();

	currentRoom = room;
	roomTitle.textContent = currentRoom.name;

	document.getElementById("chat_input").style.display = "block";
	// document.getElementById("room_users").style.display = "inline";

	if (room.created_by == userData.user_id) {
		roomTitle.textContent = `${currentRoom.name} - room id: "${currentRoom.room_id}"   |   room password: "${currentRoom.password}"`;
		// document.getElementById("room_settings").style.display = "inline";
	} else {
		// document.getElementById("room_settings").style.display = "none";
	}

	// Connect to WebSocket
	const protocol = window.location.protocol === "https:" ? "wss" : "ws";
	socket = new WebSocket(`${protocol}://${window.location.host}/ws/${userData.user_id}/${currentRoom.room_id}`);

	// socket = new WebSocket(`/ws/${userData.user_id}/${currentRoom.room_id}`);

	socket.addEventListener("message", (event) => {
		const messageData = JSON.parse(event.data);
		add_message(messageData.sender, messageData.content);

		let currRoom = document.querySelector(`#room${currentRoom.room_id} > div > p`);
		currRoom.innerHTML = messageData.content;
	});

	socket.onclose = () => console.log("Disconnected");
}

function send_message(e) {
	const messageInput = document.getElementById("message_input");
	// console.log(messageInput.value);
	if (!socket || messageInput.value.trim() === "") return;

	// console.log(e);
	if (e == null || e.keyCode == 13) {
		const messageData = {
			sender_id: userData.user_id,
			room_id: currentRoom.room_id,
			content: messageInput.value,
		};

		add_message(userData, messageData.content);

		socket.send(JSON.stringify(messageData));

		let currRoom = document.querySelector(`#room${currentRoom.room_id} > div > p`);
		currRoom.innerHTML = messageInput.value;

		messageInput.value = "";
	}
}

function add_message(user, value) {
	let div_to_add;

	if (user.user_id != userData.user_id) {
		div_to_add = `
		<div class="chat_box sender_other">
			<img src="${user.profile_picture}" class="chat_profile_picture"/>
			<div>
				<p class="chat_username">${user.username}</p>
				<p class="chat_message">${value}</p>
			</div>
		</div>
		`;
	} else {
		div_to_add = `
		<div class="chat_box sender_me">
			<div>
				<p class="chat_username">me</p>
				<p class="chat_message">${value}</p>
			</div>
		</div>
		`;
	}

	

	chatList.insertAdjacentHTML("beforeend", div_to_add);
	chatList.scrollTop = chatList.scrollHeight;
}
