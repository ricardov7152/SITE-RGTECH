import { useEffect, useState } from "react";
import { db } from "../../services/supabase";
import { Plus, Search, Edit2, Trash2, X, Users, MessageSquare } from "lucide-react";

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
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

  const loadClientes = async () => {
    setLoading(true);
    try {
      const { data } = await db.clientes.list();
      setClientes(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClientes();
  }, []);

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
    };

    try {
      if (editingId) {
        await db.clientes.update(editingId, payload);
      } else {
        await db.clientes.insert(payload);
      }
      setModalOpen(false);
      loadClientes();
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar cliente.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Deseja realmente excluir este cliente? Todos os orçamentos associados podem ser afetados.")) return;
    try {
      await db.clientes.delete(id);
      loadClientes();
    } catch (err) {
      console.error(err);
      alert("Erro ao excluir cliente.");
    }
  };

  // Filtrar clientes
  const filteredClientes = clientes.filter(c => 
    (c.nome_completo && c.nome_completo.toLowerCase().includes(search.toLowerCase())) ||
    (c.cpf_cnpj && c.cpf_cnpj.toLowerCase().includes(search.toLowerCase())) ||
    (c.nome_fantasia && c.nome_fantasia.toLowerCase().includes(search.toLowerCase()))
  );

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
        {/* Search */}
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
          <input 
            type="text" 
            placeholder="Buscar por nome, CPF/CNPJ ou nome fantasia..."
            className="w-full bg-white/5 border border-white/5 rounded-xl py-3 pl-12 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#4A47FF] transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
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
                        {c.nome_completo}
                        {c.tipo_pessoa === "PJ" && c.nome_fantasia && (
                          <span className="block text-xs font-normal text-slate-500">{c.nome_fantasia}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        c.tipo_pessoa === "PJ" ? "bg-purple-500/10 text-purple-400" : "bg-blue-500/10 text-blue-400"
                      }`}>{c.tipo_pessoa}</span>
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
                    <td className="py-3.5">{c.email || "N/D"}</td>
                    <td className="py-3.5">
                      <span className="bg-white/5 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-300">
                        {c.origem || "Google"}
                      </span>
                    </td>
                    <td className="py-3.5 text-right space-x-2">
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
    </div>
  );
}
