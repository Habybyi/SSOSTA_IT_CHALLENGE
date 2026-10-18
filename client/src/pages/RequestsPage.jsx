import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FiPlus, FiSearch } from "react-icons/fi";
import { AppShell } from "../components/AppShell";
import { RequestCard } from "../components/RequestCard";
import { Pager } from "../components/Pager";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { useDebouncedValue, useServerPaging } from "../hooks";
import { PRIORITY_LABELS, REQUEST_TYPE_LABELS } from "../utils/labels";
import styles from "../styles/neumorphic.module.css";

const VIEWS = [
  { key: "open", label: "Otvorené", stat: "open" },
  { key: "new", label: "Nové", stat: "new" },
  { key: "mine", label: "Moje", stat: "mine" },
  { key: "done", label: "Vybavené" },
  { key: "all", label: "Všetky" },
];

export const RequestsPage = () => {
  const { token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get("view") || "open";
  const [q, setQ] = useState("");
  const [priority, setPriority] = useState("");
  const [type, setType] = useState("");
  const [stats, setStats] = useState(null);
  const [data, setData] = useState({ items: [], total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const debouncedQ = useDebouncedValue(q);
  const listRef = useRef(null);
  const { page, setPage, pageSize } = useServerPaging(listRef, `${view}|${debouncedQ}|${priority}|${type}`);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError("");
    Promise.all([api.listRequests(token, { view, q: debouncedQ, priority, type, page, pageSize }), api.getRequestStats(token)])
      .then(([result, nextStats]) => {
        if (cancelled) return;
        setData(result);
        setStats(nextStats);
      })
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setIsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [token, view, debouncedQ, priority, type, page, pageSize]);

  return (
    <AppShell>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Požiadavky</h1>
        <Link to="/requests/new" className={styles.primaryButtonInline} style={{ textDecoration: "none" }}>
          <FiPlus /> NOVÁ POŽIADAVKA
        </Link>
      </div>

      <div className={styles.tabs}>
        {VIEWS.map((v) => (
          <button
            key={v.key}
            type="button"
            className={view === v.key ? styles.tabActive : styles.tab}
            onClick={() => setSearchParams(v.key === "open" ? {} : { view: v.key })}
          >
            {v.label}
            {v.stat && stats?.[v.stat] > 0 && (
              <span className={v.key === "open" && stats.emergency > 0 ? styles.countAlert : styles.count} title={v.key === "open" && stats.emergency ? `Havárie: ${stats.emergency}` : undefined}>
                {stats[v.stat]}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className={styles.toolbar}>
        <div className={`${styles.inputWrapper} ${styles.toolbarSearch}`}>
          <FiSearch />
          <input
            className={styles.input}
            placeholder="Hľadať číslo, zákazníka, obec alebo text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className={styles.inputWrapper} style={{ flex: "1 1 150px" }}>
          <select className={styles.select} value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="">Každá priorita</option>
            {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.inputWrapper} style={{ flex: "1 1 170px" }}>
          <select className={styles.select} value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">Každý typ</option>
            {Object.entries(REQUEST_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>



      {error && <div className={styles.errorMessage} style={{ marginBottom: "1rem" }}>{error}</div>}

      <div className={styles.fill}>
        <div ref={listRef} className={styles.viewport}>
          {!isLoading && data.items.length === 0 ? (
            <p className={styles.emptyState}>{view === "open" ? "Nič otvorené. Všetko vybavené. 🌱" : "Žiadne požiadavky."}</p>
          ) : (
            data.items.map((r) => <RequestCard key={r.id} request={r} fixed />)
          )}
        </div>
        <Pager page={page} pageSize={pageSize} total={data.total} onChange={setPage} />
      </div>
    </AppShell>
  );
};
