import { Link } from "react-router-dom";
import { FiChevronRight } from "react-icons/fi";
import { PRIORITY_LABELS, REQUEST_STATUS_LABELS, REQUEST_TYPE_LABELS } from "../utils/labels";
import { formatDayShort, formatTime, fullName, timeAgo, toDayKey } from "../utils/format";
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

export const RequestCard = ({ request, showCustomer = true, fixed = false }) => {
  const r = request;
  return (
    <Link to={`/requests/${r.id}`} className={fixed ? `${styles.listCard} ${styles.fixedRow}` : styles.listCard}>
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
            r.appointments?.[0]
              ? `termín ${formatDayShort(toDayKey(r.appointments[0].startsAt))}${
                  r.appointments[0].status === "RESERVED" ? " (rezervácia)" : ` ${formatTime(r.appointments[0].startsAt)}`
                }`
              : timeAgo(r.createdAt),
            r.assignedTo && `→ ${r.assignedTo.name}`,
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </span>
      <span className={styles.chipRow} style={{ justifyContent: "flex-end", flexWrap: "nowrap" }}>
        <PriorityBadge priority={r.priority} />
        <StatusBadge status={r.status} />
      </span>
      <FiChevronRight style={{ flex: "none", color: "var(--neu-text-muted)" }} />
    </Link>
  );
};
