import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/LoginPage";
import Admin from "./pages/AdminPanel";
import ReceptionDashboard from "./pages/ReceptionDashboard";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/receptiondashboard" element={<ReceptionDashboard/>}/>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
