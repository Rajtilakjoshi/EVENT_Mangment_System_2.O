import { Route, Routes, Navigate, useLocation } from "react-router-dom";
import { useEffect, useState, createContext, useContext } from "react";
import React from "react";
import Nav from "./components/Nav.jsx";
import Homepage from "./components/Homepage/Homepage.jsx";
import Register from "./pages/Register.jsx";
import Login from "./pages/Login.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import ApiManualTestConsole from "./components/ApiManualTestConsole.jsx";
import { apiFetch } from "./utils/apiUtils";
import { startOnlineFlush } from "./utils/offlineQueue";

// --- Top-level Error Boundary ---
class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[AppErrorBoundary]", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "2rem", textAlign: "center" }}>
          <h1 style={{ color: "#7c3aed", fontSize: "2rem" }}>Something went wrong</h1>
          <p style={{ color: "#555", marginTop: "1rem" }}>
            Please refresh the page or try again later.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.href = "/";
            }}
            style={{
              marginTop: "1.5rem",
              padding: "0.5rem 2rem",
              backgroundColor: "#7c3aed",
              color: "white",
              border: "none",
              borderRadius: "0.5rem",
              cursor: "pointer",
              fontSize: "1rem",
            }}
          >
            Go to Home
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

function AuthProvider({ children }) {
  const [isAuth, setIsAuth] = useState(() => !!localStorage.getItem("isAuth"));

  const login = () => {
    localStorage.setItem("isAuth", "true");
    setIsAuth(true);
  };
  const logout = () => {
    localStorage.removeItem("isAuth");
    setIsAuth(false);
  };

  useEffect(() => startOnlineFlush(apiFetch), []);

  return (
    <AuthContext.Provider value={{ isAuth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

function ProtectedRoute({ children }) {
  const { isAuth } = useAuth();
  const location = useLocation();
  if (!isAuth) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children;
}

// --- 404 Page ---
function NotFound() {
  return (
    <div style={{ padding: "2rem", textAlign: "center", minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <h1 style={{ color: "#7c3aed", fontSize: "4rem", margin: 0 }}>404</h1>
      <p style={{ color: "#555", fontSize: "1.2rem", marginTop: "0.5rem" }}>Page not found</p>
      <a
        href="/"
        style={{
          marginTop: "1.5rem",
          padding: "0.5rem 2rem",
          backgroundColor: "#7c3aed",
          color: "white",
          borderRadius: "0.5rem",
          textDecoration: "none",
          fontSize: "1rem",
        }}
      >
        Go to Home
      </a>
    </div>
  );
}

function App() {
  return (
    <AppErrorBoundary>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </AppErrorBoundary>
  );
}

function AppShell() {
  const auth = useAuth();
  return (
    <div>
      <Nav onLogout={auth.logout} isAuth={auth.isAuth} />
      <Routes>
        <Route
          path="/"
          element={
            auth.isAuth ? (
              <Navigate to="/homepage" replace />
            ) : (
              <Login onLogin={auth.login} />
            )
          }
        />
        <Route path="/register" element={<Register />} />
        <Route
          path="/login"
          element={
            auth.isAuth ? (
              <Navigate to="/homepage" replace />
            ) : (
              <Login onLogin={auth.login} />
            )
          }
        />
        <Route
          path="/homepage"
          element={
            <ProtectedRoute>
              <Homepage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/api-test" element={<ApiManualTestConsole />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}

export default App;
