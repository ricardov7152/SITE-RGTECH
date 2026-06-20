import { useEffect, useState } from "react";
import { db } from "../../services/supabase";
import { Plus, Search, Edit2, Trash2, X, Tag } from "lucide-react";

export default function Produtos() {
  const [produtos, setProdutos] = useState([]);
  const [search, setSearch] = useState("");
  const [filterTipo, setFilterTipo] = useState("Todos");
  const [filterStatus, setFilterStatus] = useState("Ativo"); // Ativo, Inativo ou Todos
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Campos do Formulário
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [tipo, setTipo] = useState("Serviço"); // Serviço ou Peça
  const [preco, setPreco] = useState(0);
  const [precoCusto, setPrecoCusto] = useState(0);
  const [estoqueAtual, setEstoqueAtual] = useState(0);
  const [statusItem, setStatusItem] = useState("Ativo"); // Ativo ou Inativo
  const [garantiaValor, setGarantiaValor] = useState(30);
  const [garantiaUnidade, setGarantiaUnidade] = useState("Dias"); // Dias, Meses, Anos
  const [fornecedor, setFornecedor] = useState("");
  const [categoria, setCategoria] = useState("Serviços");
  const [subcategoria, setSubcategoria] = useState("");

  // Estados de taxonomia do catálogo
  const [categoriasList, setCategoriasList] = useState({ "Serviço": [], "Peça": [] });
  const [subcategoriasList, setSubcategoriasList] = useState([]);

  const loadTaxonomy = () => {
    const catsStored = localStorage.getItem("rg_local_categorias_produtos");
    const subcatsStored = localStorage.getItem("rg_local_subcategorias_produtos");
    
    const defaultCats = {
      "Serviço": ["Serviços", "Consultoria", "Licenças", "Outros"],
      "Peça": ["Armazenamento", "Memória", "Processadores", "Placas de Vídeo", "Placas-Mãe", "Fontes", "Gabinetes", "Periféricos", "Outros"]
    };
    const defaultSubcats = ["SSD SATA", "SSD M.2 NVMe", "HD Externo", "RAM DDR4", "RAM DDR5", "Mouse Gamer", "Teclado Mecânico"];
    
    const loadedCats = catsStored ? JSON.parse(catsStored) : defaultCats;
    const loadedSubcats = subcatsStored ? JSON.parse(subcatsStored) : defaultSubcats;
    
    setCategoriasList(loadedCats);
    setSubcategoriasList(loadedSubcats);
    
    return { loadedCats, loadedSubcats };
  };

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
    loadTaxonomy();
  }, []);

  const handleOpenNew = () => {
    const { loadedCats } = loadTaxonomy();
    setEditingId(null);
    setNome("");
    setDescricao("");
    setTipo("Serviço");
    setPreco(0);
    setPrecoCusto(0);
    setEstoqueAtual(0);
    setStatusItem("Ativo");
    setGarantiaValor(30);
    setGarantiaUnidade("Dias");
    setFornecedor("");
    setCategoria(loadedCats["Serviço"]?.[0] || "Serviços");
    setSubcategoria("");
    setModalOpen(true);
  };

  const handleOpenEdit = (p) => {
    const { loadedCats } = loadTaxonomy();
    setEditingId(p.id);
    setNome(p.nome || "");
    setDescricao(p.descricao || "");
    setTipo(p.tipo || "Serviço");
    setPreco(p.preco || 0);
    setPrecoCusto(p.preco_custo || 0);
    setEstoqueAtual(p.estoque_atual || 0);
    setStatusItem(p.status_item || "Ativo");
    setGarantiaValor(p.garantia_valor || 30);
    setGarantiaUnidade(p.garantia_unidade || "Dias");
    setFornecedor(p.fornecedor || "");
    setCategoria(p.categoria || loadedCats[p.tipo || "Serviço"]?.[0] || "");
    setSubcategoria(p.subcategoria || "");
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();

    const payload = {
      nome,
      descricao,
      tipo,
      preco: Number(preco),
      preco_custo: Number(precoCusto),
      estoque_atual: tipo === "Peça" ? Number(estoqueAtual) : 0,
      status_item: statusItem,
      garantia_valor: Number(garantiaValor),
      garantia_unidade: garantiaUnidade,
      garantia: `${garantiaValor} ${garantiaUnidade}`,
      fornecedor: tipo === "Peça" ? fornecedor : null,
      categoria,
      subcategoria: subcategoria || null
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

  const handleToggleStatus = async (p) => {
    const novoStatus = p.status_item === "Ativo" ? "Inativo" : "Ativo";
    try {
      await db.produtos.update(p.id, { status_item: novoStatus });
      loadProdutos();
    } catch (err) {
      console.error(err);
      alert("Erro ao alterar status do item.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Deseja realmente excluir permanentemente este produto/serviço? (Recomendado apenas se cadastrado incorretamente)")) return;
    try {
      await db.produtos.delete(id);
      loadProdutos();
    } catch (err) {
      console.error(err);
      alert("Erro ao excluir permanentemente.");
    }
  };

  // Filtrar e pesquisar
  const filteredProdutos = produtos.filter(p => {
    // Busca por nome, descrição, categoria, subcategoria ou fornecedor
    const matchesSearch = 
      (p.nome && p.nome.toLowerCase().includes(search.toLowerCase())) ||
      (p.categoria && p.categoria.toLowerCase().includes(search.toLowerCase())) ||
      (p.subcategoria && p.subcategoria.toLowerCase().includes(search.toLowerCase())) ||
      (p.fornecedor && p.fornecedor.toLowerCase().includes(search.toLowerCase()));
      
    const matchesTipo = filterTipo === "Todos" || p.tipo === filterTipo;
    const matchesStatus = filterStatus === "Todos" || (p.status_item || "Ativo") === filterStatus;
    
    return matchesSearch && matchesTipo && matchesStatus;
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
              placeholder="Buscar por nome, categoria, subcategoria ou fornecedor..."
              className="w-full bg-white/5 border border-white/5 rounded-xl py-3 pl-12 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#4A47FF] transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <select 
              className="bg-[#0D0D0D] border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#4A47FF] transition-all"
              value={filterTipo}
              onChange={(e) => setFilterTipo(e.target.value)}
            >
              <option value="Todos">Todos os Tipos</option>
              <option value="Serviço">Apenas Serviços</option>
              <option value="Peça">Apenas Peças</option>
            </select>
            <select 
              className="bg-[#0D0D0D] border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#4A47FF] transition-all"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="Todos">Todos os Status</option>
              <option value="Ativo">Ativos</option>
              <option value="Inativo">Inativos</option>
            </select>
          </div>
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
                  <th className="pb-3 pt-1">Nome / Categoria</th>
                  <th className="pb-3 pt-1">Tipo</th>
                  <th className="pb-3 pt-1">Financeiro (Custo/Venda/Margem)</th>
                  <th className="pb-3 pt-1">Estoque</th>
                  <th className="pb-3 pt-1">Garantia / Fornecedor</th>
                  <th className="pb-3 pt-1">Status</th>
                  <th className="pb-3 pt-1 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredProdutos.map((p) => {
                  const venda = Number(p.preco || 0);
                  const custo = Number(p.preco_custo || 0);
                  const margem = venda > 0 ? ((venda - custo) / venda) * 100 : 0;

                  return (
                    <tr key={p.id} className="hover:bg-white/2">
                      <td className="py-3.5">
                        <div className="font-semibold text-white">{p.nome}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {p.categoria || "Sem Categoria"} {p.subcategoria ? ` > ${p.subcategoria}` : ""}
                        </div>
                      </td>
                      <td className="py-3.5">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                          p.tipo === "Serviço" ? "bg-emerald-500/10 text-emerald-400" : "bg-blue-500/10 text-blue-400"
                        }`}>{p.tipo}</span>
                      </td>
                      <td className="py-3.5">
                        <div className="text-xs">
                          <span className="text-slate-500">Venda: </span>
                          <span className="font-semibold text-white">R$ {venda.toFixed(2)}</span>
                        </div>
                        {p.tipo === "Peça" && (
                          <div className="text-[11px] mt-0.5 text-slate-500">
                            Custo: R$ {custo.toFixed(2)} | <span className="text-emerald-400 font-semibold">Margem: {margem.toFixed(0)}%</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5">
                        {p.tipo === "Peça" ? (
                          Number(p.estoque_atual || 0) > 0 ? (
                            <span className="bg-blue-500/10 border border-blue-500/25 text-blue-400 font-semibold px-2 py-0.5 rounded text-xs">
                              {p.estoque_atual} un
                            </span>
                          ) : (
                            <span className="bg-rose-500/10 border border-rose-500/25 text-rose-400 font-semibold px-2 py-0.5 rounded text-xs animate-pulse">
                              Sem estoque
                            </span>
                          )
                        ) : (
                          <span className="text-slate-600 text-xs italic">N/A - Serviço</span>
                        )}
                      </td>
                      <td className="py-3.5 text-xs">
                        <div>{p.garantia || "Sem garantia"}</div>
                        {p.tipo === "Peça" && p.fornecedor && (
                          <div className="text-[10px] text-slate-500 mt-0.5">Forn: {p.fornecedor}</div>
                        )}
                      </td>
                      <td className="py-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          (p.status_item || "Ativo") === "Ativo" 
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                            : "bg-slate-500/10 text-slate-500 border border-slate-500/20"
                        }`}>
                          {p.status_item || "Ativo"}
                        </span>
                      </td>
                      <td className="py-3.5 text-right space-x-1.5 whitespace-nowrap">
                        <button 
                          onClick={() => handleToggleStatus(p)}
                          className={`p-1 rounded-lg transition-all ${
                            (p.status_item || "Ativo") === "Ativo" 
                              ? "text-slate-400 hover:text-rose-400 hover:bg-rose-500/10" 
                              : "text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10"
                          }`}
                          title={(p.status_item || "Ativo") === "Ativo" ? "Inativar Item" : "Ativar Item"}
                        >
                          {(p.status_item || "Ativo") === "Ativo" ? "Inativar" : "Ativar"}
                        </button>
                        <button 
                          onClick={() => handleOpenEdit(p)}
                          className="text-slate-400 hover:text-white p-1 hover:bg-white/5 rounded-lg transition-all"
                          title="Editar"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(p.id)}
                          className="text-red-500/40 hover:text-red-400 p-1 hover:bg-red-500/5 rounded-lg transition-all"
                          title="Excluir Permanentemente"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
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
                    onChange={(e) => {
                      const newTipo = e.target.value;
                      setTipo(newTipo);
                      setCategoria(categoriasList[newTipo]?.[0] || "");
                    }}
                  >
                    <option value="Serviço">Serviço</option>
                    <option value="Peça">Peça</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Status do Item *</label>
                  <select 
                    required
                    className="w-full bg-[#0D0D0D] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#4A47FF] transition-all"
                    value={statusItem}
                    onChange={(e) => setStatusItem(e.target.value)}
                  >
                    <option value="Ativo">Ativo</option>
                    <option value="Inativo">Inativo</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Preço de Venda (R$) *</label>
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
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Preço de Custo (R$)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    placeholder="0.00"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#4A47FF] transition-all"
                    value={precoCusto}
                    onChange={(e) => setPrecoCusto(e.target.value)}
                  />
                </div>
                <div className="flex flex-col justify-end pb-2">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Margem de Lucro</span>
                  <span className={`text-sm font-bold mt-1 ${
                    (Number(preco) - Number(precoCusto)) >= 0 ? "text-emerald-400" : "text-rose-500"
                  }`}>
                    {Number(preco) > 0 
                      ? `${(((Number(preco) - Number(precoCusto)) / Number(preco)) * 100).toFixed(0)}%` 
                      : "0%"
                    }
                  </span>
                </div>
              </div>

              {/* Campos Exclusivos para Peças */}
              {tipo === "Peça" && (
                <div className="p-4 bg-white/2 rounded-xl border border-white/5 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fadeIn">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Estoque Atual *</label>
                    <input 
                      type="number" 
                      required 
                      placeholder="0"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#4A47FF] transition-all"
                      value={estoqueAtual}
                      onChange={(e) => setEstoqueAtual(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Fornecedor</label>
                    <input 
                      type="text" 
                      placeholder="Ex: Kingston Oficial, Kabum"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#4A47FF] transition-all"
                      value={fornecedor}
                      onChange={(e) => setFornecedor(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {/* Categorias e Subcategorias */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Categoria *</label>
                  <select 
                    required
                    className="w-full bg-[#0D0D0D] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#4A47FF] transition-all"
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                  >
                    {(categoriasList[tipo] || []).map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Subcategoria</label>
                  <input 
                    type="text" 
                    placeholder="Ex: SSD SATA, RAM DDR4, Gamer"
                    list="subcategories-suggestions"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#4A47FF] transition-all"
                    value={subcategoria}
                    onChange={(e) => setSubcategoria(e.target.value)}
                  />
                  <datalist id="subcategories-suggestions">
                    {(subcategoriasList || []).map((sub) => (
                      <option key={sub} value={sub} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Garantia Estruturada */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Garantia Padrão *</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white/2 p-3 rounded-xl border border-white/5">
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Valor</label>
                    <input 
                      type="number" 
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                      value={garantiaValor}
                      onChange={(e) => setGarantiaValor(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 font-bold uppercase mb-1">Unidade</label>
                    <select 
                      required
                      className="w-full bg-[#0D0D0D] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                      value={garantiaUnidade}
                      onChange={(e) => setGarantiaUnidade(e.target.value)}
                    >
                      <option value="Dias">Dias</option>
                      <option value="Meses">Meses</option>
                      <option value="Anos">Anos</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Descrição</label>
                <textarea 
                  rows="2" 
                  placeholder="Detalhes adicionais do produto ou serviço..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#4A47FF] transition-all resize-vertical"
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
