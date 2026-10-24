import { useSearchParams } from "react-router-dom";
import styles from "../styles/neumorphic.module.css";

export const useTab = (tabs, fallback) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const requested = searchParams.get("tab");
  const active = tabs.some((t) => t.key === requested) ? requested : fallback || tabs[0].key;
  const setActive = (key) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", key);
    setSearchParams(next, { replace: true });
  };
  return [active, setActive];
};

export const TabBar = ({ tabs, active, onChange }) => (
  <div className={styles.tabs}>
    {tabs.map((t) => (
      <button key={t.key} type="button" className={active === t.key ? styles.tabActive : styles.tab} onClick={() => onChange(t.key)}>
        {t.icon && <t.icon />}
        {t.label}
        {t.count > 0 && <span className={t.alert ? styles.countAlert : styles.count}>{t.count}</span>}
        {t.error && <span className={styles.tabError} />}
      </button>
    ))}
  </div>
);
