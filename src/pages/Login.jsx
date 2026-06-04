import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../services/supabase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      if (data.session) {
        navigate("/admin/dashboard");
      }
    } catch (err) {
      console.error("Erro no login:", err);
      setErrorMsg(err.message || "Erro desconhecido. Verifique suas credenciais.");
    } finally {
      setLoading(false);
    }
  };

  const handleDevBypass = () => {
    // Salvar uma sessão fictícia no LocalStorage para testes locais
    localStorage.setItem("rgtech_session", JSON.stringify({ user: { email: "admin@rgtech.com.br" }, expires_at: Date.now() + 3600000 }));
    navigate("/admin/dashboard");
  };

  return (
    <div className="relative min-h-screen bg-[#0D0D0D] text-[#e2e2e2] font-inter flex flex-col justify-center items-center px-4 overflow-hidden hero-gradient">
      {/* Decorative Grid */}
      <div className="absolute inset-0 opacity-5 pointer-events-none"
        style={{ backgroundImage: "radial-gradient(#2d2b7a 1px, transparent 1px)", backgroundSize: "32px 32px" }}>
      </div>
      
      {/* Decorative Glow */}
      <div className="absolute w-[400px] h-[400px] bg-blue-600/10 blur-[100px] rounded-full top-1/4 left-1/4 animate-pulse"></div>

      <div className="w-full max-w-md z-10">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <Link to="/">
            <img src="/logo.png" alt="RG TECH" className="h-20 mx-auto object-contain hover:scale-105 transition-all" />
          </Link>
          <h2 className="text-2xl font-bold tracking-tight text-white mt-4">Painel Administrativo</h2>
          <p className="text-slate-400 text-sm mt-1">Gerenciamento de Clientes, Orçamentos e Financeiro</p>
        </div>

        {/* Card */}
        <div className="glass p-8 rounded-2xl shadow-2xl relative">
          <form onSubmit={handleLogin} className="space-y-6">
            {errorMsg && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg text-center">
                {errorMsg}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">E-mail</label>
              <input
                type="email"
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-[#4A47FF] focus:ring-1 focus:ring-[#4A47FF] transition-all"
                placeholder="seu-email@rgtech.com.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Senha</label>
              <input
                type="password"
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-[#4A47FF] focus:ring-1 focus:ring-[#4A47FF] transition-all"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-[#2D2B7A] hover:bg-[#4A47FF] disabled:bg-slate-700 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-blue-900/30"
            >
              {loading ? "Entrando..." : "Acessar Painel"}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-[#0D0D0D]/10 px-2 text-slate-500 backdrop-blur-md">Ambiente de Teste</span></div>
          </div>

          {/* Bypass for Dev */}
          <button
            onClick={handleDevBypass}
            className="w-full py-3 border border-white/10 hover:border-white/20 hover:bg-white/5 text-slate-400 hover:text-white font-semibold text-xs rounded-xl transition-all"
          >
            Entrar como Administrador (Modo Offline / Teste)
          </button>
        </div>

        <div className="text-center mt-6">
          <Link to="/" className="inline-flex items-center gap-2 text-xs text-slate-500 hover:text-white transition-all">
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Voltar para o site
          </Link>
        </div>
      </div>
    </div>
  );
}
