import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MagnifyingGlass, Users, Clock, Hash, SignOut } from '@phosphor-icons/react';
import { API_BASE_URL } from '../config';

function LearnerDashboard({ username, setGlobalUsername }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [publicRooms, setPublicRooms] = useState([]);

  const [roomId, setRoomId] = useState('');

  const handleLogout = () => {
    sessionStorage.removeItem('sb_user');
    setGlobalUsername('');
    navigate('/');
  };
  
  React.useEffect(() => {
    const fetchPublicRooms = () => {
      fetch(`${API_BASE_URL}/api/rooms`)
        .then(res => res.json())
        .then(data => setPublicRooms(data))
        .catch(err => console.error(err));
    };
    
    fetchPublicRooms();
    const interval = setInterval(fetchPublicRooms, 3000); // 3-second explicit polling to dynamically sync online presence for learners
    return () => clearInterval(interval);
  }, []);

  const handleJoin = (targetId) => {
    const idToJoin = typeof targetId === 'string' ? targetId : roomId;
    if (idToJoin.trim()) {
      navigate(`/room/${idToJoin.trim()}`);
    }
  };
  
  const filteredRooms = publicRooms.filter(r => r.name.toLowerCase().includes(search.toLowerCase()) || (r.subject && r.subject.toLowerCase().includes(search.toLowerCase())));

  return (
    <div style={{ padding: '40px', minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: '30px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div>
            <h1 style={{ fontSize: '2rem', marginBottom: '8px' }}>Welcome back, {username}!</h1>
            <p style={{ color: 'var(--text-muted)' }}>Join an explicitly created room or launch a private session.</p>
          </div>
          <button 
            onClick={handleLogout} 
            className="btn-primary" 
            style={{ background: '#ee5253', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px' }}
          >
            <SignOut size={20} /> Logout
          </button>
        </div>
        
        {/* Search Bar */}
        <div style={{ position: 'relative', width: '350px' }}>
          <MagnifyingGlass size={20} color="var(--text-muted)" style={{ position: 'absolute', left: '15px', top: '12px' }} />
          <input 
            type="text" 
            placeholder="Search specific classroom or subject..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '12px 12px 12px 45px', borderRadius: '30px', border: '1px solid var(--border-color)',
              background: 'var(--bg-panel)', color: 'white', outline: 'none', fontSize: '0.95rem'
            }}
          />
        </div>
      </header>
      
      <div>
        <h2 style={{ fontSize: '1.4rem', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>Admin Official Rooms</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '25px' }}>
          {filteredRooms.map(room => (
            <div 
              key={room.id}
              className="glass-panel" 
              style={{ cursor: 'pointer', transition: 'var(--transition)' }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
              onClick={() => handleJoin(room.id)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                <h3 style={{ fontSize: '1.2rem', margin: 0 }}>{room.name}</h3>
                <span style={{ 
                  background: 'var(--accent-color)', fontSize: '0.75rem', padding: '4px 10px', 
                  borderRadius: '12px', fontWeight: 'bold', textTransform: 'uppercase'
                }}>
                  Official
                </span>
              </div>
              
              <div style={{ display: 'flex', gap: '15px', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><Hash size={16} /> {room.subject || 'General'}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: room.activeUserCount > 0 ? '#2ecc71' : 'inherit' }}>
                  <Users size={16} /> {room.activeUserCount || 0} Online
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><Clock size={16} color="var(--accent-color)" /> Open</span>
              </div>

              <button className="btn-primary" style={{ width: '100%' }}>Join Room</button>
            </div>
          ))}
          {filteredRooms.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No official rooms found matching your search. Ask an Admin to create one!</p>}
        </div>
      </div>

      <div className="glass-panel" style={{ maxWidth: '500px', alignSelf: 'center', marginTop: '20px', textAlign: 'center', width: '100%' }}>
        <h2 style={{ fontSize: '1.4rem', marginBottom: '20px' }}>Join a Study Session</h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input 
            type="text" 
            placeholder="Enter Room Code (e.g. core-cs)"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            style={{
              flex: 1, padding: '14px', borderRadius: '8px', border: '1px solid var(--border-color)',
              background: 'rgba(255,255,255,0.05)', color: 'white', outline: 'none', fontSize: '1rem',
              textAlign: 'center'
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
          />
          <button onClick={handleJoin} className="btn-primary" style={{ padding: '0 25px' }}>Enter Room</button>
        </div>
      </div>
    </div>
  );
}

export default LearnerDashboard;
