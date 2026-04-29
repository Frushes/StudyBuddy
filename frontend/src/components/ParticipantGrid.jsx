import React, { useState, useEffect, useRef } from 'react';
import { UserCircle, Circle, VideoCamera, VideoCameraSlash, Microphone } from '@phosphor-icons/react';

// RemoteVideo Component manages individual incoming streams cleanly
function RemoteVideo({ stream, color, username, isMini }) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current && stream) {
      ref.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div style={{ position: 'relative', width: isMini ? '60px' : '300px', height: isMini ? '60px' : '250px', borderRadius: isMini ? '50%' : '12px', overflow: 'hidden', background: '#000', flexShrink: 0 }}>
      {stream ? (
        <video ref={ref} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <div style={{ width: '100%', height: '100%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '1.5rem' }}>
          {username.charAt(0).toUpperCase()}
        </div>
      )}
      <span style={{ position: 'absolute', bottom: '4px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.6)', padding: '2px 6px', borderRadius: '8px', fontSize: '0.65rem', color: 'white', zIndex: 10, whiteSpace: 'nowrap', maxWidth: '70px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {username}
      </span>
    </div>
  );
}

function ParticipantGrid({ users, socket, isMini = false, onMaximize }) {
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);

  const peersRef = useRef({});
  const [remoteStreams, setRemoteStreams] = useState({});

  const stringToColor = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return `hsl(${hash % 360}, 70%, 60%)`;
  };

  useEffect(() => {
    if (!socket) return;

    const createPeer = (targetId) => {
      if (!peersRef.current[targetId]) {
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });

        pc.onicecandidate = event => {
          if (event.candidate) {
            socket.emit('webrtc_ice_candidate', { targetId, candidate: event.candidate });
          }
        };

        pc.ontrack = event => {
          const [stream] = event.streams;
          setRemoteStreams(prev => ({ ...prev, [targetId]: stream }));
        };

        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach(track => {
            pc.addTrack(track, localStreamRef.current);
          });
        }

        peersRef.current[targetId] = pc;
      }
      return peersRef.current[targetId];
    };

    const handleOffer = async ({ fromId, offer }) => {
      const pc = createPeer(fromId);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('webrtc_answer', { targetId: fromId, answer });
    };

    const handleAnswer = async ({ fromId, answer }) => {
      const pc = peersRef.current[fromId];
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    };

    const handleIceCandidate = async ({ fromId, candidate }) => {
      const pc = peersRef.current[fromId];
      if (pc) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(e => console.error("WebRTC ICE Failed:", e));
      }
    };

    const handleUserVideoDisabled = (userId) => {
      setRemoteStreams(prev => {
        const ns = { ...prev };
        delete ns[userId];
        return ns;
      });
    };

    socket.on('webrtc_offer', handleOffer);
    socket.on('webrtc_answer', handleAnswer);
    socket.on('webrtc_ice_candidate', handleIceCandidate);
    socket.on('user_video_enabled', () => {});
    socket.on('user_video_disabled', handleUserVideoDisabled);

    return () => {
      socket.off('webrtc_offer', handleOffer);
      socket.off('webrtc_answer', handleAnswer);
      socket.off('webrtc_ice_candidate', handleIceCandidate);
      socket.off('user_video_disabled', handleUserVideoDisabled);
    };
  }, [socket]);

  useEffect(() => {
    const activeIds = users.map(u => u.id);
    Object.keys(peersRef.current).forEach(id => {
      if (!activeIds.includes(id)) {
        peersRef.current[id].close();
        delete peersRef.current[id];
        setRemoteStreams(prev => {
          const ns = { ...prev };
          delete ns[id];
          return ns;
        });
      }
    });
  }, [users]);

  useEffect(() => {
    if (videoEnabled && localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
  }, [videoEnabled]);

  const toggleMedia = async (type) => {
    const isVideo = type === 'video';
    const currentlyEnabled = isVideo ? videoEnabled : audioEnabled;

    try {
      if (!currentlyEnabled) {
        // Turning ON: Request the specific track needed
        const stream = await navigator.mediaDevices.getUserMedia({
          video: isVideo,
          audio: !isVideo
        });

        const newTrack = stream.getTracks()[0];
        
        if (!localStreamRef.current) {
          localStreamRef.current = new MediaStream();
        }
        
        // Remove any existing dead tracks of the same kind
        localStreamRef.current.getTracks().forEach(t => {
          if (t.kind === newTrack.kind) {
            localStreamRef.current.removeTrack(t);
            t.stop();
          }
        });
        
        localStreamRef.current.addTrack(newTrack);

        if (isVideo) {
          setVideoEnabled(true);
          if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
          if (socket) socket.emit('video_enabled');
        } else {
          setAudioEnabled(true);
        }

        // Update all active peer connections
        for (const targetId in peersRef.current) {
          const pc = peersRef.current[targetId];
          
          // Remove old sender for this kind if it exists
          const senders = pc.getSenders();
          const oldSender = senders.find(s => s.track && s.track.kind === newTrack.kind);
          if (oldSender) pc.removeTrack(oldSender);

          pc.addTrack(newTrack, localStreamRef.current);
          
          // Renegotiate
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('webrtc_offer', { targetId, offer });
        }
      } else {
        // Turning OFF: Stop and remove the specific track
        if (localStreamRef.current) {
          const tracks = localStreamRef.current.getTracks().filter(t => t.kind === (isVideo ? 'video' : 'audio'));
          tracks.forEach(t => {
            t.stop();
            localStreamRef.current.removeTrack(t);
          });
        }

        if (isVideo) {
          setVideoEnabled(false);
          if (socket) socket.emit('video_disabled');
        } else {
          setAudioEnabled(false);
        }

        // Notify peers to remove this track from their view
        for (const targetId in peersRef.current) {
          const pc = peersRef.current[targetId];
          const senders = pc.getSenders();
          const sender = senders.find(s => s.track && s.track.kind === (isVideo ? 'video' : 'audio'));
          if (sender) pc.removeTrack(sender);
          
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('webrtc_offer', { targetId, offer });
        }
      }
    } catch (err) {
      console.error("Media error:", err);
      alert("Could not access device. Please check permissions.");
    }
  };

  const localUser = users.find(u => u.id === socket?.id) || { username: 'You', id: socket?.id || 'local' };
  const others = users.filter(u => u.id !== socket?.id);

  return (
    <div className="glass-panel" style={{ height: isMini ? 'auto' : '100%', minHeight: isMini ? '150px' : '400px', flex: isMini ? 'none' : 1, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h2 style={{ fontSize: '1rem', color: 'var(--text-muted)', margin: 0 }}>In the Room ({users.length})</h2>
          {isMini && (
            <span onClick={onMaximize} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid var(--border-color)', borderRadius: '4px', padding: '2px 6px', color: 'var(--text-main)', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 'bold' }}>MAXIMIZE</span>
          )}
        </div>
        
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => toggleMedia('audio')}
            className="btn-icon"
            style={{
              background: audioEnabled ? 'var(--accent-color)' : 'rgba(255,255,255,0.1)',
              color: 'white', width: '40px', height: '40px', borderRadius: '10px'
            }}
            title={audioEnabled ? "Mute Mic" : "Unmute Mic"}
          >
            <Microphone size={20} weight={audioEnabled ? "fill" : "regular"} />
          </button>
          <button
            onClick={() => toggleMedia('video')}
            className="btn-icon"
            style={{
              background: videoEnabled ? 'var(--accent-color)' : 'rgba(255,255,255,0.1)',
              color: 'white', width: '40px', height: '40px', borderRadius: '10px'
            }}
            title={videoEnabled ? "Stop Video" : "Start Video"}
          >
            {videoEnabled ? <VideoCamera size={20} weight="fill" /> : <VideoCameraSlash size={20} />}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', overflowY: 'auto', paddingRight: '5px' }}>
        {/* Us (The Local User) */}
        {localUser && (
          <div style={{ position: 'relative', width: isMini ? '60px' : '300px', height: isMini ? '60px' : '250px', borderRadius: isMini ? '50%' : '12px', overflow: 'hidden', background: '#000', border: (videoEnabled || audioEnabled) ? '2px solid var(--accent-color)' : '2px solid transparent', flexShrink: 0 }}>
            {videoEnabled ? (
              <video ref={localVideoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', background: stringToColor(localUser.username), display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '1.5rem' }}>
                {localUser.username.charAt(0).toUpperCase()}
              </div>
            )}
            <span style={{ position: 'absolute', bottom: '4px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.6)', padding: '2px 6px', borderRadius: '8px', fontSize: '0.65rem', color: 'white', fontWeight: 'bold', zIndex: 10, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', maxWidth: '70px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {localUser.username} {audioEnabled && <Microphone size={12} weight="fill" color="var(--accent-color)" style={{ marginLeft: '4px' }} />}
            </span>
          </div>
        )}

        {/* Everyone Else (Remote Peers) */}
        {others.map(user => (
          <RemoteVideo key={user.id} username={user.username} color={stringToColor(user.username)} stream={remoteStreams[user.id]} isMini={isMini} />
        ))}
      </div>
    </div>
  );
}

export default ParticipantGrid;
