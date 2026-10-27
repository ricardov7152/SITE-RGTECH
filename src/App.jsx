import { lazy, Suspense } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import LandingPage from "./pages/LandingPage";

// Carregamento sob demanda (Code Splitting) para Login e Módulos do ERP
const ProtectedRoute = lazy(() => import("./components/ProtectedRoute"));
const Layout = lazy(() => import("./components/Layout"));
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/admin/Dashboard"));
const Clientes = lazy(() => import("./pages/admin/Clientes"));
const Produtos = lazy(() => import("./pages/admin/Produtos"));
const Orcamentos = lazy(() => import("./pages/admin/Orcamentos"));
const CriarOrcamento = lazy(() => import("./pages/admin/CriarOrcamento"));
const Financeiro = lazy(() => import("./pages/admin/Financeiro"));
const Configuracoes = lazy(() => import("./pages/admin/Configuracoes"));
const OrdemServico = lazy(() => import("./pages/admin/OrdemServico"));

function AdminLoader() {
  return (
    <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center text-white font-inter">
      <div className="text-center space-y-4">
        <div className="w-10 h-10 border-4 border-[#0029F5] border-t-[#19DDFF] rounded-full animate-spin mx-auto"></div>
        <p className="text-slate-400 text-xs uppercase tracking-widest font-semibold">Carregando módulo...</p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Suspense fallback={<AdminLoader />}>
        <Routes>
          {/* Rota Pública - Landing Page */}
          <Route path="/" element={<LandingPage />} />

          {/* Rota de Login */}
          <Route path="/login" element={<Login />} />

          {/* Rotas Privadas (ERP) */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="orcamentos" element={<Orcamentos />} />
            <Route path="orcamentos/novo" element={<CriarOrcamento />} />
            <Route path="orcamentos/editar/:id" element={<CriarOrcamento />} />
            <Route path="ordens-servico" element={<OrdemServico />} />
            <Route path="clientes" element={<Clientes />} />
            <Route path="financeiro" element={<Financeiro />} />
            <Route path="produtos" element={<Produtos />} />
            <Route path="configuracoes" element={<Configuracoes />} />
          </Route>

          {/* Rota de Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Router>
  );
}
