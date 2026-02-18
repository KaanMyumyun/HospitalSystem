import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/LoginPage";
import Admin from "./pages/AdminPanel";
import ReceptionDashboard from "./pages/ReceptionDashboard";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public route */}
        <Route path="/" element={<Login />} />

        {/* Admin only */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute requiredRole="Admin">
              <Admin />
            </ProtectedRoute>
          }
        />

        {/* FrontDesk + Admin */}
        <Route
          path="/receptiondashboard"
          element={
            <ProtectedRoute requiredRole="FrontDesk">
              <ReceptionDashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
