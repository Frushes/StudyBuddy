import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpenText, ShieldCheck, Student, ChalkboardTeacher } from '@phosphor-icons/react';
import { API_BASE_URL } from '../config';

function Login({ setGlobalUsername, socket }) {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [authError, setAuthError] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    if (!username.trim() || !password || !selectedRole) {
      setAuthError('All fields are required.');
      return;
    }
    
    // We purposefully omit socket.emit('join') here. The App.jsx auto-rejoin listener gracefully handles it when the global username is established!

    const endpoint = isRegister ? '/api/register' : '/api/login';
    try {
      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password, role: selectedRole })
      });
      
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || 'Authentication failed.');
        return;
      }
      
      if (isRegister) {
          setIsRegister(false);
          setAuthError('Registration successful. You can now log in.');
          setPassword('');
      } else {
          setGlobalUsername(username.trim()); // Globally caches user and safely triggers socket.emit('join') over in App.jsx
          if (selectedRole === 'Admin') navigate('/admin');
          else if (selectedRole === 'Learner') navigate('/learner');
      }
    } catch(err) {
      setAuthError('Server connection failed. Is the backend running?');
    }
  };

  return (
    <div className="center" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', padding: '40px' }}>
      <h1 className="title-main" style={{ fontSize: '2.5rem', marginBottom: '10px' }}>
        <BookOpenText size={48} weight="fill" color="var(--accent-color)" /> Study Buddy Platform
      </h1>
      <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', marginBottom: '40px' }}>
        Select your module to enter the workspace.
      </p>

      <div style={{ display: 'flex', gap: '25px', marginBottom: '40px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {/* Learner */}
        <div
          className="glass-panel"
          onClick={() => setSelectedRole('Learner')}
          style={{
            width: '320px', cursor: 'pointer', transition: 'var(--transition)',
            border: selectedRole === 'Learner' ? '2px solid var(--accent-color)' : '1px solid var(--border-color)',
            transform: selectedRole === 'Learner' ? 'translateY(-5px)' : 'none',
            boxShadow: selectedRole === 'Learner' ? 'var(--shadow-glow)' : 'none',
            background: selectedRole === 'Learner' ? 'var(--bg-panel-hover)' : 'var(--bg-panel)'
          }}
        >
          <Student size={40} color="#00d2d3" style={{ marginBottom: '15px' }} />
          <h2 style={{ fontSize: '1.4rem', marginBottom: '10px' }}>Learner</h2>
          <ul style={{ color: 'var(--text-muted)', fontSize: '0.9rem', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <li>Filter buddies by subject, level, language & timezone.</li>
            <li>View peer profiles and study goals.</li>
            <li>Track focus time and sync with study rooms.</li>
          </ul>
        </div>

        {/* Admin */}
        <div
          className="glass-panel"
          onClick={() => setSelectedRole('Admin')}
          style={{
            width: '320px', cursor: 'pointer', transition: 'var(--transition)',
            border: selectedRole === 'Admin' ? '2px solid #ff9f43' : '1px solid var(--border-color)',
            transform: selectedRole === 'Admin' ? 'translateY(-5px)' : 'none',
            boxShadow: selectedRole === 'Admin' ? '0 0 20px rgba(255, 159, 67, 0.3)' : 'none',
            background: selectedRole === 'Admin' ? 'var(--bg-panel-hover)' : 'var(--bg-panel)'
          }}
        >
          <ShieldCheck size={40} color="#ff9f43" style={{ marginBottom: '15px' }} />
          <h2 style={{ fontSize: '1.4rem', marginBottom: '10px' }}>Admin</h2>
          <ul style={{ color: 'var(--text-muted)', fontSize: '0.9rem', paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <li>Monitor registered users and report metrics.</li>
            <li>Moderate public study rooms and verify details.</li>
            <li>Publish educational tips and news.</li>
          </ul>
        </div>
      </div>

      {selectedRole && (
        <form className="glass-panel" onSubmit={handleAuth} style={{ width: '400px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <h3 style={{ textAlign: 'center', marginBottom: '5px' }}>
            {isRegister ? `Create ${selectedRole} Account` : `Sign in as ${selectedRole}`}
          </h3>
          
          {authError && (
             <div style={{ background: authError.includes('successful') ? 'rgba(46, 213, 115, 0.2)' : 'rgba(238, 82, 83, 0.2)', border: authError.includes('successful') ? '1px solid #2ed573' : '1px solid #ee5253', padding: '10px', borderRadius: '8px', color: authError.includes('successful') ? '#2ed573' : '#ff7675', textAlign: 'center', fontSize: '0.9rem' }}>
                {authError}
             </div>
          )}

          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{
              padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color)',
              background: 'rgba(255,255,255,0.05)', color: 'white', outline: 'none',
              fontFamily: 'inherit', fontSize: '1rem', textAlign: 'center'
            }}
            autoFocus
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color)',
              background: 'rgba(255,255,255,0.05)', color: 'white', outline: 'none',
              fontFamily: 'inherit', fontSize: '1rem', textAlign: 'center', letterSpacing: '2px'
            }}
          />
          <button className="btn-primary" type="submit" style={{ padding: '14px', fontSize: '1rem', marginTop: '10px' }}>
            {isRegister ? 'Register Account' : 'Secure Login'}
          </button>
          
          <div style={{ textAlign: 'center', marginTop: '5px' }}>
             <span 
                onClick={() => { setIsRegister(!isRegister); setAuthError(''); }} 
                style={{ color: 'var(--accent-color)', cursor: 'pointer', fontSize: '0.9rem', textDecoration: 'underline' }}
             >
                {isRegister ? 'Already have an account? Sign In' : 'Need an account? Register Now'}
             </span>
          </div>
        </form>
      )}
    </div>
  );
}

export default Login;
