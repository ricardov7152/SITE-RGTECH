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
    // 1. Limpar sessão offline
    localStorage.removeItem("rgtech_session");
    // 2. Limpar sessão do Supabase Auth
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.error(e);
    }
    navigate("/login");
  };

  const navItems = [
    { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/admin/orcamentos", label: "Orçamentos", icon: FileText },
    { to: "/admin/ordens-servico", label: "Ordens de OS", icon: Wrench },
    { to: "/admin/clientes", label: "Clientes", icon: Users },
    { to: "/admin/financeiro", label: "Financeiro", icon: TrendingUp },
    { to: "/admin/produtos", label: "Produtos & Peças", icon: Package },
    { to: "/admin/configuracoes", label: "Configurações", icon: Settings },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#070707] text-[#e2e2e2] font-inter">
      {/* ── Sidebar ── */}
      <aside 
        className={`fixed inset-y-0 left-0 z-40 bg-[#0D0D0D] border-r border-white/5 flex flex-col transition-all duration-300 md:translate-x-0 md:static ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } ${isCollapsed ? "md:w-20" : "md:w-64"}`}
      >
        {/* Sidebar Header */}
        <div className="h-20 flex items-center justify-between px-6 border-b border-white/5">
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
              className="md:hidden text-slate-400 hover:text-white"
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
                      ? "bg-[#0029F5] text-white shadow-lg shadow-[#0029F5]/20 border-l-4 border-[#19DDFF]"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
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
        <div className={`p-4 border-t border-white/5 ${isCollapsed ? "flex justify-center" : ""}`}>
          <button
            onClick={handleLogout}
            className={`w-full flex items-center ${isCollapsed ? "justify-center px-0 w-12 h-12" : "gap-3.5 px-4 py-3"} rounded-xl text-sm font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/5 transition-all`}
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
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* ── Main Content Area ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-20 bg-[#0D0D0D] border-b border-white/5 flex items-center justify-between px-6 shrink-0 z-10">
          <div className="flex items-center gap-4">
            <button
              className="md:hidden text-slate-300 p-2 hover:bg-white/5 rounded-lg"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu size={24} />
            </button>
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden md:flex text-slate-400 hover:text-white p-2 hover:bg-white/5 rounded-lg transition-all"
              title={isCollapsed ? "Expandir menu" : "Recolher menu"}
            >
              {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            </button>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Sessão Ativa</span>
            <div className="w-8 h-8 rounded-full bg-[#0029F5] flex items-center justify-center font-bold text-xs text-[#19DDFF] border border-[#19DDFF]/20">
              RG
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-[#070707]">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
