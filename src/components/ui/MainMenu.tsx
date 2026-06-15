import { useStore } from '../../store/useStore';

export const MainMenu = () => {
  const { setGameState, player, setPlayer } = useStore();

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#000' }}>
      <div className="vhs-overlay"></div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '2rem', zIndex: 11 }}>
        <span style={{ fontSize: '1.5rem', opacity: 0.7 }}>Subject: {player?.nickname}</span>
        <button
          className="fn-btn"
          style={{ fontSize: '1.2rem', padding: '0.5rem 1rem' }}
          onClick={() => setPlayer(null)}
        >
          DISCONNECT
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '3rem', zIndex: 11 }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '6rem', color: 'var(--bk-yellow)', marginBottom: '0' }}>THE BACKROOMS</h1>
          <h3 style={{ fontSize: '2rem', opacity: 0.8, marginTop: '0' }}>Level 0: The Lobby</h3>
        </div>

        <button className="fn-btn" style={{ fontSize: '3rem', padding: '1rem 4rem' }} onClick={() => setGameState('PLAYING')}>
          DESCEND
        </button>

        <p style={{ opacity: 0.5, fontSize: '1.2rem', maxWidth: '600px', textAlign: 'center', marginTop: '2rem' }}>
          Find an exit. Do not look at them. If you hear something, it has already heard you.
        </p>
      </div>
    </div>
  );
};
