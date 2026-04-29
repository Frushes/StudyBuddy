import React, { useState } from 'react';
import { Plus, CheckCircle, Circle, Trash } from '@phosphor-icons/react';

function TaskList({ tasks, socket }) {
  const [newTask, setNewTask] = useState('');

  const handleAddTask = (e) => {
    e.preventDefault();
    if (newTask.trim() && socket) {
      socket.emit('task_action', { 
        type: 'ADD', 
        task: { id: Date.now(), text: newTask.trim(), completed: false } 
      });
      setNewTask('');
    }
  };

  const toggleTask = (id) => {
    if (socket) {
      socket.emit('task_action', { type: 'TOGGLE', id });
    }
  };

  const removeTask = (id, e) => {
    e.stopPropagation();
    if (socket) socket.emit('task_action', { type: 'REMOVE', id });
  };

  const clearCompleted = () => {
    if (socket) socket.emit('task_action', { type: 'CLEAR_COMPLETED' });
  };

  const completedCount = tasks.filter(t => t.completed).length;

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Study Goals</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--accent-color)' }}>{completedCount}/{tasks.length} Done</span>
          {completedCount > 0 && (
            <button onClick={clearCompleted} style={{ background: 'transparent', border: 'none', color: '#ff7675', cursor: 'pointer', fontSize: '0.8rem', textDecoration: 'underline' }}>Clear</button>
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', maxHeight: '200px', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '5px' }}>
        {tasks.map(task => (
          <div key={task.id} style={{ 
            display: 'flex', alignItems: 'center', gap: '10px', 
            cursor: 'pointer', transition: 'all 0.4s ease',
            opacity: task.completed ? 0.4 : 1,
            transform: task.completed ? 'translateX(5px)' : 'none',
            background: 'rgba(255,255,255,0.03)',
            padding: '8px', borderRadius: '8px'
          }} onClick={() => toggleTask(task.id)}>
            {task.completed ? (
              <CheckCircle size={20} weight="fill" color="var(--accent-color)" style={{ flexShrink: 0 }} />
            ) : (
              <Circle size={20} color="var(--text-muted)" style={{ flexShrink: 0 }} />
            )}
            <span style={{ flex: 1, textDecoration: task.completed ? 'line-through' : 'none', color: task.completed ? 'var(--text-muted)' : 'var(--text-main)', transition: 'var(--transition)' }}>
              {task.text}
            </span>
            <button className="btn-icon" style={{ padding: '4px', color: '#ff7675', opacity: 0.7 }} onClick={(e) => removeTask(task.id, e)}>
              <Trash size={16} />
            </button>
          </div>
        ))}
        {tasks.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', marginTop: '10px' }}>No goals set yet.</p>}
      </div>

      <form onSubmit={handleAddTask} style={{ display: 'flex', gap: '10px' }}>
        <input 
          type="text" 
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          placeholder="New goal..." 
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: '8px',
            border: 'none',
            background: 'rgba(255,255,255,0.05)',
            color: 'white',
            outline: 'none',
            fontFamily: 'inherit'
          }}
        />
        <button type="submit" className="btn-icon" style={{ background: 'var(--bg-panel-hover)', borderRadius: '8px' }}>
          <Plus size={18} />
        </button>
      </form>
    </div>
  );
}

export default TaskList;
