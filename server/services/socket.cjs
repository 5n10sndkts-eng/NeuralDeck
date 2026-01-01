const { Server } = require("socket.io");

let io = null;

const initSocket = (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: "*", // Allow all for now (Localhost dev)
            methods: ["GET", "POST"]
        }
    });

    io.on("connection", (socket) => {
        console.log(`[NEURAL CORTEX] Client Connected: ${socket.id}`);

        socket.on("disconnect", () => {
            console.log(`[NEURAL CORTEX] Client Disconnected: ${socket.id}`);
        });

        // Allow clients to emit agent events (if needed manually)
        socket.on("agent:action", (data) => {
            console.log("[AGENT ACTION]", data);
        });
    });

    console.log("[NEURAL CORTEX] Socket Gateway Online");
    return io;
};

const broadcast = (event, data) => {
    if (io) {
        io.emit(event, data);
    }
};

module.exports = { initSocket, broadcast };
