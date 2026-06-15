import { useStore } from './store/useStore';
import { AuthScreen } from './components/ui/AuthScreen';
import { MainMenu } from './components/ui/MainMenu';
import { World } from './components/game/World';

function App() {
  const { player, gameState } = useStore();

  return (
    <>
      {player && <World />}

      <div className="ui-layer" style={{ pointerEvents: gameState === 'PLAYING' ? 'none' : 'auto' }}>
        {!player ? (
          <AuthScreen />
        ) : gameState === 'MENU' ? (
          <MainMenu />
        ) : null}
      </div>
    </>
  );
}

export default App;
