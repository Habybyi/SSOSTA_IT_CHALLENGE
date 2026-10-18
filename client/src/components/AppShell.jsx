import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FiMenu,
  FiX,
  FiHome,
  FiUsers,
  FiInbox,
  FiCalendar,
  FiPackage,
  FiUserCheck,
  FiLogOut,
} from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import styles from "../styles/neumorphic.module.css";

// enabled: false = funkcia príde v ďalšej fáze, v menu je už vidno, kam aplikácia smeruje.
const NAV_ITEMS = [
  { to: "/dashboard", label: "Prehľad", short: "Prehľad", icon: FiHome, enabled: true },
  { to: "/customers", label: "Zákazníci", short: "Zákazníci", icon: FiUsers, enabled: true },
  { to: "/requests", label: "Požiadavky", short: "Požiadavky", icon: FiInbox, enabled: false },
  { to: "/calendar", label: "Kalendár", short: "Kalendár", icon: FiCalendar, enabled: false },
  { to: "/materials", label: "Materiál a sklad", short: "Sklad", icon: FiPackage, enabled: false },
  { to: "/team", label: "Tím", short: "Tím", icon: FiUserCheck, enabled: true, requireRole: "OWNER" },
];

// Technická karta záhrady patrí pod Zákazníkov.
const isItemActive = (item, pathname) =>
  pathname.startsWith(item.to) || (item.to === "/customers" && pathname.startsWith("/gardens"));

// Spoločný rám pre všetky obrazovky po prihlásení.
export const AppShell = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const visibleItems = NAV_ITEMS.filter((item) => !item.requireRole || item.requireRole === user?.role);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className={styles.page}>
      <div className={styles.cardWide}>
        <nav className={collapsed ? styles.sidebarCollapsed : styles.sidebar}>
          <button
            type="button"
            className={styles.sidebarToggle}
            onClick={() => setCollapsed((v) => !v)}
            title={collapsed ? "Rozbaliť menu" : "Zbaliť menu"}
          >
            {collapsed ? <FiMenu /> : <FiX />}
          </button>

          {!collapsed && <img src="/logo.png" alt="Custodia" className={styles.sidebarLogo} />}

          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive = isItemActive(item, location.pathname);

            if (!item.enabled) {
              return (
                <span key={item.to} className={styles.navItemDisabled} title="Príde v ďalšej fáze">
                  <Icon />
                  {!collapsed && item.label}
                </span>
              );
            }

            return (
              <Link key={item.to} to={item.to} className={isActive ? styles.navItemActive : styles.navItem}>
                <Icon />
                {!collapsed && item.label}
              </Link>
            );
          })}

          <div style={{ flex: 1 }} />
          <button type="button" onClick={handleLogout} className={styles.navItem} title="Odhlásiť sa">
            <FiLogOut />
            {!collapsed && `Odhlásiť (${user?.name?.split(" ")[0]})`}
          </button>
        </nav>

        <main className={styles.main}>
          <div className={styles.mobileHeader}>
            <img src="/logo.png" alt="Custodia" style={{ width: 140, mixBlendMode: "multiply" }} />
          </div>
          {children}
        </main>

        <nav className={styles.bottomNav}>
          {visibleItems
            .filter((item) => item.enabled)
            .map((item) => {
              const Icon = item.icon;
              const isActive = isItemActive(item, location.pathname);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={isActive ? styles.bottomNavItemActive : styles.bottomNavItem}
                >
                  <Icon />
                  {item.short}
                </Link>
              );
            })}
          <button type="button" onClick={handleLogout} className={styles.bottomNavItem}>
            <FiLogOut />
            Odhlásiť
          </button>
        </nav>
      </div>
    </div>
  );
};
