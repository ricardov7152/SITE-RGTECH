import { useState, useEffect } from "react";
import { Settings, Target, Bell, Calendar, Plus, Trash2, CheckCircle2 } from "lucide-react";
import { db } from "../../services/supabase";

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

  // Estados de taxonomia de produtos
  const [categorias, setCategorias] = useState({ "Serviço": [], "Peça": [] });
  const [subcategorias, setSubcategorias] = useState([]);
  
  const [novaCatServico, setNovaCatServico] = useState("");
  const [novaCatPeca, setNovaCatPeca] = useState("");
  const [novaSubcat, setNovaSubcat] = useState("");

  // Estados de Contas Bancárias
  const [bancos, setBancos] = useState([]);
  const [novoBanco, setNovoBanco] = useState("");

  const loadBancos = async () => {
    try {
      const { data } = await db.bancos.list();
      setBancos(data || []);
    } catch (e) {
      console.error("Erro ao carregar bancos:", e);
    }
  };

  const handleAddBanco = async () => {
    if (!novoBanco.trim()) return;
    const name = novoBanco.trim();
    if (bancos.some(b => b.nome.toLowerCase() === name.toLowerCase())) {
      alert("Banco já cadastrado!");
      return;
    }
    await db.bancos.insert({ nome: name });
    setNovoBanco("");
    loadBancos();
    setSuccessMsg(`Banco "${name}" adicionado com sucesso!`);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const handleRemoveBanco = async (id, nome) => {
    if (!window.confirm(`Deseja remover o banco "${nome}"? Isso apenas removerá a opção de futuras seleções, sem afetar o histórico financeiro.`)) return;
    await db.bancos.delete(id);
    loadBancos();
    setSuccessMsg("Banco removido com sucesso!");
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  useEffect(() => {
    async function loadConfigs() {
      let loadedConfigs = null;
      try {
        const { data } = await db.configuracoes.get();
        if (data) {
          loadedConfigs = data;
        }
      } catch (dbErr) {
        console.error("Erro ao carregar configurações do Supabase:", dbErr);
      }

      if (!loadedConfigs) {
        const stored = localStorage.getItem("rg_local_configuracoes");
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            loadedConfigs = {
              metas: parsed.metas || {},
              dias_alerta_followup: parsed.dias_alerta_followup !== undefined ? parsed.dias_alerta_followup : 3,
            };
            // Migrar para o banco
            await db.configuracoes.upsert(loadedConfigs);
          } catch (e) {
            console.error("Erro ao migrar local configs:", e);
          }
        } else {
          // Migrar meta antiga se houver
          const oldMeta = localStorage.getItem("rg_local_meta_faturamento");
          if (oldMeta) {
            const d = new Date();
            const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
            const initialMetas = { [monthKey]: Number(oldMeta) };
            const initialConfigs = { metas: initialMetas, dias_alerta_followup: 3 };
            loadedConfigs = initialConfigs;
            await db.configuracoes.upsert(loadedConfigs);
          }
        }
      }

      if (loadedConfigs) {
        setConfigs(loadedConfigs);
      }
    }

    loadConfigs();

    // Carregar taxonomia de produtos
    const catsStored = localStorage.getItem("rg_local_categorias_produtos");
    const subcatsStored = localStorage.getItem("rg_local_subcategorias_produtos");
    
    const defaultCats = {
      "Serviço": ["Serviços", "Consultoria", "Licenças", "Outros"],
      "Peça": ["Armazenamento", "Memória", "Processadores", "Placas de Vídeo", "Placas-Mãe", "Fontes", "Gabinetes", "Periféricos", "Outros"]
    };
    const defaultSubcats = ["SSD SATA", "SSD M.2 NVMe", "HD Externo", "RAM DDR4", "RAM DDR5", "Mouse Gamer", "Teclado Mecânico"];
    
    setCategorias(catsStored ? JSON.parse(catsStored) : defaultCats);
    setSubcategorias(subcatsStored ? JSON.parse(subcatsStored) : defaultSubcats);
    loadBancos();
  }, []);

  const handleAddCat = (tipo, val) => {
    if (!val.trim()) return;
    const trimmed = val.trim();
    if (categorias[tipo].includes(trimmed)) {
      alert("Categoria já cadastrada!");
      return;
    }
    const updated = {
      ...categorias,
      [tipo]: [...categorias[tipo], trimmed]
    };
    setCategorias(updated);
    localStorage.setItem("rg_local_categorias_produtos", JSON.stringify(updated));
    if (tipo === "Serviço") setNovaCatServico("");
    else setNovaCatPeca("");
    
    setSuccessMsg(`Categoria "${trimmed}" adicionada!`);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const handleRemoveCat = (tipo, val) => {
    if (!window.confirm(`Deseja remover a categoria "${val}"? Todos os produtos dessa categoria perderão essa referência se editados futuramente.`)) return;
    const updated = {
      ...categorias,
      [tipo]: categorias[tipo].filter(c => c !== val)
    };
    setCategorias(updated);
    localStorage.setItem("rg_local_categorias_produtos", JSON.stringify(updated));
    
    setSuccessMsg(`Categoria removida!`);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const handleAddSubcat = () => {
    if (!novaSubcat.trim()) return;
    const val = novaSubcat.trim();
    if (subcategorias.includes(val)) {
      alert("Subcategoria já cadastrada!");
      return;
    }
    const updated = [...subcategorias, val];
    setSubcategorias(updated);
    localStorage.setItem("rg_local_subcategorias_produtos", JSON.stringify(updated));
    setNovaSubcat("");
    
    setSuccessMsg(`Subcategoria "${val}" adicionada!`);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const handleRemoveSubcat = (val) => {
    if (!window.confirm(`Deseja remover a subcategoria "${val}"?`)) return;
    const updated = subcategorias.filter(s => s !== val);
    setSubcategorias(updated);
    localStorage.setItem("rg_local_subcategorias_produtos", JSON.stringify(updated));
    
    setSuccessMsg(`Subcategoria removida!`);
    setTimeout(() => setSuccessMsg(""), 3000);
  };

  const saveConfigs = async (newConfigs) => {
    try {
      setConfigs(newConfigs);
      await db.configuracoes.upsert(newConfigs);
      setSuccessMsg("Configurações salvas com sucesso!");
    } catch (e) {
      console.error("Erro ao salvar configurações no banco:", e);
      alert("Erro ao salvar configurações no banco de dados.");
    }
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

      {/* Gestão de Taxonomia do Catálogo */}
      <div className="glass p-6 rounded-2xl shadow-xl space-y-6">
        <div className="flex items-center gap-2.5 border-b border-white/5 pb-4">
          <Settings className="text-[#4A47FF]" size={20} />
          <h3 className="font-bold text-white text-base">Categorias & Subcategorias do Catálogo</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Categorias de Peças */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Categorias de Peças</h4>
            <div className="flex gap-2">
              <input 
                type="text"
                placeholder="Nova Categoria Peça..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
                value={novaCatPeca}
                onChange={(e) => setNovaCatPeca(e.target.value)}
              />
              <button 
                type="button"
                onClick={() => handleAddCat("Peça", novaCatPeca)}
                className="bg-[#2D2B7A] hover:bg-[#4A47FF] px-3 py-2 rounded-xl text-xs font-bold text-white transition-all whitespace-nowrap"
              >
                Adicionar
              </button>
            </div>
            <div className="max-h-60 overflow-y-auto bg-white/2 rounded-xl border border-white/5 divide-y divide-white/5">
              {categorias["Peça"].map(cat => (
                <div key={cat} className="flex justify-between items-center px-3 py-2">
                  <span className="text-xs text-white">{cat}</span>
                  <button 
                    type="button"
                    onClick={() => handleRemoveCat("Peça", cat)}
                    className="text-red-500 hover:text-red-400 p-1 rounded hover:bg-white/5 transition-all"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Categorias de Serviços */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Categorias de Serviços</h4>
            <div className="flex gap-2">
              <input 
                type="text"
                placeholder="Nova Categoria Serviço..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
                value={novaCatServico}
                onChange={(e) => setNovaCatServico(e.target.value)}
              />
              <button 
                type="button"
                onClick={() => handleAddCat("Serviço", novaCatServico)}
                className="bg-[#2D2B7A] hover:bg-[#4A47FF] px-3 py-2 rounded-xl text-xs font-bold text-white transition-all whitespace-nowrap"
              >
                Adicionar
              </button>
            </div>
            <div className="max-h-60 overflow-y-auto bg-white/2 rounded-xl border border-white/5 divide-y divide-white/5">
              {categorias["Serviço"].map(cat => (
                <div key={cat} className="flex justify-between items-center px-3 py-2">
                  <span className="text-xs text-white">{cat}</span>
                  <button 
                    type="button"
                    onClick={() => handleRemoveCat("Serviço", cat)}
                    className="text-red-500 hover:text-red-400 p-1 rounded hover:bg-white/5 transition-all"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Subcategorias Sugeridas */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Subcategorias Sugeridas</h4>
            <div className="flex gap-2">
              <input 
                type="text"
                placeholder="Nova Subcategoria..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
                value={novaSubcat}
                onChange={(e) => setNovaSubcat(e.target.value)}
              />
              <button 
                type="button"
                onClick={handleAddSubcat}
                className="bg-[#2D2B7A] hover:bg-[#4A47FF] px-3 py-2 rounded-xl text-xs font-bold text-white transition-all whitespace-nowrap"
              >
                Adicionar
              </button>
            </div>
            <div className="max-h-60 overflow-y-auto bg-white/2 rounded-xl border border-white/5 divide-y divide-white/5">
              {subcategorias.map(sub => (
                <div key={sub} className="flex justify-between items-center px-3 py-2">
                  <span className="text-xs text-white">{sub}</span>
                  <button 
                    type="button"
                    onClick={() => handleRemoveSubcat(sub)}
                    className="text-red-500 hover:text-red-400 p-1 rounded hover:bg-white/5 transition-all"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Gestão de Contas Bancárias */}
        <div className="glass p-6 rounded-2xl shadow-xl space-y-6">
          <div className="flex items-center gap-2.5 border-b border-white/5 pb-4">
            <Settings className="text-[#4A47FF]" size={20} />
            <h3 className="font-bold text-white text-base">Contas Bancárias / Bancos de Destino</h3>
          </div>

          <div className="max-w-md space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Bancos Cadastrados</h4>
            <div className="flex gap-2">
              <input 
                type="text"
                placeholder="Ex: C6, Banco do Brasil..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
                value={novoBanco}
                onChange={(e) => setNovoBanco(e.target.value)}
              />
              <button 
                type="button"
                onClick={handleAddBanco}
                className="bg-[#2D2B7A] hover:bg-[#4A47FF] px-3 py-2 rounded-xl text-xs font-bold text-white transition-all whitespace-nowrap"
              >
                Adicionar Banco
              </button>
            </div>
            <div className="max-h-60 overflow-y-auto bg-white/2 rounded-xl border border-white/5 divide-y divide-white/5">
              {bancos.length === 0 ? (
                <div className="p-4 text-xs text-slate-500 text-center">Nenhum banco cadastrado.</div>
              ) : (
                bancos.map(b => (
                  <div key={b.id} className="flex justify-between items-center px-4 py-3">
                    <span className="text-xs text-white font-semibold">{b.nome}</span>
                    <button 
                      type="button"
                      onClick={() => handleRemoveBanco(b.id, b.nome)}
                      className="text-red-500 hover:text-red-400 p-1 rounded hover:bg-white/5 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
