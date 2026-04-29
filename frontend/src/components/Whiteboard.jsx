import React, { useRef, useEffect, useState } from 'react';
import { Eraser } from '@phosphor-icons/react';

const COLORS = ['#000000', '#ee5253', '#2ecc71'];

function Whiteboard({ socket, initialLines = [] }) {
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const isDrawing = useRef(false);
  const [color, setColor] = useState(COLORS[0]);
  const currentPos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    let ctx = canvas.getContext("2d");
    
    const drawLineObj = (data) => {
      const { x0, y0, x1, y1, color } = data;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.strokeStyle = color;
      ctx.stroke();
      ctx.closePath();
    };

    const initCanvas = () => {
      canvas.width = canvas.parentElement.clientWidth || 600;
      canvas.height = canvas.parentElement.clientHeight || 400;
      
      ctx = canvas.getContext("2d");
      ctx.lineCap = "round";
      ctx.lineWidth = 3;
      contextRef.current = ctx;

      // Initialize history from server
      if (initialLines && initialLines.length > 0) {
        initialLines.forEach(drawLineObj);
      }
    };

    // Defer initialization to allow flexbox CSS to settle dimensions
    setTimeout(initCanvas, 50);

    // Subscribe to collaborative draws
    if (socket) {
      socket.on('draw_line', drawLineObj);
      socket.on('whiteboard_cleared', () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      });
    }

    return () => {
      if (socket) {
        socket.off('draw_line', drawLineObj);
        socket.off('whiteboard_cleared');
      }
    };
  }, [socket, initialLines]); 

  const onMouseDown = (e) => {
    const { offsetX, offsetY } = e.nativeEvent;
    currentPos.current = { x: offsetX, y: offsetY };
    isDrawing.current = true;
  };

  const onMouseUp = () => { isDrawing.current = false; };

  const onMouseMove = (e) => {
    if (!isDrawing.current) return;
    const { offsetX, offsetY } = e.nativeEvent;
    
    const data = {
      x0: currentPos.current.x,
      y0: currentPos.current.y,
      x1: offsetX,
      y1: offsetY,
      color
    };
    
    // Draw locally instantly
    const ctx = contextRef.current;
    ctx.beginPath();
    ctx.moveTo(data.x0, data.y0);
    ctx.lineTo(data.x1, data.y1);
    ctx.strokeStyle = data.color;
    ctx.stroke();
    ctx.closePath();

    currentPos.current = { x: offsetX, y: offsetY };
    
    // Broadcast
    if (socket) {
      socket.emit('draw_line', data);
    }
  };

  const handleClear = () => {
    if (socket) socket.emit('clear_whiteboard');
  };

  return (
    <div className="glass-panel" style={{ flex: 1, minHeight: '400px', display: 'flex', flexDirection: 'column', padding: '15px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
        <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Collaborative Whiteboard</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          {COLORS.map(c => (
            <button 
              key={c}
              onClick={() => setColor(c)}
              style={{
                width: '20px', height: '20px', borderRadius: '50%', background: c, 
                border: color === c ? '2px solid white' : 'none', cursor: 'pointer'
              }}
            />
          ))}
          <button onClick={handleClear} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', marginLeft: '5px' }}>
            <Eraser size={20} />
          </button>
        </div>
      </div>
      <div style={{ flex: 1, position: 'relative', background: '#ffffff', borderRadius: '8px', overflow: 'hidden' }}>
        <canvas
          ref={canvasRef}
          onMouseDown={onMouseDown}
          onMouseUp={onMouseUp}
          onMouseOut={onMouseUp}
          onMouseMove={onMouseMove}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', cursor: 'crosshair' }}
        />
      </div>
    </div>
  );
}

export default Whiteboard;
