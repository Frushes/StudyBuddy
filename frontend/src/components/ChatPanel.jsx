import React, { useState, useRef, useEffect } from 'react';
import { PaperPlaneRight } from '@phosphor-icons/react';

function ChatPanel({ messages, socket, username }) {
  const [text, setText] = useState('');
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (text.trim()) {
      socket.emit('send_message', { sender: username, text: text.trim() });
      setText('');
    }
  };

  return (
    <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '15px' }}>
      <h2 className="title-main" style={{ fontSize: '1.2rem', marginBottom: 0 }}>Room Chat</h2>
      
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '5px' }}>
        {messages.map(msg => (
          <div key={msg.id} style={{ 
            alignSelf: msg.type === 'system' ? 'center' : (msg.sender === username ? 'flex-end' : 'flex-start'),
            background: msg.type === 'system' ? 'transparent' : (msg.sender === username ? 'var(--accent-color)' : 'rgba(255,255,255,0.1)'),
            color: msg.type === 'system' ? 'var(--text-muted)' : 'var(--text-main)',
            padding: msg.type === 'system' ? '5px 10px' : '10px 14px',
            borderRadius: msg.type === 'system' ? '4px' : (msg.sender === username ? '14px 14px 0 14px' : '14px 14px 14px 0'),
            fontSize: msg.type === 'system' ? '0.85rem' : '0.95rem',
            maxWidth: '85%',
            fontStyle: msg.type === 'system' ? 'italic' : 'normal'
          }}>
            {msg.type !== 'system' && msg.sender !== username && (
              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginBottom: '4px' }}>{msg.sender}</div>
            )}
            <div>{msg.text}</div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '10px' }}>
        <input 
          type="text" 
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Send a message..." 
          style={{
            flex: 1,
            padding: '10px 14px',
            borderRadius: '20px',
            border: '1px solid var(--border-color)',
            background: 'rgba(0,0,0,0.3)',
            color: 'white',
            outline: 'none',
            fontFamily: 'inherit'
          }}
        />
        <button type="submit" className="btn-icon" style={{ background: 'var(--accent-color)', color: 'white' }}>
          <PaperPlaneRight weight="fill" />
        </button>
      </form>
    </div>
  );
}

export default ChatPanel;
