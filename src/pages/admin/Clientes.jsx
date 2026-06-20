import { useEffect, useState } from "react";
import { db } from "../../services/supabase";
import { Plus, Search, Edit2, Trash2, X, Users, MessageSquare, Gift, Eye } from "lucide-react";

const isBirthdayMonth = (dateStr) => {
  if (!dateStr) return false;
  const parts = dateStr.split("-");
  if (parts.length < 2) return false;
  const birthMonth = parseInt(parts[1], 10);
  const currentMonth = new Date().getMonth() + 1;
  return birthMonth === currentMonth;
};

const formatDateStr = (dateStr) => {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length < 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [orcamentos, setOrcamentos] = useState([]);
  const [financeiro, setFinanceiro] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Campos do Formulário
  const [tipoPessoa, setTipoPessoa] = useState("PF"); // PF ou PJ
  const [nomeCompleto, setNomeCompleto] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [endereco, setEndereco] = useState("");
  const [origem, setOrigem] = useState("Google");
  
  // Campos exclusivos PJ
  const [nomeFantasia, setNomeFantasia] = useState("");
  const [inscricaoEstadual, setInscricaoEstadual] = useState("");
  const [nomeResponsavel, setNomeResponsavel] = useState("");

  // Novos Campos CRM
  const [consentimentoMarketing, setConsentimentoMarketing] = useState(false);
  const [dataNascimentoFundacao, setDataNascimentoFundacao] = useState("");
  const [observacoesInternas, setObservacoesInternas] = useState("");
  const [dataCadastro, setDataCadastro] = useState(new Date().toISOString().split("T")[0]);
  const [statusCliente, setStatusCliente] = useState("Lead"); // Lead, Ativo, Inativo
  const [indicadoPorId, setIndicadoPorId] = useState("");
  const [tags, setTags] = useState("");

  // Filtros de Listagem
  const [filterOrigem, setFilterOrigem] = useState("Todos");
  const [filterTipo, setFilterTipo] = useState("Todos");
  const [filterStatusCliente, setFilterStatusCliente] = useState("Todos");

  // Ficha do Cliente / Drawer
  const [fichaOpen, setFichaOpen] = useState(false);
  const [selectedFichaCliente, setSelectedFichaCliente] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: cliData } = await db.clientes.list();
      const { data: orcData } = await db.orcamentos.list();
      const { data: finData } = await db.financeiro.list();
      setClientes(cliData || []);
      setOrcamentos(orcData || []);
      setFinanceiro(finData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenFicha = (c) => {
    setSelectedFichaCliente(c);
    setFichaOpen(true);
  };

  const handleOpenNew = () => {
    setEditingId(null);
    setTipoPessoa("PF");
    setNomeCompleto("");
    setCpfCnpj("");
    setTelefone("");
    setEmail("");
    setEndereco("");
    setOrigem("Google");
    setNomeFantasia("");
    setInscricaoEstadual("");
    setNomeResponsavel("");
    setConsentimentoMarketing(false);
    setDataNascimentoFundacao("");
    setObservacoesInternas("");
    setDataCadastro(new Date().toISOString().split("T")[0]);
    setStatusCliente("Lead");
    setIndicadoPorId("");
    setTags("");
    setModalOpen(true);
  };

  const handleOpenEdit = (c) => {
    setEditingId(c.id);
    setTipoPessoa(c.tipo_pessoa || "PF");
    setNomeCompleto(c.nome_completo || "");
    setCpfCnpj(c.cpf_cnpj || "");
    setTelefone(c.telefone || "");
    setEmail(c.email || "");
    setEndereco(c.endereco || "");
    setOrigem(c.origem || "Google");
    setNomeFantasia(c.nome_fantasia || "");
    setInscricaoEstadual(c.inscricao_estadual || "");
    setNomeResponsavel(c.nome_responsavel || "");
    setConsentimentoMarketing(!!c.consentimento_marketing);
    setDataNascimentoFundacao(c.data_nascimento_fundacao || "");
    setObservacoesInternas(c.observacoes_internas || "");
    setDataCadastro(c.data_cadastro || new Date().toISOString().split("T")[0]);
    setStatusCliente(c.status_cliente || "Lead");
    setIndicadoPorId(c.indicado_por_id || "");
    setTags(c.tags || "");
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();

    const payload = {
      tipo_pessoa: tipoPessoa,
      nome_completo: nomeCompleto,
      cpf_cnpj: cpfCnpj,
      telefone: telefone,
      email: email,
      endereco: endereco,
      origem: origem,
      nome_fantasia: tipoPessoa === "PJ" ? nomeFantasia : null,
      inscricao_estadual: tipoPessoa === "PJ" ? inscricaoEstadual : null,
      nome_responsavel: tipoPessoa === "PJ" ? nomeResponsavel : null,
      consentimento_marketing: consentimentoMarketing,
      data_nascimento_fundacao: dataNascimentoFundacao || null,
      observacoes_internas: observacoesInternas || null,
      data_cadastro: dataCadastro || new Date().toISOString().split("T")[0],
      status_cliente: statusCliente,
      indicado_por_id: origem === "Indicação" && indicadoPorId ? indicadoPorId : null,
      tags: tags || null
    };

    try {
      if (editingId) {
        await db.clientes.update(editingId, payload);
      } else {
        await db.clientes.insert(payload);
      }
      setModalOpen(false);
      loadData();
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar cliente.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Deseja realmente excluir este cliente? Todos os orçamentos associados podem ser afetados.")) return;
    try {
      await db.clientes.delete(id);
      loadData();
    } catch (err) {
      console.error(err);
      alert("Erro ao excluir cliente.");
    }
  };

  // Filtrar clientes
  const filteredClientes = clientes.filter(c => {
    const matchesSearch = 
      (c.nome_completo && c.nome_completo.toLowerCase().includes(search.toLowerCase())) ||
      (c.cpf_cnpj && c.cpf_cnpj.toLowerCase().includes(search.toLowerCase())) ||
      (c.nome_fantasia && c.nome_fantasia.toLowerCase().includes(search.toLowerCase())) ||
      (c.tags && c.tags.toLowerCase().includes(search.toLowerCase()));
    
    const matchesOrigem = filterOrigem === "Todos" || c.origem === filterOrigem;
    const matchesTipo = filterTipo === "Todos" || c.tipo_pessoa === filterTipo;
    const matchesStatus = filterStatusCliente === "Todos" || (c.status_cliente || "Lead") === filterStatusCliente;

    return matchesSearch && matchesOrigem && matchesTipo && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Gestão de Clientes</h1>
          <p className="text-slate-400 text-sm mt-1">Cadastro unificado de clientes, leads e acompanhamento CRM</p>
        </div>
        <button 
          onClick={handleOpenNew}
          className="flex items-center gap-2 bg-[#2D2B7A] hover:bg-[#4A47FF] px-4 py-2.5 rounded-xl font-bold text-sm text-white shadow-lg transition-all"
        >
          <Plus size={16} /> Novo Cliente
        </button>
      </div>

      {/* Tabela Card */}
      <div className="glass p-6 rounded-2xl shadow-xl space-y-4">
        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
            <input 
              type="text" 
              placeholder="Buscar por nome, CPF/CNPJ ou nome fantasia..."
              className="w-full bg-white/5 border border-white/5 rounded-xl py-3 pl-12 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#4A47FF] transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-3">
            <select 
              className="bg-[#0D0D0D] border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#4A47FF] transition-all"
              value={filterTipo}
              onChange={(e) => setFilterTipo(e.target.value)}
            >
              <option value="Todos">Todos os Tipos</option>
              <option value="PF">Pessoa Física (PF)</option>
              <option value="PJ">Pessoa Jurídica (PJ)</option>
            </select>
            <select 
              className="bg-[#0D0D0D] border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#4A47FF] transition-all"
              value={filterStatusCliente}
              onChange={(e) => setFilterStatusCliente(e.target.value)}
            >
              <option value="Todos">Todos os Status</option>
              <option value="Lead">Lead</option>
              <option value="Ativo">Ativo</option>
              <option value="Inativo">Inativo</option>
            </select>
            <select 
              className="bg-[#0D0D0D] border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#4A47FF] transition-all"
              value={filterOrigem}
              onChange={(e) => setFilterOrigem(e.target.value)}
            >
              <option value="Todos">Todas as Origens</option>
              <option value="Google">Google</option>
              <option value="Instagram">Instagram</option>
              <option value="Site">Site</option>
              <option value="WhatsApp">WhatsApp</option>
              <option value="Indicação">Indicação</option>
              <option value="Outros">Outros</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center text-slate-500 py-10">Carregando clientes...</div>
        ) : filteredClientes.length === 0 ? (
          <div className="text-center text-slate-500 py-10">Nenhum cliente encontrado.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-400 border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-xs text-slate-500 font-bold uppercase">
                  <th className="pb-3 pt-1">Nome / Razão Social</th>
                  <th className="pb-3 pt-1">Tipo</th>
                  <th className="pb-3 pt-1">CPF / CNPJ</th>
                  <th className="pb-3 pt-1">Telefone</th>
                  <th className="pb-3 pt-1">E-mail</th>
                  <th className="pb-3 pt-1">Origem</th>
                  <th className="pb-3 pt-1 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredClientes.map((c) => (
                  <tr key={c.id} className="hover:bg-white/2">
                    <td className="py-3.5 font-semibold text-white">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenFicha(c)}
                            className="hover:underline hover:text-sky-400 text-left font-semibold transition-all"
                          >
                            {c.nome_completo}
                          </button>
                          <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                            (c.status_cliente || "Lead") === "Ativo" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                            (c.status_cliente || "Lead") === "Inativo" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" :
                            "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          }`}>
                            {c.status_cliente || "Lead"}
                          </span>
                        </div>
                        {c.tipo_pessoa === "PJ" && c.nome_fantasia && (
                          <span className="block text-xs font-normal text-slate-500 mt-0.5">{c.nome_fantasia}</span>
                        )}
                        <span className="block text-[10px] text-slate-500 font-normal mt-0.5">
                          Desde: {c.data_cadastro ? formatDateStr(c.data_cadastro) : "N/D"}
                        </span>
                        
                        {/* Tags */}
                        {c.tags && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {c.tags.split(",").map((t, idx) => (
                              <span key={idx} className="bg-white/5 border border-white/5 text-[9px] font-semibold text-slate-400 px-1.5 py-0.5 rounded">
                                {t.trim()}
                              </span>
                            ))}
                          </div>
                        )}

                        {c.observacoes_internas && (
                          <span className="block text-[11px] text-slate-400 italic font-normal mt-1.5 border-l-2 border-[#2D2B7A] pl-2 max-w-[200px] truncate" title={c.observacoes_internas}>
                            Obs: {c.observacoes_internas}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5">
                      <div>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                          c.tipo_pessoa === "PJ" ? "bg-purple-500/10 text-purple-400" : "bg-blue-500/10 text-blue-400"
                        }`}>{c.tipo_pessoa}</span>
                        {c.data_nascimento_fundacao && (
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-1.5 font-normal">
                            <span>🎂 {formatDateStr(c.data_nascimento_fundacao)}</span>
                            {isBirthdayMonth(c.data_nascimento_fundacao) && (
                              <span className="inline-block text-rose-500 animate-bounce" title="Aniversariante do mês!">
                                <Gift size={10} />
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5">{c.cpf_cnpj || "N/D"}</td>
                    <td className="py-3.5">
                      {c.telefone ? (
                        <a 
                          href={`https://api.whatsapp.com/send?phone=55${c.telefone.replace(/\D/g, "")}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="hover:text-emerald-400 flex items-center gap-1 transition-all"
                        >
                          {c.telefone}
                          <MessageSquare size={12} className="text-emerald-500 shrink-0" />
                        </a>
                      ) : "N/D"}
                    </td>
                    <td className="py-3.5">
                      <div>
                        <span className="block">{c.email || "N/D"}</span>
                        <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded mt-1 ${
                          c.consentimento_marketing 
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                            : "bg-slate-500/10 text-slate-500 border border-slate-500/20"
                        }`}>
                          {c.consentimento_marketing ? "Aceita Marketing" : "Não p/ Mkt"}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5">
                      <span className="bg-white/5 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-300">
                        {c.origem || "Google"}
                      </span>
                    </td>
                    <td className="py-3.5 text-right space-x-1.5 whitespace-nowrap">
                      <button 
                        onClick={() => handleOpenFicha(c)}
                        className="text-sky-450 hover:text-white p-1 hover:bg-sky-500/10 rounded-lg transition-all"
                        title="Ver Ficha do Cliente"
                      >
                        <Eye size={16} />
                      </button>
                      <button 
                        onClick={() => handleOpenEdit(c)}
                        className="text-slate-400 hover:text-white p-1 hover:bg-white/5 rounded-lg transition-all"
                        title="Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(c.id)}
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
          <div className="glass w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-white/5 bg-[#0D0D0D]">
              <h3 className="font-bold text-white text-lg">
                {editingId ? "Editar Cliente" : "Adicionar Novo Cliente"}
              </h3>
              <button 
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-white hover:bg-white/5 p-1 rounded-lg transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Seletor Tipo Pessoa */}
              <div>
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Tipo de Cliente</span>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                    <input 
                      type="radio" 
                      name="tipoPessoa" 
                      value="PF" 
                      checked={tipoPessoa === "PF"} 
                      onChange={() => setTipoPessoa("PF")}
                      className="accent-[#2d2b7a]"
                    />
                    Pessoa Física (PF)
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                    <input 
                      type="radio" 
                      name="tipoPessoa" 
                      value="PJ" 
                      checked={tipoPessoa === "PJ"} 
                      onChange={() => setTipoPessoa("PJ")}
                      className="accent-[#2d2b7a]"
                    />
                    Pessoa Jurídica (PJ)
                  </label>
                </div>
              </div>

              {/* Grid de Inputs Comuns */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    {tipoPessoa === "PJ" ? "Razão Social *" : "Nome Completo *"}
                  </label>
                  <input 
                    type="text" 
                    required 
                    placeholder={tipoPessoa === "PJ" ? "Ex: RG Tech LTDA" : "Ex: Ricardo Bertollo"}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#4A47FF] transition-all"
                    value={nomeCompleto}
                    onChange={(e) => setNomeCompleto(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    {tipoPessoa === "PJ" ? "CNPJ" : "CPF"}
                  </label>
                  <input 
                    type="text" 
                    placeholder={tipoPessoa === "PJ" ? "00.000.000/0001-00" : "000.000.000-00"}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#4A47FF] transition-all"
                    value={cpfCnpj}
                    onChange={(e) => setCpfCnpj(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Telefone / WhatsApp</label>
                  <input 
                    type="text" 
                    placeholder="Ex: (66) 99929-8666"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#4A47FF] transition-all"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">E-mail</label>
                  <input 
                    type="email" 
                    placeholder="Ex: cliente@email.com"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#4A47FF] transition-all"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              {/* Campos específicos PJ */}
              {tipoPessoa === "PJ" && (
                <div className="p-4 bg-white/2 rounded-xl border border-white/5 space-y-4 animate-fadeIn">
                  <span className="block text-xs font-bold uppercase tracking-wider text-purple-400">Dados de Pessoa Jurídica</span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Nome Fantasia</label>
                      <input 
                        type="text" 
                        placeholder="Ex: RG Tech Computadores"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#4A47FF] transition-all"
                        value={nomeFantasia}
                        onChange={(e) => setNomeFantasia(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Inscrição Estadual</label>
                      <input 
                        type="text" 
                        placeholder="Inscrição Estadual"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#4A47FF] transition-all"
                        value={inscricaoEstadual}
                        onChange={(e) => setInscricaoEstadual(e.target.value)}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Responsável pelas Compras</label>
                      <input 
                        type="text" 
                        placeholder="Nome do responsável na empresa"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#4A47FF] transition-all"
                        value={nomeResponsavel}
                        onChange={(e) => setNomeResponsavel(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Endereço e Origem */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Endereço Completo</label>
                  <input 
                    type="text" 
                    placeholder="Rua, número, bairro, cidade - UF"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#4A47FF] transition-all"
                    value={endereco}
                    onChange={(e) => setEndereco(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Origem (Como chegou) *</label>
                  <select 
                    required
                    className="w-full bg-[#0D0D0D] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#4A47FF] transition-all"
                    value={origem}
                    onChange={(e) => setOrigem(e.target.value)}
                  >
                    <option value="Google">Google</option>
                    <option value="Instagram">Instagram</option>
                    <option value="Site">Site</option>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Indicação">Indicação</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
              </div>

              {/* Novos Campos CRM */}
              <div className="p-4 bg-white/2 rounded-xl border border-white/5 space-y-4">
                <span className="block text-xs font-bold uppercase tracking-wider text-blue-400">Informações de Relacionamento (CRM)</span>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">
                      {tipoPessoa === "PJ" ? "Data de Fundação" : "Data de Nascimento"}
                    </label>
                    <input 
                      type="date" 
                      className="w-full bg-[#0D0D0D] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#4A47FF]"
                      value={dataNascimentoFundacao}
                      onChange={(e) => setDataNascimentoFundacao(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Data de Cadastro *</label>
                    <input 
                      type="date" 
                      required
                      className="w-full bg-[#0D0D0D] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#4A47FF]"
                      value={dataCadastro}
                      onChange={(e) => setDataCadastro(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Status do Cliente *</label>
                    <select 
                      required
                      className="w-full bg-[#0D0D0D] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#4A47FF]"
                      value={statusCliente}
                      onChange={(e) => setStatusCliente(e.target.value)}
                    >
                      <option value="Lead">Lead</option>
                      <option value="Ativo">Ativo</option>
                      <option value="Inativo">Inativo</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Tags / Segmentação (separadas por vírgula)</label>
                    <input 
                      type="text" 
                      placeholder="Ex: Agro, Gamer, Recorrente"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#4A47FF] transition-all"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                    />
                  </div>
                </div>

                {origem === "Indicação" && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Quem Indicou? *</label>
                    <select 
                      required
                      className="w-full bg-[#0D0D0D] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#4A47FF]"
                      value={indicadoPorId}
                      onChange={(e) => setIndicadoPorId(e.target.value)}
                    >
                      <option value="">Selecione quem indicou...</option>
                      {clientes
                        .filter(c => c.id !== editingId)
                        .map(c => (
                          <option key={c.id} value={c.id}>
                            {c.nome_completo} {c.tipo_pessoa ? `(${c.tipo_pessoa})` : ""}
                          </option>
                        ))
                      }
                    </select>
                  </div>
                )}

                <div className="flex items-center gap-2.5 py-1">
                  <input 
                    type="checkbox" 
                    id="consentimentoMarketing"
                    checked={consentimentoMarketing} 
                    onChange={(e) => setConsentimentoMarketing(e.target.checked)}
                    className="w-4 h-4 rounded border-white/10 bg-[#0d0d0d] text-[#2d2b7a] focus:ring-[#2d2b7a] focus:ring-offset-[#0d0d0d] focus:ring-2"
                  />
                  <label htmlFor="consentimentoMarketing" className="text-sm font-medium text-slate-300 cursor-pointer select-none">
                    Autoriza envio de mensagens de marketing (novidades, promoções, lembretes de aniversário)
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Observações Internas (Notas sobre comportamento, descontos, preferências)</label>
                  <textarea 
                    rows="3" 
                    placeholder="Ex: Prefere contato à tarde. Sempre pede desconto em peças. Indicou 3 clientes."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#4A47FF] resize-vertical"
                    value={observacoesInternas}
                    onChange={(e) => setObservacoesInternas(e.target.value)}
                  />
                </div>
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
                  {editingId ? "Salvar Alterações" : "Cadastrar Cliente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ── DRAWER / FICHA DO CLIENTE ── */}
      {fichaOpen && selectedFichaCliente && (() => {
        const clientBudgets = orcamentos.filter(o => o.cliente_id === selectedFichaCliente.id);
        const clientFinanceiro = financeiro.filter(f => f.cliente_id === selectedFichaCliente.id);
        
        // Calcular LTV
        const ltv = clientFinanceiro
          .filter(f => f.tipo === "Receita" && f.status === "Pago")
          .reduce((sum, f) => sum + (f.valor || 0), 0);
          
        // Equipamentos únicos
        const uniqueEquipments = Array.from(new Set(
          clientBudgets
            .filter(o => o.eqp_tipo)
            .map(o => `${o.eqp_tipo} ${o.eqp_marca || ""} ${o.eqp_modelo || ""}`.trim())
        )).filter(Boolean);

        // Indicações
        const indicouQuem = clientes.filter(c => c.indicado_por_id === selectedFichaCliente.id);
        const quemIndicou = clientes.find(c => c.id === selectedFichaCliente.indicado_por_id);

        // Montar a timeline
        const timelineEvents = [];
        if (selectedFichaCliente.data_cadastro) {
          timelineEvents.push({
            date: selectedFichaCliente.data_cadastro,
            title: "Cadastro Realizado",
            description: "Cliente registrado na base de dados.",
            type: "cadastro"
          });
        }
        clientBudgets.forEach(o => {
          const date = o.data_emissao || (o.created_at ? o.created_at.split("T")[0] : null);
          if (date) {
            timelineEvents.push({
              date,
              title: `Orçamento Emitido (${o.id})`,
              description: `${o.eqp_tipo} ${o.eqp_marca || ""}: R$ ${o.total.toFixed(2)} - Status: ${o.status}`,
              type: `orcamento_${o.status.toLowerCase()}`,
              meta: o
            });
          }
        });
        clientFinanceiro.forEach(f => {
          const date = f.data_pagamento || f.data_vencimento || (f.created_at ? f.created_at.split("T")[0] : null);
          if (date) {
            timelineEvents.push({
              date,
              title: f.tipo === "Receita" ? "Recebimento / Faturamento" : "Lançamento Financeiro",
              description: `${f.descricao || "Lançamento"} - R$ ${f.valor.toFixed(2)} (${f.status})`,
              type: `financeiro_${f.status.toLowerCase()}`,
              meta: f
            });
          }
        });

        // Ordenar timeline por data decrescente (mais recente primeiro)
        timelineEvents.sort((a, b) => new Date(b.date) - new Date(a.date));

        return (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-fadeIn">
            {/* Backdrop click to close */}
            <div className="absolute inset-0 -z-10" onClick={() => setFichaOpen(false)} />
            
            {/* Panel */}
            <div className="glass w-full max-w-lg h-full shadow-2xl flex flex-col bg-[#0D0D0D] border-l border-white/5 animate-slideLeft overflow-hidden">
              {/* Header */}
              <div className="p-6 border-b border-white/5 flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-bold text-white">{selectedFichaCliente.nome_completo}</h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                      (selectedFichaCliente.status_cliente || "Lead") === "Ativo" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                      (selectedFichaCliente.status_cliente || "Lead") === "Inativo" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" :
                      "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    }`}>
                      {selectedFichaCliente.status_cliente || "Lead"}
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs mt-1">Ficha de Cliente & Histórico CRM</p>
                </div>
                <button 
                  onClick={() => setFichaOpen(false)}
                  className="text-slate-400 hover:text-white hover:bg-white/5 p-1.5 rounded-lg transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Métricas Principais (Cards) */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white/2 border border-white/5 p-3 rounded-xl text-center">
                    <span className="block text-[10px] text-slate-500 uppercase font-bold">LTV (Pago)</span>
                    <span className="text-sm font-bold text-emerald-400 mt-1 block">
                      R$ {ltv.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="bg-white/2 border border-white/5 p-3 rounded-xl text-center">
                    <span className="block text-[10px] text-slate-500 uppercase font-bold">Orçamentos</span>
                    <span className="text-sm font-bold text-sky-400 mt-1 block">
                      {clientBudgets.length}
                    </span>
                  </div>
                  <div className="bg-white/2 border border-white/5 p-3 rounded-xl text-center">
                    <span className="block text-[10px] text-slate-500 uppercase font-bold">Último Contato</span>
                    <span className="text-xs font-bold text-slate-300 mt-1.5 block truncate">
                      {selectedFichaCliente.ultimo_contato ? formatDateStr(selectedFichaCliente.ultimo_contato) : (clientBudgets[0] ? formatDateStr(clientBudgets[0].data_emissao) : "N/D")}
                    </span>
                  </div>
                </div>

                {/* Dados de Cadastro / Info */}
                <div className="bg-white/2 border border-white/5 p-4 rounded-xl space-y-2 text-sm text-slate-300">
                  <span className="block text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-white/5 pb-1 mb-2">Informações Cadastrais</span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-slate-500">Tipo:</span> {selectedFichaCliente.tipo_pessoa}</div>
                    <div><span className="text-slate-500">Origem:</span> {selectedFichaCliente.origem}</div>
                    <div className="col-span-2"><span className="text-slate-500">Documento:</span> {selectedFichaCliente.cpf_cnpj || "N/D"}</div>
                    <div className="col-span-2"><span className="text-slate-500">E-mail:</span> {selectedFichaCliente.email || "N/D"}</div>
                    <div className="col-span-2"><span className="text-slate-500">Telefone:</span> {selectedFichaCliente.telefone || "N/D"}</div>
                    <div className="col-span-2"><span className="text-slate-500">Endereço:</span> {selectedFichaCliente.endereco || "N/D"}</div>
                    {selectedFichaCliente.data_nascimento_fundacao && (
                      <div className="col-span-2"><span className="text-slate-500">Aniversário/Fundação:</span> {formatDateStr(selectedFichaCliente.data_nascimento_fundacao)}</div>
                    )}
                  </div>
                </div>

                {/* Tags / Segmentação */}
                {selectedFichaCliente.tags && (
                  <div className="space-y-1.5">
                    <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">Segmentação / Tags</span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedFichaCliente.tags.split(",").map((t, idx) => (
                        <span key={idx} className="bg-blue-500/10 border border-blue-500/20 text-xs font-semibold text-blue-400 px-2.5 py-1 rounded-lg">
                          {t.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Indicações (Quem indicou / Indicou quem) */}
                <div className="space-y-2.5 bg-white/2 border border-white/5 p-4 rounded-xl">
                  <span className="block text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-white/5 pb-1 mb-2">Rede de Indicações</span>
                  
                  {/* Quem indicou */}
                  <div>
                    <span className="block text-xs text-slate-500">Indicado por:</span>
                    {quemIndicou ? (
                      <button 
                        type="button"
                        onClick={() => setSelectedFichaCliente(quemIndicou)}
                        className="text-xs font-bold text-sky-400 hover:underline mt-0.5 text-left cursor-pointer"
                      >
                        👤 {quemIndicou.nome_completo}
                      </button>
                    ) : (
                      <span className="text-xs text-slate-500 italic mt-0.5 block">Nenhum cliente (Origem: {selectedFichaCliente.origem})</span>
                    )}
                  </div>

                  {/* Indicou quem */}
                  <div className="pt-2 border-t border-white/5">
                    <span className="block text-xs text-slate-500 mb-1">Clientes indicados por este cliente ({indicouQuem.length}):</span>
                    {indicouQuem.length > 0 ? (
                      <div className="flex flex-wrap gap-2 mt-1">
                        {indicouQuem.map(iq => (
                          <button 
                            type="button"
                            key={iq.id}
                            onClick={() => setSelectedFichaCliente(iq)}
                            className="bg-white/5 border border-white/5 text-xs text-slate-300 font-semibold px-2 py-1 rounded hover:bg-white/10 hover:text-white transition-all text-left cursor-pointer"
                          >
                            👤 {iq.nome_completo}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500 italic block">Ainda não indicou outros clientes.</span>
                    )}
                  </div>
                </div>

                {/* Equipamentos Assistidos */}
                <div className="space-y-2 bg-white/2 border border-white/5 p-4 rounded-xl">
                  <span className="block text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-white/5 pb-1 mb-2">Histórico de Equipamentos ({uniqueEquipments.length})</span>
                  {uniqueEquipments.length > 0 ? (
                    <ul className="list-disc list-inside text-xs text-slate-300 space-y-1.5">
                      {uniqueEquipments.map((eq, i) => (
                        <li key={i} className="font-medium">{eq}</li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-xs text-slate-500 italic block">Nenhum equipamento registrado.</span>
                  )}
                </div>

                {/* Linha do Tempo (Timeline) */}
                <div className="space-y-4">
                  <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">Linha do Tempo (CRM)</span>
                  {timelineEvents.length > 0 ? (
                    <div className="relative border-l border-white/10 ml-3 pl-5 space-y-6 text-left">
                      {timelineEvents.map((ev, idx) => (
                        <div key={idx} className="relative">
                          {/* Dot indicator */}
                          <div className={`absolute -left-[26px] top-1 w-3 h-3 rounded-full border-2 border-[#0D0D0D] ${
                            ev.type === "cadastro" ? "bg-blue-500" :
                            ev.type?.includes("aprovado") || ev.type?.includes("pago") ? "bg-emerald-500" :
                            ev.type?.includes("recusado") ? "bg-red-500" :
                            ev.type?.includes("pendente") ? "bg-amber-500" :
                            "bg-slate-400"
                          }`} />
                          
                          <div className="text-xs font-semibold text-slate-400">{formatDateStr(ev.date)}</div>
                          <div className="text-sm font-bold text-white mt-0.5">{ev.title}</div>
                          <div className="text-xs text-slate-400 mt-0.5 leading-relaxed">{ev.description}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500 italic block">Nenhuma interação registrada na linha do tempo.</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
