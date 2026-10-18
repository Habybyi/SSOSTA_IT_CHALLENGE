import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { FiUsers, FiInbox, FiCalendar, FiPackage } from "react-icons/fi";
import { AppShell } from "../components/AppShell";
import { useAuth } from "../context/AuthContext";
import { ROLE_LABELS } from "../utils/labels";
import styles from "../styles/neumorphic.module.css";

// Rozcestník. Dlaždice sa postupne "zapnú", ako pribúdajú fázy.
const TILES = [
  { icon: FiUsers, title: "Zákazníci", text: "Kontakty, adresy a technická karta každej záhrady.", phase: 1, to: "/customers" },
  { icon: FiInbox, title: "Požiadavky", text: "Poruchy, spustenia a zazimovania na jednom mieste.", phase: 2, to: "/requests" },
  { icon: FiCalendar, title: "Kalendár", text: "Termíny podľa lokality a kapacity na deň.", phase: 3 },
  { icon: FiPackage, title: "Materiál", text: "Čo zobrať na výjazd a čo sa minulo.", phase: 4 },
];

export const DashboardPage = () => {
  const { user, token } = useAuth();
  const firstName = user?.name?.split(" ")[0];
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.getRequestStats(token).then(setStats).catch(() => {});
  }, [token]);

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
