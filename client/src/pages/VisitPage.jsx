import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  FiArrowLeft,
  FiPhone,
  FiMapPin,
  FiDroplet,
  FiCpu,
  FiCheckSquare,
  FiClock,
  FiPlus,
  FiTrash2,
  FiCheckCircle,
  FiInfo,
  FiHome,
} from "react-icons/fi";
import { AppShell } from "../components/AppShell";
import { Section } from "../components/Section";
import { InfoItem } from "../components/InfoItem";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { IRRIGATION_LABELS, REQUEST_TYPE_LABELS, WATER_SOURCE_LABELS, ZONE_AREA_LABELS } from "../utils/labels";
import { capitalize, formatDate, formatDayLong, formatTime, fullName, mapsUrl, toDayKey } from "../utils/format";
import styles from "../styles/neumorphic.module.css";

// Odškrtnutý checklist si pamätá prehliadač, aby sa nestratil, keď technik v teréne zavrie appku.
const storageKey = (id) => `checklist:${id}`;
const loadChecked = (id) => {
  try {
    return JSON.parse(localStorage.getItem(storageKey(id)) || "[]");
  } catch {
    return [];
  }
};

// Výjazd pre technika: pred príchodom karta záhrady a checklist, po zásahu zápis práce a materiálu.
export const VisitPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuth();
  const [visit, setVisit] = useState(null);
  const [checked, setChecked] = useState(() => loadChecked(id));
  const [allMaterials, setAllMaterials] = useState([]);
  const [form, setForm] = useState({ description: "", durationMin: "", outcome: "DONE", notifyCustomer: true });
  const [used, setUsed] = useState([]);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(() => {
    api
      .getVisit(token, id)
      .then((d) => {
        setVisit(d);
        // Predvyplníme spotrebu podľa checklistu, technik len opraví, čo naozaj minul.
        setUsed(d.checklist.map((c) => ({ materialId: c.materialId, quantity: String(c.quantity) })));
      })
      .catch((err) => setError(err.message));
  }, [token, id]);

  useEffect(() => {
    load();
    api.listMaterials(token).then((d) => setAllMaterials(d.materials)).catch(() => {});
  }, [load, token]);

  useEffect(() => {
    localStorage.setItem(storageKey(id), JSON.stringify(checked));
  }, [checked, id]);

  const materialById = useMemo(() => new Map(allMaterials.map((m) => [m.id, m])), [allMaterials]);
  const estimatedCost = used.reduce((sum, u) => sum + (Number(u.quantity) || 0) * (materialById.get(u.materialId)?.unitPrice || 0), 0);

  const toggle = (materialId) =>
    setChecked((c) => (c.includes(materialId) ? c.filter((x) => x !== materialId) : [...c, materialId]));

  const handleComplete = async () => {
    setError("");
    setErrors({});
    setIsSaving(true);
    try {
      await api.completeVisit(token, id, {
        ...form,
        materials: used.filter((u) => u.materialId && Number(u.quantity) > 0).map((u) => ({ ...u, quantity: Number(u.quantity) })),
      });
      localStorage.removeItem(storageKey(id));
      const requestId = visit.appointment.serviceRequest?.id;
      navigate(requestId ? `/requests/${requestId}` : `/gardens/${visit.appointment.garden.id}`);
    } catch (err) {
      setError(err.message);
      setErrors(err.fields || {});
      setIsSaving(false);
    }
  };

  if (!visit) {
    return (
      <AppShell>
        {error ? <div className={styles.errorMessage}>{error}</div> : <p className={styles.muted}>Načítavam…</p>}
      </AppShell>
    );
  }

  const { appointment: a, checklist, lastWorkLogs } = visit;
  const g = a.garden;
  const customer = g.customer;
  const isDone = a.status === "DONE";
  const doneCount = checklist.filter((c) => checked.includes(c.materialId)).length;

  return (
    <AppShell>
      <Link to="/dashboard" className={styles.backLink}>
        <FiArrowLeft /> Prehľad
      </Link>

      <div className={styles.splitHeader}>
        <div>
          <h1 className={styles.pageTitle}>{fullName(customer)}</h1>
          <p className={styles.muted} style={{ margin: "0.3rem 0 0" }}>
            {g.street}, {g.city}
          </p>
          <div className={styles.chipRow} style={{ marginTop: "0.5rem" }}>
            <span className={styles.badgeGreen}>
              {capitalize(formatDayLong(toDayKey(a.startsAt)))}, {formatTime(a.startsAt)}
            </span>
            {a.serviceRequest && <span className={styles.badge}>{REQUEST_TYPE_LABELS[a.serviceRequest.type]}</span>}
            {isDone && <span className={styles.badgeBrand}>hotovo</span>}
          </div>
        </div>
        <div className={styles.buttonRow}>
          <a href={mapsUrl(g)} target="_blank" rel="noreferrer" className={styles.primaryButtonInline} style={{ textDecoration: "none" }}>
            <FiMapPin /> NAVIGOVAŤ
          </a>
          {customer.phone && (
            <a href={`tel:${customer.phone.replace(/\s/g, "")}`} className={styles.secondaryButton} style={{ textDecoration: "none" }}>
              <FiPhone /> Zavolať
            </a>
          )}
        </div>
      </div>

      {(a.serviceRequest?.description || a.notes || g.notes) && (
        <Section title="Čo treba vedieť" icon={FiInfo}>
          {a.serviceRequest?.description && <p className={styles.infoValue} style={{ whiteSpace: "pre-wrap" }}>{a.serviceRequest.description}</p>}
          {a.notes && <p className={styles.muted} style={{ whiteSpace: "pre-wrap" }}>Termín: {a.notes}</p>}
          {g.notes && <p className={styles.muted} style={{ whiteSpace: "pre-wrap" }}>Záhrada: {g.notes}</p>}
        </Section>
      )}

      <Section
        title={`Materiál so sebou ${checklist.length ? `(${doneCount}/${checklist.length})` : ""}`}
        icon={FiCheckSquare}
      >
        {checklist.length === 0 ? (
          <p className={styles.emptyState}>Pre tento typ zásahu nie je nastavený checklist. Majiteľ ho doplní v časti Materiál.</p>
        ) : (
          <div className={styles.list}>
            {checklist.map((c) => (
              <label key={c.materialId} className={checked.includes(c.materialId) ? styles.checkItemDone : styles.checkItem}>
                <input type="checkbox" checked={checked.includes(c.materialId)} onChange={() => toggle(c.materialId)} />
                <span className={styles.listCardMain}>
                  <span className={styles.checkName}>
                    {c.quantity} {c.unit} · {c.name}
                  </span>
                  <span className={styles.listCardMeta}>
                    {c.perZone
                      ? g.zones.length
                        ? `${c.quantity / g.zones.length} na zónu × ${g.zones.length} zón · `
                        : "na zónu, zóny nie sú zapísané (počíta sa 1) · "
                      : ""}
                    na sklade {c.stockQty} {c.unit}
                  </span>
                </span>
                {!c.enoughStock && <span className={styles.badgeEmergency}>málo na sklade</span>}
              </label>
            ))}
          </div>
        )}
      </Section>

      <Section title={`Zóny (${g.zones.length})`} icon={FiDroplet}>
        {g.zones.length === 0 ? (
          <p className={styles.emptyState}>Zóny nie sú zapísané. Po výjazde ich doplň do technickej karty.</p>
        ) : (
          <div className={styles.list}>
            {g.zones.map((z) => (
              <div key={z.id} className={styles.zoneCard}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span className={styles.zoneNumber}>{z.number}</span>
                  <strong>{z.name || `Zóna ${z.number}`}</strong>
                  <span className={styles.muted}>
                    {ZONE_AREA_LABELS[z.areaType]} · {IRRIGATION_LABELS[z.irrigationType]}
                  </span>
                </div>
                <span className={styles.muted}>
                  {[z.sprinklerCount && `${z.sprinklerCount} ks`, z.sprinklerType, z.sprinklerBrand, z.valveLocation && `ventil: ${z.valveLocation}`]
                    .filter(Boolean)
                    .join(" · ") || "bez detailov"}
                </span>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Voda a riadiaca jednotka" icon={FiCpu}>
        <div className={styles.infoGrid}>
          <InfoItem label="Zdroj vody">{WATER_SOURCE_LABELS[g.waterSource]}</InfoItem>
          <InfoItem label="Hlavný uzáver">{g.mainValveLocation}</InfoItem>
          <InfoItem label="Jednotka">{g.controllerModel}</InfoItem>
          <InfoItem label="Umiestnenie jednotky">{g.controllerLocation}</InfoItem>
          <InfoItem label="Inštalované">{g.installedYear ? `${g.installedYear}${g.systemVersion ? `, ${g.systemVersion}` : ""}` : ""}</InfoItem>
          <InfoItem label="Fotky">{g.photos.length ? `${g.photos.length} v technickej karte` : ""}</InfoItem>
        </div>
        <Link to={`/gardens/${g.id}`} className={styles.linkButton} style={{ marginTop: "1rem" }}>
          <FiHome /> Celá technická karta s fotkami
        </Link>
      </Section>

      {lastWorkLogs.length > 0 && (
        <Section title="Naposledy sa robilo" icon={FiClock}>
          <div className={styles.timeline}>
            {lastWorkLogs.map((w) => (
              <div key={w.id} className={styles.timelineItem}>
                <span className={styles.timelineDate}>
                  {formatDate(w.performedAt)}
                  {w.technician && ` · ${w.technician.name}`}
                </span>
                <span>{w.description}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {isDone ? (
        <Section title="Výjazd je zapísaný" icon={FiCheckCircle}>
          <p className={styles.infoValue}>{a.workLog?.description}</p>
          {a.workLog?.materials?.length > 0 && (
            <p className={styles.muted}>
              Materiál: {a.workLog.materials.map((m) => `${m.material.name} ${Number(m.quantity)} ${m.material.unit}`).join(", ")}
            </p>
          )}
        </Section>
      ) : (
        <Section title="Dokončiť výjazd" icon={FiCheckCircle}>
          <div className={styles.form}>
            <label className={styles.field}>
              <span className={styles.label}>Čo sa urobilo *</span>
              <span className={styles.inputWrapper}>
                <textarea
                  className={styles.textarea}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="napr. vyfúkané všetky zóny, jednotka vypnutá, vymenená batéria"
                />
              </span>
              {errors.description && <span className={styles.fieldError}>{errors.description}</span>}
            </label>
            <label className={styles.field} style={{ maxWidth: 220 }}>
              <span className={styles.label}>Trvanie (min.)</span>
              <span className={styles.inputWrapper}>
                <input
                  type="number"
                  min="0"
                  step="5"
                  className={styles.input}
                  value={form.durationMin}
                  onChange={(e) => setForm((f) => ({ ...f, durationMin: e.target.value }))}
                />
              </span>
            </label>

            <span className={styles.label}>Minutý materiál</span>
            {used.map((u, index) => (
              <div key={index} className={styles.materialRow}>
                <span className={styles.inputWrapper}>
                  <select
                    className={styles.select}
                    value={u.materialId}
                    onChange={(e) => setUsed((list) => list.map((x, i) => (i === index ? { ...x, materialId: e.target.value } : x)))}
                  >
                    <option value="">Vyber materiál</option>
                    {allMaterials.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.unit})
                      </option>
                    ))}
                  </select>
                </span>
                <span className={`${styles.inputWrapper} ${styles.qtyInput}`}>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    className={styles.input}
                    value={u.quantity}
                    onChange={(e) => setUsed((list) => list.map((x, i) => (i === index ? { ...x, quantity: e.target.value } : x)))}
                  />
                </span>
                <button
                  type="button"
                  className={styles.iconButton}
                  onClick={() => setUsed((list) => list.filter((_, i) => i !== index))}
                  title="Odobrať"
                >
                  <FiTrash2 />
                </button>
              </div>
            ))}
            <button
              type="button"
              className={styles.linkButton}
              style={{ alignSelf: "flex-start" }}
              onClick={() => setUsed((list) => [...list, { materialId: "", quantity: "1" }])}
            >
              <FiPlus /> Pridať materiál
            </button>
            {estimatedCost > 0 && <span className={styles.muted}>Materiál spolu: {estimatedCost.toFixed(2)} €</span>}

            {a.serviceRequest && (
              <>
                <span className={styles.label}>Výsledok</span>
                <div className={styles.tabs}>
                  <button
                    type="button"
                    className={form.outcome === "DONE" ? styles.tabActive : styles.tab}
                    onClick={() => setForm((f) => ({ ...f, outcome: "DONE" }))}
                  >
                    Hotovo, vybavené
                  </button>
                  <button
                    type="button"
                    className={form.outcome === "FOLLOW_UP" ? styles.tabActive : styles.tab}
                    onClick={() => setForm((f) => ({ ...f, outcome: "FOLLOW_UP" }))}
                  >
                    Treba prísť znova
                  </button>
                </div>
                {form.outcome === "DONE" && customer.email && (
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={form.notifyCustomer}
                      onChange={(e) => setForm((f) => ({ ...f, notifyCustomer: e.target.checked }))}
                    />
                    Poslať zákazníkovi e-mail, že je hotovo
                  </label>
                )}
              </>
            )}

            {error && <div className={styles.errorMessage}>{error}</div>}
            <div className={styles.stickyAction}>
              <button type="button" className={styles.primaryButton} onClick={handleComplete} disabled={isSaving}>
                <FiCheckCircle /> {isSaving ? "UKLADÁM…" : "DOKONČIŤ VÝJAZD"}
              </button>
            </div>
          </div>
        </Section>
      )}
    </AppShell>
  );
};
