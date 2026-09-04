import React, { useState, useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import Sidebar from "../components/navigation/Sidebar";
import { Bell, ChevronRight, Menu } from "lucide-react";
import { notificationsService } from "../services/api/notificationsService";

const labels = {
  "/": "Home",
  "/announcements": "Announcements",
  "/events": "Events",
  "/grievances": "Grievances",
  "/blood": "Blood Bank",
  "/academics": "Academics",
  "/welfare": "Student Welfare",
  "/emergency": "Emergency Hub",
  "/magazine": "Union Magazine",
  "/map": "University Map",
  "/notifications": "Notifications",
  "/profile": "Profile",
  "/maintainer": "Maintainer Console",
  "/admin": "Admin Console",
  "/admin/users": "Admin Users",
};

export default function StudentLayout({ user, role, onLogout }) {
  const [toast, setToast] = useState("");
  const notify = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2200);
  };
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(() => notificationsService.getUnreadCount());

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = notificationsService.onNotificationsChange(setUnreadCount);
    return () => unsubscribe();
  }, []);

  const go = (key) => navigate(key === "home" ? "/" : `/${key}`);
  const label = labels[location.pathname] || "UnionHub";

  return (
    <div className="app">
      <Sidebar
        page={location.pathname === "/" ? "home" : location.pathname.slice(1)}
        go={go}
        open={mobileOpen}
        close={() => setMobileOpen(false)}
        role={role}
        user={user}
        unreadCount={unreadCount}
        onLogout={onLogout}
      />
      <main className="main">
        <header className="topbar">
          <button className="iconbtn mobile-menu" onClick={() => setMobileOpen(true)}>
            <Menu size={21} />
          </button>
          <div className="crumb">
            <span>UnionHub</span>
            <ChevronRight size={15} />
            <b>{label}</b>
          </div>
          <div className="top-actions">
            <label className="searchbox">
              <input placeholder="Search platform..." />
            </label>
            <button className="iconbtn" onClick={() => navigate("/notifications")} title="Notifications">
              <Bell size={19} />
              {unreadCount > 0 && <i>{unreadCount}</i>}
            </button>
            <div className="role-badge">
              {role === "admin" ? "Admin" : role === "maintainer" ? "Maintainer" : "Student"}
            </div>
          </div>
        </header>
        <div className="content">
          <Outlet context={{ go, notify, role, user, unreadCount }} />
        </div>
      </main>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
