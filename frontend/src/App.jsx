import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, HashRouter } from 'react-router-dom';
import { io } from 'socket.io-client';

import Landing from './pages/Landing';
import Login from './pages/Login';
import LearnerDashboard from './pages/LearnerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import RoomView from './pages/RoomView';

import { API_BASE_URL } from './config';

// Connect to backend (adjust URL when deploying)
const socket = io(API_BASE_URL);

function App() {
  const [globalUsername, setGlobalUsername] = useState(sessionStorage.getItem('sb_user') || '');
  const [socketConnected, setSocketConnected] = useState(false);
  const [activeUsers, setActiveUsers] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [timerState, setTimerState] = useState({ isActive: false, mode: 'focus', timeLeft: 60 * 60 });
  const [myTasks, setMyTasks] = useState([]);
  const [whiteboardLines, setWhiteboardLines] = useState([]);

  useEffect(() => {
    if (globalUsername) sessionStorage.setItem('sb_user', globalUsername);
  }, [globalUsername]);

  // Handle Server Re-Connections & Auto-Rejoin
  useEffect(() => {
    const handleConnect = () => setSocketConnected(true);
    const handleDisconnect = () => setSocketConnected(false);

    if (socket.connected) {
      handleConnect();
    }

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
    };
  }, [globalUsername]);

  useEffect(() => {
    socket.on('initial_state', (state) => {
      setActiveUsers(state.activeUsers);
      setTimerState(state.timer);
      setChatMessages(state.chatMessages);
      if (state.whiteboardLines) setWhiteboardLines(state.whiteboardLines);
      if (state.tasks) setMyTasks(state.tasks);
    });
    socket.on('users_updated', (users) => setActiveUsers(users));
    socket.on('message_received', (msg) => setChatMessages((prev) => [...prev, msg]));
    socket.on('timer_updated', (timer) => setTimerState(timer));
    socket.on('timer_sync', (timeLeft) => setTimerState(prev => ({ ...prev, timeLeft })));
    socket.on('timer_ended', () => setTimerState(prev => ({ ...prev, isActive: false, timeLeft: 0 })));
    socket.on('tasks_updated', (tasks) => setMyTasks(tasks));

    return () => {
      socket.off('initial_state'); socket.off('users_updated');
      socket.off('message_received'); socket.off('timer_updated'); socket.off('timer_sync');
      socket.off('timer_ended'); socket.off('tasks_updated');
    };
  }, []);

  return (
    // We use HashRouter here instead of BrowserRouter so direct links don't break in dev servers without fallback routing
    <HashRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login setGlobalUsername={setGlobalUsername} socket={socket} />} />
        <Route path="/learner" element={<LearnerDashboard username={globalUsername} />} />
        <Route path="/admin" element={<AdminDashboard username={globalUsername} />} />
        <Route path="/room/:id" element={
          <RoomView 
            socket={socket} 
            socketConnected={socketConnected}
            username={globalUsername} 
            activeUsers={activeUsers} 
            timerState={timerState} 
            chatMessages={chatMessages} 
            myTasks={myTasks} 
            setMyTasks={setMyTasks} 
            whiteboardLines={whiteboardLines}
          />
        } />
      </Routes>
    </HashRouter>
  );
}

export default App;
