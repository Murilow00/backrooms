import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import { useStore } from './store/useStore';
import { AuthScreen } from './components/ui/AuthScreen';
import { MainMenu } from './components/ui/MainMenu';
import { World } from './components/game/World';

function App() {
  const { user, setUser, gameState } = useStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [setUser]);

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '2rem', fontFamily: 'VT323', backgroundColor: '#000', color: 'var(--bk-yellow)' }}>LOADING...</div>;
  }

  return (
    <>
      {user && <World />}

      <div className="ui-layer" style={{ pointerEvents: gameState === 'PLAYING' ? 'none' : 'auto' }}>
        {!user ? (
          <AuthScreen />
        ) : gameState === 'MENU' ? (
          <MainMenu />
        ) : null}
      </div>
    </>
  );
}

export default App;
