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
  const localStream = useRef(new MediaStream());

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

        // Attach whatever tracks we currently have
        localStream.current.getTracks().forEach(track => {
          pc.addTrack(track, localStream.current);
        });

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
        await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
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
    socket.on('user_video_disabled', handleUserVideoDisabled);

    return () => {
      socket.off('webrtc_offer', handleOffer);
      socket.off('webrtc_answer', handleAnswer);
      socket.off('webrtc_ice_candidate', handleIceCandidate);
      socket.off('user_video_disabled', handleUserVideoDisabled);
    };
  }, [socket]);

  useEffect(() => {
    if (!socket) return;

    // 1. Monitor users list and initiate connections to new people
    users.forEach(user => {
      if (user.id !== socket.id && !peersRef.current[user.id]) {
        const pc = createPeer(user.id);
        
        // The "Newcomer" or the one with the higher ID initiates to prevent double-offers
        if (socket.id > user.id) {
          (async () => {
             try {
               const offer = await pc.createOffer();
               await pc.setLocalDescription(offer);
               socket.emit('webrtc_offer', { targetId: user.id, offer });
             } catch (err) { console.error("Initial offer failed", err); }
          })();
        }
      }
    });

    // 2. Clean up detached peers if users leave room
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
  }, [users, socket]);

  // Keep local video preview updated
  useEffect(() => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream.current;
    }
  }, [videoEnabled, audioEnabled]);

  const renegotiate = async () => {
    for (const targetId in peersRef.current) {
      const pc = peersRef.current[targetId];
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('webrtc_offer', { targetId, offer });
      } catch (err) {
        console.error("Renegotiation failed", err);
      }
    }
  };

  const toggleMedia = async (type) => {
    const isVideo = type === 'video';
    const currentlyEnabled = isVideo ? videoEnabled : audioEnabled;

    try {
      if (!currentlyEnabled) {
        // TURN ON
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: isVideo,
          audio: !isVideo
        });
        const newTrack = newStream.getTracks()[0];
        
        localStream.current.addTrack(newTrack);
        
        if (isVideo) {
          setVideoEnabled(true);
          socket.emit('video_enabled');
        } else {
          setAudioEnabled(true);
        }

        // Add to all peer connections
        for (const targetId in peersRef.current) {
          peersRef.current[targetId].addTrack(newTrack, localStream.current);
        }
        await renegotiate();

      } else {
        // TURN OFF
        const tracks = localStream.current.getTracks().filter(t => t.kind === (isVideo ? 'video' : 'audio'));
        tracks.forEach(t => {
          t.stop();
          localStream.current.removeTrack(t);
        });

        if (isVideo) {
          setVideoEnabled(false);
          socket.emit('video_disabled');
        } else {
          setAudioEnabled(false);
        }

        // Remove from all peer connections
        for (const targetId in peersRef.current) {
          const pc = peersRef.current[targetId];
          const sender = pc.getSenders().find(s => s.track && s.track.kind === (isVideo ? 'video' : 'audio'));
          if (sender) pc.removeTrack(sender);
        }
        await renegotiate();
      }
    } catch (err) {
      console.error("Media Toggle Error:", err);
      alert("Could not access device. Check browser permissions.");
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
