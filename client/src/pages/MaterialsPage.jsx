import { useCallback, useEffect, useState } from "react";
import { FiPlus, FiSearch, FiDownload, FiEdit2, FiSave, FiX, FiTrash2, FiAlertTriangle } from "react-icons/fi";
import { AppShell } from "../components/AppShell";
import { Section } from "../components/Section";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { useDebouncedValue } from "../hooks";
import { REQUEST_TYPE_LABELS } from "../utils/labels";
import styles from "../styles/neumorphic.module.css";

const EMPTY_MATERIAL = { name: "", sku: "", unit: "ks", unitPrice: "", stockQty: "", minStock: "" };

const MaterialForm = ({ initial, onSave, onCancel }) => {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSave = async () => {
    setError("");
    setErrors({});
    try {
      await onSave(form);
    } catch (err) {
      setError(err.message);
      setErrors(err.fields || {});
    }
  };

  const field = (key, label, props = {}) => (
    <label className={styles.field}>
      <span className={styles.label}>{label}</span>
      <span className={styles.inputWrapper}>
        <input className={styles.input} value={form[key]} onChange={set(key)} {...props} />
      </span>
      {errors[key] && <span className={styles.fieldError}>{errors[key]}</span>}
    </label>
  );

  return (
    <div className={styles.formPanel}>
      <div className={styles.formRow}>
        {field("name", "Názov *")}
        {field("sku", "Kód (nepovinné)")}
        {field("unit", "Jednotka", { placeholder: "ks, m, kg" })}
      </div>
      <div className={styles.formRow} style={{ marginTop: "1rem" }}>
        {field("unitPrice", "Nákupná cena (€)", { inputMode: "decimal" })}
        {field("stockQty", "Na sklade", { inputMode: "decimal" })}
        {field("minStock", "Upozorniť pod", { inputMode: "decimal" })}
      </div>
      {error && <div className={styles.errorMessage} style={{ marginTop: "0.75rem" }}>{error}</div>}
      <div className={styles.actionRow}>
        <button type="button" className={styles.secondaryButton} onClick={onCancel}>
          <FiX /> Zrušiť
        </button>
        <button type="button" className={styles.primaryButtonInline} onClick={handleSave}>
          <FiSave /> ULOŽIŤ
        </button>
      </div>
    </div>
  );
};

// Šablóny checklistu: čo brať so sebou na daný typ zásahu.
const TemplatesTab = ({ materials, isOwner }) => {
  const { token } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [type, setType] = useState("WINTERIZATION");
  const [form, setForm] = useState({ materialId: "", quantity: "1", perZone: false });
  const [error, setError] = useState("");

  const load = useCallback(() => {
    api.listTemplates(token).then((d) => setTemplates(d.templates)).catch((err) => setError(err.message));
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = async () => {
    setError("");
    try {
      await api.saveTemplate(token, { ...form, requestType: type });
      setForm({ materialId: "", quantity: "1", perZone: false });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    await api.deleteTemplate(token, id);
    load();
  };

  const items = templates.filter((t) => t.requestType === type);

  return (
    <>
      <p className={styles.muted} style={{ marginTop: 0 }}>
        Podľa tohto zoznamu sa technikovi pred výjazdom ukáže, čo má zobrať. „Na zónu“ sa vynásobí počtom zón záhrady.
      </p>
      <div className={styles.tabs}>
        {Object.entries(REQUEST_TYPE_LABELS).map(([value, label]) => (
          <button key={value} type="button" className={type === value ? styles.tabActive : styles.tab} onClick={() => setType(value)}>
            {label}
            {templates.some((t) => t.requestType === value) && (
              <span className={styles.count}>{templates.filter((t) => t.requestType === value).length}</span>
            )}
          </button>
        ))}
      </div>

      <Section title={`Checklist: ${REQUEST_TYPE_LABELS[type]}`}>
        {items.length === 0 ? (
          <p className={styles.emptyState}>Zatiaľ prázdny.</p>
        ) : (
          <div className={styles.list}>
            {items.map((t) => (
              <div key={t.id} className={styles.listCard}>
                <span className={styles.listCardMain}>
                  <span className={styles.listCardTitle}>{t.material.name}</span>
                  <span className={styles.listCardMeta}>
                    {t.quantity} {t.material.unit} {t.perZone ? "na každú zónu" : "na výjazd"}
                  </span>
                </span>
                {isOwner && (
                  <button type="button" className={styles.iconButton} onClick={() => handleDelete(t.id)} title="Odobrať">
                    <FiTrash2 />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {isOwner && (
          <div className={styles.formRow} style={{ marginTop: "1.25rem", alignItems: "flex-end" }}>
            <label className={styles.field}>
              <span className={styles.label}>Materiál</span>
              <span className={styles.inputWrapper}>
                <select className={styles.select} value={form.materialId} onChange={(e) => setForm((f) => ({ ...f, materialId: e.target.value }))}>
                  <option value="">Vyber materiál</option>
                  {materials.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </span>
            </label>
            <label className={styles.field} style={{ flex: "0 1 120px" }}>
              <span className={styles.label}>Množstvo</span>
              <span className={styles.inputWrapper}>
                <input className={styles.input} inputMode="decimal" value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))} />
              </span>
            </label>
            <label className={styles.checkboxLabel}>
              <input type="checkbox" checked={form.perZone} onChange={(e) => setForm((f) => ({ ...f, perZone: e.target.checked }))} />
              na zónu
            </label>
            <button type="button" className={styles.primaryButtonInline} onClick={handleAdd} disabled={!form.materialId}>
              <FiPlus /> PRIDAŤ
            </button>
          </div>
        )}
        {error && <div className={styles.errorMessage} style={{ marginTop: "0.75rem" }}>{error}</div>}
      </Section>
    </>
  );
};

export const MaterialsPage = () => {
  const { token, user } = useAuth();
  const isOwner = user.role === "OWNER";
  const [tab, setTab] = useState("stock");
  const [materials, setMaterials] = useState([]);
  const [q, setQ] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [editing, setEditing] = useState(null); // "new" | id
  const [error, setError] = useState("");
  const debouncedQ = useDebouncedValue(q);

  const load = useCallback(() => {
    api
      .listMaterials(token, { q: debouncedQ, lowOnly: lowOnly ? "true" : undefined })
      .then((d) => setMaterials(d.materials))
      .catch((err) => setError(err.message));
  }, [token, debouncedQ, lowOnly]);

  useEffect(() => {
    load();
  }, [load]);

  const handleReceive = async (m) => {
    const value = window.prompt(`Koľko ${m.unit} prišlo na sklad? (${m.name})`);
    if (!value) return;
    try {
      await api.receiveMaterial(token, m.id, { quantity: value });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const lowCount = materials.filter((m) => m.isLow).length;

  return (
    <AppShell>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Materiál a sklad</h1>
        {isOwner && tab === "stock" && editing !== "new" && (
          <button type="button" className={styles.primaryButtonInline} onClick={() => setEditing("new")}>
            <FiPlus /> NOVÝ MATERIÁL
          </button>
        )}
      </div>

      <div className={styles.tabs}>
        <button type="button" className={tab === "stock" ? styles.tabActive : styles.tab} onClick={() => setTab("stock")}>
          Sklad
        </button>
        <button type="button" className={tab === "templates" ? styles.tabActive : styles.tab} onClick={() => setTab("templates")}>
          Checklisty na výjazd
        </button>
      </div>

      {error && <div className={styles.errorMessage} style={{ marginBottom: "1rem" }}>{error}</div>}

      {tab === "templates" ? (
        <TemplatesTab materials={materials} isOwner={isOwner} />
      ) : (
        <>
          {editing === "new" && (
            <MaterialForm
              initial={EMPTY_MATERIAL}
              onCancel={() => setEditing(null)}
              onSave={async (form) => {
                await api.createMaterial(token, form);
                setEditing(null);
                load();
              }}
            />
          )}

          <div className={styles.toolbar} style={{ alignItems: "center" }}>
            <div className={`${styles.inputWrapper} ${styles.toolbarSearch}`}>
              <FiSearch />
              <input className={styles.input} placeholder="Hľadať materiál" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <label className={styles.checkboxLabel}>
              <input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} />
              Len čo dochádza
            </label>
          </div>

          {lowCount > 0 && !lowOnly && (
            <div className={styles.calloutWarning} style={{ marginBottom: "1rem" }}>
              <FiAlertTriangle style={{ verticalAlign: "-2px" }} /> Dochádza {lowCount} {lowCount === 1 ? "položka" : "položky"}. Čas
              objednať vo veľkoobchode.
            </div>
          )}

          <div className={styles.list}>
            {materials.map((m) =>
              editing === m.id ? (
                <MaterialForm
                  key={m.id}
                  initial={{
                    name: m.name,
                    sku: m.sku || "",
                    unit: m.unit,
                    unitPrice: String(m.unitPrice),
                    stockQty: String(m.stockQty),
                    minStock: String(m.minStock),
                  }}
                  onCancel={() => setEditing(null)}
                  onSave={async (form) => {
                    await api.updateMaterial(token, m.id, form);
                    setEditing(null);
                    load();
                  }}
                />
              ) : (
                <div key={m.id} className={styles.listCard}>
                  <span className={styles.listCardMain}>
                    <span className={styles.listCardTitle}>{m.name}</span>
                    <span className={styles.listCardMeta}>
                      {m.sku ? `${m.sku} · ` : ""}
                      {m.unitPrice.toFixed(2)} € / {m.unit} · upozorniť pod {m.minStock} {m.unit}
                    </span>
                  </span>
                  <span className={m.isLow ? styles.badgeEmergency : styles.badgeGreen}>
                    {m.stockQty} {m.unit}
                  </span>
                  <button type="button" className={styles.iconButton} onClick={() => handleReceive(m)} title="Príjem na sklad">
                    <FiDownload />
                  </button>
                  {isOwner && (
                    <button type="button" className={styles.iconButton} onClick={() => setEditing(m.id)} title="Upraviť">
                      <FiEdit2 />
                    </button>
                  )}
                </div>
              )
            )}
          </div>
        </>
      )}
    </AppShell>
  );
};
