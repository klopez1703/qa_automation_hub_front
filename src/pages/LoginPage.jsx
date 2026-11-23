import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/Auth.css';
import logoFicohsa from "../../public/logoFicohsa.png";
import logoFicohsaBlanco from "../../public/logoFicohsa-blanco.png";

export default function LoginPage() {
  const { auth, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const params = new URLSearchParams(location.search);
  const isExpired = params.get('expired') === '1' || params.get('expired') === 'true';
  const isInactiveRedirect = params.get('inactive') === '1';

  const remembered = localStorage.getItem('qa-hub-remember-email') || '';
  const [email, setEmail] = useState(remembered);
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(Boolean(remembered));
  const [showPassword, setShowPassword] = useState(false);
  const [infoNotice, setInfoNotice] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const savedAuth = localStorage.getItem('qa-hub-auth');

  useEffect(() => {
    if (auth?.token || savedAuth) {
      navigate('/', { replace: true });
    }
  }, [auth, savedAuth, navigate]);

  if (auth?.token || savedAuth) {
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setInfoNotice('');

    if (location.search) {
      navigate('/login', { replace: true });
    }

    try {
      await login(email, password);
      if (rememberMe) {
        localStorage.setItem('qa-hub-remember-email', email.trim());
      } else {
        localStorage.removeItem('qa-hub-remember-email');
      }
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message || 'No se pudo iniciar sesión.');
    } finally {
      setLoading(false);
    }
  }

  const getAlertConfig = () => {
    const lowerError = error.toLowerCase();
    const isAccountInactive =
      isInactiveRedirect || lowerError.includes('desactivada') || lowerError.includes('inactiva');

    if (isAccountInactive) {
      return {
        variant: 'warning',
        title: 'Cuenta desactivada',
        message: error || 'Tu usuario se encuentra inactivo en el sistema. Contacta al administrador para habilitar tu acceso.',
      };
    }
    if (error) {
      return {
        variant: 'error',
        title: 'No se pudo iniciar sesión',
        message: error,
      };
    }
    if (isExpired) {
      return {
        variant: 'info',
        title: 'Sesión expirada por inactividad',
        message: 'Por seguridad tu sesión se cerró automáticamente. Ingresa tus credenciales nuevamente.',
      };
    }
    if (infoNotice) {
      return {
        variant: 'neutral',
        title: 'Información de acceso',
        message: infoNotice,
        dismissible: true,
      };
    }
    return null;
  };

  const alert = getAlertConfig();

  return (
    <div className="auth-wrapper">
      <form className="auth-card" onSubmit={handleSubmit}>
        <div className="auth-logo-wrap">
          <img
            src={logoFicohsa}
            alt="Banco Ficohsa"
            className="auth-logo auth-logo--light"
          />
          <img
            src={logoFicohsaBlanco}
            alt="Banco Ficohsa"
            className="auth-logo auth-logo--dark"
          />
        </div>

        <div className="auth-header">
          <h1 className="auth-title">
            Portal de Automatización
            <br />
            Banco Ficohsa
          </h1>
          <p className="auth-subtitle">
            Inicia sesión para ejecutar y dar seguimiento a tus escenarios.
          </p>
        </div>

        {alert && (
          <div className={`auth-alert auth-alert--${alert.variant}`}>
            <div className="auth-alert-icon">
              <AlertIcon variant={alert.variant} />
            </div>
            <div className="auth-alert-body">
              <div className="auth-alert-title">{alert.title}</div>
              <div>{alert.message}</div>
            </div>
            {alert.dismissible && (
              <button type="button" className="auth-alert-close" onClick={() => setInfoNotice('')}>
                ✕
              </button>
            )}
          </div>
        )}

        <div className="auth-field">
          <label htmlFor="email" className="auth-label">Correo corporativo</label>
          <div className="auth-input-group">
            <span className="auth-input-icon"><MailIcon /></span>
            <input
              id="email"
              className="auth-input"
              type="email"
              placeholder="nombre.apellido@ficohsa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </div>

        <div className="auth-field">
          <label htmlFor="password" className="auth-label">Contraseña</label>
          <div className="auth-input-group">
            <span className="auth-input-icon"><LockIcon /></span>
            <input
              id="password"
              className="auth-input"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="auth-eye-btn"
              onClick={() => setShowPassword((prev) => !prev)}
              title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
            >
              <EyeIcon visible={showPassword} />
            </button>
          </div>
        </div>

        <div className="auth-options">
          <label className="auth-checkbox-label">
            <input
              type="checkbox"
              className="auth-checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            Recordarme
          </label>

          <button
            type="button"
            className="auth-link-btn"
            onClick={() => {
              setError('');
              setInfoNotice('Solicita al Administrador de QA el envío de una contraseña temporal desde el módulo de Usuarios.');
            }}
          >
            ¿Olvidaste tu contraseña?
          </button>
        </div>

        <button className="auth-btn-primary" type="submit" disabled={loading}>
          {loading ? 'Ingresando…' : 'Ingresar'}
        </button>

        <div className="auth-divider">
          <div className="auth-divider-line" />
          <span className="auth-divider-text">O CONTINÚA CON</span>
          <div className="auth-divider-line" />
        </div>

        <button
          type="button"
          className="auth-btn-secondary"
          onClick={() => {
            setError('');
            setInfoNotice('El inicio de sesión único (SSO) se habilitará tras integrar el proveedor de identidad corporativo.');
          }}
        >
          <SsoCardIcon />
          Cuenta corporativa (SSO)
        </button>
      </form>

      <div className="auth-footer">
        <ShieldIcon />
        <span>Banco Ficohsa · Ambiente de Automatización QA</span>
      </div>
    </div>
  );
}

/* ---------- Íconos SVG desacoplados ---------- */

function AlertIcon({ variant }) {
  if (variant === 'warning') {
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
      </svg>
    );
  }
  if (variant === 'info') {
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    );
  }
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

const MailIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);

const LockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const EyeIcon = ({ visible }) =>
  visible ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );

const SsoCardIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <line x1="2" y1="10" x2="22" y2="10" />
  </svg>
);

const ShieldIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);