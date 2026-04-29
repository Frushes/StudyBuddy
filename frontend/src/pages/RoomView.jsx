import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Timer from '../components/Timer';
import Whiteboard from '../components/Whiteboard';
import ChatPanel from '../components/ChatPanel';
import ParticipantGrid from '../components/ParticipantGrid';
import TaskList from '../components/TaskList';
import AmbientControls from '../components/AmbientControls';
import { BookOpenText, Chalkboard, Timer as TimerIcon, VideoCamera, SignOut } from '@phosphor-icons/react';

function RoomView({ socket, socketConnected, username, activeUsers, timerState, chatMessages, myTasks, setMyTasks, whiteboardLines }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeCenter, setActiveCenter] = useState('whiteboard'); // Defaulting to the new whiteboard as primary dock

  // Safely emit isolated join packet upon entering this functional route interface
  React.useEffect(() => {
    if (socket && socketConnected) {
      socket.emit('join_room', { username: username || 'Anonymous', roomId: id || 'global' });
    }
    
    return () => {
      // Whenever we unmount (e.g. going back to dashboard), we explicitly instruct the global socket to leave the room
      if (socket && socketConnected) {
        socket.emit('leave_room', { roomId: id || 'global' });
      }
    };
  }, [username, id, socket, socketConnected]);

  const renderMiniModule = (module) => {
    if (module === 'timer') {
      return (
        <div 
          key="timer"
          onClick={() => setActiveCenter('timer')}
          className="glass-panel"
          style={{ padding: '20px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '5px', border: '2px dashed var(--border-color)', transition: 'var(--transition)'}}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-color)'}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
        >
          <TimerIcon size={36} color="var(--accent-color)" />
          <span style={{ fontSize: '1rem', color: 'var(--text-main)', fontWeight: 'bold' }}>Focus Timer</span>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            {Math.floor(timerState?.timeLeft / 60) || 0}:{(timerState?.timeLeft % 60)?.toString().padStart(2, '0') || '00'}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: '5px' }}>Click to Maximize</span>
        </div>
      );
    }
    if (module === 'whiteboard') {
      return (
        <div 
          key="whiteboard"
          onClick={() => setActiveCenter('whiteboard')}
          className="glass-panel"
          style={{ padding: '20px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '5px', border: '2px dashed var(--border-color)', transition: 'var(--transition)'}}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = '#ee5253'}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
        >
          <Chalkboard size={36} color="#ee5253" />
          <span style={{ fontSize: '1rem', color: 'var(--text-main)', fontWeight: 'bold' }}>Whiteboard</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginTop: '5px' }}>Click to Maximize</span>
        </div>
      );
    }
    if (module === 'video') {
      return <ParticipantGrid key="video" users={activeUsers} socket={socket} isMini={true} onMaximize={() => setActiveCenter('video')} />;
    }
    return null;
  };

  return (
    <div className="app-container">
      {/* Left Panel: Tasks & Ambient */}
      <div className="side-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h1 className="title-main" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.5rem' }}>
            <BookOpenText size={24} weight="fill" color="var(--accent-color)" /> {id || 'Global'}
          </h1>
          <button 
            onClick={() => {
              navigate(-1);
            }} 
            className="btn-primary" 
            style={{ background: '#ee5253', padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <SignOut size={16} /> Leave
          </button>
        </div>
        <TaskList tasks={myTasks} socket={socket} />
        
        {/* Minimized Modules */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {['timer', 'whiteboard', 'video'].filter(m => m !== activeCenter).map(m => renderMiniModule(m))}
        </div>

        <div style={{ flexGrow: 1 }} />
        <AmbientControls />
      </div>

      {/* Center Panel: Active Module */}
      <div className="main-focus-area" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {activeCenter === 'timer' && <Timer timerState={timerState} socket={socket} />}
        {activeCenter === 'whiteboard' && <Whiteboard socket={socket} initialLines={whiteboardLines} />}
        {activeCenter === 'video' && <ParticipantGrid users={activeUsers} socket={socket} isMini={false} />}
      </div>

      {/* Right Panel: Chat List */}
      <div className="side-panel">
        <ChatPanel messages={chatMessages} socket={socket} username={username || 'Guest'} />
      </div>
    </div>
  );
}

export default RoomView;
