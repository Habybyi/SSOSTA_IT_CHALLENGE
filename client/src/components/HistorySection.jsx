import { useCallback, useEffect, useState } from "react";
import { FiClock, FiPlus, FiSave, FiX } from "react-icons/fi";
import { Section } from "./Section";
import { TextField, TextAreaField } from "./FormFields";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { REQUEST_STATUS_LABELS, REQUEST_TYPE_LABELS } from "../utils/labels";
import { formatDate } from "../utils/format";
import styles from "../styles/neumorphic.module.css";

const today = () => new Date().toISOString().slice(0, 10);

// História zásahov: vykonaná práca aj požiadavky v jednej časovej osi.
// Ručný záznam slúži hlavne na prepis starej histórie zo zošita.
export const HistorySection = ({ gardenId }) => {
  const { token } = useAuth();
  const [items, setItems] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [form, setForm] = useState({ performedAt: today(), description: "", durationMin: "" });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(() => {
    api
      .getHistory(token, gardenId)
      .then((d) => setItems(d.items))
      .catch((err) => setError(err.message));
  }, [token, gardenId]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setErrors({});
    setIsSaving(true);
    try {
      await api.addWorkLog(token, gardenId, form);
      setForm({ performedAt: today(), description: "", durationMin: "" });
      setIsAdding(false);
      load();
    } catch (err) {
      setError(err.message);
      setErrors(err.fields || {});
    } finally {
      setIsSaving(false);
    }
  };

  const props = { form, setForm, errors };

  return (
    <Section
      title="História zásahov"
      icon={FiClock}
      actions={
        !isAdding && (
          <button type="button" className={styles.secondaryButton} onClick={() => setIsAdding(true)}>
            <FiPlus /> Zapísať zásah
          </button>
        )
      }
    >
      {isAdding && (
        <form onSubmit={handleSubmit} className={styles.formPanel} style={{ marginBottom: "1rem" }}>
          <div className={styles.formRow}>
            <TextField name="performedAt" label="Dátum" type="date" {...props} />
            <TextField name="durationMin" label="Trvanie (min.)" inputMode="numeric" {...props} />
          </div>
          <div style={{ marginTop: "1rem" }}>
            <TextAreaField name="description" label="Čo sa robilo" placeholder="napr. zazimovanie, vyfúkanie všetkých zón" {...props} />
          </div>
          {error && <div className={styles.errorMessage} style={{ marginTop: "0.75rem" }}>{error}</div>}
          <div className={styles.actionRow}>
            <button type="button" className={styles.secondaryButton} onClick={() => setIsAdding(false)}>
              <FiX /> Zrušiť
            </button>
            <button type="submit" className={styles.primaryButtonInline} disabled={isSaving}>
              <FiSave /> {isSaving ? "UKLADÁM…" : "ULOŽIŤ"}
            </button>
          </div>
        </form>
      )}

      {items.length === 0 ? (
        <p className={styles.emptyState}>Zatiaľ žiadne zásahy.</p>
      ) : (
        <div className={styles.timeline}>
          {items.map((item) =>
            item.kind === "WORK" ? (
              <div key={`w-${item.id}`} className={styles.timelineItem}>
                <span className={styles.timelineDate}>
                  {formatDate(item.date)}
                  {item.technician && ` · ${item.technician.name}`}
                  {item.durationMin ? ` · ${item.durationMin} min.` : ""}
                </span>
                <span style={{ whiteSpace: "pre-wrap" }}>{item.description}</span>
                {item.materials?.length > 0 && (
                  <span className={styles.muted}>
                    Materiál: {item.materials.map((m) => `${m.material.name} ${Number(m.quantity)} ${m.material.unit}`).join(", ")}
                  </span>
                )}
              </div>
            ) : (
              <div key={`r-${item.id}`} className={styles.timelineItem}>
                <span className={styles.timelineDate}>{formatDate(item.date)} · požiadavka #{item.number}</span>
                <span>
                  {REQUEST_TYPE_LABELS[item.type]}: {item.title}{" "}
                  <span className={styles.badge}>{REQUEST_STATUS_LABELS[item.status]}</span>
                </span>
              </div>
            )
          )}
        </div>
      )}
    </Section>
  );
};
