'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';
import { LogoIcon, AlertIcon, CheckIcon } from '../../components/Icons';

function LoginContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    // Check if redirect query param contains error
    const err = searchParams.get('error');
    if (err === 'auth-callback-failed') {
      setErrorMsg('Authentication failed during redirect. Please try again.');
    }
  }, [searchParams]);

  const handleBypass = () => {
    document.cookie = "blunlty_bypass=true; path=/; max-age=86400";
    router.push('/');
    router.refresh();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setMessage(null);

    try {
      if (isSignUp) {
        // Sign Up Flow
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (error) throw error;
        
        if (data?.user?.identities?.length === 0) {
          setErrorMsg('An account with this email already exists.');
        } else {
          setMessage('Success! Check your email to verify your registration.');
          setEmail('');
          setPassword('');
        }
      } else {
        // Sign In Flow
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        // Redirect to dashboard page
        router.push('/');
        router.refresh();
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container polka-dot-bg flex align-center justify-center">
      <div className="login-card card flex-col gap-6">
        {/* Brand/Header */}
        <div className="login-header flex-col align-center gap-2 text-center">
          <div className="login-logo flex align-center justify-center" style={{ color: '#FFFFFF' }}>
            <LogoIcon size={24} />
          </div>
          <h1 className="heading-primary font-sans">blunlty</h1>
          <p className="login-subtitle font-sans">
            {isSignUp ? 'Create an account to start parsing resumes' : 'Sign in to access your dashboard'}
          </p>
        </div>

        {/* Auth Error/Success Alerts */}
        {errorMsg && (
          <div className="alert alert-danger flex align-center gap-2 font-sans">
            <AlertIcon size={16} />
            <span>{errorMsg}</span>
          </div>
        )}
        
        {message && (
          <div className="alert alert-success flex align-center gap-2 font-sans">
            <CheckIcon size={16} />
            <span>{message}</span>
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="login-form flex-col gap-4">
          <div className="form-group flex-col gap-1">
            <label className="form-label font-sans">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="input-text font-sans"
              disabled={loading}
            />
          </div>

          <div className="form-group flex-col gap-1">
            <label className="form-label font-sans">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="input-text font-sans"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="button-primary submit-btn font-sans"
          >
            {loading ? 'Processing...' : isSignUp ? 'Create Free Account' : 'Sign In to Dashboard'}
          </button>

          {!isSignUp && (
            <button
              type="button"
              onClick={handleBypass}
              disabled={loading}
              className="button-secondary bypass-btn font-sans flex align-center justify-center gap-2"
              style={{ width: '100%', marginTop: '0.75rem', padding: '0.8rem', fontSize: '0.95rem' }}
            >
              <LogoIcon size={16} /> Developer Bypass (Skip Auth)
            </button>
          )}
        </form>

        {/* Sign In/Up Toggle */}
        <div className="toggle-section text-center font-sans">
          <span>{isSignUp ? 'Already have an account?' : "Don't have an account?"} </span>
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setErrorMsg(null);
              setMessage(null);
            }}
            className="toggle-btn"
            disabled={loading}
          >
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </div>
      </div>

      <style jsx>{`
        .login-container {
          min-height: 100vh;
          width: 100vw;
          background-color: var(--bg-primary);
        }

        .login-card {
          width: 100%;
          max-width: 420px;
          padding: 2.5rem 2rem;
          box-shadow: var(--shadow-drop);
          border-color: var(--border-color);
        }

        .login-logo {
          background: linear-gradient(135deg, var(--primary), var(--secondary));
          width: 48px;
          height: 48px;
          border-radius: 12px;
          font-size: 1.5rem;
        }

        .login-subtitle {
          font-size: 0.85rem;
          color: var(--text-secondary);
        }

        .login-form {
          width: 100%;
        }

        .form-label {
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--text-secondary);
        }

        .submit-btn {
          width: 100%;
          padding: 0.8rem;
          font-size: 0.95rem;
          margin-top: 0.5rem;
        }

        .alert {
          border-radius: 8px;
          padding: 0.75rem;
          font-size: 0.8rem;
          font-weight: 600;
          border: 1px solid transparent;
        }

        .alert-danger {
          background-color: var(--danger-bg);
          color: var(--danger);
          border-color: rgba(239, 68, 68, 0.15);
        }

        .alert-success {
          background-color: var(--success-bg);
          color: var(--success);
          border-color: rgba(16, 185, 129, 0.15);
        }

        .toggle-section {
          font-size: 0.85rem;
          color: var(--text-secondary);
        }

        .toggle-btn {
          background: transparent;
          border: none;
          color: var(--primary);
          font-weight: 700;
          cursor: pointer;
          font-size: 0.85rem;
          text-decoration: underline;
        }

        .toggle-btn:hover {
          color: var(--secondary);
        }
      `}</style>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="login-container polka-dot-bg flex align-center justify-center">
        <div className="login-card card flex-col align-center justify-center p-6" style={{ width: '420px', height: '200px' }}>
          <span className="font-sans text-secondary" style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>
            Loading authentication screen...
          </span>
        </div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
