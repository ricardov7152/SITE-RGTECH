import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  FileText, 
  Wrench,
  Users, 
  TrendingUp, 
  Package, 
  LogOut, 
  Menu, 
  X,
  Settings,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { supabase } from "../services/supabase";

export default function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    // Limpar sessão do Supabase Auth
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error(e);
    }
    navigate("/login");
  };

  const navItems = [
    { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/admin/ordens-servico", label: "Manutenção", icon: Wrench },
    { to: "/admin/orcamentos", label: "Orçamentos", icon: FileText },
    { to: "/admin/clientes", label: "Clientes", icon: Users },
    { to: "/admin/financeiro", label: "Financeiro", icon: TrendingUp },
    { to: "/admin/produtos", label: "Produtos & Peças", icon: Package },
    { to: "/admin/configuracoes", label: "Configurações", icon: Settings },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gradient-to-br from-[#021024] via-[#052659]/80 to-[#021024] text-[#e2e2e2] font-inter">
      {/* ── Sidebar ── */}
      <aside 
        className={`fixed inset-y-0 left-0 z-40 bg-gradient-to-b from-[#021024] via-[#052659]/90 to-[#021024] border-r border-[#7DA0CA]/20 flex flex-col transition-all duration-300 md:translate-x-0 md:static ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } ${isCollapsed ? "md:w-20" : "md:w-64"}`}
      >
        {/* Sidebar Header */}
        <div className="h-20 flex items-center justify-between px-6 border-b border-[#7DA0CA]/15">
          <div className={`flex items-center ${isCollapsed ? "mx-auto" : ""}`}>
            <img 
              src={isCollapsed ? "/favicoin.png" : "/logo.png"} 
              alt="RG TECH" 
              className={`object-contain transition-all duration-300 ${
                isCollapsed ? "h-9" : "h-14 -ml-3"
              }`} 
            />
          </div>
          {!isCollapsed && (
            <button 
              className="md:hidden text-[#7DA0CA] hover:text-[#C1E8FF]"
              onClick={() => setIsSidebarOpen(false)}
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Sidebar Nav */}
        <nav className={`flex-1 py-6 space-y-1.5 overflow-y-auto ${isCollapsed ? "px-2" : "px-4"}`}>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setIsSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center ${isCollapsed ? "justify-center px-0" : "gap-3.5 px-4"} py-3 rounded-xl text-sm font-semibold tracking-tight transition-all ${
                    isActive
                      ? "bg-gradient-to-r from-[#052659] via-[#5483B3] to-[#7DA0CA]/80 text-white shadow-lg shadow-[#021024]/50 border-l-4 border-[#C1E8FF]"
                      : "text-[#7DA0CA] hover:text-[#C1E8FF] hover:bg-[#052659]/50"
                  }`
                }
                title={isCollapsed ? item.label : ""}
              >
                <Icon size={18} className="shrink-0" />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className={`p-4 border-t border-[#7DA0CA]/15 ${isCollapsed ? "flex justify-center" : ""}`}>
          <button
            onClick={handleLogout}
            className={`w-full flex items-center ${isCollapsed ? "justify-center px-0 w-12 h-12" : "gap-3.5 px-4 py-3"} rounded-xl text-sm font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all`}
            title={isCollapsed ? "Sair do Painel" : ""}
          >
            <LogOut size={18} className="shrink-0" />
            {!isCollapsed && <span>Sair do Painel</span>}
          </button>
        </div>
      </aside>

      {/* Overlay para mobile quando sidebar aberta */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-30 bg-[#021024]/75 backdrop-blur-xs md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* ── Main Content Area ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-20 bg-gradient-to-r from-[#021024]/95 via-[#052659]/85 to-[#021024]/95 border-b border-[#7DA0CA]/20 flex items-center justify-between px-6 shrink-0 z-10">
          <div className="flex items-center gap-4">
            <button
              className="md:hidden text-[#C1E8FF] p-2 hover:bg-[#052659]/60 rounded-lg"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu size={24} />
            </button>
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden md:flex text-[#7DA0CA] hover:text-[#C1E8FF] p-2 hover:bg-[#052659]/60 rounded-lg transition-all"
              title={isCollapsed ? "Expandir menu" : "Recolher menu"}
            >
              {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            </button>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xs font-semibold tracking-wider text-[#7DA0CA] uppercase">Sessão Ativa</span>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#052659] to-[#5483B3] flex items-center justify-center font-bold text-xs text-[#C1E8FF] border border-[#C1E8FF]/30">
              RG
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-gradient-to-br from-[#021024] via-[#052659]/45 to-[#021024]">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
