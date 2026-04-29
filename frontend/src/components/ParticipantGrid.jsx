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
  const [mediaState, setMediaState] = useState('none');
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
        // We use Google's free public STUN server to help negotiate connections through firewalls
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });

        // 1. ICE Candidates discovery
        pc.onicecandidate = event => {
          if (event.candidate) {
            socket.emit('webrtc_ice_candidate', { targetId, candidate: event.candidate });
          }
        };

        // 2. Stream received from remote peer
        pc.ontrack = event => {
          const [stream] = event.streams;
          setRemoteStreams(prev => ({ ...prev, [targetId]: stream }));
        };

        // 3. Attach our local video to send to them immediately if we have it
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach(track => {
            pc.addTrack(track, localStreamRef.current);
          });
        }

        peersRef.current[targetId] = pc;
      }
      return peersRef.current[targetId];
    };

    // Listeners for Signaling
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

    const handleUserVideoEnabled = async (userId) => {
      // A new person joined video AFTER we connected. If we already have camera, 
      // they likely will send an offer via their startCamera logic, so we do nothing here.
    };

    const handleUserVideoDisabled = (userId) => {
      setRemoteStreams(prev => {
        const ns = { ...prev };
        delete ns[userId];
        return ns;
      });
      // We purposefully DO NOT close the peer connection, allowing them to remain in the room and receive our streams,
      // and allowing them to seamlessly reconnect their video later without InvalidState errors!
    };

    socket.on('webrtc_offer', handleOffer);
    socket.on('webrtc_answer', handleAnswer);
    socket.on('webrtc_ice_candidate', handleIceCandidate);
    socket.on('user_video_enabled', handleUserVideoEnabled);
    socket.on('user_video_disabled', handleUserVideoDisabled);

    return () => {
      socket.off('webrtc_offer', handleOffer);
      socket.off('webrtc_answer', handleAnswer);
      socket.off('webrtc_ice_candidate', handleIceCandidate);
      socket.off('user_video_enabled', handleUserVideoEnabled);
      socket.off('user_video_disabled', handleUserVideoDisabled);
    };
  }, [socket]);

  // Clean up detached peers if users leave room
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

  // Bind local video stream to ref after it correctly renders into the DOM
  useEffect(() => {
    if (mediaState === 'video' && localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
  }, [mediaState]);

  // Handle explicit security opt-in pattern requested by the user
  const startStream = async (withVideo) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: withVideo, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current && withVideo) localVideoRef.current.srcObject = stream;
      setMediaState(withVideo ? 'video' : 'audio');

      if (socket && withVideo) socket.emit('video_enabled');

      // Initiate WebRTC mesh connections to everyone else in the room
      users.forEach(async (user) => {
        if (socket && user.id !== socket.id) {
          const pc = peersRef.current[user.id] || new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });

          pc.onicecandidate = event => {
            if (event.candidate) socket.emit('webrtc_ice_candidate', { targetId: user.id, candidate: event.candidate });
          };

          pc.ontrack = event => {
            const [rs] = event.streams;
            setRemoteStreams(prev => ({ ...prev, [user.id]: rs }));
          };

          stream.getTracks().forEach(track => pc.addTrack(track, stream));
          peersRef.current[user.id] = pc;

          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit('webrtc_offer', { targetId: user.id, offer });
        }
      });
    } catch (err) {
      console.error("Camera access denied or failed", err);
      alert("Failed to access camera/mic. Please check browser permissions.");
    }
  };

  const stopStream = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }

    // Properly detach the tracks from all ongoing WebRTC peer connections
    Object.values(peersRef.current).forEach(pc => {
      pc.getSenders().forEach(sender => {
        if (sender.track) {
          pc.removeTrack(sender);
        }
      });
    });

    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    setMediaState('none');
    if (socket) socket.emit('video_disabled');
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
        {socket ? (
          mediaState === 'none' ? (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => startStream(false)}
                style={{
                  background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '6px',
                  padding: '6px 12px', color: 'white', cursor: 'pointer', display: 'flex',
                  gap: '6px', alignItems: 'center', fontWeight: 'bold'
                }}
              >
                <Microphone size={18} /> Audio
              </button>
              <button
                onClick={() => startStream(true)}
                style={{
                  background: 'var(--accent-color)', border: 'none', borderRadius: '6px',
                  padding: '6px 12px', color: 'white', cursor: 'pointer', display: 'flex',
                  gap: '6px', alignItems: 'center', fontWeight: 'bold'
                }}
              >
                <VideoCamera size={18} /> Video
              </button>
            </div>
          ) : (
            <button
              onClick={stopStream}
              style={{ background: '#ee5253', border: 'none', borderRadius: '6px', padding: '6px 12px', color: 'white', cursor: 'pointer', display: 'flex', gap: '6px', alignItems: 'center', fontWeight: 'bold', fontSize: '0.8rem' }}
            >
              Stop Media
            </button>
          )
        ) : null}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', overflowY: 'auto', paddingRight: '5px' }}>

        {/* Us (The Local User) */}
        {localUser && (
          <div style={{ position: 'relative', width: isMini ? '60px' : '300px', height: isMini ? '60px' : '250px', borderRadius: isMini ? '50%' : '12px', overflow: 'hidden', background: '#000', border: mediaState !== 'none' ? '2px solid var(--accent-color)' : '2px solid transparent', flexShrink: 0 }}>
            {mediaState === 'video' ? (
              <video ref={localVideoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', background: stringToColor(localUser.username), display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '1.5rem' }}>
                {localUser.username.charAt(0).toUpperCase()}
              </div>
            )}
            <span style={{ position: 'absolute', bottom: '4px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.6)', padding: '2px 6px', borderRadius: '8px', fontSize: '0.65rem', color: 'white', fontWeight: 'bold', zIndex: 10, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', maxWidth: '70px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {localUser.username} {mediaState === 'audio' && <Microphone size={12} weight="fill" color="var(--accent-color)" style={{ marginLeft: '4px' }} />}
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
