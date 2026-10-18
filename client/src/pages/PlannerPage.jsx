import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FiArrowLeft, FiMapPin, FiCalendar, FiCheckCircle, FiAlertCircle, FiBell } from "react-icons/fi";
import { AppShell } from "../components/AppShell";
import { PriorityBadge } from "../components/RequestCard";
import { RemindersPanel } from "../components/RemindersPanel";
import { Modal } from "../components/Modal";
import { PagedList } from "../components/PagedList";
import { useAuth } from "../context/AuthContext";
import { useMediaQuery } from "../hooks";
import { api } from "../api/client";
import { REQUEST_TYPE_LABELS } from "../utils/labels";
import { addDaysKey, capitalize, formatDayLong, formatDayShort, formatTime, fullName, timeAgo, toDayKey } from "../utils/format";
import styles from "../styles/neumorphic.module.css";

const SEASON_TYPES = ["WINTERIZATION", "SPRING_START", "LAWN_CARE", "FAULT", "INSPECTION", "INSTALLATION", "OTHER"];

// Jeseň = zazimovanie, jar = spustenie, inak starostlivosť o trávnik.
const defaultType = () => {
  const month = new Date().getMonth() + 1;
  if (month >= 8 && month <= 12) return "WINTERIZATION";
  if (month >= 2 && month <= 5) return "SPRING_START";
  return "LAWN_CARE";
};

// Riešenie jarnej a jesennej špičky: požiadavky zoskupené podľa obce,
// Milan vyberie, kam ide v jeden deň, a systém rozloží časy za sebou.
export const PlannerPage = () => {
  const { token } = useAuth();
  const [type, setType] = useState(defaultType);
  const [groups, setGroups] = useState([]);
  const [city, setCity] = useState("");
  const [selected, setSelected] = useState([]);
  const [assignees, setAssignees] = useState([]);
  const [plan, setPlan] = useState({ date: addDaysKey(toDayKey(new Date()), 1), technicianId: "", startTime: "", notifyCustomer: true });
  const [dayInfo, setDayInfo] = useState(null);
  const [result, setResult] = useState(null);
  const [showReminders, setShowReminders] = useState(false);
  const [showPlanForm, setShowPlanForm] = useState(false);
  // V úzkom okne je formulár za tlačidlom, aby mal zoznam miesto.
  const narrow = useMediaQuery("(max-width: 1100px), (max-height: 780px)");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(() => {
    api
      .getPlanner(token, type)
      .then((d) => setGroups(d.groups))
      .catch((err) => setError(err.message));
  }, [token, type]);

  useEffect(() => {
    load();
    setSelected([]);
    setCity("");
  }, [load]);

  useEffect(() => {
    api.listAssignees(token).then((d) => setAssignees(d.users)).catch(() => {});
  }, [token]);

  useEffect(() => {
    api.getCapacity(token, plan.date, plan.date).then((d) => setDayInfo(d.days[0])).catch(() => setDayInfo(null));
  }, [token, plan.date, result]);

  // Poradie = podľa obce a ulice, teda rozumná trasa.
  const allItems = useMemo(() => groups.flatMap((g) => g.items.map((i) => ({ ...i, city: g.city }))), [groups]);
  const items = city ? allItems.filter((i) => i.city === city) : allItems;
  const plannable = items.filter((i) => i.garden);
  const allOn = plannable.length > 0 && plannable.every((i) => selected.includes(i.id));

  const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const toggleAll = () => {
    const ids = plannable.map((i) => i.id);
    setSelected((s) => (allOn ? s.filter((id) => !ids.includes(id)) : [...new Set([...s, ...ids])]));
  };

  const handlePlan = async () => {
    setError("");
    setIsSaving(true);
    try {
      const requestIds = allItems.filter((i) => selected.includes(i.id)).map((i) => i.id);
      const data = await api.planDay(token, { ...plan, startTime: plan.startTime || undefined, requestIds });
      setResult(data);
      setSelected([]);
      setShowPlanForm(false);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const planForm = (
          <div className={styles.form}>
      <label className={styles.field}>
        <span className={styles.label}>Deň</span>
        <span className={styles.inputWrapper}>
          <input type="date" className={styles.input} value={plan.date} onChange={(e) => setPlan((p) => ({ ...p, date: e.target.value }))} />
        </span>
      </label>
      {dayInfo && (
        <span className={dayInfo.free > 0 ? styles.muted : styles.fieldError}>
          {capitalize(formatDayLong(plan.date))}: {dayInfo.max === 0 ? "nepracovný deň" : `voľné ${dayInfo.free} z ${dayInfo.max} výjazdov`}
        </span>
      )}
      <label className={styles.field}>
        <span className={styles.label}>Technik</span>
        <span className={styles.inputWrapper}>
          <select className={styles.select} value={plan.technicianId} onChange={(e) => setPlan((p) => ({ ...p, technicianId: e.target.value }))}>
            <option value="">Zatiaľ nikto</option>
            {assignees.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </span>
      </label>
      <label className={styles.field}>
        <span className={styles.label}>Začať o (prázdne = začiatok dňa)</span>
        <span className={styles.inputWrapper}>
          <input type="time" step="900" className={styles.input} value={plan.startTime} onChange={(e) => setPlan((p) => ({ ...p, startTime: e.target.value }))} />
        </span>
      </label>
      <label className={styles.checkboxLabel}>
        <input type="checkbox" checked={plan.notifyCustomer} onChange={(e) => setPlan((p) => ({ ...p, notifyCustomer: e.target.checked }))} />
        Poslať zákazníkom e-mail s časom
      </label>
      <button type="button" className={styles.primaryButton} disabled={!selected.length || isSaving} onClick={handlePlan}>
        {isSaving ? "PLÁNUJEM…" : `NAPLÁNOVAŤ VYBRANÉ (${selected.length})`}
      </button>
      {error && <div className={styles.errorMessage}>{error}</div>}
    </div>
  );

  const Row = ({ item }) => (
    <label className={`${styles.checkRow} ${styles.listCard} ${styles.fixedRow}`} style={item.garden ? undefined : { opacity: 0.55, cursor: "not-allowed" }}>
      <input type="checkbox" checked={selected.includes(item.id)} onChange={() => toggle(item.id)} disabled={!item.garden} />
      <span className={styles.listCardMain}>
        <span className={styles.listCardTitle}>
          {fullName(item.customer)}
          <span className={styles.muted}> · #{item.number}</span>
        </span>
        <span className={styles.listCardMeta}>
          {item.garden ? `${item.garden.street}, ${item.city} · ${item.garden._count.zones} zón` : "chýba záhrada, doplň ju v požiadavke"} · prijaté{" "}
          {timeAgo(item.createdAt)}
        </span>
      </span>
      <span className={styles.chipRow} style={{ flexWrap: "nowrap" }}>
        <PriorityBadge priority={item.priority} />
        {item.reservedFor && <span className={styles.badgeHigh}>chce {formatDayShort(item.reservedFor)}</span>}
      </span>
    </label>
  );

  return (
    <AppShell>
      <Link to="/calendar" className={styles.backLink}>
        <FiArrowLeft /> Kalendár
      </Link>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Plánovač sezóny</h1>
        <button type="button" className={styles.secondaryButton} onClick={() => setShowReminders(true)}>
          <FiBell /> Pripomienky zákazníkom
        </button>
      </div>

      <div className={styles.tabs}>
        {SEASON_TYPES.map((t) => (
          <button key={t} type="button" className={type === t ? styles.tabActive : styles.tab} onClick={() => setType(t)}>
            {REQUEST_TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      <div className={styles.plannerLayout} style={{ flex: 1, minHeight: 0, ...(narrow ? { gridTemplateColumns: "1fr", gridTemplateRows: "minmax(0, 1fr)" } : {}) }}>
        <section className={styles.panelFill}>
          <div className={styles.sectionHeader}>
            <div className={styles.tabs} style={{ marginBottom: 0 }}>
              <button type="button" className={city === "" ? styles.tabActive : styles.tab} onClick={() => setCity("")}>
                Všetky obce <span className={styles.count}>{allItems.length}</span>
              </button>
              {groups.map((g) => (
                <button key={g.city} type="button" className={city === g.city ? styles.tabActive : styles.tab} onClick={() => setCity(g.city)}>
                  <FiMapPin /> {g.city} <span className={styles.count}>{g.items.length}</span>
                </button>
              ))}
            </div>
            <div className={styles.buttonRow}>
              {plannable.length > 0 && (
                <button type="button" className={styles.linkButton} onClick={toggleAll}>
                  {allOn ? "Odznačiť" : city ? "Vybrať celú obec" : "Vybrať všetko"}
                </button>
              )}
              {narrow && (
                <button type="button" className={styles.primaryButtonInline} disabled={!selected.length} onClick={() => setShowPlanForm(true)}>
                  <FiCalendar /> NAPLÁNOVAŤ ({selected.length})
                </button>
              )}
            </div>
          </div>
          <PagedList items={items} renderItem={(item) => <Row item={item} />} empty={<p className={styles.emptyState}>Žiadne nenaplánované požiadavky tohto typu.</p>} />
        </section>

        {!narrow && (
          <aside className={styles.panelFill}>
            <h2 className={styles.sectionTitle} style={{ marginBottom: "1rem" }}>
              <FiCalendar /> Naplánovať deň
            </h2>
            {planForm}
          </aside>
        )}
      </div>

      {result && (
        <Modal title="Výsledok plánovania" onClose={() => setResult(null)}>
          {result.planned.length > 0 && (
            <div className={styles.calloutBox}>
              <strong>
                <FiCheckCircle style={{ verticalAlign: "-2px" }} /> Naplánované: {result.planned.length}
              </strong>
              <ul style={{ margin: "0.4rem 0 0", paddingLeft: "1.1rem" }}>
                {result.planned.map((p) => (
                  <li key={p.appointmentId}>
                    {formatTime(p.startsAt)} až {formatTime(p.endsAt)}: #{p.number}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {result.skipped.length > 0 && (
            <div className={styles.calloutWarning} style={{ marginTop: "0.75rem" }}>
              <strong>
                <FiAlertCircle style={{ verticalAlign: "-2px" }} /> Preskočené: {result.skipped.length}
              </strong>
              <ul style={{ margin: "0.4rem 0 0", paddingLeft: "1.1rem" }}>
                {result.skipped.map((s) => (
                  <li key={s.requestId}>
                    #{s.number}: {s.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className={styles.buttonRow} style={{ justifyContent: "flex-end", marginTop: "1rem" }}>
            <Link to={`/calendar?week=${plan.date}`} className={styles.primaryButtonInline} style={{ textDecoration: "none" }}>
              OTVORIŤ V KALENDÁRI
            </Link>
          </div>
        </Modal>
      )}

      {showPlanForm && (
        <Modal title="Naplánovať deň" onClose={() => setShowPlanForm(false)}>
          {planForm}
        </Modal>
      )}

      {showReminders && (
        <Modal title="Pripomienky zákazníkom" wide onClose={() => setShowReminders(false)}>
          <RemindersPanel />
        </Modal>
      )}
    </AppShell>
  );
};
