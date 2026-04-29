import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChartLineUp, Users, CalendarPlus, PaperPlaneRight, VideoCamera, SignOut } from '@phosphor-icons/react';
import { API_BASE_URL } from '../config';

function AdminDashboard({ username, setGlobalUsername }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    sessionStorage.removeItem('sb_user');
    setGlobalUsername('');
    navigate('/');
  };

  // Create Room State
  const [newRoomId, setNewRoomId] = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomSubject, setNewRoomSubject] = useState('');
  const [creationStatus, setCreationStatus] = useState('');
  
  // Rooms State
  const [rooms, setRooms] = useState([]);

  // Invite State
  const [inviteRoomId, setInviteRoomId] = useState('');
  const [inviteStatus, setInviteStatus] = useState('');

  const fetchRooms = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/rooms`);
      if (res.ok) {
        const data = await res.json();
        setRooms(data);
      }
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(fetchRooms, 3000); // Establish explicit 3-second polling to ensure dashboard counts dynamically live update
    return () => clearInterval(interval);
  }, []);

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/api/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: newRoomId.trim(), name: newRoomName.trim(), subject: newRoomSubject.trim(), host: username })
      });
      if (res.ok) {
        setCreationStatus(`Success: Room ${newRoomId} initialized.`);
        setNewRoomId(''); setNewRoomName(''); setNewRoomSubject('');
        fetchRooms(); // Refresh the dynamic table explicitly upon creation
        setTimeout(() => setCreationStatus(''), 3000);
      } else {
        setCreationStatus('Error: Failed to create room.');
      }
    } catch (e) {
      setCreationStatus('Network error occurred.');
    }
  };

  const handleCopyInvite = () => {
    if (!inviteRoomId.trim()) return;
    // We will generate the HashRouter compatible URL
    const url = `${window.location.protocol}//${window.location.host}/#/room/${inviteRoomId.trim()}`;
    navigator.clipboard.writeText(`Join my focus room on StudyBuddy! ${url}`);
    setInviteStatus('Link copied to clipboard!');
    setTimeout(() => setInviteStatus(''), 3000);
  };

  return (
    <div style={{ padding: 'clamp(15px, 5vw, 40px)', minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: '30px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 2rem)', marginBottom: '8px' }}>Admin Portal</h1>
          <p style={{ color: 'var(--text-muted)' }}>Logged in as {username} (Supervisor)</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button 
            onClick={handleLogout} 
            className="btn-primary" 
            style={{ background: '#ee5253', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <SignOut size={20} /> Logout
          </button>
          <button className="btn-primary" style={{ background: '#ff9f43' }}>
            <ChartLineUp size={20} /> Generate Report
          </button>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))', gap: '30px' }}>
        {/* Left Column Area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          {/* Active Rooms */}
          <div className="glass-panel" style={{ borderTop: '4px solid #ff9f43', overflowX: 'auto' }}>
            <h2 style={{ fontSize: '1.3rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <VideoCamera size={24} color="#ff9f43" /> Active Study Rooms
            </h2>
            <div style={{ minWidth: '500px' }}>
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)' }}>
                    <th style={{ paddingBottom: '10px' }}>Room Name</th>
                    <th style={{ paddingBottom: '10px' }}>Host</th>
                    <th style={{ paddingBottom: '10px' }}>Members</th>
                    <th style={{ paddingBottom: '10px' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rooms.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No active rooms currently broadcasting.
                      </td>
                    </tr>
                  ) : (
                    rooms.map(room => (
                      <tr key={room.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '15px 0' }}>
                          <div style={{ fontWeight: 'bold' }}>{room.name} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({room.id})</span></div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--accent-color)' }}>{room.subject || 'General'}</div>
                        </td>
                        <td>{room.host}</td>
                        <td style={{ color: 'var(--text-muted)', fontWeight: 'bold' }}>{room.activeUserCount || 0}</td>
                        <td>
                          <button onClick={() => navigate(`/room/${room.id}`)} className="btn-primary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>Moderate</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Create New Room */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h2 style={{ fontSize: '1.3rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CalendarPlus size={24} color="var(--accent-color)" /> Create Native Study Room
            </h2>
            <form onSubmit={handleCreateRoom} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                <input required type="text" placeholder="Room ID" value={newRoomId} onChange={e => setNewRoomId(e.target.value)} style={{ flex: 1, minWidth: '200px', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.3)', color: 'white' }} />
                <input required type="text" placeholder="Display Name" value={newRoomName} onChange={e => setNewRoomName(e.target.value)} style={{ flex: 1, minWidth: '200px', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.3)', color: 'white' }} />
              </div>
              <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
                <input required type="text" placeholder="Subject Target" value={newRoomSubject} onChange={e => setNewRoomSubject(e.target.value)} style={{ flex: 1, minWidth: '200px', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.3)', color: 'white' }} />
                <button type="submit" className="btn-primary" style={{ width: '100%', maxWidth: '200px' }}>Initialize Room</button>
              </div>
              {creationStatus && <p style={{ color: '#2ecc71', fontSize: '0.9rem', margin: 0 }}>{creationStatus}</p>}
            </form>
          </div>
        </div>

        {/* Right Column Area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
          {/* Online Members */}
          <div className="glass-panel">
            <h2 style={{ fontSize: '1.2rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Users size={24} color="var(--accent-color)" /> Online Members
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[...new Set(rooms.flatMap(r => r.activeUsersList || []))].length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No active members.</div>
              ) : (
                [...new Set(rooms.flatMap(r => r.activeUsersList || []))].map(username => (
                  <div key={username} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.05)', padding: '10px 15px', borderRadius: '8px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#2ecc71', boxShadow: '0 0 5px #2ecc71' }}></div>
                    <span style={{ fontWeight: 'bold', color: 'white' }}>{username}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Configure Invitation */}
          <div className="glass-panel">
            <h2 style={{ fontSize: '1.2rem', marginBottom: '15px' }}>Room Invitation</h2>
            <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
              <input type="text" value={inviteRoomId} onChange={e => setInviteRoomId(e.target.value)} placeholder="Target Room ID" style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'rgba(0,0,0,0.3)', color: 'white', outline: 'none' }} />
              <button className="btn-primary" onClick={handleCopyInvite} style={{ padding: '12px', width: '100%' }}><PaperPlaneRight size={20} /> Copy Link</button>
            </div>
            {inviteStatus && <p style={{ color: '#2ecc71', fontSize: '0.85rem', marginTop: '10px', textAlign: 'center' }}>{inviteStatus}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
