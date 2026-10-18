import { Link } from "react-router-dom";
import { FiChevronRight } from "react-icons/fi";
import { PRIORITY_LABELS, REQUEST_STATUS_LABELS, REQUEST_TYPE_LABELS } from "../utils/labels";
import { fullName, timeAgo } from "../utils/format";
import styles from "../styles/neumorphic.module.css";

export const PriorityBadge = ({ priority }) => {
  if (priority === "EMERGENCY") return <span className={styles.badgeEmergency}>{PRIORITY_LABELS[priority]}</span>;
  if (priority === "HIGH") return <span className={styles.badgeHigh}>{PRIORITY_LABELS[priority]}</span>;
  return null;
};

export const StatusBadge = ({ status }) => {
  const cls = status === "NEW" ? styles.badgeBrand : status === "DONE" || status === "CLOSED" ? styles.badgeGreen : styles.badge;
  return <span className={cls}>{REQUEST_STATUS_LABELS[status]}</span>;
};

// Jedna požiadavka v zozname: priorita farbou, číslo, zákazník, ako dlho čaká.
export const RequestCard = ({ request, showCustomer = true }) => {
  const r = request;
  return (
    <Link to={`/requests/${r.id}`} className={styles.listCard}>
      <span className={`${styles.priorityStripe} ${styles[`priority${r.priority}`]}`} />
      <span className={styles.listCardMain}>
        <span className={styles.listCardTitle}>
          <span className={styles.muted}>#{r.number}</span> {r.title}
        </span>
        <span className={styles.listCardMeta}>
          {[
            showCustomer && r.customer && fullName(r.customer),
            r.garden?.city,
            REQUEST_TYPE_LABELS[r.type],
            timeAgo(r.createdAt),
            r.assignedTo && `→ ${r.assignedTo.name}`,
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </span>
      <span className={styles.chipRow} style={{ justifyContent: "flex-end" }}>
        <PriorityBadge priority={r.priority} />
        <StatusBadge status={r.status} />
      </span>
      <FiChevronRight style={{ flex: "none", color: "var(--neu-text-muted)" }} />
    </Link>
  );
};
