import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { FiUsers, FiInbox, FiCalendar, FiPackage, FiMapPin, FiPhone } from "react-icons/fi";
import { Section } from "../components/Section";
import { REQUEST_TYPE_LABELS as TYPE_LABELS } from "../utils/labels";
import { formatTime, mapsUrl, toDayKey } from "../utils/format";
import { AppShell } from "../components/AppShell";
import { useAuth } from "../context/AuthContext";
import { ROLE_LABELS } from "../utils/labels";
import styles from "../styles/neumorphic.module.css";

// Rozcestník. Dlaždice sa postupne "zapnú", ako pribúdajú fázy.
const TILES = [
  { icon: FiUsers, title: "Zákazníci", text: "Kontakty, adresy a technická karta každej záhrady.", phase: 1, to: "/customers" },
  { icon: FiInbox, title: "Požiadavky", text: "Poruchy, spustenia a zazimovania na jednom mieste.", phase: 2, to: "/requests" },
  { icon: FiCalendar, title: "Kalendár", text: "Termíny podľa lokality a kapacity na deň.", phase: 3, to: "/calendar" },
  { icon: FiPackage, title: "Materiál", text: "Čo zobrať na výjazd a čo sa minulo.", phase: 4, to: "/materials" },
];

export const DashboardPage = () => {
  const { user, token } = useAuth();
  const firstName = user?.name?.split(" ")[0];
  const [stats, setStats] = useState(null);
  const [today, setToday] = useState([]);
  const [lowStock, setLowStock] = useState([]);

  useEffect(() => {
    api.getRequestStats(token).then(setStats).catch(() => {});
    // Technik vidí svoje dnešné výjazdy, majiteľ všetky.
    const day = toDayKey(new Date());
    api
      .listAppointments(token, day, day, user.role === "TECHNICIAN" ? user.id : undefined)
      .then((d) => setToday(d.appointments))
      .catch(() => {});
    if (user.role === "OWNER") {
      api.listMaterials(token, { lowOnly: "true" }).then((d) => setLowStock(d.materials)).catch(() => {});
    }
  }, [token, user.id, user.role]);

  const STAT_TILES = [
    { key: "new", label: "Nové požiadavky", to: "/requests?view=new" },
    { key: "emergency", label: "Havárie", to: "/requests", alert: true },
    { key: "open", label: "Otvorené spolu", to: "/requests" },
    { key: "mine", label: "Pridelené mne", to: "/requests?view=mine" },
  ];

  return (
    <AppShell>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Ahoj, {firstName}</h1>
          <p className={styles.muted} style={{ margin: "0.3rem 0 0" }}>
            Prihlásený ako {ROLE_LABELS[user?.role]?.toLowerCase()}
          </p>
        </div>
      </div>

      {stats && (
        <div className={styles.statGrid}>
          {STAT_TILES.map((t) => (
            <Link key={t.key} to={t.to} className={styles.stat}>
              <span className={t.alert && stats[t.key] > 0 ? styles.statValueAlert : styles.statValue}>{stats[t.key]}</span>
              <span className={styles.muted}>{t.label}</span>
            </Link>
          ))}
        </div>
      )}

      {lowStock.length > 0 && (
        <Link to="/materials" className={styles.calloutWarning} style={{ display: "block", marginBottom: "1.5rem", textDecoration: "none" }}>
          Dochádza materiál: {lowStock.map((m) => `${m.name} (${m.stockQty} ${m.unit})`).join(", ")}
        </Link>
      )}

      <Section title={`Dnešné výjazdy (${today.length})`} icon={FiCalendar}>
        {today.length === 0 ? (
          <p className={styles.emptyState}>Dnes žiadne výjazdy.</p>
        ) : (
          <div className={styles.list}>
            {today.map((a) => (
              <div key={a.id} className={styles.listCard}>
                <span className={styles.apptTime} style={{ minWidth: 48 }}>
                  {a.status === "DONE" ? "✓" : a.status === "RESERVED" ? "?" : formatTime(a.startsAt)}
                </span>
                <Link
                  to={`/visits/${a.id}`}
                  className={styles.listCardMain}
                  style={{ color: "inherit", textDecoration: "none" }}
                >
                  <span className={styles.listCardTitle}>
                    {a.garden.customer.firstName} {a.garden.customer.lastName}
                  </span>
                  <span className={styles.listCardMeta}>
                    {a.garden.street}, {a.garden.city}
                    {a.serviceRequest && ` · ${TYPE_LABELS[a.serviceRequest.type]}`}
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
            ))}
          </div>
        )}
      </Section>

      <div className={styles.tileGrid}>
        {TILES.map(({ icon: Icon, title, text, phase, to }) => {
          const content = (
            <>
              <Icon className={styles.tileIcon} />
              <span className={styles.tileTitle}>{title}</span>
              <span className={styles.muted}>{text}</span>
              {!to && (
                <span className={styles.badgeMuted} style={{ alignSelf: "flex-start" }}>
                  Fáza {phase}
                </span>
              )}
            </>
          );
          return to ? (
            <Link key={title} to={to} className={styles.tile}>
              {content}
            </Link>
          ) : (
            <div key={title} className={styles.tile} style={{ opacity: 0.6 }}>
              {content}
            </div>
          );
        })}
      </div>
    </AppShell>
  );
};
