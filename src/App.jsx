
import { Route, Routes, Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import Nav from "./components/Nav.jsx";
import Homepage from "./components/Homepage/Homepage.jsx";
import Register from "./pages/Register.jsx";
import Login from "./pages/Login.jsx";
import { UnikProvider } from "./context/UnikProvider";





// Simple auth state (replace with real logic as needed)
function useAuth() {
  const [isAuth, setIsAuth] = useState(() => {
    return !!localStorage.getItem("isAuth");
  });
  const login = () => {
    localStorage.setItem("isAuth", "true");
    setIsAuth(true);
  };
  const logout = () => {
    localStorage.removeItem("isAuth");
    setIsAuth(false);
  };
  return { isAuth, login, logout };
}

function ProtectedRoute({ children }) {
  const { isAuth } = useAuth();
  const location = useLocation();
  if (!isAuth) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children;
}

function App() {
  // Use auth context
  const auth = useAuth();
  return (
    <UnikProvider>
      <div className="">
        <Nav onLogout={auth.logout} isAuth={auth.isAuth} />
        <Routes>
          <Route path="/" element={auth.isAuth ? <Navigate to="/homepage" replace /> : <Login onLogin={auth.login} />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={auth.isAuth ? <Navigate to="/homepage" replace /> : <Login onLogin={auth.login} />} />
          <Route path="/homepage" element={<ProtectedRoute><Homepage onLogout={auth.logout} /></ProtectedRoute>} />
        </Routes>
      </div>
    </UnikProvider>
  );
}

export default App;
