import { useCallback, useEffect, useState } from "react";
import { FiSend, FiUsers, FiSave } from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { REQUEST_TYPE_LABELS } from "../utils/labels";
import { formatDateTime } from "../utils/format";
import styles from "../styles/neumorphic.module.css";

const MONTHS = ["január", "február", "marec", "apríl", "máj", "jún", "júl", "august", "september", "október", "november", "december"];

export const RemindersPanel = () => {
  const { token, user } = useAuth();
  const isOwner = user.role === "OWNER";
  const [campaigns, setCampaigns] = useState([]);
  const [settings, setSettings] = useState(null);
  const [recipients, setRecipients] = useState({});
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(() => {
    Promise.all([api.getSeasonalCampaigns(token), api.getReminderSettings(token)])
      .then(([c, s]) => {
        setCampaigns(c.campaigns);
        setSettings(s.settings);
      })
      .catch((err) => setError(err.message));
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const showRecipients = async (type) => {
    if (recipients[type]) {
      setRecipients((r) => ({ ...r, [type]: null }));
      return;
    }
    const data = await api.getSeasonalRecipients(token, type);
    setRecipients((r) => ({ ...r, [type]: data.recipients }));
  };

  const runCampaign = async (c) => {
    if (!window.confirm(`Poslať pripomienku „${REQUEST_TYPE_LABELS[c.type]}“ ${c.recipients} zákazníkom?`)) return;
    setError("");
    try {
      const data = await api.runSeasonalCampaign(token, c.type);
      setMessage(`Odoslaných do fronty: ${data.queued}.`);
      setRecipients((r) => ({ ...r, [c.type]: null }));
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const runTomorrow = async () => {
    setError("");
    try {
      const data = await api.runTomorrowReminders(token);
      setMessage(`Pripomienky na zajtra: zákazníci ${data.customers}, technici ${data.technicians} (už odoslané sa neopakujú).`);
    } catch (err) {
      setError(err.message);
    }
  };

  const updateSeason = (type, key, value) =>
    setSettings((s) => ({ ...s, seasonal: { ...s.seasonal, [type]: { ...s.seasonal[type], [key]: value } } }));

  const saveSettings = async () => {
    setError("");
    try {
      const data = await api.updateReminderSettings(token, settings);
      setSettings(data.settings);
      setMessage("Nastavenia pripomienok uložené.");
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  if (!settings) return null;

  return (
    <div>
      <div className={styles.list}>
        {campaigns.map((c) => (
          <div key={c.type} className={styles.zoneCard}>
            <div className={styles.sectionHeader} style={{ marginBottom: 0 }}>
              <strong>{REQUEST_TYPE_LABELS[c.type]}</strong>
              <span className={c.enabled ? styles.badgeGreen : styles.badge}>
                {c.enabled ? `automaticky ${c.day}. ${MONTHS[c.month - 1]}` : "automaticky vypnuté"}
              </span>
            </div>
            <span className={styles.muted}>
              {c.lastRun ? `Tento rok odoslané ${formatDateTime(c.lastRun.at)} (${c.lastRun.count} zákazníkov). ` : "Tento rok ešte neodoslané. "}
              Teraz by dostalo: <strong>{c.recipients}</strong> (aktívni so záhradou a e-mailom, bez zásahu v tejto sezóne).
            </span>
            {recipients[c.type] && (
              <span className={styles.muted}>{recipients[c.type].map((r) => `${r.firstName} ${r.lastName}`).join(", ") || "nikto"}</span>
            )}
            <div className={styles.buttonRow}>
              <button type="button" className={styles.secondaryButton} onClick={() => showRecipients(c.type)}>
                <FiUsers /> {recipients[c.type] ? "Skryť" : "Komu"}
              </button>
              {isOwner && (
                <button type="button" className={styles.primaryButtonInline} onClick={() => runCampaign(c)} disabled={!c.recipients}>
                  <FiSend /> POSLAŤ TERAZ
                </button>
              )}
            </div>
            {isOwner && (
              <div className={styles.formRow} style={{ alignItems: "flex-end" }}>
                <label className={styles.checkboxLabel}>
                  <input type="checkbox" checked={settings.seasonal[c.type].enabled} onChange={(e) => updateSeason(c.type, "enabled", e.target.checked)} />
                  posielať automaticky
                </label>
                <label className={styles.field} style={{ flex: "0 1 90px" }}>
                  <span className={styles.label}>Deň</span>
                  <span className={styles.inputWrapper}>
                    <input type="number" min="1" max="28" className={styles.input} value={settings.seasonal[c.type].day} onChange={(e) => updateSeason(c.type, "day", e.target.value)} />
                  </span>
                </label>
                <label className={styles.field} style={{ flex: "0 1 160px" }}>
                  <span className={styles.label}>Mesiac</span>
                  <span className={styles.inputWrapper}>
                    <select className={styles.select} value={settings.seasonal[c.type].month} onChange={(e) => updateSeason(c.type, "month", Number(e.target.value))}>
                      {MONTHS.map((m, i) => (
                        <option key={m} value={i + 1}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </span>
                </label>
              </div>
            )}
          </div>
        ))}

        <div className={styles.zoneCard}>
          <strong>Deň pred termínom</strong>
          <span className={styles.muted}>
            Zákazník dostane pripomienku a technik zoznam zajtrajších výjazdov, automaticky od {settings.dayBeforeHour}:00.
          </span>
          {isOwner && (
            <div className={styles.formRow} style={{ alignItems: "flex-end" }}>
              <label className={styles.field} style={{ flex: "0 1 140px" }}>
                <span className={styles.label}>Posielať od (hod.)</span>
                <span className={styles.inputWrapper}>
                  <input
                    type="number"
                    min="6"
                    max="22"
                    className={styles.input}
                    value={settings.dayBeforeHour}
                    onChange={(e) => setSettings((s) => ({ ...s, dayBeforeHour: e.target.value }))}
                  />
                </span>
              </label>
              <button type="button" className={styles.secondaryButton} onClick={runTomorrow}>
                <FiSend /> Poslať na zajtra teraz
              </button>
            </div>
          )}
        </div>
      </div>

      {message && <div className={styles.calloutBox} style={{ marginTop: "1rem" }}>{message}</div>}
      {error && <div className={styles.errorMessage} style={{ marginTop: "1rem" }}>{error}</div>}
      {isOwner && (
        <div className={styles.actionRow}>
          <button type="button" className={styles.primaryButtonInline} onClick={saveSettings}>
            <FiSave /> ULOŽIŤ NASTAVENIA
          </button>
        </div>
      )}
    </div>
  );
};
