import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpenText, DownloadSimple } from '@phosphor-icons/react';

function Landing() {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.4)), url("/bw_abstract.png")',
      backgroundSize: '115% 115%',
      animation: 'bgPan 60s ease-in-out infinite alternate'
    }}>
      <style>
        {`
          @keyframes bgPan {
            0% { background-position: 0% 0%; }
            100% { background-position: 100% 100%; }
          }
        `}
      </style>
      {/* Top Nav */}
      <nav style={{ padding: '20px 50px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.2rem', fontWeight: 'bold' }}>
          <BookOpenText size={28} weight="fill" color="var(--accent-color)" /> StudyBuddy
        </div>
        <div style={{ display: 'flex', gap: '30px', fontWeight: '500' }}>
          <span style={{ cursor: 'pointer' }}>Discover</span>
          <span style={{ cursor: 'pointer' }}>Safety</span>
          <span style={{ cursor: 'pointer' }}>Support</span>
          <span style={{ cursor: 'pointer' }}>Blog</span>
        </div>
        <button
          onClick={() => navigate('/login')}
          style={{
            padding: '10px 20px', borderRadius: '20px', border: 'none', background: 'white', color: 'black',
            fontWeight: '600', cursor: 'pointer', transition: 'var(--transition)'
          }}>
          Log In
        </button>
      </nav>

      {/* Hero Section */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '50px 10%' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '30px' }}>
          <h1 style={{ fontSize: '5rem', lineHeight: '1.1', fontWeight: '800', fontFamily: "'Arial Black', Impact, sans-serif", textTransform: 'uppercase', textShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
            Group Study<br />That's All Fun & Focus
          </h1>
          <p style={{ fontSize: '1.3rem', lineHeight: '1.6', color: 'var(--text-main)', maxWidth: '700px', fontWeight: '500', textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
            StudyBuddy is great for crushing goals with friends, or even building a worldwide collaborative community. Customize your own space to chat, study, and hang out.
          </p>
          <div style={{ display: 'flex', gap: '20px', marginTop: '10px' }}>
            <button className="btn-primary" onClick={() => navigate('/login')} style={{ padding: '16px 50px', borderRadius: '30px', fontSize: '1.3rem', background: 'var(--accent-color)', boxShadow: '0 10px 30px rgba(108, 92, 231, 0.4)' }}>
              Enter StudyBuddy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Landing;
