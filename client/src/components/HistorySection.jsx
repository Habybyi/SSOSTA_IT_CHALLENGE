import { useCallback, useEffect, useState } from "react";
import { FiClock, FiPlus, FiSave, FiX } from "react-icons/fi";
import { Modal } from "./Modal";
import { PagedList } from "./PagedList";
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

  const Row = ({ item }) =>
    item.kind === "WORK" ? (
      <div className={`${styles.listCard} ${styles.fixedRow}`} title={item.description}>
        <span className={styles.listCardMain}>
          <span className={styles.listCardTitle}>{item.description}</span>
          <span className={styles.listCardMeta}>
            {formatDate(item.date)}
            {item.technician && ` · ${item.technician.name}`}
            {item.durationMin ? ` · ${item.durationMin} min.` : ""}
            {item.materials?.length > 0 &&
              ` · ${item.materials.map((m) => `${m.material.name} ${Number(m.quantity)} ${m.material.unit}`).join(", ")}`}
          </span>
        </span>
        <span className={styles.badgeGreen}>zásah</span>
      </div>
    ) : (
      <div className={`${styles.listCard} ${styles.fixedRow}`}>
        <span className={styles.listCardMain}>
          <span className={styles.listCardTitle}>
            {REQUEST_TYPE_LABELS[item.type]}: {item.title}
          </span>
          <span className={styles.listCardMeta}>
            {formatDate(item.date)} · požiadavka #{item.number}
          </span>
        </span>
        <span className={styles.badge}>{REQUEST_STATUS_LABELS[item.status]}</span>
      </div>
    );

  return (
    <section className={styles.panelFill}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>
          <FiClock /> História zásahov
        </h2>
        <button type="button" className={styles.secondaryButton} onClick={() => setIsAdding(true)}>
          <FiPlus /> Zapísať zásah
        </button>
      </div>
      {error && !isAdding && <div className={styles.errorMessage} style={{ marginBottom: "0.75rem" }}>{error}</div>}

      <PagedList
        items={items}
        getKey={(item) => `${item.kind}-${item.id}`}
        renderItem={(item) => <Row item={item} />}
        empty={<p className={styles.emptyState}>Zatiaľ žiadne zásahy.</p>}
      />

      {isAdding && (
        <Modal title="Zapísať zásah do histórie" onClose={() => setIsAdding(false)}>
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formRow}>
              <TextField name="performedAt" label="Dátum" type="date" {...props} />
              <TextField name="durationMin" label="Trvanie (min.)" inputMode="numeric" {...props} />
            </div>
            <TextAreaField name="description" label="Čo sa robilo" placeholder="napr. zazimovanie, vyfúkanie všetkých zón" {...props} />
            {error && <div className={styles.errorMessage}>{error}</div>}
            <div className={styles.buttonRow} style={{ justifyContent: "flex-end" }}>
              <button type="button" className={styles.secondaryButton} onClick={() => setIsAdding(false)}>
                <FiX /> Zrušiť
              </button>
              <button type="submit" className={styles.primaryButtonInline} disabled={isSaving}>
                <FiSave /> {isSaving ? "UKLADÁM…" : "ULOŽIŤ"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
};
