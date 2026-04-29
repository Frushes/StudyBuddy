import React from 'react';
import { Play, Pause, ArrowCounterClockwise, Plus, Minus } from '@phosphor-icons/react';

function Timer({ timerState, socket }) {
  const { isActive, mode, timeLeft } = timerState;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  
  // Format as MM:SS
  const formatTime = (value) => value.toString().padStart(2, '0');

  const handleStart = () => {
    socket.emit('timer_action', { type: 'START' });
  };
  const handlePause = () => {
    socket.emit('timer_action', { type: 'STOP' });
  };
  const handleReset = () => {
    socket.emit('timer_action', { type: 'STOP' });
    socket.emit('timer_action', { type: 'START', duration: 60 * 60, mode: 'focus' }); // Reset to 60m
  };
  const handleAdd = () => socket.emit('timer_action', { type: 'ADJUST', amount: 10 * 60 });
  const handleSubtract = () => socket.emit('timer_action', { type: 'ADJUST', amount: -10 * 60 });

  const percentage = (timeLeft / (mode === 'focus' ? 60 * 60 : 5 * 60)) * 100;

  const strokeColor = mode === 'focus' ? '#6c5ce7' : '#00d2d3';
  const shadowColor = mode === 'focus' ? 'rgba(108, 92, 231, 0.6)' : 'rgba(0, 210, 211, 0.6)';

  return (
    <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <h2 style={{ fontSize: '1.2rem', color: strokeColor, marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '3px', fontWeight: 700, textShadow: `0 0 10px ${shadowColor}` }}>
        {mode === 'focus' ? 'Deep Work' : 'Break Time'}
      </h2>
      
      <div style={{ position: 'relative', width: '240px', height: '240px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', transform: 'rotate(-90deg)', filter: `drop-shadow(0 0 12px ${shadowColor})` }}>
          <circle cx="120" cy="120" r="110" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="6" />
          <circle 
            cx="120" cy="120" r="110" 
            fill="none" 
            stroke={strokeColor}
            strokeWidth="8" 
            strokeDasharray="691" 
            strokeDashoffset={691 - (691 * percentage) / 100} 
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s ease' }}
          />
        </svg>
        <div style={{ fontSize: '4rem', fontWeight: 800, fontFamily: 'monospace', color: 'var(--text-main)', zIndex: 1, textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
          {formatTime(minutes)}:<span style={{ color: strokeColor }}>{formatTime(seconds)}</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '15px', marginTop: '30px' }}>
        <button className="btn-icon" onClick={handleSubtract} title="Subtract 10 mins"><Minus size={24} /></button>
        {isActive ? (
          <button className="btn-icon" onClick={handlePause} title="Pause"><Pause size={32} weight="fill" /></button>
        ) : (
          <button className="btn-icon" onClick={handleStart} title="Start"><Play size={32} weight="fill" /></button>
        )}
        <button className="btn-icon" onClick={handleReset} title="Reset"><ArrowCounterClockwise size={32} /></button>
        <button className="btn-icon" onClick={handleAdd} title="Add 10 mins"><Plus size={24} /></button>
      </div>
    </div>
  );
}

export default Timer;
