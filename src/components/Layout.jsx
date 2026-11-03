import { useState, useEffect } from "react";
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
  ChevronRight,
  Sun,
  Moon
} from "lucide-react";
import { supabase } from "../services/supabase";

export default function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("rgtech_admin_theme") || "dark";
    } catch {
      return "dark";
    }
  });

  const navigate = useNavigate();

  useEffect(() => {
    try {
      localStorage.setItem("rgtech_admin_theme", theme);
    } catch {
      // ignore
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const handleLogout = async () => {
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

  const isLight = theme === "light";

  return (
    <div className={`flex h-screen w-screen overflow-hidden font-inter ${isLight ? "light bg-[#f1f5f9] text-[#0f172a]" : "bg-[#070707] text-[#e2e2e2]"}`}>
      {/* ── Sidebar ── */}
      <aside 
        className={`fixed inset-y-0 left-0 z-40 border-r flex flex-col transition-all duration-300 md:translate-x-0 md:static ${
          isLight ? "bg-white border-slate-200" : "bg-[#0D0D0D] border-white/5"
        } ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } ${isCollapsed ? "md:w-20" : "md:w-64"}`}
      >
        {/* Sidebar Header */}
        <div className={`h-20 flex items-center justify-between px-6 border-b ${isLight ? "border-slate-200" : "border-white/5"}`}>
          <div className={`flex items-center ${isCollapsed ? "mx-auto" : ""}`}>
            <img 
              src={isCollapsed ? "/favicoin.png" : (isLight ? "/logo_dark.png" : "/logo.png")} 
              alt="RG TECH" 
              className={`object-contain transition-all duration-300 ${
                isCollapsed ? "h-9" : "h-14 -ml-3"
              }`} 
            />
          </div>
          {!isCollapsed && (
            <button 
              className={`md:hidden p-1 rounded-lg ${isLight ? "text-slate-500 hover:text-slate-900" : "text-slate-400 hover:text-white"}`}
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
                      ? "bg-[#0029F5] text-white shadow-lg shadow-[#0029F5]/25 border-l-4 border-[#19DDFF]"
                      : isLight
                      ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
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
        <div className={`p-4 border-t space-y-2 ${isLight ? "border-slate-200" : "border-white/5"} ${isCollapsed ? "flex flex-col items-center" : ""}`}>
          <button
            onClick={toggleTheme}
            className={`w-full flex items-center ${isCollapsed ? "justify-center px-0 w-12 h-12" : "gap-3.5 px-4 py-2.5"} rounded-xl text-xs font-bold transition-all ${
              isLight 
                ? "bg-slate-100 hover:bg-slate-200 text-slate-700" 
                : "bg-white/5 hover:bg-white/10 text-slate-300"
            }`}
            title={isLight ? "Mudar para Modo Dark" : "Mudar para Modo Branco"}
          >
            {isLight ? <Moon size={16} className="text-[#0029F5] shrink-0" /> : <Sun size={16} className="text-[#19DDFF] shrink-0" />}
            {!isCollapsed && <span>{isLight ? "Modo Dark" : "Modo Branco"}</span>}
          </button>

          <button
            onClick={handleLogout}
            className={`w-full flex items-center ${isCollapsed ? "justify-center px-0 w-12 h-12" : "gap-3.5 px-4 py-2.5"} rounded-xl text-sm font-semibold text-red-500 hover:text-red-400 hover:bg-red-500/10 transition-all`}
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
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top Header */}
        <header className={`h-20 border-b flex items-center justify-between px-6 shrink-0 z-10 ${
          isLight ? "bg-white border-slate-200 text-slate-900" : "bg-[#0D0D0D] border-white/5 text-white"
        }`}>
          <div className="flex items-center gap-4">
            <button
              className={`md:hidden p-2 rounded-lg ${isLight ? "text-slate-700 hover:bg-slate-100" : "text-slate-300 hover:bg-white/5"}`}
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu size={24} />
            </button>
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={`hidden md:flex p-2 rounded-lg transition-all ${
                isLight ? "text-slate-500 hover:text-slate-900 hover:bg-slate-100" : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
              title={isCollapsed ? "Expandir menu" : "Recolher menu"}
            >
              {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            </button>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                isLight 
                  ? "bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700" 
                  : "bg-white/5 hover:bg-white/10 border-white/10 text-slate-300"
              }`}
              title={isLight ? "Mudar para Modo Dark" : "Mudar para Modo Branco"}
            >
              {isLight ? <Moon size={14} className="text-[#0029F5]" /> : <Sun size={14} className="text-[#19DDFF]" />}
              <span className="hidden sm:inline">{isLight ? "Modo Dark" : "Modo Branco"}</span>
            </button>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className={`text-xs font-semibold tracking-wider uppercase ${isLight ? "text-slate-500" : "text-slate-400"}`}>Sessão Ativa</span>
            <div className="w-8 h-8 rounded-full bg-[#0029F5] flex items-center justify-center font-bold text-xs text-[#19DDFF] border border-[#19DDFF]/30">
              RG
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className={`flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 ${isLight ? "bg-[#f8fafc]" : "bg-[#070707]"}`}>
          <div className="w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
