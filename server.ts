import express from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";
import path from "path";

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// In-memory store for sessions and transcripts
// In a production app, this would be a database
const sessions = new Map<string, {
  code: string;
  teacherId: string;
  teacherName: string;
  participants: Map<string, any>;
  transcripts: any[];
}>();

// Map to find session by code
const codeToSessionId = new Map<string, string>();

// Map to track which session a socket belongs to
const socketToSession = new Map<WebSocket, string>();
const socketToUser = new Map<WebSocket, string>();

wss.on("connection", (ws) => {
  console.log("New client connected");

  ws.on("message", (data) => {
    try {
      const message = JSON.parse(data.toString());
      const { type, payload } = message;

      switch (type) {
        case "HOST_SESSION": {
          const { teacherId, teacherName } = payload;
          const sessionId = Math.random().toString(36).substring(2, 15);
          const code = Math.floor(100000 + Math.random() * 900000).toString();
          
          sessions.set(sessionId, {
            code,
            teacherId,
            teacherName,
            participants: new Map(),
            transcripts: []
          });
          codeToSessionId.set(code, sessionId);
          socketToSession.set(ws, sessionId);
          socketToUser.set(ws, teacherId);

          ws.send(JSON.stringify({ 
            type: "SESSION_CREATED", 
            payload: { sessionId, code } 
          }));
          break;
        }

        case "JOIN_SESSION": {
          const { code, userId, name, role } = payload;
          const sessionId = codeToSessionId.get(code);
          const session = sessionId ? sessions.get(sessionId) : null;

          if (!session) {
            ws.send(JSON.stringify({ type: "ERROR", payload: "Invalid class code" }));
            return;
          }

          socketToSession.set(ws, sessionId!);
          socketToUser.set(ws, userId);

          const userData = { id: userId, name, role, isOnline: true };
          session.participants.set(userId, userData);

          ws.send(JSON.stringify({ 
            type: "JOIN_SUCCESS", 
            payload: { 
              sessionId, 
              transcripts: session.transcripts,
              participants: Array.from(session.participants.values())
            } 
          }));

          // Notify others
          broadcastToSession(sessionId!, {
            type: "PARTICIPANT_JOINED",
            payload: userData
          }, ws);
          break;
        }

        case "SEND_TRANSCRIPT": {
          const sessionId = socketToSession.get(ws);
          const session = sessionId ? sessions.get(sessionId) : null;
          if (session) {
            const transcript = {
              ...payload,
              id: Math.random().toString(36).substring(2, 9),
              timestamp: Date.now()
            };
            session.transcripts.push(transcript);
            broadcastToSession(sessionId!, {
              type: "NEW_TRANSCRIPT",
              payload: transcript
            });
          }
          break;
        }

        case "LIVE_CAPTION": {
          const sessionId = socketToSession.get(ws);
          if (sessionId) {
            broadcastToSession(sessionId, {
              type: "LIVE_CAPTION",
              payload: {
                ...payload,
                timestamp: Date.now()
              }
            }, ws);
          }
          break;
        }
      }
    } catch (err) {
      console.error("WS Message Error:", err);
    }
  });

  ws.on("close", () => {
    const sessionId = socketToSession.get(ws);
    const userId = socketToUser.get(ws);
    if (sessionId && userId) {
      const session = sessions.get(sessionId);
      if (session) {
        session.participants.delete(userId);
        broadcastToSession(sessionId, {
          type: "PARTICIPANT_LEFT",
          payload: userId
        });
      }
    }
    socketToSession.delete(ws);
    socketToUser.delete(ws);
  });
});

function broadcastToSession(sessionId: string, message: any, excludeWs?: WebSocket) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && socketToSession.get(client) === sessionId) {
      if (client !== excludeWs) {
        client.send(JSON.stringify(message));
      }
    }
  });
}

async function startServer() {
  const PORT = 3000;

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
