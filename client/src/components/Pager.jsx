import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import styles from "../styles/neumorphic.module.css";

// Čísla strán s vynechaním v strede: 1 … 4 5 6 … 12
const pageNumbers = (page, pageCount) => {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);
  const pages = new Set([1, pageCount, page - 1, page, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= pageCount).sort((a, b) => a - b);
  const result = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1] > 1) result.push("…" + p);
    result.push(p);
  });
  return result;
};

// Stránkovanie pod zoznamom: "1 až 8 z 23" a tlačidlá strán.
export const Pager = ({ page, pageSize, total, onChange }) => {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  return (
    <div className={styles.pagerBar}>
      <span className={styles.muted}>
        {from === to ? from : `${from} až ${to}`} z {total}
      </span>
      {pageCount > 1 && (
        <div className={styles.pagerButtons}>
          <button type="button" className={styles.pagerButton} disabled={page <= 1} onClick={() => onChange(page - 1)} title="Predchádzajúca strana">
            <FiChevronLeft />
          </button>
          {pageNumbers(page, pageCount).map((p) =>
            typeof p === "string" ? (
              <span key={p} className={styles.pagerEllipsis}>
                …
              </span>
            ) : (
              <button key={p} type="button" className={p === page ? styles.pagerButtonActive : styles.pagerButton} onClick={() => onChange(p)}>
                {p}
              </button>
            )
          )}
          <button type="button" className={styles.pagerButton} disabled={page >= pageCount} onClick={() => onChange(page + 1)} title="Ďalšia strana">
            <FiChevronRight />
          </button>
        </div>
      )}
    </div>
  );
};
