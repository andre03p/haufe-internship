import { Routes, Route, Link, useLocation } from "react-router-dom";
import { Code, Settings, BarChart } from "lucide-react";
import Dashboard from "./pages/Dashboard";
import ReviewDetail from "./pages/ReviewDetail";
import CodingStandards from "./pages/CodingStandards";

function Navigation() {
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <nav
      style={{
        backgroundColor: "var(--gh-bg-secondary)",
        borderBottom: "1px solid var(--gh-border-default)",
        position: "sticky",
        top: 0,
        zIndex: 50,
        boxShadow: "var(--gh-shadow-sm)",
      }}
    >
      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "0 24px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: "64px",
          }}
        >
          <Link
            to="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              textDecoration: "none",
            }}
          >
            <div
              style={{
                background:
                  "linear-gradient(135deg, var(--gh-success-emphasis), var(--gh-success-fg))",
                padding: "8px",
                borderRadius: "var(--gh-radius-md)",
                boxShadow: "var(--gh-shadow-sm)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Code style={{ width: "24px", height: "24px", color: "white" }} />
            </div>
            <div>
              <h1
                style={{
                  fontSize: "20px",
                  fontWeight: 600,
                  color: "var(--gh-text-primary)",
                  marginBottom: "2px",
                }}
              >
                AI Code Review
              </h1>
              <p style={{ fontSize: "12px", color: "var(--gh-text-tertiary)" }}>
                Automated Quality Assurance
              </p>
            </div>
          </Link>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <NavLink
              to="/"
              icon={<BarChart style={{ width: "20px", height: "20px" }} />}
              active={isActive("/")}
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/standards"
              icon={<Settings style={{ width: "20px", height: "20px" }} />}
              active={isActive("/standards")}
            >
              Standards
            </NavLink>
          </div>
        </div>
      </div>
    </nav>
  );
}

function NavLink({ to, icon, children, active }) {
  return (
    <Link
      to={to}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "8px 16px",
        borderRadius: "var(--gh-radius-sm)",
        fontSize: "14px",
        fontWeight: active ? 600 : 500,
        textDecoration: "none",
        transition: "all 0.2s ease",
        backgroundColor: active ? "var(--gh-success-emphasis)" : "transparent",
        color: active ? "white" : "var(--gh-text-secondary)",
        border: active
          ? "1px solid rgba(240, 246, 252, 0.1)"
          : "1px solid transparent",
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.backgroundColor = "var(--gh-bg-tertiary)";
          e.currentTarget.style.color = "var(--gh-text-primary)";
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.backgroundColor = "transparent";
          e.currentTarget.style.color = "var(--gh-text-secondary)";
        }
      }}
    >
      {icon}
      {children}
    </Link>
  );
}

function App() {
  return (
    <div
      style={{ minHeight: "100vh", backgroundColor: "var(--gh-bg-primary)" }}
    >
      <Navigation />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/review/:id" element={<ReviewDetail />} />
        <Route path="/standards" element={<CodingStandards />} />
      </Routes>
    </div>
  );
}

export default App;
