import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./screens/Login";
import ResetPassword from "./screens/ResetPassword";
import CheckIn from "./screens/CheckIn";
import RequireAuth from "./components/RequireAuth";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <CheckIn />
            </RequireAuth>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
