import React, { useState } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithCredential
} from 'firebase/auth';
import { auth } from '../../services/firebase';
import { useNavigate } from 'react-router-dom';
import { Wallet } from 'lucide-react';
import { useGoogleAuth } from '../../hooks/useGoogleAuth';
import './Auth.css';

export const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleGoogleSuccess = async (response: any) => {
    if (response.credential) {
      try {
        setLoading(true);
        const credential = GoogleAuthProvider.credential(response.credential);
        await signInWithCredential(auth, credential);
        navigate('/');
      } catch (err: any) {
        console.error("Firebase Google Auth Error:", err);
        setError(err.message || 'Failed to authenticate with Google');
      } finally {
        setLoading(false);
      }
    }
  };

  const { isScriptLoaded, renderGoogleButton } = useGoogleAuth({
    clientId: '47962228877-5phpa0pq4dcnrrn1d3pni632ntpj9vn4.apps.googleusercontent.com',
    onSuccess: handleGoogleSuccess,
    onError: () => setError('Google Sign-In failed to load. Please try again.')
  });

  // Render the GIS button into our div once the script is loaded
  React.useEffect(() => {
    if (isScriptLoaded) {
      renderGoogleButton('google-signIn-button');
    }
  }, [isScriptLoaded, renderGoogleButton]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <Wallet size={36} color="var(--accent-primary)" />
          </div>
          <h2>{isLogin ? 'Welcome back' : 'Create an account'}</h2>
          <p className="auth-subtitle">
            {isLogin ? 'Sign in to access your expenses' : 'Sign up to start tracking expenses'}
          </p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
            {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Sign Up')}
          </button>
        </form>

        <div className="auth-divider">
          <span>OR</span>
        </div>

        <div className="google-auth-container">
          <div id="google-signIn-button"></div>
          {/* Note: This div acts as a mount point for Google's GIS iframe rendering */}
        </div>

        <div className="auth-footer">
          {isLogin ? (
            <p>Don't have an account? <button className="text-link" onClick={() => setIsLogin(false)}>Sign up</button></p>
          ) : (
            <p>Already have an account? <button className="text-link" onClick={() => setIsLogin(true)}>Sign in</button></p>
          )}
        </div>
      </div>
    </div>
  );
};
