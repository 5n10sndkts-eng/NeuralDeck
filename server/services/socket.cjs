const { Server } = require("socket.io");

let io = null;
let jwtSecret = null;
let jwtLib = null;
let activeSessions = null;
let securityLogger = null;

const initSocket = (httpServer, options = {}) => {
    // Store auth dependencies
    jwtSecret = options.jwtSecret;
    jwtLib = options.jwt;
    activeSessions = options.activeSessions;
    securityLogger = options.securityLogger;

    io = new Server(httpServer, {
        cors: {
            origin: "*", // Allow all for now (Localhost dev)
            methods: ["GET", "POST"]
        }
    });

    // JWT Authentication Middleware - Story 6-4
    if (jwtLib && jwtSecret && activeSessions) {
        io.use((socket, next) => {
            try {
                const token = socket.handshake.auth.token;
                
                if (!token) {
                    // Allow connection without auth in development
                    if (process.env.NODE_ENV !== 'production') {
                        console.log(`[SOCKET] Unauthenticated connection allowed (dev mode): ${socket.id}`);
                        socket.userId = 'anonymous';
                        socket.authenticated = false;
                        return next();
                    }
                    
                    if (securityLogger) {
                        securityLogger.logSecurityEvent('SOCKET_AUTH_FAILED', {
                            socketId: socket.id,
                            ip: socket.handshake.address,
                            reason: 'No token provided'
                        });
                    }
                    return next(new Error('Authentication required'));
                }

                // Verify token
                const decoded = jwtLib.verify(token, jwtSecret);
                
                // Check session validity
                const session = activeSessions.get(decoded.sessionId);
                if (!session || session.invalidated) {
                    if (securityLogger) {
                        securityLogger.logSecurityEvent('SOCKET_AUTH_FAILED', {
                            socketId: socket.id,
                            userId: decoded.userId,
                            ip: socket.handshake.address,
                            reason: 'Session invalidated'
                        });
                    }
                    return next(new Error('Session expired or invalidated'));
                }

                // Attach user info to socket
                socket.userId = decoded.userId;
                socket.sessionId = decoded.sessionId;
                socket.authenticated = true;

                if (securityLogger) {
                    securityLogger.logSecurityEvent('SOCKET_AUTH_SUCCESS', {
                        socketId: socket.id,
                        userId: decoded.userId,
                        ip: socket.handshake.address
                    });
                }

                next();
            } catch (err) {
                if (securityLogger) {
                    securityLogger.logSecurityEvent('SOCKET_AUTH_FAILED', {
                        socketId: socket.id,
                        ip: socket.handshake.address,
                        reason: err.message
                    });
                }
                
                // Allow connection without auth in development
                if (process.env.NODE_ENV !== 'production') {
                    console.log(`[SOCKET] Auth error, allowing connection (dev mode): ${err.message}`);
                    socket.userId = 'anonymous';
                    socket.authenticated = false;
                    return next();
                }
                
                next(new Error('Authentication failed'));
            }
        });
    }

    io.on("connection", (socket) => {
        console.log(`[NEURAL CORTEX] Client Connected: ${socket.id} (user: ${socket.userId || 'anonymous'})`);

        socket.on("disconnect", () => {
            console.log(`[NEURAL CORTEX] Client Disconnected: ${socket.id}`);
        });

        // Allow clients to emit agent events (if needed manually)
        socket.on("agent:action", (data) => {
            console.log("[AGENT ACTION]", data);
        });

        // Periodic token validation for long-lived connections
        if (socket.authenticated && jwtLib && activeSessions) {
            const validateInterval = setInterval(() => {
                try {
                    const session = activeSessions.get(socket.sessionId);
                    if (!session || session.invalidated) {
                        console.log(`[SOCKET] Session invalidated, disconnecting: ${socket.id}`);
                        socket.disconnect(true);
                        clearInterval(validateInterval);
                    }
                } catch (err) {
                    console.error(`[SOCKET] Validation error: ${err.message}`);
                }
            }, 60000); // Check every minute

            socket.on("disconnect", () => {
                clearInterval(validateInterval);
            });
        }
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

