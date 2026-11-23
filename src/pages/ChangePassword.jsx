import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import '../styles/Auth.css';

export default function ChangePasswordPage() {
  const { auth, logout } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const savedAuth = JSON.parse(localStorage.getItem('qa-hub-auth') || 'null');
  const currentAuth = auth?.token ? auth : savedAuth;

  if (!currentAuth?.token) {
    return <Navigate to="/login" replace />;
  }

  if (!currentAuth?.user?.mustChangePassword) {
    return <Navigate to="/" replace />;
  }

  const securityRules = [
    { valid: newPassword.length >= 8, label: 'Mínimo 8 caracteres' },
    { valid: /[A-Z]/.test(newPassword), label: 'Al menos una letra mayúscula' },
    { valid: /\d/.test(newPassword), label: 'Al menos un número' },
    { valid: newPassword.length > 0 && newPassword === confirmPassword, label: 'Las contraseñas coinciden' },
  ];

  const passedRulesCount = securityRules.filter((rule) => rule.valid).length;
  const isFormValid = passedRulesCount === securityRules.length;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!isFormValid) {
      setError('Completa todos los requisitos de seguridad antes de continuar.');
      return;
    }

    setLoading(true);
    try {
      const data = await api.post('/auth/change-password', { newPassword }, currentAuth.token);

      localStorage.setItem(
        'qa-hub-auth',
        JSON.stringify({
          token: data.token,
          user: data.user,
        })
      );

      window.location.replace('/');
    } catch (err) {
      setError(err.message || 'No se pudo actualizar la contraseña.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrapper">
      <form className="auth-card" onSubmit={handleSubmit}>
        <div className="auth-logo-wrap">
          <img src="/logoFicohsa.png" alt="Banco Ficohsa" className="auth-logo" />
        </div>

        <div className="auth-header">
          <h1 className="auth-title">
            Portal de Automatización
            <br />
            Banco Ficohsa
          </h1>
          <p className="auth-subtitle">Actualización obligatoria de contraseña</p>
        </div>

        <div className="auth-alert auth-alert--info">
          <div className="auth-alert-icon">
            <LockIcon />
          </div>
          <div className="auth-alert-body">
            Hola <strong>{currentAuth.user?.name}</strong>, ingresaste con una contraseña temporal. Define una contraseña personal para continuar.
          </div>
        </div>

        {error && (
          <div className="auth-alert auth-alert--error">
            <div className="auth-alert-icon">
              <ErrorIcon />
            </div>
            <div className="auth-alert-body">
              <div className="auth-alert-title">No se pudo actualizar</div>
              <div>{error}</div>
            </div>
          </div>
        )}

        <div className="auth-field">
          <label htmlFor="newPassword" className="auth-label">Nueva contraseña</label>
          <div className="auth-input-group">
            <span className="auth-input-icon"><LockIcon /></span>
            <input
              id="newPassword"
              className="auth-input"
              type={showNewPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Ingresa tu nueva contraseña"
              required
            />
            <button
              type="button"
              className="auth-eye-btn"
              onClick={() => setShowNewPassword((prev) => !prev)}
              title={showNewPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
            >
              <EyeIcon visible={showNewPassword} />
            </button>
          </div>
        </div>

        <div className="auth-field">
          <label htmlFor="confirmPassword" className="auth-label">Confirmar nueva contraseña</label>
          <div className="auth-input-group">
            <span className="auth-input-icon"><ShieldIcon size={16} /></span>
            <input
              id="confirmPassword"
              className="auth-input"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repite tu nueva contraseña"
              required
            />
            <button
              type="button"
              className="auth-eye-btn"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              title={showConfirmPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
            >
              <EyeIcon visible={showConfirmPassword} />
            </button>
          </div>
        </div>

        <div className="auth-checklist">
          <div className="auth-progress">
            {[1, 2, 3, 4].map((step) => {
              const stepClass =
                passedRulesCount >= step
                  ? isFormValid
                    ? 'is-complete'
                    : 'is-active'
                  : '';
              return <div key={step} className={`auth-progress-step ${stepClass}`} />;
            })}
          </div>

          {securityRules.map((rule) => (
            <div key={rule.label} className={`auth-rule ${rule.valid ? 'is-valid' : ''}`}>
              <span className="auth-rule-badge">{rule.valid && <CheckIcon />}</span>
              <span>{rule.label}</span>
            </div>
          ))}
        </div>

        <button className="auth-btn-primary" type="submit" disabled={loading || !isFormValid}>
          {loading ? 'Guardando…' : 'Guardar contraseña y continuar'}
        </button>

        {typeof logout === 'function' && (
          <>
            <div className="auth-divider">
              <div className="auth-divider-line" />
              <span className="auth-divider-text">O SALIR DE LA SESIÓN</span>
              <div className="auth-divider-line" />
            </div>

            <button type="button" className="auth-btn-secondary" onClick={logout}>
              <LogoutIcon />
              Cerrar sesión
            </button>
          </>
        )}
      </form>

      <div className="auth-footer">
        <ShieldIcon size={14} />
        <span>Banco Ficohsa · Ambiente de Automatización QA</span>
      </div>
    </div>
  );
}

/* ---------- Íconos SVG desacoplados ---------- */

const LockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const ErrorIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
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

const CheckIcon = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const ShieldIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const LogoutIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);