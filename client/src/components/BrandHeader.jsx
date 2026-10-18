import styles from "../styles/neumorphic.module.css";

// Slogan je súčasťou loga (lockup) od grafikov.
export const SLOGAN = "Kráľovsky bez starostí";

export const BrandHeader = () => {
  return (
    <div className={styles.brand}>
      <img src="/brand/lockup_dark.svg" alt={`Custodia: ${SLOGAN}`} className={styles.brandLogo} />
    </div>
  );
};
