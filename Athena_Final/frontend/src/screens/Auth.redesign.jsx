// Redesigned Auth layout (spear centerpiece fills the empty left panel).
// Uses USERNAME + password to match the backend (/auth/login, /auth/signup).
// Adopt it by merging the left .auth-brand panel into your existing Auth.jsx, or swap this file in
// and wire onSubmit to your API client. onSubmit({ mode: 'login'|'signup', username, password })
// may be async and should throw Error(message) on failure.
import React, { useState } from 'react';
import AthenaMark from '../components/AthenaMark';
import SpearCenterpiece from '../components/SpearCenterpiece';

export default function Auth({ onSubmit }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try {
      await onSubmit?.({ mode: isSignUp ? 'signup' : 'login', username: username.trim(), password });
    } catch (err) {
      setError(err?.message || 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      <div className="auth-brand">
        <div className="brandline">
          <AthenaMark size={30} />
          <div>
            <div className="wordmark">ATHENA</div>
            <div className="tag">VERDICT ENGINE</div>
          </div>
        </div>

        <div className="auth-cp"><SpearCenterpiece progress={100} interactive ambient /></div>

        <div className="auth-statement">
          <div className="eyebrow">Executive Intelligence</div>
          <h1 className="display">Intelligence, <em>aimed.</em></h1>
          <p className="auth-sub">Every strategic decision with its underlying telemetry, evidence matrix, and risk provenance attached.</p>
        </div>

        <div className="quote">
          <blockquote>
            <p>“Torture the data, and it will confess to anything.”</p>
            <div className="quote-author"><span className="spear-rule">—</span> RONALD COASE</div>
          </blockquote>
        </div>
      </div>

      <div className="auth-form">
        <div className="auth-card">
          <div>
            <div className="eyebrow">{isSignUp ? 'Registration' : 'Access'}</div>
            <h1>{isSignUp ? 'Create account' : 'Sign in'}</h1>
            <p className="sub">Authenticate to enter the Athena command center.</p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="field">
              <label>Username</label>
              <input className="input" placeholder="operative.name" value={username} autoComplete="username"
                     onChange={(e) => setUsername(e.target.value)} required minLength={3} maxLength={32} />
            </div>
            <div className="field">
              <label>Password</label>
              <input type="password" className="input" placeholder="••••••••" value={password}
                     autoComplete={isSignUp ? 'new-password' : 'current-password'}
                     onChange={(e) => setPassword(e.target.value)} required minLength={8} />
              {isSignUp && <div className="hint">At least 8 characters, with a letter and a digit.</div>}
            </div>
            {error && <div className="pill" role="alert">{error}</div>}
            <button type="submit" className="btn" disabled={busy} style={{ marginTop: 10 }}>
              {busy ? 'Please wait…' : isSignUp ? 'Create account' : 'Sign in'}
            </button>
          </form>

          <div className="auth-swap">
            {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
            <button type="button" onClick={() => { setIsSignUp(!isSignUp); setError(''); }}>
              {isSignUp ? 'Sign in' : 'Sign up'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
