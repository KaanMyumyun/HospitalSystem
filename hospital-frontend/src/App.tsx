import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/LoginPage";
import Department from "./pages/AdminPanel";
function App() {
return(
  <BrowserRouter>
  <Routes>
    <Route path="/" element={<Login/>}/>
    <Route path="departments" element={<Department/>}/>
  </Routes>
  </BrowserRouter>
);
}

export default App;
