
import { Route, Routes } from "react-router-dom";
import Nav from "./components/Nav.jsx";
import Homepage from "./components/Homepage/Homepage.jsx";
import Register from "./pages/Register.jsx";
import Login from "./pages/Login.jsx";
import { UnikProvider } from "./context/UnikProvider";
import { useState } from "react";



function App() {
  // const [user, setUser] = useState(null);
  // if (!user) {
  //   // return <LoginRegister onLoginSuccess={setUser} />;
  // }
  // Bypass login for now, always show main app
  return (
    <UnikProvider>
      <div className="">
        <Nav />
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/homepage" element={<Homepage />} />
        </Routes>
      </div>
    </UnikProvider>
  );
}

export default App;
