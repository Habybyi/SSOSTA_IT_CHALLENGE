import { useEffect, useState } from "react";
import { useStoredState } from "../hooks";
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
  FiActivity,
} from "react-icons/fi";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import styles from "../styles/neumorphic.module.css";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Prehľad", short: "Prehľad", icon: FiHome, enabled: true },
  { to: "/customers", label: "Zákazníci", short: "Zákazníci", icon: FiUsers, enabled: true },
  { to: "/requests", label: "Požiadavky", short: "Požiadavky", icon: FiInbox, enabled: true, countKey: "new" },
  { to: "/calendar", label: "Kalendár", short: "Kalendár", icon: FiCalendar, enabled: true },
  { to: "/materials", label: "Materiál a sklad", short: "Sklad", icon: FiPackage, enabled: true },
  { to: "/team", label: "Tím", short: "Tím", icon: FiUserCheck, enabled: true, requireRole: "OWNER" },
  { to: "/audit", label: "Logy", short: "Logy", icon: FiActivity, enabled: true, requireRole: "OWNER", desktopOnly: true },
];

const CUSTOMER_NAV_ITEMS = [{ to: "/portal", label: "Môj portál", short: "Portál", icon: FiHome, enabled: true }];

const isItemActive = (item, pathname) =>
  pathname.startsWith(item.to) ||
  (item.to === "/customers" && pathname.startsWith("/gardens")) ||
  (item.to === "/calendar" && pathname.startsWith("/visits"));

export const AppShell = ({ children }) => {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useStoredState("sidebarCollapsed", false);
  const [counts, setCounts] = useState(null);

  useEffect(() => {
    if (user?.role === "CUSTOMER") return;
    api.getRequestStats(token).then(setCounts).catch(() => {});
  }, [token, user?.role, location.pathname]);

  const visibleItems =
    user?.role === "CUSTOMER" ? CUSTOMER_NAV_ITEMS : NAV_ITEMS.filter((item) => !item.requireRole || item.requireRole === user?.role);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className={`${styles.page} ${styles.appPage}`}>
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

          {collapsed ? (
            <img src="/brand/mark_dark.svg" alt="Custodia" className={styles.sidebarMark} />
          ) : (
            <img src="/brand/primary_dark.svg" alt="Custodia" className={styles.sidebarLogo} />
          )}

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
                {item.countKey && counts?.[item.countKey] > 0 && (
                  <span className={`${counts.emergency > 0 ? styles.countAlert : styles.count} ${styles.navCount}`}>
                    {counts[item.countKey]}
                  </span>
                )}
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
            <img src="/brand/secondary_dark.svg" alt="Custodia" className={styles.mobileLogo} />
          </div>
          <div className={styles.screen}>{children}</div>
        </main>

        <nav className={styles.bottomNav}>
          {visibleItems
            .filter((item) => item.enabled && !item.desktopOnly)
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
