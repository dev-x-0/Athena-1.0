import { useMemo, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./state/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import IntroSequence from "./screens/IntroSequence";
import Auth from "./screens/Auth";
import CommandShell from "./screens/command/CommandShell";
import Home from "./screens/command/Home";
import History from "./screens/command/History";
import AnalysisDetail from "./screens/command/AnalysisDetail";
import RunAnalysis from "./screens/command/RunAnalysis";
import DataReferences from "./screens/command/DataReferences";

function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route path="/login" element={<Navigate to="/auth" replace />} />
      
      <Route element={<ProtectedRoute><CommandShell /></ProtectedRoute>}>
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