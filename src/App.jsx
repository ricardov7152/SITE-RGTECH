import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import Layout from "./components/Layout";
import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";

// Páginas Administrativas (ERP)
import Dashboard from "./pages/admin/Dashboard";
import Clientes from "./pages/admin/Clientes";
import Produtos from "./pages/admin/Produtos";
import Orcamentos from "./pages/admin/Orcamentos";
import CriarOrcamento from "./pages/admin/CriarOrcamento";
import Financeiro from "./pages/admin/Financeiro";
import Configuracoes from "./pages/admin/Configuracoes";

export default function App() {
  return (
    <Router>
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
          <Route path="clientes" element={<Clientes />} />
          <Route path="financeiro" element={<Financeiro />} />
          <Route path="produtos" element={<Produtos />} />
          <Route path="configuracoes" element={<Configuracoes />} />
        </Route>

        {/* Rota de Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
