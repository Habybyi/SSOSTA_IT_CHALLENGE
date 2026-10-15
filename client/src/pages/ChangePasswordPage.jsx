import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiLock } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import { BrandHeader } from "../components/BrandHeader";
import { Field } from "../components/Field";
import styles from "../styles/neumorphic.module.css";

export const ChangePasswordPage = () => {
  const navigate = useNavigate();
  const { user, changePassword, logout } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    if (newPassword !== confirmPassword) {
      setFieldErrors({ confirmPassword: "Heslá sa nezhodujú." });
      return;
    }
    setIsSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
      setFieldErrors(err.fields || {});
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <BrandHeader />
        <form onSubmit={handleSubmit} className={styles.form}>
          <p className={styles.subtitle} style={{ margin: 0 }}>
            {user?.mustChangePassword
              ? "Prihlásil si sa dočasným heslom. Nastav si vlastné."
              : "Zmena hesla"}
          </p>

          <Field icon={FiLock} error={fieldErrors.currentPassword}>
            <input
              type="password"
              placeholder="Aktuálne (dočasné) heslo"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={styles.input}
              autoComplete="current-password"
              required
            />
          </Field>

          <Field icon={FiLock} error={fieldErrors.newPassword}>
            <input
              type="password"
              placeholder="Nové heslo (aspoň 8 znakov, písmeno aj číslo)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={styles.input}
              autoComplete="new-password"
              required
            />
          </Field>

          <Field icon={FiLock} error={fieldErrors.confirmPassword}>
            <input
              type="password"
              placeholder="Nové heslo znova"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={styles.input}
              autoComplete="new-password"
              required
            />
          </Field>

          {error && <div className={styles.errorMessage}>{error}</div>}

          <button type="submit" className={styles.primaryButton} disabled={isSubmitting}>
            {isSubmitting ? "UKLADÁM…" : "ULOŽIŤ HESLO"}
          </button>
          <button type="button" className={styles.linkButton} style={{ alignSelf: "center" }} onClick={logout}>
            Odhlásiť sa
          </button>
        </form>
      </div>
    </div>
  );
};
