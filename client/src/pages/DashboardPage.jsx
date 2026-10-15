import { FiUsers, FiInbox, FiCalendar, FiPackage } from "react-icons/fi";
import { AppShell } from "../components/AppShell";
import { useAuth } from "../context/AuthContext";
import { ROLE_LABELS } from "../utils/labels";
import styles from "../styles/neumorphic.module.css";

// Rozcestník. Dlaždice sa postupne "zapnú", ako pribúdajú fázy.
const TILES = [
  { icon: FiUsers, title: "Zákazníci", text: "Kontakty, adresy a technická karta každej záhrady.", phase: 1 },
  { icon: FiInbox, title: "Požiadavky", text: "Poruchy, spustenia a zazimovania na jednom mieste.", phase: 2 },
  { icon: FiCalendar, title: "Kalendár", text: "Termíny podľa lokality a kapacity na deň.", phase: 3 },
  { icon: FiPackage, title: "Materiál", text: "Čo zobrať na výjazd a čo sa minulo.", phase: 4 },
];

export const DashboardPage = () => {
  const { user } = useAuth();
  const firstName = user?.name?.split(" ")[0];

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

      <div className={styles.tileGrid}>
        {TILES.map(({ icon: Icon, title, text, phase }) => (
          <div key={title} className={styles.tile}>
            <Icon className={styles.tileIcon} />
            <span className={styles.tileTitle}>{title}</span>
            <span className={styles.muted}>{text}</span>
            <span className={styles.badgeMuted} style={{ alignSelf: "flex-start" }}>
              Fáza {phase}
            </span>
          </div>
        ))}
      </div>
    </AppShell>
  );
};
