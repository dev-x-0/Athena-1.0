import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../state/AuthContext";

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, token } = useAuth();
  const location = useLocation();

  const isAuth = Boolean(
    isAuthenticated ||
    token ||
    localStorage.getItem("athena.token") ||
    localStorage.getItem("token")
  );

  if (!isAuth) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return children;
}

export { ProtectedRoute };