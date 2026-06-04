import { useEffect, useState } from "react";
import { db } from "../../services/supabase";
import { Plus, Search, Edit2, Trash2, X, Tag } from "lucide-react";

export default function Produtos() {
  const [produtos, setProdutos] = useState([]);
  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState("Todos");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Campos do Formulário
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [tipo, setTipo] = useState("Serviço"); // Serviço ou Peça
  const [preco, setPreco] = useState(0);
  const [garantia, setGarantia] = useState("");

  const loadProdutos = async () => {
    setLoading(true);
    try {
      const { data } = await db.produtos.list();
      setProdutos(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProdutos();
  }, []);

  const handleOpenNew = () => {
    setEditingId(null);
    setNome("");
    setDescricao("");
    setTipo("Serviço");
    setPreco(0);
    setGarantia("30 dias");
    setModalOpen(true);
  };

  const handleOpenEdit = (p) => {
    setEditingId(p.id);
    setNome(p.nome || "");
    setDescricao(p.descricao || "");
    setTipo(p.tipo || "Serviço");
    setPreco(p.preco || 0);
    setGarantia(p.garantia || "");
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();

    const payload = {
      nome,
      descricao,
      tipo,
      preco: Number(preco),
      garantia,
    };

    try {
      if (editingId) {
        await db.produtos.update(editingId, payload);
      } else {
        await db.produtos.insert(payload);
      }
      setModalOpen(false);
      loadProdutos();
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar produto/serviço.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Deseja realmente excluir este produto/serviço?")) return;
    try {
      await db.produtos.delete(id);
      loadProdutos();
    } catch (err) {
      console.error(err);
      alert("Erro ao excluir produto/serviço.");
    }
  };

  // Filtrar e pesquisar
  const filteredProdutos = produtos.filter(p => {
    const matchesSearch = p.nome && p.nome.toLowerCase().includes(search.toLowerCase());
    const matchesTipo = filterTipo === "Todos" || p.tipo === filterTipo;
    return matchesSearch && matchesTipo;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Produtos e Serviços</h1>
          <p className="text-slate-400 text-sm mt-1">Catálogo de peças e serviços da RG TECH Computadores</p>
        </div>
        <button 
          onClick={handleOpenNew}
          className="flex items-center gap-2 bg-[#2D2B7A] hover:bg-[#4A47FF] px-4 py-2.5 rounded-xl font-bold text-sm text-white shadow-lg transition-all"
        >
          <Plus size={16} /> Novo Item
        </button>
      </div>

      {/* Tabela Card */}
      <div className="glass p-6 rounded-2xl shadow-xl space-y-4">
        {/* Search & Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
            <input 
              type="text" 
              placeholder="Buscar por nome do produto ou serviço..."
              className="w-full bg-white/5 border border-white/5 rounded-xl py-3 pl-12 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#4A47FF] transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select 
            className="bg-[#0D0D0D] border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#4A47FF] transition-all"
            value={filterTipo}
            onChange={(e) => setFilterTipo(e.target.value)}
          >
            <option value="Todos">Todos os Tipos</option>
            <option value="Serviço">Apenas Serviços</option>
            <option value="Peça">Apenas Peças</option>
          </select>
        </div>

        {loading ? (
          <div className="text-center text-slate-500 py-10">Carregando itens...</div>
        ) : filteredProdutos.length === 0 ? (
          <div className="text-center text-slate-500 py-10">Nenhum produto ou serviço encontrado.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-400 border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-xs text-slate-500 font-bold uppercase">
                  <th className="pb-3 pt-1">Nome</th>
                  <th className="pb-3 pt-1">Tipo</th>
                  <th className="pb-3 pt-1">Preço Padrão</th>
                  <th className="pb-3 pt-1">Garantia</th>
                  <th className="pb-3 pt-1">Descrição</th>
                  <th className="pb-3 pt-1 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredProdutos.map((p) => (
                  <tr key={p.id} className="hover:bg-white/2">
                    <td className="py-3.5 font-semibold text-white">{p.nome}</td>
                    <td className="py-3.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        p.tipo === "Serviço" ? "bg-emerald-500/10 text-emerald-400" : "bg-blue-500/10 text-blue-400"
                      }`}>{p.tipo}</span>
                    </td>
                    <td className="py-3.5 font-semibold text-white">R$ {Number(p.preco).toFixed(2)}</td>
                    <td className="py-3.5">{p.garantia || "Sem garantia"}</td>
                    <td className="py-3.5 max-w-xs truncate">{p.descricao || "N/A"}</td>
                    <td className="py-3.5 text-right space-x-2">
                      <button 
                        onClick={() => handleOpenEdit(p)}
                        className="text-slate-400 hover:text-white p-1 hover:bg-white/5 rounded-lg transition-all"
                        title="Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(p.id)}
                        className="text-red-500 hover:text-red-400 p-1 hover:bg-red-500/5 rounded-lg transition-all"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── MODAL CADASTRO / EDIÇÃO ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="glass w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-white/5 bg-[#0D0D0D]">
              <h3 className="font-bold text-white text-lg">
                {editingId ? "Editar Item" : "Adicionar Novo Item"}
              </h3>
              <button 
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-white hover:bg-white/5 p-1 rounded-lg transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Nome do Item *</label>
                <input 
                  type="text" 
                  required 
                  placeholder="Ex: Formatação de Notebook"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#4A47FF] transition-all"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Tipo *</label>
                  <select 
                    required
                    className="w-full bg-[#0D0D0D] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#4A47FF] transition-all"
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value)}
                  >
                    <option value="Serviço">Serviço</option>
                    <option value="Peça">Peça</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Preço Padrão (R$) *</label>
                  <input 
                    type="number" 
                    step="0.01"
                    required 
                    placeholder="0.00"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#4A47FF] transition-all"
                    value={preco}
                    onChange={(e) => setPreco(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Garantia Padrão</label>
                <input 
                  type="text" 
                  placeholder="Ex: 30 dias, 1 ano de fabricante"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#4A47FF] transition-all"
                  value={garantia}
                  onChange={(e) => setGarantia(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Descrição</label>
                <textarea 
                  rows="3" 
                  placeholder="Detalhes adicionais do produto ou serviço..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#4A47FF] transition-all resize-vertical"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                />
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end gap-3 border-t border-white/5 pt-4">
                <button 
                  type="button" 
                  onClick={() => setModalOpen(false)}
                  className="px-5 py-2.5 border border-white/10 text-slate-300 font-semibold text-sm rounded-xl hover:bg-white/5 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="px-6 py-2.5 bg-[#2D2B7A] hover:bg-[#4A47FF] text-white font-bold text-sm rounded-xl shadow-lg transition-all"
                >
                  {editingId ? "Salvar Alterações" : "Adicionar Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
