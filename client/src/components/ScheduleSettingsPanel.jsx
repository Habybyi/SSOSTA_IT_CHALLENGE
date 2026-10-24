import { useEffect, useState } from "react";
import { FiSave, FiX } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { REQUEST_TYPE_LABELS, WEEKDAY_LABELS } from "../utils/labels";
import styles from "../styles/neumorphic.module.css";

export const ScheduleSettingsPanel = ({ onClose, onSaved }) => {
  const { token } = useAuth();
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");

  useEffect(() => {
    api.getScheduleSettings(token).then((d) => setForm(d.settings)).catch((err) => setError(err.message));
  }, [token]);

  if (!form) return error ? <div className={styles.errorMessage}>{error}</div> : null;

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const toggleDay = (day) =>
    setForm((f) => ({
      ...f,
      workDays: f.workDays.includes(day) ? f.workDays.filter((d) => d !== day) : [...f.workDays, day].sort(),
    }));

  const handleSave = async () => {
    setError("");
    setErrors({});
    try {
      const data = await api.updateScheduleSettings(token, form);
      onSaved(data.settings);
    } catch (err) {
      setError(err.message);
      setErrors(err.fields || {});
    }
  };

  const numberField = (key, label, extra = {}) => (
    <label className={styles.field}>
      <span className={styles.label}>{label}</span>
      <span className={styles.inputWrapper}>
        <input type="number" className={styles.input} value={form[key]} onChange={set(key)} {...extra} />
      </span>
      {errors[key] && <span className={styles.fieldError}>{errors[key]}</span>}
    </label>
  );

  return (
    <div>
      <div className={styles.formRow}>
        <label className={styles.field}>
          <span className={styles.label}>Začiatok dňa</span>
          <span className={styles.inputWrapper}>
            <input type="time" className={styles.input} value={form.workdayStart} onChange={set("workdayStart")} />
          </span>
        </label>
        <label className={styles.field}>
          <span className={styles.label}>Koniec dňa</span>
          <span className={styles.inputWrapper}>
            <input type="time" className={styles.input} value={form.workdayEnd} onChange={set("workdayEnd")} />
          </span>
          {errors.workdayEnd && <span className={styles.fieldError}>{errors.workdayEnd}</span>}
        </label>
        {numberField("defaultVisitsPerDay", "Výjazdov za deň", { min: 1 })}
        {numberField("travelBufferMin", "Presun medzi záhradami (min.)", { min: 0, step: 5 })}
      </div>

      <p className={styles.label} style={{ margin: "1rem 0 0.4rem" }}>Pracovné dni</p>
      <div className={styles.tabs}>
        {Object.entries(WEEKDAY_LABELS).map(([day, label]) => (
          <button
            key={day}
            type="button"
            className={form.workDays.includes(Number(day)) ? styles.tabActive : styles.tab}
            onClick={() => toggleDay(Number(day))}
          >
            {label}
          </button>
        ))}
      </div>

      <p className={styles.label} style={{ margin: "0.5rem 0 0.4rem" }}>Koľko trvá zásah (minúty)</p>
      <div className={styles.formRow}>
        {Object.entries(REQUEST_TYPE_LABELS).map(([type, label]) => (
          <label key={type} className={styles.field} style={{ flex: "1 1 140px" }}>
            <span className={styles.label}>{label}</span>
            <span className={styles.inputWrapper}>
              <input
                type="number"
                min="15"
                step="15"
                className={styles.input}
                value={form.durations[type]}
                onChange={(e) => setForm((f) => ({ ...f, durations: { ...f.durations, [type]: e.target.value } }))}
              />
            </span>
          </label>
        ))}
      </div>

      {error && <div className={styles.errorMessage} style={{ marginTop: "1rem" }}>{error}</div>}
      <div className={styles.actionRow}>
        <button type="button" className={styles.secondaryButton} onClick={onClose}>
          <FiX /> Zavrieť
        </button>
        <button type="button" className={styles.primaryButtonInline} onClick={handleSave}>
          <FiSave /> ULOŽIŤ
        </button>
      </div>
    </div>
  );
};
