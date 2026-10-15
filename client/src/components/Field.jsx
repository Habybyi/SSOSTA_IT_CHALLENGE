import styles from "../styles/neumorphic.module.css";

// Input s popisom a chybou pod ním, aby Milan hneď videl, čo opraviť.
export const Field = ({ label, error, icon: Icon, children }) => {
  return (
    <label className={styles.field}>
      {label && <span className={styles.label}>{label}</span>}
      <span className={styles.inputWrapper}>
        {Icon && <Icon />}
        {children}
      </span>
      {error && <span className={styles.fieldError}>{error}</span>}
    </label>
  );
};
