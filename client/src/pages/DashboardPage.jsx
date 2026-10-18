import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiCalendar, FiMapPin, FiPhone, FiAlertTriangle } from "react-icons/fi";
import { AppShell } from "../components/AppShell";
import { MonthCalendar } from "../components/MonthCalendar";
import { PagedList } from "../components/PagedList";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { ROLE_LABELS, REQUEST_TYPE_LABELS } from "../utils/labels";
import { formatTime, mapsUrl, toDayKey } from "../utils/format";
import styles from "../styles/neumorphic.module.css";

const STAT_TILES = [
  { key: "new", label: "Nové požiadavky", to: "/requests?view=new" },
  { key: "emergency", label: "Havárie", to: "/requests", alert: true },
  { key: "open", label: "Otvorené spolu", to: "/requests" },
  { key: "mine", label: "Pridelené mne", to: "/requests?view=mine" },
];

const TodayRow = ({ a }) => (
  <div className={`${styles.listCard} ${styles.fixedRow}`}>
    <span className={styles.apptTime} style={{ minWidth: 44 }}>
      {a.status === "DONE" ? "✓" : a.status === "RESERVED" ? "?" : formatTime(a.startsAt)}
    </span>
    <Link to={`/visits/${a.id}`} className={styles.listCardMain} style={{ color: "inherit", textDecoration: "none" }}>
      <span className={styles.listCardTitle}>
        {a.garden.customer.firstName} {a.garden.customer.lastName}
      </span>
      <span className={styles.listCardMeta}>
        {a.garden.street}, {a.garden.city}
        {a.serviceRequest && ` · ${REQUEST_TYPE_LABELS[a.serviceRequest.type]}`}
        {a.technician && ` · ${a.technician.name}`}
      </span>
    </Link>
    {a.garden.customer.phone && (
      <a href={`tel:${a.garden.customer.phone.replace(/\s/g, "")}`} className={styles.iconButton} title="Zavolať">
        <FiPhone />
      </a>
    )}
    <a href={mapsUrl(a.garden)} target="_blank" rel="noreferrer" className={styles.iconButton} title="Navigovať">
      <FiMapPin />
    </a>
  </div>
);

export const DashboardPage = () => {
  const { user, token } = useAuth();
  const firstName = user?.name?.split(" ")[0];
  const isTechnician = user.role === "TECHNICIAN";
  const [stats, setStats] = useState(null);
  const [today, setToday] = useState([]);
  const [lowStock, setLowStock] = useState([]);

  useEffect(() => {
    api.getRequestStats(token).then(setStats).catch(() => {});
    // Technik vidí svoje dnešné výjazdy, majiteľ všetky.
    const day = toDayKey(new Date());
    api
      .listAppointments(token, day, day, isTechnician ? user.id : undefined)
      .then((d) => setToday(d.appointments))
      .catch(() => {});
    if (user.role === "OWNER") {
      api.listMaterials(token, { lowOnly: "true" }).then((d) => setLowStock(d.materials)).catch(() => {});
    }
  }, [token, user.id, user.role, isTechnician]);

  return (
    <AppShell>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Ahoj, {firstName}</h1>
          <p className={styles.muted} style={{ margin: "0.2rem 0 0" }}>
            Prihlásený ako {ROLE_LABELS[user?.role]?.toLowerCase()}
          </p>
        </div>
        {lowStock.length > 0 && (
          <Link to="/materials" className={styles.calloutWarning} style={{ textDecoration: "none", padding: "0.6rem 0.9rem" }}>
            <FiAlertTriangle style={{ verticalAlign: "-2px" }} /> Dochádza materiál: {lowStock.length}{" "}
            {lowStock.length === 1 ? "položka" : "položky"}
          </Link>
        )}
      </div>

      {stats && (
        <div className={styles.statGridCompact}>
          {STAT_TILES.map((t) => (
            <Link key={t.key} to={t.to} className={styles.stat}>
              <span className={t.alert && stats[t.key] > 0 ? styles.statValueAlert : styles.statValue}>{stats[t.key]}</span>
              <span className={styles.muted}>{t.label}</span>
            </Link>
          ))}
        </div>
      )}

      <div className={styles.splitColumns}>
        <section className={styles.panelFill}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>
              <FiCalendar /> Dnešné výjazdy ({today.length})
            </h2>
          </div>
          <PagedList items={today} renderItem={(a) => <TodayRow a={a} />} empty={<p className={styles.emptyState}>Dnes žiadne výjazdy.</p>} />
        </section>
        <section className={`${styles.panelFill} ${styles.calendarPanel}`}>
          <MonthCalendar technicianId={isTechnician ? user.id : undefined} />
        </section>
      </div>
    </AppShell>
  );
};
