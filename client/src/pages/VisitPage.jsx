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
import { PagedList } from "../components/PagedList";
import { TabBar, useTab } from "../components/Tabs";
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
  const checklistDone = visit ? visit.checklist.filter((c) => checked.includes(c.materialId)).length : 0;
  const tabs = [
    { key: "materials", label: `Materiál${visit?.checklist.length ? ` ${checklistDone}/${visit.checklist.length}` : ""}`, icon: FiCheckSquare },
    { key: "zones", label: "Zóny", icon: FiDroplet, count: visit?.appointment.garden.zones.length },
    { key: "card", label: "Karta záhrady", icon: FiCpu },
    { key: "last", label: "Naposledy", icon: FiClock, count: visit?.lastWorkLogs.length },
    { key: "finish", label: visit?.appointment.status === "DONE" ? "Zápis" : "Dokončiť", icon: FiCheckCircle },
  ];
  const [tab, setTab] = useTab(tabs);

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
  const info = [a.serviceRequest?.description, a.notes && `Termín: ${a.notes}`, g.notes && `Záhrada: ${g.notes}`].filter(Boolean);

  return (
    <AppShell>
      <Link to="/dashboard" className={styles.backLink}>
        <FiArrowLeft /> Prehľad
      </Link>

      <div className={styles.pageHeader}>
        <div style={{ minWidth: 0 }}>
          <h1 className={styles.pageTitle}>{fullName(customer)}</h1>
          <div className={styles.chipRow} style={{ marginTop: "0.4rem", alignItems: "center" }}>
            <span className={styles.muted}>
              {g.street}, {g.city}
            </span>
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

      {info.length > 0 && (
        <div className={styles.calloutBox} style={{ marginBottom: "0.85rem", flex: "none", maxHeight: "5.5rem", overflow: "hidden" }} title={info.join("\n")}>
          <FiInfo style={{ verticalAlign: "-2px" }} /> {info.join(" · ")}
        </div>
      )}

      <TabBar tabs={tabs} active={tab} onChange={setTab} />

      <div className={styles.tabPanel}>
        {tab === "materials" && (
          <section className={styles.panelFill}>
            <PagedList
              items={checklist}
              getKey={(c) => c.materialId}
              empty={<p className={styles.emptyState}>Pre tento typ zásahu nie je nastavený checklist. Majiteľ ho doplní v časti Materiál.</p>}
              renderItem={(c) => (
                <label className={`${checked.includes(c.materialId) ? styles.checkItemDone : styles.checkItem} ${styles.fixedRow}`}>
                  <input type="checkbox" checked={checked.includes(c.materialId)} onChange={() => toggle(c.materialId)} />
                  <span className={styles.listCardMain}>
                    <span className={`${styles.checkName} ${styles.listCardTitle}`}>
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
              )}
            />
          </section>
        )}

        {tab === "zones" && (
          <section className={styles.panelFill}>
            <PagedList
              items={g.zones}
              empty={<p className={styles.emptyState}>Zóny nie sú zapísané. Po výjazde ich doplň do technickej karty.</p>}
              renderItem={(z) => (
                <div className={`${styles.listCard} ${styles.fixedRow}`}>
                  <span className={styles.zoneNumber}>{z.number}</span>
                  <span className={styles.listCardMain}>
                    <span className={styles.listCardTitle}>
                      {z.name || `Zóna ${z.number}`}
                      <span className={styles.muted}>
                        {" "}
                        · {ZONE_AREA_LABELS[z.areaType]} · {IRRIGATION_LABELS[z.irrigationType]}
                      </span>
                    </span>
                    <span className={styles.listCardMeta}>
                      {[z.sprinklerCount && `${z.sprinklerCount} ks`, z.sprinklerType, z.sprinklerBrand, z.valveLocation && `ventil: ${z.valveLocation}`]
                        .filter(Boolean)
                        .join(" · ") || "bez detailov"}
                    </span>
                  </span>
                </div>
              )}
            />
          </section>
        )}

        {tab === "card" && (
            <Section title="Voda a riadiaca jednotka" icon={FiCpu}>
              <div className={styles.infoGrid}>
                <InfoItem label="Zdroj vody">{WATER_SOURCE_LABELS[g.waterSource]}</InfoItem>
                <InfoItem label="Hlavný uzáver">{g.mainValveLocation}</InfoItem>
                <InfoItem label="Jednotka">{g.controllerModel}</InfoItem>
                <InfoItem label="Umiestnenie jednotky">{g.controllerLocation}</InfoItem>
                <InfoItem label="Inštalované">{g.installedYear ? `${g.installedYear}${g.systemVersion ? `, ${g.systemVersion}` : ""}` : ""}</InfoItem>
                <InfoItem label="Fotky">{g.photos.length ? `${g.photos.length} v technickej karte` : ""}</InfoItem>
              </div>
              <Link to={`/gardens/${g.id}?tab=photos`} className={styles.linkButton} style={{ marginTop: "1rem" }}>
                <FiHome /> Technická karta s fotkami
              </Link>
            </Section>
        )}

        {tab === "last" && (
            <section className={styles.panelFill}>
              <PagedList
                items={lastWorkLogs}
                empty={<p className={styles.emptyState}>Zatiaľ bez histórie.</p>}
                renderItem={(w) => (
                  <div className={`${styles.listCard} ${styles.fixedRow}`} title={w.description}>
                    <span className={styles.listCardMain}>
                      <span className={styles.listCardTitle}>{w.description}</span>
                      <span className={styles.listCardMeta}>
                        {formatDate(w.performedAt)}
                        {w.technician && ` · ${w.technician.name}`}
                      </span>
                    </span>
                  </div>
                )}
              />
            </section>
        )}

        {tab === "finish" &&
          (isDone ? (
            <Section title="Výjazd je zapísaný" icon={FiCheckCircle}>
              <p className={styles.infoValue}>{a.workLog?.description}</p>
              {a.workLog?.materials?.length > 0 && (
                <p className={styles.muted}>
                  Materiál: {a.workLog.materials.map((m) => `${m.material.name} ${Number(m.quantity)} ${m.material.unit}`).join(", ")}
                </p>
              )}
            </Section>
          ) : (
            <div className={styles.splitColumns}>
              <section className={styles.panelFill}>
                <div className={styles.form}>
                  <label className={styles.field}>
                    <span className={styles.label}>Čo sa urobilo *</span>
                    <span className={styles.inputWrapper}>
                      <textarea
                        className={styles.textarea}
                        rows={3}
                        value={form.description}
                        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                        placeholder="napr. vyfúkané všetky zóny, jednotka vypnutá, vymenená batéria"
                      />
                    </span>
                    {errors.description && <span className={styles.fieldError}>{errors.description}</span>}
                  </label>
                  <label className={styles.field} style={{ maxWidth: 200 }}>
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
                  {a.serviceRequest && (
                    <div className={styles.tabs} style={{ marginBottom: 0 }}>
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
                  )}
                  {a.serviceRequest && form.outcome === "DONE" && customer.email && (
                    <label className={styles.checkboxLabel} style={{ padding: 0 }}>
                      <input
                        type="checkbox"
                        checked={form.notifyCustomer}
                        onChange={(e) => setForm((f) => ({ ...f, notifyCustomer: e.target.checked }))}
                      />
                      Poslať zákazníkovi e-mail, že je hotovo
                    </label>
                  )}
                  {error && <div className={styles.errorMessage}>{error}</div>}
                  <button type="button" className={styles.primaryButton} onClick={handleComplete} disabled={isSaving}>
                    <FiCheckCircle /> {isSaving ? "UKLADÁM…" : "DOKONČIŤ VÝJAZD"}
                  </button>
                </div>
              </section>

              <section className={styles.panelFill}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>Minutý materiál</h2>
                  <button type="button" className={styles.linkButton} onClick={() => setUsed((list) => [...list, { materialId: "", quantity: "1", key: Date.now() }])}>
                    <FiPlus /> Pridať
                  </button>
                </div>
                <PagedList
                  items={used.map((u, index) => ({ ...u, index }))}
                  rowHeight={56}
                  getKey={(u) => u.key || `${u.materialId}-${u.index}`}
                  empty={<p className={styles.emptyState}>Žiadny materiál.</p>}
                  renderItem={(u) => (
                    <div className={styles.materialRow} style={{ height: 56, flexWrap: "nowrap" }}>
                      <span className={styles.inputWrapper}>
                        <select
                          className={styles.select}
                          value={u.materialId}
                          onChange={(e) => setUsed((list) => list.map((x, i) => (i === u.index ? { ...x, materialId: e.target.value } : x)))}
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
                          onChange={(e) => setUsed((list) => list.map((x, i) => (i === u.index ? { ...x, quantity: e.target.value } : x)))}
                        />
                      </span>
                      <button type="button" className={styles.iconButton} onClick={() => setUsed((list) => list.filter((_, i) => i !== u.index))} title="Odobrať">
                        <FiTrash2 />
                      </button>
                    </div>
                  )}
                />
                {estimatedCost > 0 && (
                  <span className={styles.muted} style={{ flex: "none" }}>
                    Materiál spolu: {estimatedCost.toFixed(2)} €
                  </span>
                )}
              </section>
            </div>
          ))}
      </div>
    </AppShell>
  );
};
