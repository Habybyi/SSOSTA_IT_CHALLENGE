import { useCallback, useEffect, useState } from "react";
import { FiUserPlus, FiKey, FiUserX, FiUserCheck, FiCopy } from "react-icons/fi";
import { AppShell } from "../components/AppShell";
import { Field } from "../components/Field";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { ROLE_LABELS } from "../utils/labels";
import styles from "../styles/neumorphic.module.css";

const EMPTY_FORM = { name: "", email: "", phone: "", role: "TECHNICIAN" };

// Správa tímu (len majiteľ): pridanie brigádnika, deaktivácia, nové dočasné heslo.
export const TeamPage = () => {
  const { token, user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [credentials, setCredentials] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.listUsers(token, { pageSize: 100 });
      setUsers(data.items);
    } catch (err) {
      setError(err.message);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const updateForm = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    setIsSubmitting(true);
    try {
      const data = await api.createUser(token, form);
      setCredentials({ name: data.user.name, email: data.user.email, password: data.tempPassword });
      setForm(EMPTY_FORM);
      load();
    } catch (err) {
      setError(err.message);
      setFieldErrors(err.fields || {});
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (u) => {
    const action = u.isActive ? "deaktivovať" : "znova aktivovať";
    if (!window.confirm(`Naozaj chceš ${action} účet ${u.name}?`)) return;
    try {
      await api.updateUser(token, u.id, { isActive: !u.isActive });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleReset = async (u) => {
    if (!window.confirm(`Vygenerovať nové dočasné heslo pre ${u.name}?`)) return;
    try {
      const data = await api.resetPassword(token, u.id);
      setCredentials({ name: u.name, email: u.email, password: data.tempPassword });
    } catch (err) {
      setError(err.message);
    }
  };

  const copyCredentials = () => {
    navigator.clipboard?.writeText(`E-mail: ${credentials.email}\nDočasné heslo: ${credentials.password}`);
  };

  return (
    <AppShell>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Tím</h1>
      </div>

      <form onSubmit={handleCreate} className={styles.formPanel}>
        <h2 className={styles.formPanelTitle}>Pridať člena tímu</h2>
        <div className={styles.formRow}>
          <Field label="Meno a priezvisko" error={fieldErrors.name}>
            <input className={styles.input} value={form.name} onChange={updateForm("name")} required />
          </Field>
          <Field label="E-mail (prihlasovacie meno)" error={fieldErrors.email}>
            <input type="email" className={styles.input} value={form.email} onChange={updateForm("email")} required />
          </Field>
          <Field label="Telefón" error={fieldErrors.phone}>
            <input type="tel" className={styles.input} value={form.phone} onChange={updateForm("phone")} />
          </Field>
          <Field label="Rola" error={fieldErrors.role}>
            <select className={styles.select} value={form.role} onChange={updateForm("role")}>
              <option value="TECHNICIAN">Technik / brigádnik</option>
              <option value="OWNER">Majiteľ</option>
            </select>
          </Field>
        </div>
        <div style={{ marginTop: "1.25rem", display: "flex", justifyContent: "flex-end" }}>
          <button type="submit" className={styles.primaryButtonInline} disabled={isSubmitting}>
            <FiUserPlus /> {isSubmitting ? "PRIDÁVAM…" : "PRIDAŤ"}
          </button>
        </div>
      </form>

      {credentials && (
        <div className={styles.calloutBox} style={{ marginBottom: "1.5rem" }}>
          <strong>Prihlasovacie údaje pre {credentials.name}</strong>
          <br />
          E-mail: {credentials.email}
          <br />
          Dočasné heslo: <code style={{ fontSize: "1.05rem" }}>{credentials.password}</code>
          <br />
          <span className={styles.muted}>
            Heslo sa zobrazí len teraz. Pri prvom prihlásení si ho technik zmení.
          </span>
          <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.75rem", flexWrap: "wrap" }}>
            <button type="button" className={styles.secondaryButton} onClick={copyCredentials}>
              <FiCopy /> Kopírovať
            </button>
            <button type="button" className={styles.secondaryButton} onClick={() => setCredentials(null)}>
              Hotovo
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className={styles.errorMessage} style={{ marginBottom: "1rem" }}>
          {error}
        </div>
      )}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Meno</th>
              <th>E-mail</th>
              <th>Rola</th>
              <th>Stav</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} style={u.isActive ? undefined : { opacity: 0.55 }}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>
                  <span className={u.role === "OWNER" ? styles.badgeBrand : styles.badgeGreen}>
                    {ROLE_LABELS[u.role]}
                  </span>
                </td>
                <td>
                  {!u.isActive ? "Neaktívny" : u.mustChangePassword ? "Čaká na prvé prihlásenie" : "Aktívny"}
                </td>
                <td>
                  {u.id !== me.id && (
                    <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                      <button type="button" className={styles.secondaryButton} onClick={() => handleReset(u)} title="Nové dočasné heslo">
                        <FiKey />
                      </button>
                      <button
                        type="button"
                        className={styles.secondaryButton}
                        onClick={() => handleToggleActive(u)}
                        title={u.isActive ? "Deaktivovať" : "Aktivovať"}
                      >
                        {u.isActive ? <FiUserX /> : <FiUserCheck />}
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
};
