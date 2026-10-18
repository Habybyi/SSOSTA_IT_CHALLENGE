import styles from "../styles/neumorphic.module.css";

// Jeden údaj na karte. Prázdna hodnota sa ukáže ako pomlčka, aby bolo jasné, že chýba.
export const InfoItem = ({ label, children }) => {
  const isEmpty = children === null || children === undefined || children === "";
  return (
    <div className={styles.infoItem}>
      <span className={styles.infoLabel}>{label}</span>
      <p className={isEmpty ? styles.infoEmpty : styles.infoValue}>{isEmpty ? "nevyplnené" : children}</p>
    </div>
  );
};
