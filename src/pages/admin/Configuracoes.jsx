import { useState, useEffect } from "react";
import { Settings, Target, Bell, Calendar, Plus, Trash2, CheckCircle2 } from "lucide-react";

export default function Configuracoes() {
  const [configs, setConfigs] = useState({
    metas: {},
    dias_alerta_followup: 3,
  });

  // Estado para cadastrar nova meta
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    return `${d.getFullYear()}-${month}`;
  });
  const [metaValue, setMetaValue] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("rg_local_configuracoes");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setConfigs({
          metas: parsed.metas || {},
          dias_alerta_followup: parsed.dias_alerta_followup !== undefined ? parsed.dias_alerta_followup : 3,
        });
      } catch (e) {
        console.error("Erro ao ler configurações locais:", e);
      }
    } else {
      // Migrar meta antiga se houver
      const oldMeta = localStorage.getItem("rg_local_meta_faturamento");
      if (oldMeta) {
        const d = new Date();
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const initialMetas = { [monthKey]: Number(oldMeta) };
        const initialConfigs = { metas: initialMetas, dias_alerta_followup: 3 };
        setConfigs(initialConfigs);
        localStorage.setItem("rg_local_configuracoes", JSON.stringify(initialConfigs));
      }
    }
  }, []);

  const saveConfigs = (newConfigs) => {
    setConfigs(newConfigs);
    localStorage.setItem("rg_local_configuracoes", JSON.stringify(newConfigs));
    
    // Sincronizar também o valor da meta do mês atual com a chave antiga para compatibilidade se necessário
    const currentMonthKey = new Date().toISOString().substring(0, 7);
    if (newConfigs.metas[currentMonthKey]) {
      localStorage.setItem("rg_local_meta_faturamento", newConfigs.metas[currentMonthKey]);
    }

    setSuccessMsg("Configurações salvas com sucesso!");
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const handleAddMeta = (e) => {
    e.preventDefault();
    const val = Number(metaValue);
    if (isNaN(val) || val <= 0) {
      alert("Por favor, insira um valor de meta válido e maior que zero.");
      return;
    }

    const updatedMetas = {
      ...configs.metas,
      [selectedMonth]: val,
    };

    saveConfigs({
      ...configs,
      metas: updatedMetas,
    });
    setMetaValue("");
  };

  const handleDeleteMeta = (monthKey) => {
    if (!window.confirm(`Deseja remover a meta para o mês ${monthKey}?`)) return;
    
    const updatedMetas = { ...configs.metas };
    delete updatedMetas[monthKey];

    saveConfigs({
      ...configs,
      metas: updatedMetas,
    });
  };

  const handleUpdateFollowup = (val) => {
    const days = Math.max(1, parseInt(val, 10) || 1);
    saveConfigs({
      ...configs,
      dias_alerta_followup: days,
    });
  };

  // Formatador de nome do mês (ex: 2026-06 -> Junho de 2026)
  const formatMonthName = (monthKey) => {
    const [year, month] = monthKey.split("-");
    const date = new Date(Number(year), Number(month) - 1, 15);
    return date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            <Settings size={28} className="text-[#4A47FF]" /> Configurações Gerais
          </h1>
          <p className="text-slate-400 text-sm mt-1">Gerenciamento de metas comerciais e regras operacionais do ERP</p>
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-4 rounded-xl flex items-center gap-3 animate-fadeIn">
          <CheckCircle2 size={18} className="shrink-0" />
          <span className="text-sm font-semibold">{successMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Metas Card */}
        <div className="glass p-6 rounded-2xl shadow-xl space-y-6 lg:col-span-2">
          <div className="flex items-center gap-2.5 border-b border-white/5 pb-4">
            <Target className="text-purple-400" size={20} />
            <h3 className="font-bold text-white text-base">Metas de Faturamento</h3>
          </div>

          <form onSubmit={handleAddMeta} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end bg-white/2 p-4 rounded-xl border border-white/5">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Selecione o Mês</label>
              <input 
                type="month"
                className="w-full bg-[#0D0D0D] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#4A47FF] transition-all"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Meta de Faturamento (R$)</label>
              <input 
                type="number"
                placeholder="Ex: 5000"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#4A47FF] transition-all"
                value={metaValue}
                onChange={(e) => setMetaValue(e.target.value)}
                required
                min="1"
              />
            </div>
            <button 
              type="submit"
              className="flex items-center justify-center gap-2 bg-[#2D2B7A] hover:bg-[#4A47FF] px-4 py-2.5 rounded-xl font-bold text-sm text-white shadow-lg transition-all"
            >
              <Plus size={16} /> Definir Meta
            </button>
          </form>

          {/* Histórico/Lista de metas */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Metas Configuradas</h4>
            {Object.keys(configs.metas).length === 0 ? (
              <p className="text-sm text-slate-500 py-6 text-center">Nenhuma meta mensal definida ainda.</p>
            ) : (
              <div className="divide-y divide-white/5 bg-white/2 rounded-xl border border-white/5 overflow-hidden">
                {Object.entries(configs.metas)
                  .sort((a, b) => b[0].localeCompare(a[0])) // Meses mais recentes primeiro
                  .map(([monthKey, value]) => (
                    <div key={monthKey} className="flex justify-between items-center px-4 py-3.5 hover:bg-white/2 transition-all">
                      <div className="flex items-center gap-3">
                        <Calendar size={16} className="text-slate-400" />
                        <div>
                          <span className="font-semibold text-white text-sm capitalize">{formatMonthName(monthKey)}</span>
                          <span className="block text-[10px] text-slate-500 font-bold uppercase">{monthKey}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-bold text-emerald-400 text-sm">
                          R$ {value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                        <button 
                          onClick={() => handleDeleteMeta(monthKey)}
                          className="text-red-500 hover:text-red-400 hover:bg-red-500/10 p-1.5 rounded-lg transition-all"
                          title="Remover Meta"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Regras Operacionais Card */}
        <div className="glass p-6 rounded-2xl shadow-xl space-y-6">
          <div className="flex items-center gap-2.5 border-b border-white/5 pb-4">
            <Bell className="text-sky-400" size={20} />
            <h3 className="font-bold text-white text-base">Regras de Negócio</h3>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-400">
                Alerta de Orçamento Sem Resposta (Dias)
              </label>
              <div className="flex items-center gap-3">
                <input 
                  type="number"
                  className="w-24 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#4A47FF] transition-all"
                  value={configs.dias_alerta_followup}
                  onChange={(e) => handleUpdateFollowup(e.target.value)}
                  min="1"
                  required
                />
                <span className="text-sm text-slate-400">dias parado</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-normal">
                Determina após quantos dias em aberto o orçamento é listado na seção de <strong>Alertas de Follow-up</strong> para que você mande um lembrete ao cliente via WhatsApp.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
