import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Login from "./screens/Login";
import ResetPassword from "./screens/ResetPassword";
import CheckIn from "./screens/CheckIn";
import FindGuest from "./screens/FindGuest";
import RegisterGuest from "./screens/RegisterGuest";
import GuestList from "./screens/GuestList";
import RecordServices from "./screens/RecordServices";
import VisitSummary from "./screens/VisitSummary";
import RequireAuth from "./components/RequireAuth";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
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
          <Route
            path="/guests/find"
            element={
              <RequireAuth>
                <FindGuest />
              </RequireAuth>
            }
          />
          <Route
            path="/guests/new"
            element={
              <RequireAuth>
                <RegisterGuest />
              </RequireAuth>
            }
          />
          <Route
            path="/guests"
            element={
              <RequireAuth>
                <GuestList />
              </RequireAuth>
            }
          />
          <Route
            path="/visits/:visitId/services"
            element={
              <RequireAuth>
                <RecordServices />
              </RequireAuth>
            }
          />
          <Route
            path="/visits/:visitId/summary"
            element={
              <RequireAuth>
                <VisitSummary />
              </RequireAuth>
            }
          />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
