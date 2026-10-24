import { useEffect, useState } from "react";
import { FiBarChart2, FiGlobe, FiInbox, FiTrendingDown } from "react-icons/fi";
import { AppShell } from "../components/AppShell";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { SOURCE_LABELS } from "../utils/labels";
import { fromDayKey } from "../utils/format";
import styles from "../styles/neumorphic.module.css";

const RANGES = [7, 30, 90];

const pct = (part, whole) => (whole ? `${Math.round((part / whole) * 100)} %` : "–");

const BarList = ({ rows, empty }) => {
  if (!rows.length) return <p className={styles.emptyState}>{empty}</p>;
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className={styles.barList}>
      {rows.map((r) => (
        <div key={r.label} className={styles.barRow}>
          <span className={styles.barLabel}>{r.label}</span>
          <span className={styles.barTrack}>
            <span className={styles.barFill} style={{ width: `${(r.value / max) * 100}%` }} />
          </span>
          <strong className={styles.barValue}>{r.value}</strong>
          {r.note !== undefined && <span className={styles.barNote}>{r.note}</span>}
        </div>
      ))}
    </div>
  );
};

const dayLabel = (key) => fromDayKey(key).toLocaleDateString("sk-SK", { weekday: "short", day: "numeric", month: "numeric" });

const DailyChart = ({ daily, days }) => {
  const [hover, setHover] = useState(null);
  const byDay = Object.fromEntries(daily.map((d) => [d.day, d.count]));
  const series = Array.from({ length: days }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - i));
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    return { key, count: byDay[key] || 0 };
  });
  const max = Math.max(1, ...series.map((s) => s.count));
  const total = series.reduce((sum, s) => sum + s.count, 0);
  const shown = hover !== null ? series[hover] : null;
  return (
    <div className={styles.dailyChart}>
      <div className={styles.dailyReadout}>
        {shown ? (
          <>
            <strong>{shown.count}</strong> {shown.count === 1 ? "návšteva" : "návštev"} · {dayLabel(shown.key)}
          </>
        ) : (
          <>
            <strong>{total}</strong> návštev za {days} dní · prejdi myšou na deň
          </>
        )}
      </div>
      <div className={styles.dailyBars} onMouseLeave={() => setHover(null)} role="img" aria-label={`Návštevy po dňoch, spolu ${total}`}>
        {series.map((s, i) => (
          <button
            key={s.key}
            type="button"
            className={styles.dailyCol}
            onMouseEnter={() => setHover(i)}
            onFocus={() => setHover(i)}
            aria-label={`${dayLabel(s.key)}: ${s.count}`}
          >
            <span className={hover === i ? styles.dailyBarActive : styles.dailyBar} style={{ height: `${Math.max(s.count ? 4 : 0, (s.count / max) * 100)}%` }} />
          </button>
        ))}
      </div>
      <div className={styles.dailyAxis}>
        <span>{dayLabel(series[0].key)}</span>
        <span>dnes</span>
      </div>
    </div>
  );
};

export const WebStatsPage = () => {
  const { token } = useAuth();
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .getWebStats(token, days)
      .then((d) => {
        setData(d);
        setError("");
      })
      .catch((err) => setError(err.message));
  }, [token, days]);

  const c = data?.counts;
  const funnel = c
    ? [
        { label: "Návštevy webu", value: c.page_view, note: "" },
        { label: "Začali kalkulačku", value: c.calc_start, note: pct(c.calc_start, c.page_view) },
        { label: "Dokončili výpočet", value: c.calc_complete, note: pct(c.calc_complete, c.calc_start) },
        { label: "Odoslali dopyt", value: c.lead_submit, note: pct(c.lead_submit, c.calc_complete) },
      ]
    : [];

  return (
    <AppShell>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Web a dopyty</h1>
          <p className={styles.muted} style={{ margin: "0.2rem 0 0" }}>
            Anonymné súčty z webu, bez cookies a bez osobných údajov.
          </p>
        </div>
        <div className={styles.buttonRow}>
          {RANGES.map((r) => (
            <button key={r} type="button" className={r === days ? styles.tabActive : styles.tab} onClick={() => setDays(r)}>
              {r} dní
            </button>
          ))}
        </div>
      </div>

      {error && <div className={styles.errorMessage} style={{ marginBottom: "1rem" }}>{error}</div>}

      {data && (
        <>
          <div className={styles.statGridCompact}>
            <div className={styles.stat}>
              <span className={styles.statValue}>{c.page_view}</span>
              <span className={styles.muted}>Návštevy webu</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>{c.lead_submit}</span>
              <span className={styles.muted}>Dopyty z kalkulačky</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>{c.service_submit}</span>
              <span className={styles.muted}>Servis cez web</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>{pct(c.lead_submit, c.page_view)}</span>
              <span className={styles.muted}>Návštev skončí dopytom</span>
            </div>
          </div>

          <div className={styles.splitColumns}>
            <section className={styles.panelFill}>
              <div className={styles.statsScroll}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>
                    <FiTrendingDown /> Lievik kalkulačky
                  </h2>
                </div>
                <BarList rows={funnel} empty="Zatiaľ žiadne dáta." />
                <div className={styles.sectionHeader} style={{ marginTop: "1.25rem" }}>
                  <h2 className={styles.sectionTitle}>
                    <FiBarChart2 /> Návštevy po dňoch
                  </h2>
                </div>
                <DailyChart daily={data.daily} days={days} />
              </div>
            </section>

            <section className={styles.panelFill}>
              <div className={styles.statsScroll}>
                <div className={styles.sectionHeader}>
                  <h2 className={styles.sectionTitle}>
                    <FiGlobe /> Odkiaľ chodia návštevníci
                  </h2>
                </div>
                <BarList rows={data.sources.map((s) => ({ label: s.source, value: s.count }))} empty="Zatiaľ žiadne návštevy." />
                <div className={styles.sectionHeader} style={{ marginTop: "1.25rem" }}>
                  <h2 className={styles.sectionTitle}>
                    <FiInbox /> Požiadavky v CRM podľa zdroja
                  </h2>
                </div>
                <BarList
                  rows={data.requestsBySource.map((s) => ({ label: SOURCE_LABELS[s.source] || s.source, value: s.count }))}
                  empty="V tomto období žiadne požiadavky."
                />
                <p className={styles.muted} style={{ marginBottom: 0 }}>
                  Z webu prišlo {data.webCustomers.leads + data.webCustomers.active} nových ľudí, zákazníkmi sa stalo{" "}
                  <strong>{data.webCustomers.active}</strong>.
                </p>
              </div>
            </section>
          </div>
        </>
      )}
    </AppShell>
  );
};
