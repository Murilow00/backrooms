import { useState } from 'react';
import { supabase } from '../../lib/supabase';

export const AuthScreen = () => {
  const [nick, setNick] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Fake email generation behind the scenes so Supabase accepts it
    const fakeEmail = `${nick.toLowerCase().trim().replace(/[^a-z0-9]/g, '')}@backrooms.com`;
    
    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email: fakeEmail, password });
      if (error) alert("Erro ao conectar. Verifique se a senha está correta ou se a verificação de email foi desativada no Supabase.");
    } else {
      const { error } = await supabase.auth.signUp({ email: fakeEmail, password });
      if (error) alert(error.message);
      else alert('Subject registered. You may now enter.');
    }
    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', backgroundColor: '#000' }}>
      <div className="vhs-overlay"></div>
      <div className="fn-modal">
        <h1 style={{ textAlign: 'center', fontSize: '4rem' }}>{isLogin ? 'SYSTEM LOGIN' : 'NEW SUBJECT'}</h1>
        <p style={{ textAlign: 'center', opacity: 0.7, marginBottom: '2rem' }}>Warning: No clipping out of reality is strictly prohibited.</p>
        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <input 
            className="fn-input"
            type="text" 
            placeholder="SUBJECT NICKNAME" 
            value={nick} 
            onChange={(e) => setNick(e.target.value)} 
            required 
            minLength={3}
            maxLength={15}
          />
          <input 
            className="fn-input"
            type="password" 
            placeholder="PIN (PASSWORD)" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
          />
          <button className="fn-btn" type="submit" disabled={loading}>
            {loading ? 'CONNECTING...' : (isLogin ? 'ENTER THE BACKROOMS' : 'REGISTER')}
          </button>
        </form>
        <button 
          style={{ background: 'transparent', border: 'none', color: 'var(--bk-yellow)', cursor: 'pointer', fontFamily: 'VT323', fontSize: '1.2rem', marginTop: '1rem', textDecoration: 'underline' }} 
          onClick={() => setIsLogin(!isLogin)}
        >
          {isLogin ? "No access code? Register here." : "Already registered? Login here."}
        </button>
      </div>
    </div>
  );
};
