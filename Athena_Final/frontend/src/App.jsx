import { useMemo, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./state/AuthContext";
import IntroSequence from "./screens/IntroSequence";
import Auth from "./screens/Auth";
import CommandShell from "./screens/command/CommandShell";
import Home from "./screens/command/Home";
import History from "./screens/command/History";
import AnalysisDetail from "./screens/command/AnalysisDetail";
import RunAnalysis from "./screens/command/RunAnalysis";
import DataReferences from "./screens/command/DataReferences";

function RequireAuth({ children }) {
  const { token } = useAuth();
  const location = useLocation();
  if (!token) return <Navigate to="/auth" replace state={{ from: location }} />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route element={<RequireAuth><CommandShell /></RequireAuth>}>
        <Route index element={<Home />} />
        <Route path="history" element={<History />} />
        <Route path="history/:id" element={<AnalysisDetail />} />
        <Route path="run" element={<RunAnalysis />} />
        <Route path="references" element={<DataReferences />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  const skip = useMemo(
    () => new URLSearchParams(window.location.search).get("intro") === "0",
    []
  );
  const [introDone, setIntroDone] = useState(skip);

  return (
    <AuthProvider>
      {!introDone && <IntroSequence onDone={() => setIntroDone(true)} />}
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}