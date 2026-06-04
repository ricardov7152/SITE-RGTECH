import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "../services/supabase";

export default function ProtectedRoute({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAuth() {
      // 1. Verificar se há sessão de teste (Offline Dev Bypass)
      const devSessionStr = localStorage.getItem("rgtech_session");
      if (devSessionStr) {
        try {
          const devSession = JSON.parse(devSessionStr);
          if (devSession && devSession.expires_at > Date.now()) {
            setIsAuthenticated(true);
            setLoading(false);
            return;
          } else {
            localStorage.removeItem("rgtech_session");
          }
        } catch (e) {
          localStorage.removeItem("rgtech_session");
        }
      }

      // 2. Verificar sessão no Supabase Auth
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setIsAuthenticated(!!session);
      } catch (err) {
        console.error("Erro ao checar auth:", err);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center text-white">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-4 border-[#2D2B7A] border-t-white rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-400 text-sm">Verificando credenciais...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
