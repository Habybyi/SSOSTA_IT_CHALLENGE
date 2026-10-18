import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { FiMail, FiLock } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import { BrandHeader } from "../components/BrandHeader";
import { Field } from "../components/Field";
import styles from "../styles/neumorphic.module.css";

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, login } = useAuth();
  const from = location.state?.from && location.state.from !== "/login" ? location.state.from : "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (user) return <Navigate to={from} replace />;

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const loggedIn = await login(email, password);
      navigate(loggedIn.mustChangePassword ? "/change-password" : from, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <BrandHeader />
        <form onSubmit={handleLogin} className={styles.form}>
          <Field icon={FiMail}>
            <input
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles.input}
              autoComplete="username"
              required
            />
          </Field>

          <Field icon={FiLock}>
            <input
              type="password"
              placeholder="Heslo"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={styles.input}
              autoComplete="current-password"
              required
            />
          </Field>

          {error && <div className={styles.errorMessage}>{error}</div>}

          <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>
            {isSubmitting ? "PRIHLASUJEM…" : "PRIHLÁSIŤ SA"}
          </button>
        </form>
      </div>
    </div>
  );
};
