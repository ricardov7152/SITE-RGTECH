import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  TrendingUp, 
  Package, 
  LogOut, 
  Menu, 
  X 
} from "lucide-react";
import { supabase } from "../services/supabase";

export default function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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
    { to: "/admin/clientes", label: "Clientes", icon: Users },
    { to: "/admin/financeiro", label: "Financeiro", icon: TrendingUp },
    { to: "/admin/produtos", label: "Produtos & Peças", icon: Package },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#070707] text-[#e2e2e2] font-inter">
      {/* ── Sidebar ── */}
      <aside 
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#0D0D0D] border-r border-white/5 flex flex-col transition-transform duration-300 md:translate-x-0 md:static ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Sidebar Header */}
        <div className="h-20 flex items-center justify-between px-6 border-b border-white/5">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="RG TECH" className="h-12 w-auto object-contain" />
            <span className="font-bold text-white tracking-wider text-sm">ERP</span>
          </div>
          <button 
            className="md:hidden text-slate-400 hover:text-white"
            onClick={() => setIsSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        {/* Sidebar Nav */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setIsSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold tracking-tight transition-all ${
                    isActive
                      ? "bg-[#2D2B7A] text-white shadow-lg shadow-blue-900/10 border-l-4 border-blue-400"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`
                }
              >
                <Icon size={18} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-white/5">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/5 transition-all"
          >
            <LogOut size={18} />
            Sair do Painel
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
          <button
            className="md:hidden text-slate-300 p-2 hover:bg-white/5 rounded-lg"
            onClick={() => setIsSidebarOpen(true)}
          >
            <Menu size={24} />
          </button>
          
          <div className="ml-auto flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">Sessão Ativa</span>
            <div className="w-8 h-8 rounded-full bg-[#2D2B7A] flex items-center justify-center font-bold text-xs text-white">
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
