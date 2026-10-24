import styles from "../styles/neumorphic.module.css";

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
