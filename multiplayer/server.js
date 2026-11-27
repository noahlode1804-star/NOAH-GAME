
const http = require("http");
const { WebSocketServer, WebSocket } = require("ws");

const PORT = process.env.PORT || 10000;
const MAX_PLAYERS = 20;

const rooms = new Map();
let nextRoomId = 1;
let nextPlayerId = 1;

const server = http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
        status: "online",
        game: "NOAH GAME Multiplayer",
        rooms: rooms.size
    }));
});

const wss = new WebSocketServer({ server });

function send(socket, data) {
    if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(data));
    }
}

function broadcast(room, data, excludedSocket = null) {
    for (const player of room.players.values()) {
        if (player.socket !== excludedSocket) {
            send(player.socket, data);
        }
    }
}

function findRoom() {
    for (const room of rooms.values()) {
        if (room.players.size < MAX_PLAYERS) {
            return room;
        }
    }

    const room = {
        id: `room-${nextRoomId++}`,
        players: new Map()
    };

    rooms.set(room.id, room);
    console.log("Nieuwe room:", room.id);

    return room;
}

function removePlayer(socket) {
    const room = socket.room;

    if (!room || !socket.playerId) return;

    const playerId = socket.playerId;

    room.players.delete(playerId);

    broadcast(room, {
        type: "player-left",
        id: playerId
    });

    console.log(`Speler ${playerId} heeft ${room.id} verlaten.`);

    if (room.players.size === 0) {
        rooms.delete(room.id);
        console.log("Room verwijderd:", room.id);
    }

    socket.room = null;
    socket.playerId = null;
}

wss.on("connection", (socket) => {
    const room = findRoom();
    const playerId = `player-${nextPlayerId++}`;

    socket.room = room;
    socket.playerId = playerId;

    const existingPlayers = [];

    for (const player of room.players.values()) {
        existingPlayers.push({
            id: player.id,
            x: player.x,
            y: player.y,
            z: player.z,
            yaw: player.yaw,
            pitch: player.pitch
        });
    }

    const player = {
        id: playerId,
        socket,
        x: 0,
        y: 1.7,
        z: 0,
        yaw: 0,
        pitch: 0
    };

    room.players.set(playerId, player);

    send(socket, {
        type: "welcome",
        id: playerId,
        roomId: room.id,
        maxPlayers: MAX_PLAYERS,
        players: existingPlayers
    });

    broadcast(room, {
        type: "player-joined",
        id: playerId,
        x: player.x,
        y: player.y,
        z: player.z,
        yaw: player.yaw,
        pitch: player.pitch
    }, socket);

    console.log(
        `${playerId} is verbonden met ${room.id} (${room.players.size}/${MAX_PLAYERS})`
    );

    socket.on("message", (rawMessage) => {
        let data;

        try {
            data = JSON.parse(rawMessage.toString());
        } catch {
            return;
        }

        if (data.type !== "move") return;

        const currentPlayer = room.players.get(playerId);
        if (!currentPlayer) return;

        const values = [data.x, data.y, data.z, data.yaw, data.pitch];

        if (!values.every(Number.isFinite)) return;

        currentPlayer.x = Math.max(-500, Math.min(500, data.x));
        currentPlayer.y = Math.max(-100, Math.min(100, data.y));
        currentPlayer.z = Math.max(-500, Math.min(500, data.z));
        currentPlayer.yaw = data.yaw;
        currentPlayer.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, data.pitch));

        broadcast(room, {
            type: "player-moved",
            id: playerId,
            x: currentPlayer.x,
            y: currentPlayer.y,
            z: currentPlayer.z,
            yaw: currentPlayer.yaw,
            pitch: currentPlayer.pitch
        }, socket);
    });

    socket.on("close", () => removePlayer(socket));
    socket.on("error", () => removePlayer(socket));
});

server.listen(PORT, "0.0.0.0", () => {
    console.log(`NOAH GAME Multiplayer draait op poort ${PORT}`);
});
