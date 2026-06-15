import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useStore } from '../../store/useStore';

export const AuthScreen = () => {
  const [nick, setNick] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const { setPlayer } = useStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('nickname', nick.trim())
      .eq('password', password)
      .single();

    if (error || !data) {
      alert('Nickname ou senha incorretos.');
    } else {
      setPlayer({ id: data.id, nickname: data.nickname });
    }
    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase
      .from('players')
      .insert({ nickname: nick.trim(), password })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        alert('Esse nickname já existe. Escolha outro.');
      } else {
        alert('Erro ao registrar: ' + error.message);
      }
    } else if (data) {
      alert('Registrado! Entrando...');
      setPlayer({ id: data.id, nickname: data.nickname });
    }
    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', backgroundColor: '#000' }}>
      <div className="vhs-overlay"></div>
      <div className="fn-modal">
        <h1 style={{ textAlign: 'center', fontSize: '4rem' }}>{isLogin ? 'SYSTEM LOGIN' : 'NEW SUBJECT'}</h1>
        <p style={{ textAlign: 'center', opacity: 0.7, marginBottom: '2rem' }}>
          Warning: No clipping out of reality is strictly prohibited.
        </p>
        <form onSubmit={isLogin ? handleLogin : handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
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
            minLength={4}
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
