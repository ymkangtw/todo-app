require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const todosRoute = require('./routes/todos.route');

const app = express();
const PORT = 3001;

const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' },
});

io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.resolve(__dirname, '../client/dist')));

// Routes
app.use('/api/todos', todosRoute(io));

// SPA fallback: non-API requests serve index.html
app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, '../client/dist/index.html'));
});

httpServer.listen(PORT, () => {
  console.log(`✅ 伺服器運行於 http://localhost:${PORT}`);
});
