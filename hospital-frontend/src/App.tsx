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

        {/* Admin only (Real & Demo) */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={["Admin", "DemoAdmin"]}>
              <Admin />
            </ProtectedRoute>
          }
        />

        {/* FrontDesk (Real & Demo) + Admins */}
        <Route
          path="/receptiondashboard"
          element={
            <ProtectedRoute allowedRoles={["FrontDesk", "DemoFrontDesk", "Admin", "DemoAdmin"]}>
              <ReceptionDashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;