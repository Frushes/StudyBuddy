const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { initDB, getPool } = require('./db');

const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/register', async (req, res) => {
  try {
    const { username, password, role } = req.body;
    if (!username || !password || !role) {
      return res.status(400).json({ error: 'All fields are required.' });
    }
    const pool = getPool();
    const [existing] = await pool.query('SELECT username FROM users WHERE username = ?', [username]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Username already exists.' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', [username, hashedPassword, role]);
    res.status(201).json({ message: 'User registered successfully.' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

app.post('/api/rooms', async (req, res) => {
  try {
    const { id, name, subject, host } = req.body;
    if (!id || !name) return res.status(400).json({ error: 'Room ID and Name required' });
    const pool = getPool();
    await pool.query('INSERT INTO rooms (id, name, subject, host) VALUES (?, ?, ?, ?)', [id.trim(), name.trim(), subject ? subject.trim() : 'General', host || 'System']);
    res.status(201).json({ message: 'Room created successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create room' });
  }
});

app.get('/api/rooms', async (req, res) => {
  try {
    const pool = getPool();
    const [rooms] = await pool.query('SELECT * FROM rooms ORDER BY created_at DESC');
    
    // Enrich with dynamic volatile socket data
    const enrichedRooms = rooms.map(room => {
      const state = roomsState[room.id.trim()];
      const usersArray = state ? state.activeUsers.map(u => u.username) : [];
      return { ...room, activeUserCount: usersArray.length, activeUsersList: usersArray };
    });

    res.status(200).json(enrichedRooms);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password, role } = req.body;
    if (!username || !password || !role) {
      return res.status(400).json({ error: 'All fields are required.' });
    }
    const pool = getPool();
    const [users] = await pool.query('SELECT * FROM users WHERE username = ? AND role = ?', [username, role]);
    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid username or role.' });
    }
    const user = users[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: 'Incorrect password.' });
    }
    res.status(200).json({ message: 'Login successful.', username: user.username, role: user.role });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 4001;

const roomsState = {};

function getRoomState(roomId) {
  if (!roomsState[roomId]) {
    roomsState[roomId] = {
      activeUsers: [],
      timer: { isActive: false, mode: 'focus', timeLeft: 60 * 60 },
      chatMessages: [],
      whiteboardLines: [],
      tasks: []
    };
  }
  return roomsState[roomId];
}

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Handle user joining a specific room
  socket.on('join_room', async ({ username, roomId }) => {
    username = username ? username.trim() : 'Anonymous';
    roomId = roomId ? roomId.trim() : 'global';
    
    socket.join(roomId);
    socket.roomId = roomId;

    const state = getRoomState(roomId);
    if (state.activeUsers.some(u => u.id === socket.id)) return; // Prevent double-join

    // Fetch historical DB state for this room if empty
    if (state.chatMessages.length === 0) {
      try {
        const pool = getPool();
        const [msgs] = await pool.query('SELECT id, sender, text, type FROM messages WHERE room_id = ? ORDER BY created_at ASC LIMIT 50', [roomId]);
        state.chatMessages = msgs;
        const [lines] = await pool.query('SELECT x0, y0, x1, y1, color FROM whiteboard_lines WHERE room_id = ? ORDER BY created_at ASC', [roomId]);
        state.whiteboardLines = lines;
      } catch (err) { console.error('Failed to load room history', err); }
    }

    // Protect against ghost users: If user navigated away or closed the socket while we were intensely fetching DB history, gracefully abort
    if (socket.disconnected || socket.roomId !== roomId) return;

    // Destroy any lingering ghost connections tied to this precise normalized username
    state.activeUsers = state.activeUsers.filter(u => u.username.trim() !== username);

    const user = { id: socket.id, username, status: 'Studying' };
    state.activeUsers.push(user);
    io.to(roomId).emit('users_updated', state.activeUsers);
    
    // Send specific isolated state back to the user
    socket.emit('initial_state', state);

    // System message
    const uniqueId = Date.now().toString() + '-' + Math.random().toString(36).substring(2, 9);
    const joinMsg = { id: uniqueId, sender: 'System', text: `${username} joined the focus room.`, type: 'system' };
    state.chatMessages.push(joinMsg);
    try {
      const pool = getPool();
      await pool.query('INSERT INTO messages (id, room_id, sender, text, type) VALUES (?, ?, ?, ?, ?)', [joinMsg.id, roomId, joinMsg.sender, joinMsg.text, joinMsg.type]);
    } catch (e) { console.error('Join msg DB error:', e); }
    io.to(roomId).emit('message_received', joinMsg);
  });

  // Handle explicit leaving of a room without full TCP disconnect
  socket.on('leave_room', async ({ roomId }) => {
    socket.leave(roomId);
    socket.roomId = null;

    const state = roomsState[roomId];
    if (!state) return;
    
    // Synchronously remove user to prevent async race conditions where a rapid rejoin intersects the database yield
    const user = state.activeUsers.find(u => u.id === socket.id);
    state.activeUsers = state.activeUsers.filter(u => u.id !== socket.id);
    io.to(roomId).emit('users_updated', state.activeUsers);

    if (user) {
      const uniqueId = Date.now().toString() + '-' + Math.random().toString(36).substring(2, 9);
      const leaveMsg = { id: uniqueId, sender: 'System', text: `${user.username} left.`, type: 'system' };
      state.chatMessages.push(leaveMsg);
      if (state.chatMessages.length > 50) state.chatMessages.shift();
      try {
        const pool = getPool();
        await pool.query('INSERT INTO messages (id, room_id, sender, text, type) VALUES (?, ?, ?, ?, ?)', [leaveMsg.id, roomId, leaveMsg.sender, leaveMsg.text, leaveMsg.type]);
      } catch (e) {}
      io.to(roomId).emit('message_received', leaveMsg);
    }
  });

  // Handle chat messages
  socket.on('send_message', async (message) => {
    const roomId = socket.roomId;
    if (!roomId) return;
    const state = getRoomState(roomId);

    const uniqueId = Date.now().toString() + '-' + Math.random().toString(36).substring(2, 9);
    const chatMsg = { id: uniqueId, sender: message.sender, text: message.text, type: 'user' };
    state.chatMessages.push(chatMsg);
    if (state.chatMessages.length > 50) state.chatMessages.shift();

    try {
      const pool = getPool();
      await pool.query('INSERT INTO messages (id, room_id, sender, text, type) VALUES (?, ?, ?, ?, ?)', [chatMsg.id, roomId, chatMsg.sender, chatMsg.text, chatMsg.type]);
    } catch (e) { console.error('Chat msg DB error:', e); }
    io.to(roomId).emit('message_received', chatMsg);
  });

  // Handle timer sync
  socket.on('timer_action', (action) => {
    const roomId = socket.roomId;
    if (!roomId) return;
    const state = getRoomState(roomId);

    if (action.type === 'START') {
      state.timer.isActive = true;
      if (action.duration !== undefined) state.timer.timeLeft = action.duration;
      if (action.mode) state.timer.mode = action.mode;
    } else if (action.type === 'STOP') {
      state.timer.isActive = false;
    } else if (action.type === 'ADJUST') {
      state.timer.timeLeft = Math.max(0, state.timer.timeLeft + action.amount);
    }
    io.to(roomId).emit('timer_updated', state.timer);
  });

  // Handle study goals / task list sync
  socket.on('task_action', (action) => {
    const roomId = socket.roomId;
    if (!roomId) return;
    const state = getRoomState(roomId);
    
    if (action.type === 'ADD') {
      state.tasks.push(action.task);
    } else if (action.type === 'TOGGLE') {
      const task = state.tasks.find(t => t.id === action.id);
      if (task) task.completed = !task.completed;
    } else if (action.type === 'REMOVE') {
      state.tasks = state.tasks.filter(t => t.id !== action.id);
    } else if (action.type === 'CLEAR_COMPLETED') {
      state.tasks = state.tasks.filter(t => !t.completed);
    }
    io.to(roomId).emit('tasks_updated', state.tasks);
  });

  // Handle whiteboard drawing
  socket.on('draw_line', async (lineData) => {
    const roomId = socket.roomId;
    if (!roomId) return;
    const state = getRoomState(roomId);

    state.whiteboardLines.push(lineData);
    try {
      const pool = getPool();
      await pool.query('INSERT INTO whiteboard_lines (room_id, x0, y0, x1, y1, color) VALUES (?, ?, ?, ?, ?, ?)', [roomId, lineData.x0, lineData.y0, lineData.x1, lineData.y1, lineData.color]);
    } catch (e) { console.error(e); }
    socket.to(roomId).emit('draw_line', lineData); // broadcast to everyone except sender
  });

  // Handle whiteboard clearing
  socket.on('clear_whiteboard', async () => {
    const roomId = socket.roomId;
    if (!roomId) return;
    const state = getRoomState(roomId);

    state.whiteboardLines = [];
    try {
      const pool = getPool();
      await pool.query('DELETE FROM whiteboard_lines WHERE room_id = ?', [roomId]);
    } catch (e) { console.error(e); }
    io.to(roomId).emit('whiteboard_cleared');
  });

  // WebRTC Signaling
  socket.on('webrtc_offer', (data) => {
    io.to(data.targetId).emit('webrtc_offer', { fromId: socket.id, offer: data.offer });
  });

  socket.on('webrtc_answer', (data) => {
    io.to(data.targetId).emit('webrtc_answer', { fromId: socket.id, answer: data.answer });
  });

  socket.on('webrtc_ice_candidate', (data) => {
    io.to(data.targetId).emit('webrtc_ice_candidate', { fromId: socket.id, candidate: data.candidate });
  });

  socket.on('video_enabled', () => {
    if (socket.roomId) socket.to(socket.roomId).emit('user_video_enabled', socket.id);
  });

  socket.on('video_disabled', () => {
    if (socket.roomId) socket.to(socket.roomId).emit('user_video_disabled', socket.id);
  });

  socket.on('disconnect', async () => {
    console.log(`User disconnected: ${socket.id}`);
    const roomId = socket.roomId;
    if (!roomId) return;

    const state = getRoomState(roomId);
    const user = state.activeUsers.find(u => u.id === socket.id);
    
    // Synchronously remove user exactly like leave_room to prevent reconnect races
    state.activeUsers = state.activeUsers.filter(u => u.id !== socket.id);
    io.to(roomId).emit('users_updated', state.activeUsers);

    if (user) {
      const uniqueId = Date.now().toString() + '-' + Math.random().toString(36).substring(2, 9);
      const leaveMsg = { id: uniqueId, sender: 'System', text: `${user.username} left.`, type: 'system' };
      state.chatMessages.push(leaveMsg);
      try {
        const pool = getPool();
        await pool.query('INSERT INTO messages (id, room_id, sender, text, type) VALUES (?, ?, ?, ?, ?)', [leaveMsg.id, roomId, leaveMsg.sender, leaveMsg.text, leaveMsg.type]);
      } catch (e) { console.error('Leave msg DB error:', e); }
      io.to(roomId).emit('message_received', leaveMsg);
    }
  });
});

// Server-side timer loop per room
setInterval(() => {
  Object.keys(roomsState).forEach(roomId => {
    const state = roomsState[roomId];
    if (state.timer.isActive && state.timer.timeLeft > 0) {
      state.timer.timeLeft -= 1;
      io.to(roomId).emit('timer_sync', state.timer.timeLeft);
    } else if (state.timer.isActive && state.timer.timeLeft <= 0) {
      state.timer.isActive = false;
      io.to(roomId).emit('timer_ended');
    }
  });
}, 1000);

initDB().then(async (pool) => {
  server.listen(PORT, () => {
    console.log(`Socket.io server running on port ${PORT} connected to MySQL`);
  });
}).catch(err => {
  console.error("Critical Failure:", err);
});
