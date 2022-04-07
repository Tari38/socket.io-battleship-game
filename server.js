const express = require("express");
const path = require("path");
const http = require("http");
const PORT = process.env.PORT || 3000;
const socketio = require("socket.io");
const app = express();
const server = http.createServer(app);
const io = socketio(server);

app.use(express.static(path.join(__dirname, "public")));

//handle socket connection
const connections = [null, null];

io.on("connection", socket => {
	console.log("Successfully created a new connection!");

	//find an available player number
	let playerIndex = -1;
	for (const i in connections) {
		if (connections[i] === null) {
			playerIndex = i
			break
		}
	}

	//tell the connecting client what number they are
	socket.emit("player-number", playerIndex);
		console.log("Player ${playerIndex} has connected!");

		// ignore player 3
		if (playerIndex === -1) return

		connections[playerIndex] = false;

	// tell everyone what player just connected
	socket.broadcast.emit("player-connection", playerIndex);

	//handle disconnect
	socket.on("disconnect", () => {
		connections[playerIndex] = null;
		//tell everyone what player just disconnected
		socket.broadcast.emit("player-connection", playerIndex);
	});

	// start game
	socket.on("player-ready", () => {
		socket.broadcast.emit("enemy-ready", playerIndex);
		connections[playerIndex] = true;
	});

	// check player connections
	socket.on("check-players", () => {
		const players = [];
		for (const i in connections) {
			connections[i] === null ? players.push({connected: false, ready: false}) : players.push({connected: true, ready: connections[i]});
		}
		socket.emit("check-players", players);
	});

	//on attack
	socket.on("fire", id => {
		console.log(`Shot fired from ${playerIndex}`, id);

		//emit the move to the other player
		socket.broadcast.emit("fire", id);
	});

	//on counterattack
	socket.on("fire-reply", square => {
		console.log(square);

		//emit the response to the other player
		socket.broadcast.emit("fire-reply", square);
	});

	// timeout connection
	setTimeout(() => {
		connections[playerIndex] = null;
		socket.emit("timeout");
		socket.disconnect();
	}, 600000) // 10 minute limit per player

});
