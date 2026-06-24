import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { db } from "../../services/supabase";
import { Save, Printer, ArrowLeft, Plus, Trash2, HelpCircle } from "lucide-react";
import { format } from "date-fns";
import html2pdf from "html2pdf.js";

export default function CriarOrcamento() {
  const { id } = useParams(); // Se houver ID nas rotas, estamos EDITANDO
  const navigate = useNavigate();
  const pdfRef = useRef(null);

  // Massa de dados do banco
  const [clientes, setClientes] = useState([]);
  const [produtosCatalogo, setProdutosCatalogo] = useState([]);

  // Estados de busca de cliente
  const [clientSearch, setClientSearch] = useState("");
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const clientDropdownRef = useRef(null);

  // Estados do Formulário
  const [clienteId, setClienteId] = useState("");
  const [equipamento, setEquipamento] = useState({ tipo: "", marca: "", modelo: "", serie: "" });
  const [problema, setProblema] = useState("");
  const [itens, setItens] = useState([]);
  const [desconto, setDesconto] = useState(0);
  const [status, setStatus] = useState("Em aberto");
  const [motivoRecusa, setMotivoRecusa] = useState("");
  const [condicoes, setCondicoes] = useState({
    validade_dias: 7,
    prazo_entrega: "3 a 5 dias úteis",
    forma_pagamento: "PIX ou Cartão",
    observacoes: ""
  });

  const [loading, setLoading] = useState(true);
  const [orcamentoNumero, setOrcamentoNumero] = useState("");
  const [dataEmissao, setDataEmissao] = useState(new Date().toISOString().split("T")[0]);

  // Fechar dropdown de cliente ao clicar fora
  useEffect(() => {
    function handleClickOutside(event) {
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(event.target)) {
        setIsClientDropdownOpen(false);
        if (clienteId) {
          const selected = clientes.find(c => c.id === clienteId);
          if (selected) {
            setClientSearch(selected.nome_completo);
          }
        } else {
          setClientSearch("");
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [clienteId, clientes]);

  // Carregar dados iniciais
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const { data: cliData } = await db.clientes.list();
        const { data: prodData } = await db.produtos.list();
        setClientes(cliData || []);
        setProdutosCatalogo(prodData || []);

        if (id) {
          // Carregar orçamento para edição
          const { data: orc } = await db.orcamentos.get(id);
          if (orc) {
            setOrcamentoNumero(orc.id);
            setClienteId(orc.cliente_id || "");
            const selected = cliData.find(c => c.id === orc.cliente_id);
            if (selected) {
              setClientSearch(selected.nome_completo);
            }
            setEquipamento({
              tipo: orc.eqp_tipo || "",
              marca: orc.eqp_marca || "",
              modelo: orc.eqp_modelo || "",
              serie: orc.eqp_serie || ""
            });
            setProblema(orc.problema_relatado || "");
            setItens(orc.itens || []);
            setDesconto(Number(orc.desconto || 0));
            setStatus(orc.status || "Em aberto");
            setMotivoRecusa(orc.motivo_recusa || "");
            setDataEmissao(orc.data_emissao || new Date().toISOString().split("T")[0]);
            setCondicoes({
              validade_dias: orc.validade_dias || 7,
              prazo_entrega: orc.prazo_entrega || "3 a 5 dias úteis",
              forma_pagamento: orc.forma_pagamento || "PIX ou Cartão",
              observacoes: orc.observacoes || ""
            });
          }
        } else {
          // Gerar ID sequencial temporário
          const year = new Date().getFullYear();
          const randomNum = Math.floor(Math.random() * 9000) + 1000;
          setOrcamentoNumero(`ORC-${year}-${randomNum}`);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  // Funções de manipulação de itens
  const adicionarItem = (produtoObj = null) => {
    if (produtoObj) {
      const novo = {
        id: crypto.randomUUID(),
        produto_id: produtoObj.id,
        nome: produtoObj.nome,
        tipo: produtoObj.tipo,
        quantidade: 1,
        valor_unitario: Number(produtoObj.preco),
        total: Number(produtoObj.preco),
        garantia: produtoObj.garantia || "30 dias"
      };
      setItens([...itens, novo]);
    } else {
      const novo = {
        id: crypto.randomUUID(),
        produto_id: null,
        nome: "Serviço/Peça Customizada",
        tipo: "Serviço",
        quantidade: 1,
        valor_unitario: 100.00,
        total: 100.00,
        garantia: "30 dias"
      };
      setItens([...itens, novo]);
    }
  };

  const atualizarItem = (itemId, campo, valor) => {
    setItens(itens.map(item => {
      if (item.id === itemId) {
        const atualizado = { ...item, [campo]: valor };
        if (campo === "quantidade" || campo === "valor_unitario") {
          atualizado.total = Number(atualizado.quantidade) * Number(atualizado.valor_unitario);
        }
        return atualizado;
      }
      return item;
    }));
  };

  const removerItem = (itemId) => {
    setItens(itens.filter(item => item.id !== itemId));
  };

  // Cálculos matemáticos
  const subtotal = itens.reduce((sum, item) => sum + Number(item.total), 0);
  const totalFinal = Math.max(0, subtotal - Number(desconto));

  // Salvar Orçamento
  const handleSave = async (e) => {
    e.preventDefault();
    if (!clienteId) {
      alert("Selecione um cliente!");
      return;
    }
    if (itens.length === 0) {
      alert("Adicione pelo menos um item ao orçamento!");
      return;
    }

    const selectedClient = clientes.find(c => c.id === clienteId);

    const payload = {
      id: orcamentoNumero,
      cliente_id: clienteId,
      cliente_nome: selectedClient ? selectedClient.nome_completo : "Cliente",
      eqp_tipo: equipamento.tipo,
      eqp_marca: equipamento.marca,
      eqp_modelo: equipamento.modelo,
      eqp_serie: equipamento.serie,
      problema_relatado: problema,
      subtotal,
      desconto: Number(desconto),
      total: totalFinal,
      status,
      motivo_recusa: status === "Recusado" ? motivoRecusa : null,
      data_emissao: dataEmissao,
      validade_dias: Number(condicoes.validade_dias),
      prazo_entrega: condicoes.prazo_entrega,
      forma_pagamento: condicoes.forma_pagamento,
      observacoes: condicoes.observacoes
    };

    try {
      if (id) {
        // Atualizar orçamentos exige deletar e reinserir itens para simplicidade de relacionamento
        await db.orcamentos.delete(id);
      }
      await db.orcamentos.insert(payload, itens);
      
      alert("Orçamento salvo com sucesso!");
      navigate("/admin/orcamentos");
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar orçamento.");
    }
  };

  // Gerar PDF A4
  const handleGeneratePDF = () => {
    if (!clienteId) {
      alert("Selecione um cliente antes de gerar o PDF!");
      return;
    }
    const element = pdfRef.current;
    const selectedClient = clientes.find(c => c.id === clienteId);
    
    const opt = {
      margin:       [10, 10, 10, 10],
      filename:     `Orcamento_${orcamentoNumero}_${selectedClient?.nome_completo.replace(/\s+/g, "_")}.pdf`,
      image:        { type: "jpeg", quality: 1 },
      html2canvas:  { scale: 2.5, useCORS: true, logging: false },
      jsPDF:        { unit: "mm", format: "a4", orientation: "portrait" }
    };
    
    html2pdf().from(element).set(opt).save();
  };

  if (loading) {
    return <div className="text-center text-slate-400 py-10">Carregando formulário...</div>;
  }

  const selectedClient = clientes.find(c => c.id === clienteId);

  const filteredClientes = clientes.filter(c => {
    const term = clientSearch.toLowerCase();
    const nome = c.nome_completo.toLowerCase();
    const doc = (c.cpf_cnpj || "").toLowerCase();
    return nome.includes(term) || doc.includes(term);
  });

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* ── HEADER DE AÇÕES DO FORMULÁRIO ── */}
      <div className="flex justify-between items-center border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <button 
            type="button" 
            onClick={() => navigate("/admin/orcamentos")}
            className="text-slate-400 hover:text-white p-2 hover:bg-white/5 rounded-xl transition-all"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">{id ? `Editar Orçamento #${orcamentoNumero}` : "Novo Orçamento"}</h1>
            <p className="text-slate-400 text-xs">Preencha os dados e gere a proposta em PDF</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button 
            type="button" 
            onClick={handleGeneratePDF}
            className="flex items-center gap-2 border border-white/10 hover:border-white/20 hover:bg-white/5 px-4 py-2.5 rounded-xl font-bold text-sm text-white shadow-lg transition-all"
          >
            <Printer size={16} /> Imprimir / PDF
          </button>
          <button 
            onClick={handleSave}
            className="flex items-center gap-2 bg-[#2D2B7A] hover:bg-[#4A47FF] px-5 py-2.5 rounded-xl font-bold text-sm text-white shadow-lg transition-all"
          >
            <Save size={16} /> Salvar Orçamento
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* COLUNA ESQUERDA: CLIENTE, MAQUINA E DEFEITO */}
        <div className="space-y-6">
          {/* Card Cliente */}
          <div className="glass p-6 rounded-2xl shadow-xl space-y-4">
            <h3 className="font-bold text-white text-base border-b border-white/5 pb-2">Identificação do Cliente</h3>
            <div className="relative" ref={clientDropdownRef}>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Selecionar Cliente *</label>
              <input
                type="text"
                placeholder="Digite o nome ou CPF/CNPJ para buscar..."
                className="w-full bg-[#0D0D0D] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#4A47FF] transition-all"
                value={clientSearch}
                onFocus={() => setIsClientDropdownOpen(true)}
                onChange={(e) => {
                  setClientSearch(e.target.value);
                  setIsClientDropdownOpen(true);
                  if (!e.target.value) {
                    setClienteId("");
                  }
                }}
              />
              {isClientDropdownOpen && (
                <div className="absolute z-50 w-full mt-1 bg-[#121212] border border-white/10 rounded-xl shadow-2xl max-h-60 overflow-y-auto">
                  {filteredClientes.length === 0 ? (
                    <div className="p-3 text-xs text-slate-500 text-center">Nenhum cliente encontrado</div>
                  ) : (
                    filteredClientes.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        className="w-full text-left px-4 py-3 text-xs hover:bg-[#2D2B7A] hover:text-white border-b border-white/5 last:border-0 text-slate-300 transition-all flex justify-between items-center"
                        onClick={() => {
                          setClienteId(c.id);
                          setClientSearch(c.nome_completo);
                          setIsClientDropdownOpen(false);
                        }}
                      >
                        <span>{c.nome_completo} ({c.tipo_pessoa})</span>
                        <span className="text-slate-500 text-[10px]">{c.cpf_cnpj || ""}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {selectedClient && (
              <div className="bg-white/2 border border-white/5 p-4 rounded-xl text-xs space-y-1.5 text-slate-300 animate-fadeIn">
                <p><strong>Tipo:</strong> {selectedClient.tipo_pessoa}</p>
                <p><strong>Documento:</strong> {selectedClient.cpf_cnpj || "N/D"}</p>
                <p><strong>Telefone:</strong> {selectedClient.telefone || "N/D"}</p>
                <p><strong>E-mail:</strong> {selectedClient.email || "N/D"}</p>
                <p><strong>Endereço:</strong> {selectedClient.endereco || "N/D"}</p>
                {selectedClient.tipo_pessoa === "PJ" && (
                  <>
                    <p><strong>Inscrição Estadual:</strong> {selectedClient.inscricao_estadual || "Isento"}</p>
                    <p><strong>Responsável:</strong> {selectedClient.nome_responsavel || "N/D"}</p>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Card Equipamento */}
          <div className="glass p-6 rounded-2xl shadow-xl space-y-4">
            <h3 className="font-bold text-white text-base border-b border-white/5 pb-2">Equipamento em Reparo</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Tipo (Ex: Notebook, Desktop)</label>
                <input 
                  type="text" 
                  placeholder="Notebook"
                  list="tipos-equipamento"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#4A47FF] transition-all"
                  value={equipamento.tipo}
                  onChange={(e) => setEquipamento({ ...equipamento, tipo: e.target.value })}
                />
                <datalist id="tipos-equipamento">
                  {["Desktop", "Desktop Gamer", "Notebook", "Notebook Gamer", "All In One", "Monitor", "Tablets", "HD", "SSD SATA", "SSD M2", "Fonte de Alimentação", "Periféricos", "PS5", "PS5 SLIM", "PS5 PRO", "XBOX", "XBOX ONE", "XBOX 360", "XBOX SERIES S"].map(t => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Marca</label>
                <input 
                  type="text" 
                  placeholder="Dell"
                  list="marcas-equipamento"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#4A47FF] transition-all"
                  value={equipamento.marca}
                  onChange={(e) => setEquipamento({ ...equipamento, marca: e.target.value })}
                />
                <datalist id="marcas-equipamento">
                  {["Dell", "HP", "Lenovo", "Asus", "Acer", "Apple", "Samsung", "Positivo", "Multilaser", "MSI", "Gigabyte", "Vaio", "LG", "Toshiba", "Mancer", "Pichau", "Rise Mode"].map(m => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Modelo</label>
                <input 
                  type="text" 
                  placeholder="Vostro 3510"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#4A47FF] transition-all"
                  value={equipamento.modelo}
                  onChange={(e) => setEquipamento({ ...equipamento, modelo: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Nº de Série</label>
                <input 
                  type="text" 
                  placeholder="S/N"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#4A47FF] transition-all"
                  value={equipamento.serie}
                  onChange={(e) => setEquipamento({ ...equipamento, serie: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Problema Relatado */}
          <div className="glass p-6 rounded-2xl shadow-xl space-y-4">
            <h3 className="font-bold text-white text-base border-b border-white/5 pb-2">Diagnóstico / Defeito</h3>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Descrição do Problema</label>
              <textarea 
                rows="4" 
                placeholder="Ex: Notebook apresenta tela azul intermitente e superaquecimento..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#4A47FF] transition-all resize-vertical"
                value={problema}
                onChange={(e) => setProblema(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* COLUNA DIREITA: ITENS E VALORES */}
        <div className="space-y-6">
          
          {/* Card Itens do Orçamento */}
          <div className="glass p-6 rounded-2xl shadow-xl space-y-4 flex flex-col min-h-[400px]">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <h3 className="font-bold text-white text-base">Itens da Proposta</h3>
              <div className="flex gap-2">
                {/* Dropdown Rápido de Produtos de Catálogo */}
                <select 
                  className="bg-[#0D0D0D] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                  onChange={(e) => {
                    const prod = produtosCatalogo.find(p => p.id === e.target.value);
                    if (prod) adicionarItem(prod);
                    e.target.value = "";
                  }}
                >
                  <option value="">+ Add do Catálogo</option>
                  {produtosCatalogo.map(p => (
                    <option key={p.id} value={p.id}>{p.nome} (R$ {p.preco})</option>
                  ))}
                </select>
                <button 
                  type="button" 
                  onClick={() => adicionarItem()}
                  className="flex items-center gap-1 bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-xl font-semibold text-xs text-white"
                >
                  + Manual
                </button>
              </div>
            </div>

            {itens.length === 0 ? (
              <div className="flex-1 flex flex-col justify-center items-center text-slate-500 text-sm py-10 space-y-2">
                <HelpCircle size={32} className="text-slate-600" />
                <p>Nenhum serviço ou peça adicionada a este orçamento.</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                {itens.map((item, idx) => (
                  <div key={item.id} className="bg-white/2 border border-white/5 p-4 rounded-xl flex flex-col gap-3 relative group animate-fadeIn">
                    <button 
                      type="button" 
                      onClick={() => removerItem(item.id)}
                      className="absolute top-4 right-4 text-red-500 hover:text-red-400 p-1 hover:bg-red-500/5 rounded-lg"
                    >
                      <Trash2 size={14} />
                    </button>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="sm:col-span-2">
                        <label className="text-[10px] text-slate-500 font-bold uppercase">Item / Serviço</label>
                        <input 
                          type="text" 
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white"
                          value={item.nome}
                          onChange={(e) => atualizarItem(item.id, "nome", e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 font-bold uppercase">Tipo</label>
                        <select 
                          className="w-full bg-[#0d0d0d] border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white"
                          value={item.tipo}
                          onChange={(e) => atualizarItem(item.id, "tipo", e.target.value)}
                        >
                          <option value="Serviço">Serviço</option>
                          <option value="Peça">Peça</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] text-slate-500 font-bold uppercase">Quant.</label>
                        <input 
                          type="number" 
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white"
                          value={item.quantidade}
                          onChange={(e) => atualizarItem(item.id, "quantidade", Number(e.target.value))}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 font-bold uppercase">V. Unit.</label>
                        <input 
                          type="number" 
                          step="0.01"
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white"
                          value={item.valor_unitario}
                          onChange={(e) => atualizarItem(item.id, "valor_unitario", Number(e.target.value))}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500 font-bold uppercase">Subtotal</label>
                        <div className="text-xs text-white font-bold h-full flex items-center pl-1">
                          R$ {item.total.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Totais do Orçamento */}
            <div className="border-t border-dashed border-white/10 pt-4 mt-auto space-y-2">
              <div className="flex justify-between text-sm text-slate-400">
                <span>Subtotal:</span>
                <span>R$ {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Desconto Comercial (R$):</span>
                <input 
                  type="number" 
                  step="0.01"
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-xs text-white w-24 text-right"
                  value={desconto}
                  onChange={(e) => setDesconto(e.target.value)}
                />
              </div>
              <div className="flex justify-between text-base font-bold text-white border-t border-white/5 pt-2">
                <span>Total Final:</span>
                <span className="text-[#c2c1ff]">R$ {totalFinal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Condições e Prazos */}
          <div className="glass p-6 rounded-2xl shadow-xl space-y-4">
            <h3 className="font-bold text-white text-base border-b border-white/5 pb-2">Condições Comerciais</h3>
            
            {/* Status e Motivo de Recusa */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-2 border-b border-white/5">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Status do Orçamento *</label>
                <select 
                  className="w-full bg-[#0D0D0D] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#4A47FF]"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="Em aberto">Em aberto</option>
                  <option value="Aprovado">Aprovado</option>
                  <option value="Recusado">Recusado</option>
                  <option value="Concluído">Concluído</option>
                </select>
              </div>
              {status === "Recusado" ? (
                <div className="animate-fadeIn">
                  <label className="block text-xs font-semibold text-rose-400 mb-1">Motivo da Recusa (Opcional)</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Achou o valor das peças alto"
                    className="w-full bg-white/5 border border-red-500/30 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
                    value={motivoRecusa}
                    onChange={(e) => setMotivoRecusa(e.target.value)}
                  />
                </div>
              ) : (
                <div className="text-xs text-slate-500 flex items-center pt-6">
                  Modifique para "Recusado" para detalhar o motivo.
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Validade do Orçamento (Dias)</label>
                <input 
                  type="number" 
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white"
                  value={condicoes.validade_dias}
                  onChange={(e) => setCondicoes({ ...condicoes, validade_dias: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Prazo de Entrega/Execução</label>
                <input 
                  type="text" 
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white"
                  value={condicoes.prazo_entrega}
                  onChange={(e) => setCondicoes({ ...condicoes, prazo_entrega: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-400 mb-1">Forma de Pagamento Aceita</label>
                <input 
                  type="text" 
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white"
                  value={condicoes.forma_pagamento}
                  onChange={(e) => setCondicoes({ ...condicoes, forma_pagamento: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-400 mb-1">Observações Internas / Termos</label>
                <textarea 
                  rows="2" 
                  placeholder="Garantia estendida, itens pendentes de aprovação, etc."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white resize-vertical"
                  value={condicoes.observacoes}
                  onChange={(e) => setCondicoes({ ...condicoes, observacoes: e.target.value })}
                />
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ── TEMPLATE DO PDF OMITIDO NA TELA (Apenas para html2pdf) ── */}
      <div style={{ position: "absolute", top: "-9999px", left: "-9999px", width: "794px", backgroundColor: "#fff", color: "#000" }}>
        <div ref={pdfRef} style={{ padding: "25px 35px", fontFamily: "Arial, sans-serif", fontSize: "12px", lineHeight: "1.5", color: "#333" }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "2px solid #2d2b7a", paddingBottom: "10px", marginBottom: "20px" }}>
            <img src="/logo.png" alt="RG TECH" style={{ maxHeight: "120px", maxWidth: "250px", objectFit: "contain" }} />
            <div style={{ textAlign: "right" }}>
              <h2 style={{ margin: 0, color: "#2d2b7a", fontSize: "18px" }}>RG TECH Computadores</h2>
              <p style={{ margin: "2px 0 0 0" }}>WhatsApp: (66) 9 9929-8666</p>
              <p style={{ margin: "1px 0 0 0" }}>E-mail: rgtechpc@gmail.com</p>
              <p style={{ margin: "1px 0 0 0" }}>Sorriso - Mato Grosso</p>
            </div>
          </div>

          {/* Título */}
          <div style={{ textAlign: "center", marginBottom: "20px" }}>
            <h1 style={{ margin: 0, fontSize: "18px", color: "#2d2b7a", textTransform: "uppercase" }}>Orçamento - #{orcamentoNumero}</h1>
            <p style={{ margin: "3px 0 0 0", color: "#666" }}>Data de Emissão: {format(new Date(dataEmissao + "T00:00:00"), "dd/MM/yyyy")}</p>
          </div>

          {/* Dados do Cliente e Equipamento */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "20px" }}>
            <div style={{ backgroundColor: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid #cbd5e1" }}>
              <h3 style={{ margin: "0 0 6px 0", fontSize: "13px", color: "#2d2b7a", borderBottom: "1px solid #cbd5e1", paddingBottom: "3px" }}>Dados do Cliente</h3>
              <p style={{ margin: "0 0 3px 0" }}><strong>Nome/Razão Social:</strong> {selectedClient?.nome_completo || "Não cadastrado"}</p>
              {selectedClient?.tipo_pessoa === "PJ" ? (
                <>
                  <p style={{ margin: "0 0 3px 0" }}><strong>CNPJ:</strong> {selectedClient.cpf_cnpj}</p>
                  <p style={{ margin: "0 0 3px 0" }}><strong>Insc. Estadual:</strong> {selectedClient.inscricao_estadual || "Isento"}</p>
                  <p style={{ margin: "0 0 3px 0" }}><strong>Contato:</strong> {selectedClient.nome_responsavel}</p>
                </>
              ) : (
                <p style={{ margin: "0 0 3px 0" }}><strong>CPF:</strong> {selectedClient?.cpf_cnpj || "N/A"}</p>
              )}
              <p style={{ margin: "0 0 3px 0" }}><strong>WhatsApp:</strong> {selectedClient?.telefone}</p>
              <p style={{ margin: "0 0 0 0" }}><strong>E-mail:</strong> {selectedClient?.email}</p>
            </div>
            <div style={{ backgroundColor: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid #cbd5e1" }}>
              <h3 style={{ margin: "0 0 6px 0", fontSize: "13px", color: "#2d2b7a", borderBottom: "1px solid #cbd5e1", paddingBottom: "3px" }}>Equipamento / Defeito</h3>
              <p style={{ margin: "0 0 3px 0" }}><strong>Tipo:</strong> {equipamento.tipo || "N/A"}</p>
              <p style={{ margin: "0 0 3px 0" }}><strong>Marca/Modelo:</strong> {equipamento.marca} {equipamento.modelo}</p>
              <p style={{ margin: "0 0 3px 0" }}><strong>Nº de Série:</strong> {equipamento.serie || "N/A"}</p>
              <p style={{ margin: "0 0 0 0" }}><strong>Problema:</strong> {problema || "Manutenção padrão."}</p>
            </div>
          </div>

          {/* Tabela de Itens */}
          <h3 style={{ margin: "0 0 6px 0", fontSize: "13px", color: "#2d2b7a" }}>Peças e Serviços</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "20px" }}>
            <thead>
              <tr style={{ backgroundColor: "#2d2b7a", color: "#fff", fontSize: "11px" }}>
                <th style={{ padding: "8px 10px", textAlign: "left", border: "1px solid #cbd5e1" }}>Item / Serviço</th>
                <th style={{ padding: "8px 10px", textAlign: "center", width: "50px", border: "1px solid #cbd5e1" }}>Qtd</th>
                <th style={{ padding: "8px 10px", textAlign: "right", width: "90px", border: "1px solid #cbd5e1" }}>Valor Unit.</th>
                <th style={{ padding: "8px 10px", textAlign: "right", width: "90px", border: "1px solid #cbd5e1" }}>Garantia</th>
                <th style={{ padding: "8px 10px", textAlign: "right", width: "90px", border: "1px solid #cbd5e1" }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((item, idx) => (
                <tr key={idx} style={{ fontSize: "11px" }}>
                  <td style={{ padding: "8px 10px", border: "1px solid #cbd5e1" }}>{item.nome}</td>
                  <td style={{ padding: "8px 10px", textAlign: "center", border: "1px solid #cbd5e1" }}>{item.quantidade}</td>
                  <td style={{ padding: "8px 10px", textAlign: "right", border: "1px solid #cbd5e1" }}>R$ {Number(item.valor_unitario).toFixed(2)}</td>
                  <td style={{ padding: "8px 10px", textAlign: "right", border: "1px solid #cbd5e1" }}>{item.garantia || "30 dias"}</td>
                  <td style={{ padding: "8px 10px", textAlign: "right", border: "1px solid #cbd5e1", fontWeight: "bold" }}>R$ {Number(item.total).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totais */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "20px" }}>
            <table style={{ width: "230px", borderCollapse: "collapse", fontSize: "11px" }}>
              <tbody>
                <tr>
                  <td style={{ padding: "4px 8px", textAlign: "right", fontWeight: "bold" }}>Subtotal:</td>
                  <td style={{ padding: "4px 8px", textAlign: "right" }}>R$ {subtotal.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style={{ padding: "4px 8px", textAlign: "right", fontWeight: "bold", color: "#10b981" }}>Desconto Comercial:</td>
                  <td style={{ padding: "4px 8px", textAlign: "right", color: "#10b981" }}>- R$ {Number(desconto).toFixed(2)}</td>
                </tr>
                <tr style={{ backgroundColor: "#2d2b7a", color: "#fff" }}>
                  <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: "bold", fontSize: "12px" }}>Total Final:</td>
                  <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: "bold", fontSize: "12px" }}>R$ {totalFinal.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Condições e rodapé */}
          <div style={{ borderTop: "2px solid #cbd5e1", paddingTop: "10px", fontSize: "11px" }}>
            <h4 style={{ margin: "0 0 5px 0", color: "#2d2b7a" }}>Condições Gerais do Orçamento</h4>
            <p style={{ margin: "0 0 3px 0" }}>- <strong>Validade deste documento:</strong> {condicoes.validade_dias} dias a partir da data de emissão.</p>
            <p style={{ margin: "0 0 3px 0" }}>- <strong>Forma de pagamento aceita:</strong> {condicoes.forma_pagamento}</p>
            <p style={{ margin: "0 0 3px 0" }}>- <strong>Prazo médio de entrega/execução:</strong> {condicoes.prazo_entrega}</p>
            {condicoes.observacoes && <p style={{ margin: "0 0 3px 0" }}>- <strong>Observações:</strong> {condicoes.observacoes}</p>}
            
            <h4 style={{ margin: "10px 0 5px 0", color: "#2d2b7a" }}>Garantia e Termos</h4>
            <p style={{ margin: 0, fontSize: "9px", color: "#666", whiteSpace: "pre-line" }}>
              Serviços prestados contam com garantia legal de 30 dias a partir da data de entrega da máquina.
              Peças de reposição possuem termos de garantia estipulados diretamente pelo fabricante correspondente.
              Ao autorizar a execução (seja verbalmente, por e-mail ou WhatsApp), o cliente concorda integralmente com os termos aqui dispostos.
            </p>
          </div>

          {/* Assinaturas */}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: "40px" }}>
            <div style={{ width: "230px", borderTop: "1px solid #666", textAlign: "center", paddingTop: "5px" }}>
              <p style={{ margin: 0, fontSize: "10px" }}>RG TECH Computadores (Técnico)</p>
            </div>
            <div style={{ width: "230px", borderTop: "1px solid #666", textAlign: "center", paddingTop: "5px" }}>
              <p style={{ margin: 0, fontSize: "10px" }}>Assinatura do Cliente (Aprovação)</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
