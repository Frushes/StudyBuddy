import React, { useState, useRef, useEffect } from 'react';
import { SpeakerHigh, SpeakerNone, CloudRain, Campfire, Coffee } from '@phosphor-icons/react';

const SOUNDS = {
  rain: 'https://actions.google.com/sounds/v1/weather/rain_heavy_loud.ogg',
  fire: 'https://actions.google.com/sounds/v1/ambiences/fire.ogg',
  cafe: 'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg'
};

function AmbientControls() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(50);
  const [activeSound, setActiveSound] = useState(null);
  const audioRef = useRef(new Audio());

  useEffect(() => {
    audioRef.current.loop = true;
    return () => audioRef.current.pause(); // Cleanup on unmount
  }, []);

  useEffect(() => {
    // Web Audio volume is 0.0 to 1.0
    audioRef.current.volume = volume / 100;
  }, [volume]);

  useEffect(() => {
    if (activeSound) {
      if (audioRef.current.src !== SOUNDS[activeSound]) {
        audioRef.current.src = SOUNDS[activeSound];
      }
      if (isPlaying) {
        audioRef.current.play().catch(e => console.error("Audio playback failed:", e));
      } else {
        audioRef.current.pause();
      }
    } else {
      audioRef.current.pause();
    }
  }, [activeSound, isPlaying]);

  const toggleSound = (sound) => {
    if (activeSound === sound) {
      setIsPlaying(!isPlaying);
    } else {
      setActiveSound(sound);
      setIsPlaying(true);
    }
  };

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Ambiance</h2>
        {isPlaying ? <SpeakerHigh size={20} color="var(--accent-color)" /> : <SpeakerNone size={20} color="var(--text-muted)" />}
      </div>

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '10px' }}>
        {[
          { id: 'rain', icon: <CloudRain size={24} />, label: 'Rain' },
          { id: 'fire', icon: <Campfire size={24} />, label: 'Fire' },
          { id: 'cafe', icon: <Coffee size={24} />, label: 'Cafe' }
        ].map(item => (
          <button
            key={item.id}
            className="btn-icon"
            onClick={() => toggleSound(item.id)}
            style={{
              background: activeSound === item.id && isPlaying ? 'var(--accent-color)' : 'rgba(255,255,255,0.05)',
              color: activeSound === item.id && isPlaying ? 'white' : 'var(--text-muted)',
              width: '60px', height: '60px',
              borderRadius: '12px',
              display: 'flex', flexDirection: 'column', gap: '4px'
            }}
          >
            {item.icon}
            <span style={{ fontSize: '0.65rem' }}>{item.label}</span>
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
        <SpeakerNone size={16} color="var(--text-muted)" />
        <input
          type="range"
          min="0" max="100"
          value={volume}
          onChange={(e) => setVolume(parseInt(e.target.value, 10) || 0)}
          style={{ flex: 1, accentColor: 'var(--accent-color)', cursor: 'pointer' }}
        />
        <SpeakerHigh size={16} color="var(--text-muted)" />
      </div>
    </div>
  );
}

export default AmbientControls;
