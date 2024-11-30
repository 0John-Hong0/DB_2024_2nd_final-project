const roomList = document.getElementById("rooms");
const createRoomBtn = document.getElementById("new_room");
const userBtn = document.getElementById("user");
// const newRoomInput = document.getElementById("new_room");
// const messagesDiv = document.getElementById("messages");
// const messageInput = document.getElementById("message-input");
// const sendMessageBtn = document.getElementById("send-message");
const roomTitle = document.getElementById("room_name");
const login_form = document.getElementById("login_form");

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

// Fetch chat rooms
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

	} else {
		let email = login_form.querySelector('input[name="email"]').value;
		let password = login_form.querySelector('input[name="password"]').value;
	
		if (!email.trim() || !password.trim()) {
			alert("Email and Password fields cannot be empty!");
			return;
		}
	
		let response = await fetch(`/user?email=${email}&password=${sha256(password)}`);
		let user = await response.json();
		
		
		if (user.email) {
			userData = user;
			const LoginForm = document.getElementById("LoginForm");
			LoginForm.style.display = "none";
			
			if (userData.profile_picture) {
				userBtn.innerHTML = `<img src="${userData.profile_picture}" height="50" width="50"/>`
			} else {
				userBtn.innerHTML = `<img src="assets/default_avatar.png" height="50" width="50"/>`
			}

		} else {
			console.error("Error:", response);
        	alert("user not found\ncheck if email/password is incorrect"); // Show a user-friendly error message
		}
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
	} else {
		let profilePicture = login_form.querySelector('input[name="profile_picture"]').files[0]; // File input
		let username = login_form.querySelector('input[name="username"]').value;
		let email = login_form.querySelector('input[name="email"]').value;
		let password = login_form.querySelector('input[name="password"]').value;
		let rePassword = login_form.querySelector('input[name="repassword"]').value;

		if (!username.trim() || !email.trim() || !password.trim()) {
			alert("username, Email and Password fields cannot be empty!");
			return;
		}
		else if (password != rePassword) {
			alert("Passwords are different!");
			return;
		}

		const myHeaders = new Headers();
		myHeaders.append("accept", "application/json");
		// myHeaders.append("Content-Type", "application/json");


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
				redirect: "follow"
			  };

		} else {
			raw = JSON.stringify({
				username: username,
				email: email,
				hashed_password: sha256(password)
			});

			requestOptions = {
				method: "POST",
				headers: myHeaders,
				body: raw,
				redirect: "follow"
			  };
		}

		
		fetch("http://127.0.0.1:8000/users", requestOptions)
			.then((response) => {
				if(!response.ok) {
					return response.json().then((err) => {
						throw new Error(err.detail || `HTTP error! Status: ${response.status}`);
					});
				}
				return response.json();
			})
			.then((result) => {
				userData = result;
				const LoginForm = document.getElementById("LoginForm");
				LoginForm.style.display = "none";
				if (userData.profile_picture) {
					userBtn.innerHTML = `<img src="${userData.profile_picture}" height="50" width="50"/>`
				} else {
					userBtn.innerHTML = `<img src="assets/default_avatar.png" height="50" width="50"/>`
				}
			})
			.catch((error) => {
				console.error("Error:", error.message);
        		alert(error.message); // Show a user-friendly error message
			});
	}
}

function closeForm(form_id) {
	const Form = document.getElementById(form_id);
	Form.style.display = "none";
}

/*********************login*********************/

userBtn.addEventListener("click", async () => {
	if (userData.user_id) {
		console.log("user found");
	} else {
		const LoginForm = document.getElementById("LoginForm");
		LoginForm.style.display = "block";
	}
});

Date.prototype.getInterval = function (otherDate) {
	var interval;

	if (this > otherDate) interval = this.getTime() - otherDate.getTime();
	else interval = otherDate.getTime() - this.getTime();

	return Math.floor(interval / (1000 * 60 * 60 * 24));
};

// Fetch chat rooms
async function fetchRooms() {
	//   const response = await fetch("/rooms");
	//   const rooms = await response.json();
	const rooms = [];

	for (var i = 0; i < 5; i++) {
		rooms.push({
			room_id: i + 1,
			created_by: i + 1,
			recent_message: {
				message_id: i + 1,
				sender_id: i + 1,
				room_id: i + 1,
				content: `asdffdsa${Math.floor(Math.random() * 100)}`,
				timestamp: new Date(`2024-11-${29 - i} 10:20:30`),
			},
			name: `Room ${i + 1}`,
			password: null,
			created_at: null,
			room_picture: null,
		});
	}

	rooms.forEach((room) => {
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

		var time_passed = new Date().getInterval(room.recent_message.timestamp);

		roomList.insertAdjacentHTML("beforeend", div_to_add);
		const addedRoom = document.getElementById(`room${room.room_id}`);

		if (room.room_picture) {
			addedRoom.querySelector("img").src = room.room_picture;
		} else {
			addedRoom.querySelector("img").src = "assets/chat_room.svg";
		}

		if (time_passed == 0) {
			addedRoom.querySelectorAll("p")[1].textContent = "today";
		} else if (time_passed == 1) {
			addedRoom.querySelectorAll("p")[1].textContent = time_passed + "day ago";
		} else {
			addedRoom.querySelectorAll("p")[1].textContent = time_passed + "days ago";
		}

		addedRoom.addEventListener("click", () => joinRoom(room.room_id, room.name));
	});
}

// Join a chat room
function joinRoom(roomId, roomName) {
	if (socket) socket.close();

	currentRoom = roomId;
	roomTitle.textContent = roomName;

	// Connect to WebSocket
	socket = new WebSocket(`ws://localhost:8000/ws/${roomId}`);

	socket.onmessage = (event) => {
		const messageData = JSON.parse(event.data);
		const messageElem = document.createElement("div");
		messageElem.textContent = `${messageData.sender}: ${messageData.content}`;
		messagesDiv.appendChild(messageElem);
		messagesDiv.scrollTop = messagesDiv.scrollHeight;
	};

	socket.onclose = () => console.log("Disconnected");
}

// // Create a new room
createRoomBtn.addEventListener("click", async () => {
	const roomName = newRoomInput.value;
	if (roomName.trim() === "") return;
	await fetch("http://localhost:8000/api/rooms", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ name: roomName }),
	});
	newRoomInput.value = "";
	fetchRooms();
});

// // Send a message
// sendMessageBtn.addEventListener("click", () => {
// 	if (!socket || messageInput.value.trim() === "") return;
// 	const message = { content: messageInput.value };
// 	socket.send(JSON.stringify(message));
// 	messageInput.value = "";
// });

// Load initial data
fetchRooms();
