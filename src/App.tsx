import { useStore } from './store/useStore';
import { AuthScreen } from './components/ui/AuthScreen';
import { MainMenu } from './components/ui/MainMenu';
import { World } from './components/game/World';

function App() {
    const { player, gameState } = useStore();

    return (
        <>
            {player && <World />}

            {/* Debug label */}
            <div
                style={{
                    position: 'fixed',
                    top: 8,
                    left: 8,
                    zIndex: 99999,
                    background: 'rgba(0,0,0,0.6)',
                    padding: '6px 10px',
                    borderRadius: 6,
                    color: '#fff',
                    fontFamily: 'VT323',
                }}>
                {player ? `Player: ${player.nickname} — State: ${gameState}` : 'Not connected'}
            </div>

            <div
                className="ui-layer"
                style={{ pointerEvents: gameState === 'PLAYING' ? 'none' : 'auto' }}>
                {!player ? <AuthScreen /> : gameState === 'MENU' ? <MainMenu /> : null}
            </div>
        </>
    );
}

export default App;
