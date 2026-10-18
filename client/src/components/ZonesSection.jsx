import { useState } from "react";
import { FiPlus, FiEdit2, FiTrash2, FiDroplet, FiSave, FiX } from "react-icons/fi";
import { Modal } from "./Modal";
import { PagedList } from "./PagedList";
import { TextField, TextAreaField, SelectField } from "./FormFields";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { IRRIGATION_LABELS, ZONE_AREA_LABELS, toOptions } from "../utils/labels";
import { toFormValues } from "../utils/format";
import styles from "../styles/neumorphic.module.css";

const EMPTY_ZONE = {
  number: "",
  name: "",
  areaType: "LAWN",
  irrigationType: "SPRINKLER",
  areaM2: "",
  sprinklerType: "",
  sprinklerBrand: "",
  sprinklerCount: "",
  valveType: "",
  valveLocation: "",
  notes: "",
};

const ZoneForm = ({ initial, onSave, onCancel }) => {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const props = { form, setForm, errors };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setErrors({});
    setIsSaving(true);
    try {
      await onSave(form);
    } catch (err) {
      setError(err.message);
      setErrors(err.fields || {});
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.formRow}>
        <TextField name="number" label="Číslo zóny" inputMode="numeric" placeholder="automaticky" {...props} />
        <TextField name="name" label="Názov" placeholder="napr. Predná záhrada" {...props} />
        <SelectField name="areaType" label="Čo zavlažuje" options={toOptions(ZONE_AREA_LABELS)} {...props} />
        <SelectField name="irrigationType" label="Typ závlahy" options={toOptions(IRRIGATION_LABELS)} {...props} />
      </div>
      <div className={styles.formRow}>
        <TextField name="sprinklerType" label="Typ postrekovača / kvapkovača" placeholder="rotačný, statický, tryska…" {...props} />
        <TextField name="sprinklerBrand" label="Značka" placeholder="Hunter, Rain Bird…" {...props} />
        <TextField name="sprinklerCount" label="Počet kusov" inputMode="numeric" {...props} />
        <TextField name="areaM2" label="Plocha (m²)" inputMode="numeric" {...props} />
      </div>
      <div className={styles.formRow}>
        <TextField name="valveType" label="Ventil (typ)" {...props} />
        <TextField name="valveLocation" label="Ventil (kde je)" placeholder="šachta pri garáži" {...props} />
      </div>
      <TextAreaField name="notes" label="Poznámky" rows={2} {...props} />
      {error && <div className={styles.errorMessage}>{error}</div>}
      <div className={styles.buttonRow} style={{ justifyContent: "flex-end" }}>
        <button type="button" className={styles.secondaryButton} onClick={onCancel}>
          <FiX /> Zrušiť
        </button>
        <button type="submit" className={styles.primaryButtonInline} disabled={isSaving}>
          <FiSave /> {isSaving ? "UKLADÁM…" : "ULOŽIŤ ZÓNU"}
        </button>
      </div>
    </form>
  );
};

// Zóny záhrady: na jednom mieste, čo je kde zakopané.
export const ZonesSection = ({ gardenId, zones, onChange }) => {
  const { token } = useAuth();
  const [editing, setEditing] = useState(null); // "new" | zoneId | null
  const [error, setError] = useState("");

  const handleCreate = async (form) => {
    await api.createZone(token, gardenId, form);
    setEditing(null);
    onChange();
  };

  const handleUpdate = (zoneId) => async (form) => {
    await api.updateZone(token, gardenId, zoneId, form);
    setEditing(null);
    onChange();
  };

  const handleDelete = async (zone) => {
    if (!window.confirm(`Naozaj zmazať zónu ${zone.number}?`)) return;
    try {
      await api.deleteZone(token, gardenId, zone.id);
      onChange();
    } catch (err) {
      setError(err.message);
    }
  };

  const totalSprinklers = zones.reduce((sum, z) => sum + (z.sprinklerCount || 0), 0);
  const editingZone = editing && editing !== "new" ? zones.find((z) => z.id === editing) : null;

  return (
    <section className={styles.panelFill}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>
          <FiDroplet /> Zóny ({zones.length}){totalSprinklers > 0 && <span className={styles.muted}> · spolu {totalSprinklers} postrekovačov</span>}
        </h2>
        <button type="button" className={styles.secondaryButton} onClick={() => setEditing("new")}>
          <FiPlus /> Pridať zónu
        </button>
      </div>
      {error && <div className={styles.errorMessage} style={{ marginBottom: "0.75rem" }}>{error}</div>}

      <PagedList
        items={zones}
        empty={<p className={styles.emptyState}>Zatiaľ žiadne zóny. Pridaj ich, nech technik vie, čo ho čaká.</p>}
        renderItem={(zone) => (
          <div className={`${styles.listCard} ${styles.fixedRow}`}>
            <span className={styles.zoneNumber}>{zone.number}</span>
            <span className={styles.listCardMain}>
              <span className={styles.listCardTitle}>
                {zone.name || `Zóna ${zone.number}`}
                <span className={styles.muted}>
                  {" "}
                  · {ZONE_AREA_LABELS[zone.areaType]} · {IRRIGATION_LABELS[zone.irrigationType]}
                </span>
              </span>
              <span className={styles.listCardMeta}>
                {[
                  zone.sprinklerCount && `${zone.sprinklerCount} ks`,
                  zone.sprinklerType,
                  zone.sprinklerBrand,
                  zone.valveLocation && `ventil: ${zone.valveLocation}`,
                  zone.areaM2 && `${zone.areaM2} m²`,
                ]
                  .filter(Boolean)
                  .join(" · ") || "bez detailov"}
              </span>
            </span>
            <button type="button" className={styles.iconButton} onClick={() => setEditing(zone.id)} title="Upraviť">
              <FiEdit2 />
            </button>
            <button type="button" className={styles.iconButton} onClick={() => handleDelete(zone)} title="Zmazať">
              <FiTrash2 />
            </button>
          </div>
        )}
      />

      {editing && (
        <Modal title={editingZone ? `Zóna ${editingZone.number}` : "Nová zóna"} wide onClose={() => setEditing(null)}>
          <ZoneForm
            initial={editingZone ? toFormValues(editingZone, EMPTY_ZONE) : EMPTY_ZONE}
            onSave={editingZone ? handleUpdate(editingZone.id) : handleCreate}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      )}
    </section>
  );
};
