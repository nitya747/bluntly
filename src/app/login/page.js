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
    // Load theme to maintain consistency on mount
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  useEffect(() => {
    // Check if redirect query param contains error
    const err = searchParams.get('error');
    if (err === 'auth-callback-failed') {
      const timer = setTimeout(() => {
        setErrorMsg('Authentication failed during redirect. Please try again.');
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

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
    <div className="login-container flex align-center justify-center">
      <div className="login-card card">
        {/* Brand/Header */}
        <div className="login-header flex-col align-center gap-3 text-center">
          <div className="login-logo flex align-center justify-center">
            <LogoIcon size={24} style={{ color: '#FFFFFF' }} />
          </div>
          <h1 className="login-title">bluntly</h1>
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
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group flex-col gap-2">
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

          <div className="form-group flex-col gap-2">
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
            className="submit-btn"
          >
            {loading ? 'Processing...' : isSignUp ? 'Create Free Account' : 'Sign In to Dashboard'}
          </button>
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
          background-color: var(--bg);
          transition: background-color var(--transition-speed) ease;
        }

        .login-card {
          width: 100%;
          max-width: 440px;
          padding: 3rem 2.5rem;
          background-color: var(--surface);
          border: 1px solid var(--border);
          border-radius: 24px;
          box-shadow: var(--shadow);
          display: flex;
          flex-direction: column;
          gap: 2rem;
          position: relative;
          z-index: 10;
          transition: background-color var(--transition-speed) ease, border-color var(--transition-speed) ease, box-shadow var(--transition-speed) ease;
        }

        :global([data-theme="dark"]) .login-card {
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.4);
          background-color: rgba(30, 30, 34, 0.85);
          backdrop-filter: blur(16px);
          border-color: rgba(45, 45, 50, 0.6);
        }

        .login-logo {
          background-color: var(--primary);
          width: 52px;
          height: 52px;
          border-radius: 14px;
          color: #FFFFFF;
          box-shadow: 0 4px 12px rgba(15, 118, 110, 0.2);
          transition: all var(--transition-speed) ease;
        }

        .login-logo:hover {
          transform: scale(1.05);
          box-shadow: 0 6px 16px rgba(15, 118, 110, 0.3);
        }

        :global([data-theme="dark"]) .login-logo {
          box-shadow: 0 4px 12px rgba(20, 184, 166, 0.25);
        }

        :global([data-theme="dark"]) .login-logo:hover {
          box-shadow: 0 6px 16px rgba(20, 184, 166, 0.35);
        }

        .login-title {
          font-family: var(--font-primary);
          font-size: 1.75rem;
          font-weight: 800;
          color: var(--text-primary);
          letter-spacing: -0.03em;
          margin: 0;
        }

        .login-subtitle {
          font-size: 0.875rem;
          color: var(--text-secondary);
          line-height: 1.4;
          margin: 0;
        }

        .login-form {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .form-label {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .input-text {
          width: 100%;
          padding: 0.875rem 1rem;
          border-radius: var(--radius-input);
          border: 1px solid var(--border);
          background-color: var(--bg);
          color: var(--text-primary);
          font-family: var(--font-secondary);
          font-size: 0.9rem;
          outline: none;
          transition: all var(--transition-speed) ease;
        }

        .input-text:hover {
          border-color: var(--text-secondary);
        }

        .input-text:focus {
          border-color: var(--primary);
          background-color: var(--surface);
          box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.15);
        }

        :global([data-theme="light"]) .input-text:focus {
          box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.1);
        }

        .input-text::placeholder {
          color: var(--text-secondary);
          opacity: 0.4;
        }

        /* Prevent browser autofill from ruining the theme */
        .input-text:-webkit-autofill,
        .input-text:-webkit-autofill:hover,
        .input-text:-webkit-autofill:focus,
        .input-text:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 30px var(--surface) inset !important;
          -webkit-text-fill-color: var(--text-primary) !important;
          transition: background-color 5000s ease-in-out 0s;
        }

        .submit-btn {
          width: 100%;
          padding: 0.875rem;
          font-size: 0.95rem;
          font-weight: 600;
          border-radius: var(--radius-btn);
          background-color: var(--primary);
          color: #FFFFFF !important;
          border: none;
          cursor: pointer;
          transition: all var(--transition-speed) ease;
          box-shadow: 0 4px 12px rgba(15, 118, 110, 0.2);
        }

        .submit-btn:hover:not(:disabled) {
          background-color: var(--primary-hover);
          transform: translateY(-1px);
          box-shadow: 0 6px 16px rgba(15, 118, 110, 0.3);
        }

        :global([data-theme="dark"]) .submit-btn {
          box-shadow: 0 4px 12px rgba(20, 184, 166, 0.25);
        }

        :global([data-theme="dark"]) .submit-btn:hover:not(:disabled) {
          box-shadow: 0 6px 16px rgba(20, 184, 166, 0.35);
        }

        .submit-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .alert {
          border-radius: 12px;
          padding: 0.875rem 1rem;
          font-size: 0.85rem;
          font-weight: 500;
          border: 1px solid transparent;
        }

        .alert-danger {
          background-color: var(--danger-subtle);
          color: var(--danger);
          border-color: rgba(239, 68, 68, 0.1);
        }

        .alert-success {
          background-color: var(--success-subtle);
          color: var(--success);
          border-color: rgba(16, 185, 129, 0.1);
        }

        .toggle-section {
          font-size: 0.875rem;
          color: var(--text-secondary);
        }

        .toggle-btn {
          background: transparent;
          border: none;
          color: var(--primary);
          font-weight: 600;
          cursor: pointer;
          font-size: 0.875rem;
          text-decoration: none;
          margin-left: 0.375rem;
          transition: color var(--transition-speed) ease;
        }

        .toggle-btn:hover {
          color: var(--primary-hover);
          text-decoration: underline;
        }

        @media (max-width: 480px) {
          .login-card {
            padding: 2.5rem 1.5rem;
            border-radius: 20px;
            max-width: 90%;
            gap: 1.5rem;
          }
          .login-title {
            font-size: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="login-container flex align-center justify-center">
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

