'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';
import { LogoIcon, AlertIcon, CheckIcon, SunIcon, MoonIcon } from '../../components/Icons';

// Local SVG Icons for the redesigned page
function EnvelopeIcon({ size = 16, ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

// Lock Icon
function LockIcon({ size = 16, ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

// Eye Icon
function EyeIcon({ size = 16, ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

// Eye Off Icon
function EyeOffIcon({ size = 16, ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  );
}

// Arrow Right Icon
function ArrowRightIcon({ size = 15, ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

// Spinner Icon
function SpinnerIcon({ size = 16, ...props }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" {...props}>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" />
    </svg>
  );
}

function LoginContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [theme, setTheme] = useState('light');
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    let themeTimer;
    // Load theme to maintain consistency on mount
    const savedTheme = localStorage.getItem('theme') || 'light';
    themeTimer = setTimeout(() => {
      setTheme(savedTheme);
    }, 0);
    document.documentElement.setAttribute('data-theme', savedTheme);
    return () => {
      if (themeTimer) clearTimeout(themeTimer);
    };
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

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
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
      setErrorMsg(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  const handleGitHubSignIn = async () => {
    setLoading(true);
    setErrorMsg(null);
    setMessage(null);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          scopes: 'read:user repo',
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (err) {
      setErrorMsg(err.message || 'Failed to initiate GitHub authentication.');
      setLoading(false);
    }
  };

  return (
    <div className="login-container flex align-center justify-center">
      {/* Decorative ambient light glows */}
      <div className="bg-glow-1"></div>
      <div className="bg-glow-2"></div>

      {/* Floating Theme Toggle Switcher */}
      <div className="login-nav">
        <button 
          onClick={toggleTheme} 
          className="theme-toggle-btn flex align-center justify-center"
          aria-label="Toggle theme"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
        >
          {theme === 'dark' ? <SunIcon size={18} /> : <MoonIcon size={18} />}
        </button>
      </div>

      <div className="login-card">
        {/* Brand/Header */}
        <div className="login-header flex-col align-center gap-2 text-center">
          <h1 className="login-title">bluntly</h1>
          <p className="login-subtitle font-sans">
            {isSignUp ? 'Create an account to start parsing resumes' : 'Sign in to access your dashboard'}
          </p>
        </div>

        {/* Auth Error/Success Alerts */}
        {errorMsg && (
          <div className="alert alert-danger flex align-center gap-2 font-sans fade-in">
            <AlertIcon size={16} />
            <span>{errorMsg}</span>
          </div>
        )}
        
        {message && (
          <div className="alert alert-success flex align-center gap-2 font-sans fade-in">
            <CheckIcon size={16} />
            <span>{message}</span>
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group flex-col gap-2">
            <label className="form-label font-sans">Email Address</label>
            <div className="input-container">
              <span className="input-icon">
                <EnvelopeIcon size={16} />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="input-text font-sans with-icon"
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group flex-col gap-2">
            <label className="form-label font-sans">Password</label>
            <div className="input-container">
              <span className="input-icon">
                <LockIcon size={16} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-text font-sans with-icon with-action"
                disabled={loading}
              />
              <button
                type="button"
                className="input-action-btn flex align-center justify-center"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                title={showPassword ? "Hide password" : "Show password"}
                disabled={loading}
              >
                {showPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="submit-btn font-sans"
          >
            {loading ? (
              <div className="flex align-center gap-2">
                <SpinnerIcon size={16} className="spin-animation" />
                <span>Processing...</span>
              </div>
            ) : (
              <div className="flex align-center gap-2">
                <span>{isSignUp ? 'Create Free Account' : 'Sign In to Dashboard'}</span>
                <ArrowRightIcon size={15} className="btn-arrow" />
              </div>
            )}
          </button>

          <div className="flex align-center justify-center gap-2 font-sans" style={{ color: 'var(--text-secondary)', fontSize: '11px', margin: '4px 0' }}>
            <div style={{ height: '1px', backgroundColor: 'var(--border)', flex: 1 }}></div>
            <span style={{ opacity: 0.6 }}>OR</span>
            <div style={{ height: '1px', backgroundColor: 'var(--border)', flex: 1 }}></div>
          </div>

          <button
            type="button"
            onClick={handleGitHubSignIn}
            disabled={loading}
            className="github-btn font-sans"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ marginRight: '8px' }}>
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
            </svg>
            <span>Continue with GitHub</span>
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
          position: relative;
          min-height: 100vh;
          width: 100vw;
          background-color: var(--bg);
          transition: background-color var(--transition-speed) ease;
          overflow: hidden;
        }

        .bg-glow-1,
        .bg-glow-2 {
          position: absolute;
          border-radius: 50%;
          filter: blur(150px);
          pointer-events: none;
          z-index: 1;
          opacity: 0.06;
          transition: all 0.8s ease;
        }

        .bg-glow-1 {
          width: 500px;
          height: 500px;
          top: -150px;
          left: -150px;
          background: radial-gradient(circle, var(--primary) 0%, transparent 70%);
          animation: floatGlow1 25s ease-in-out infinite alternate;
        }

        .bg-glow-2 {
          width: 600px;
          height: 600px;
          bottom: -200px;
          right: -150px;
          background: radial-gradient(circle, var(--primary-hover) 0%, transparent 70%);
          animation: floatGlow2 30s ease-in-out infinite alternate;
        }

        [data-theme="dark"] .bg-glow-1,
        [data-theme="dark"] .bg-glow-2 {
          opacity: 0.09;
          filter: blur(180px);
        }

        @keyframes floatGlow1 {
          0% { transform: translate(0, 0) scale(1); }
          100% { transform: translate(60px, 30px) scale(1.1); }
        }

        @keyframes floatGlow2 {
          0% { transform: translate(0, 0) scale(1); }
          100% { transform: translate(-60px, -30px) scale(1.05); }
        }

        .login-nav {
          position: absolute;
          top: 2rem;
          right: 2rem;
          z-index: 20;
        }

        .theme-toggle-btn {
          background-color: var(--surface);
          border: 1px solid var(--border);
          color: var(--text-primary);
          width: 42px;
          height: 42px;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: var(--shadow);
          transition: all var(--transition-speed) ease;
          outline: none;
        }

        .theme-toggle-btn:hover {
          background-color: var(--bg);
          border-color: var(--text-secondary);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
        }

        [data-theme="dark"] .theme-toggle-btn:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        .login-card {
          width: 100%;
          max-width: 400px;
          padding: 3.5rem 2.5rem;
          background-color: var(--surface);
          border: 1px solid var(--border);
          border-radius: 20px;
          box-shadow: 0 20px 40px -15px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.04);
          display: flex;
          flex-direction: column;
          gap: 2rem;
          position: relative;
          z-index: 10;
          transition: background-color var(--transition-speed) ease, border-color var(--transition-speed) ease, box-shadow var(--transition-speed) ease;
          animation: slideUpCard 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes slideUpCard {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .login-card:hover {
          border-color: rgba(15, 118, 110, 0.2);
          box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.08);
        }

        [data-theme="dark"] .login-card {
          box-shadow: 0 30px 60px -15px rgba(0, 0, 0, 0.45);
          background-color: rgba(30, 30, 34, 0.75);
          backdrop-filter: blur(20px);
          border-color: rgba(255, 255, 255, 0.06);
        }

        [data-theme="dark"] .login-card:hover {
          border-color: rgba(20, 184, 166, 0.2);
          box-shadow: 0 30px 60px -15px rgba(0, 0, 0, 0.45);
        }

        .login-logo {
          background: linear-gradient(135deg, var(--primary), var(--primary-hover));
          width: 44px;
          height: 44px;
          border-radius: 12px;
          color: #FFFFFF;
          box-shadow: 0 4px 12px rgba(15, 118, 110, 0.25);
          transition: all var(--transition-speed) ease;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .login-logo:hover {
          transform: scale(1.05);
          box-shadow: 0 4px 10px rgba(15, 118, 110, 0.2);
        }

        [data-theme="dark"] .login-logo {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }

        [data-theme="dark"] .login-logo:hover {
          box-shadow: 0 4px 12px rgba(20, 184, 166, 0.25);
        }

        .login-title {
          font-family: var(--font-primary);
          font-size: 1.85rem;
          font-weight: 800;
          letter-spacing: -0.03em;
          margin: 0;
          background: linear-gradient(135deg, var(--text-primary) 30%, var(--primary) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .login-subtitle {
          font-size: 0.85rem;
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

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-label {
          font-size: 0.7rem;
          font-weight: 600;
          color: var(--text-secondary);
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .input-container {
          position: relative;
          display: flex;
          align-items: center;
          width: 100%;
        }

        .input-icon {
          position: absolute;
          left: 0.95rem;
          color: var(--text-secondary);
          opacity: 0.6;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          transition: color var(--transition-speed) ease, opacity var(--transition-speed) ease;
          z-index: 5;
        }

        .input-text {
          width: 100%;
          padding: 0.8rem 1rem;
          border-radius: 10px;
          border: 1px solid rgba(226, 232, 240, 0.8);
          background-color: var(--bg);
          color: var(--text-primary);
          font-family: var(--font-secondary);
          font-size: 0.9rem;
          outline: none;
          transition: all var(--transition-speed) ease;
        }

        [data-theme="dark"] .input-text {
          border: 1px solid rgba(255, 255, 255, 0.08);
          background-color: rgba(18, 18, 20, 0.6);
        }

        .input-text.with-icon {
          padding-left: 2.5rem;
        }

        .input-text.with-action {
          padding-right: 2.5rem;
        }

        .input-text:hover {
          border-color: rgba(20, 184, 166, 0.2);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.02);
          transform: scale(1.02);
        }

        .input-text:focus {
          border-color: var(--primary);
          background-color: var(--surface);
          box-shadow: 0 0 0 2.5px rgba(20, 184, 166, 0.15);
          transform: scale(1.02);
        }

        .input-container:focus-within .input-icon {
          color: var(--primary);
          opacity: 1;
        }

        [data-theme="light"] .input-text:focus {
          box-shadow: 0 0 0 2.5px rgba(15, 118, 110, 0.12);
        }

        .input-text::placeholder {
          color: var(--text-secondary);
          opacity: 0.4;
        }

        .input-text:-webkit-autofill,
        .input-text:-webkit-autofill:hover,
        .input-text:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 30px var(--bg) inset !important;
          -webkit-text-fill-color: var(--text-primary) !important;
          transition: background-color 5000s ease-in-out 0s;
        }

        .input-text:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0 30px var(--surface) inset !important;
          -webkit-text-fill-color: var(--text-primary) !important;
          transition: background-color 5000s ease-in-out 0s;
        }

        .input-action-btn {
          position: absolute;
          right: 0.65rem;
          background: transparent;
          border: none;
          color: var(--text-secondary);
          opacity: 0.6;
          cursor: pointer;
          padding: 5px;
          border-radius: 6px;
          transition: all var(--transition-speed) ease;
          z-index: 5;
        }

        .input-action-btn:hover {
          color: var(--text-primary);
          opacity: 1;
          background-color: rgba(0, 0, 0, 0.04);
        }

        [data-theme="dark"] .input-action-btn:hover {
          background-color: rgba(255, 255, 255, 0.04);
        }

        .submit-btn {
          width: 100%;
          padding: 0.85rem;
          font-size: 0.9rem;
          font-weight: 600;
          border-radius: 10px;
          background-color: var(--primary);
          color: #FFFFFF !important;
          border: none;
          cursor: pointer;
          transition: all var(--transition-speed) ease;
          box-shadow: 0 4px 12px rgba(15, 118, 110, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .submit-btn:hover:not(:disabled) {
          background-color: var(--primary-hover);
          transform: translateY(-1px);
          box-shadow: 0 6px 16px -4px rgba(15, 118, 110, 0.3);
        }

        [data-theme="dark"] .submit-btn {
          box-shadow: 0 4px 12px rgba(20, 184, 166, 0.2);
        }

        [data-theme="dark"] .submit-btn:hover:not(:disabled) {
          box-shadow: 0 6px 16px -4px rgba(20, 184, 166, 0.35);
        }

        .submit-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .submit-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .github-btn {
          width: 100%;
          padding: 0.85rem;
          font-size: 0.9rem;
          font-weight: 600;
          border-radius: 10px;
          background-color: #24292e;
          color: #FFFFFF !important;
          border: none;
          cursor: pointer;
          transition: all var(--transition-speed) ease;
          box-shadow: 0 4px 12px rgba(36, 41, 46, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .github-btn:hover:not(:disabled) {
          background-color: #2b3137;
          transform: translateY(-1px);
          box-shadow: 0 6px 16px -4px rgba(36, 41, 46, 0.35);
        }

        .github-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .submit-btn:hover:not(:disabled) .btn-arrow {
          transform: translateX(3px);
        }

        .bypass-btn {
          width: 100%;
          padding: 0.85rem;
          font-size: 0.9rem;
          font-weight: 600;
          border-radius: 10px;
          background-color: var(--surface);
          border: 1px solid var(--border);
          color: var(--text-primary);
          cursor: pointer;
          transition: all var(--transition-speed) ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          margin-top: 0.75rem;
        }

        .bypass-btn:hover:not(:disabled) {
          background-color: var(--bg);
          border-color: var(--text-secondary);
          transform: translateY(-1px);
        }

        .bypass-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .bypass-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-arrow {
          transition: transform 0.2s ease;
        }

        .alert {
          border-radius: 10px;
          padding: 0.75rem 0.95rem;
          font-size: 0.8rem;
          font-weight: 500;
          border: 1px solid transparent;
          line-height: 1.4;
        }

        .alert-danger {
          background-color: var(--danger-subtle);
          color: var(--danger);
          border-color: rgba(239, 68, 68, 0.15);
        }

        .alert-success {
          background-color: var(--success-subtle);
          color: var(--success);
          border-color: rgba(16, 185, 129, 0.15);
        }

        .toggle-section {
          font-size: 0.85rem;
          color: var(--text-secondary);
        }

        .toggle-btn {
          position: relative;
          background: transparent;
          border: none;
          color: var(--primary);
          font-weight: 600;
          cursor: pointer;
          font-size: 0.85rem;
          text-decoration: none;
          margin-left: 0.375rem;
          transition: color var(--transition-speed) ease;
          padding-bottom: 2px;
        }

        .toggle-btn::after {
          content: '';
          position: absolute;
          width: 100%;
          transform: scaleX(0);
          height: 2px;
          bottom: 0;
          left: 0;
          background-color: var(--primary-hover);
          transform-origin: bottom right;
          transition: transform 0.25s ease-out;
        }

        .toggle-btn:hover {
          color: var(--primary-hover);
          text-decoration: none;
        }

        .toggle-btn:hover::after {
          transform: scaleX(1);
          transform-origin: bottom left;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .spin-animation {
          animation: spin 1s linear infinite;
        }

        @media (max-width: 480px) {
          .login-card {
            padding: 2.25rem 1.75rem;
            border-radius: 16px;
            max-width: 90%;
            gap: 1.5rem;
          }
          .login-title {
            font-size: 1.6rem;
          }
          .login-nav {
            top: 1.5rem;
            right: 1.5rem;
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
        <div className="login-card flex-col align-center justify-center p-6" style={{ width: '420px', height: '200px' }}>
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
