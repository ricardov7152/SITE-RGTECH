import { useState, useRef, useEffect } from "react";
import { Search, UserPlus, Check, X, ChevronDown, Phone } from "lucide-react";
import { db } from "../services/supabase";
import { localDateISO } from "../utils/date";

export default function ClientCombobox({
  clientes = [],
  value,
  onChange,
  onClientCreated,
  onNotify,
  compact = false,
  placeholder = "Buscar cliente pelo nome ou telefone...",
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [savingNew, setSavingNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newCpf, setNewCpf] = useState("");
  const [newOrigem, setNewOrigem] = useState("WhatsApp");

  const wrapperRef = useRef(null);
  const searchInputRef = useRef(null);

  const selectedClient = clientes.find((c) => c.id === value);

  useEffect(() => {
    const handleOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
        setCreating(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  useEffect(() => {
    if (open && !creating && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [open, creating]);

  const term = query.trim().toLowerCase();
  const filtered = clientes.filter((c) => {
    if (!term) return true;
    const nome = (c.nome_completo || "").toLowerCase();
    const fantasia = (c.nome_fantasia || "").toLowerCase();
    const tel = (c.telefone || "").toLowerCase();
    const doc = (c.cpf_cnpj || "").toLowerCase();
    return nome.includes(term) || fantasia.includes(term) || tel.includes(term) || doc.includes(term);
  });

  const startQuickCreate = () => {
    setNewName(query.trim());
    setNewPhone("");
    setNewCpf("");
    setCreating(true);
  };

  const handleSaveNewClient = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!newName.trim()) {
      onNotify?.("error", "Informe o nome do cliente para cadastrar.");
      return;
    }

    setSavingNew(true);
    try {
      const payload = {
        tipo_pessoa: "PF",
        nome_completo: newName.trim(),
        telefone: newPhone.trim() || null,
        cpf_cnpj: newCpf.trim() || null,
        origem: newOrigem,
        data_cadastro: localDateISO(),
        status_cliente: "Ativo",
      };
      const { data: created } = await db.clientes.insert(payload);
      if (created) {
        onClientCreated?.(created);
        onChange?.(created.id);
        onNotify?.("success", `Cliente "${created.nome_completo}" cadastrado e vinculado!`);
        setCreating(false);
        setOpen(false);
        setQuery("");
      }
    } catch (err) {
      console.error("Erro ao cadastrar cliente rápido:", err);
      onNotify?.("error", "Não foi possível cadastrar o cliente.");
    } finally {
      setSavingNew(false);
    }
  };

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between gap-2 bg-[#021024] border border-[#7DA0CA]/35 hover:border-[#C1E8FF]/60 rounded-xl text-left transition-colors combobox-trigger ${
          compact ? "px-2.5 py-1.5 text-[11px]" : "px-3 py-2 text-xs font-bold"
        } text-white`}
      >
        <span className="truncate">
          {selectedClient ? (
            <>
              {selectedClient.nome_completo}
              {selectedClient.telefone && !compact ? (
                <span className="ml-1.5 font-normal text-[#7DA0CA]">
                  ({selectedClient.telefone})
                </span>
              ) : null}
            </>
          ) : (
            <span className="text-[#7DA0CA] font-medium">
              {compact ? "Cliente (Opcional)" : "Selecionar ou buscar cliente..."}
            </span>
          )}
        </span>
        <ChevronDown
          size={compact ? 12 : 14}
          className={`shrink-0 text-[#7DA0CA] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="combobox-dropdown absolute left-0 right-0 mt-1.5 z-50 rounded-2xl bg-[#021024] border border-[#7DA0CA]/40 shadow-[0_18px_45px_rgba(2,16,36,0.95)] overflow-hidden min-w-[260px]">
          {!creating ? (
            <>
              <div className="p-2 border-b border-[#7DA0CA]/20 flex items-center gap-2">
                <Search size={13} className="text-[#7DA0CA] shrink-0 ml-1" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={placeholder}
                  className="w-full bg-transparent text-xs text-white placeholder-[#7DA0CA]/60 focus:outline-none py-1"
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setOpen(false);
                  }}
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="p-1 text-[#7DA0CA] hover:text-white rounded"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              <div className="max-h-52 overflow-y-auto kanban-scrollbar p-1.5 space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    onChange?.("");
                    setOpen(false);
                    setQuery("");
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                    !value
                      ? "bg-[#052659] text-[#C1E8FF] font-bold"
                      : "text-[#7DA0CA] hover:bg-white/5"
                  }`}
                >
                  <span>Sem cliente vinculado</span>
                  {!value && <Check size={12} />}
                </button>

                {filtered.length === 0 ? (
                  <div className="py-4 px-3 text-center text-[11px] text-[#7DA0CA]">
                    Nenhum cliente encontrado para &ldquo;{query}&rdquo;.
                  </div>
                ) : (
                  filtered.slice(0, 60).map((c) => {
                    const isSel = c.id === value;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          onChange?.(c.id);
                          setOpen(false);
                          setQuery("");
                        }}
                        className={`w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-center justify-between gap-2 transition-colors ${
                          isSel
                            ? "bg-[#052659] text-[#C1E8FF] font-bold"
                            : "text-white hover:bg-white/5"
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="truncate font-semibold">{c.nome_completo}</div>
                          {(c.telefone || c.cpf_cnpj) && (
                            <div className="text-[10px] text-[#7DA0CA] flex items-center gap-2 truncate">
                              {c.telefone && (
                                <span className="flex items-center gap-1">
                                  <Phone size={9} /> {c.telefone}
                                </span>
                              )}
                              {c.cpf_cnpj && <span>{c.cpf_cnpj}</span>}
                            </div>
                          )}
                        </div>
                        {isSel && <Check size={13} className="shrink-0 text-[#19DDFF]" />}
                      </button>
                    );
                  })
                )}
              </div>

              <div className="p-2 border-t border-[#7DA0CA]/20 bg-[#052659]/35">
                <button
                  type="button"
                  onClick={startQuickCreate}
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#0029F5] hover:bg-[#19DDFF] hover:text-[#05050c] text-white text-xs font-bold transition-all shadow-sm"
                >
                  <UserPlus size={14} />
                  <span>
                    {query.trim()
                      ? `Cadastrar "${query.trim()}"`
                      : "Cadastrar novo cliente rápido"}
                  </span>
                </button>
              </div>
            </>
          ) : (
            <div className="p-3 space-y-2.5">
              <div className="flex items-center justify-between border-b border-[#7DA0CA]/20 pb-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#C1E8FF] flex items-center gap-1.5">
                  <UserPlus size={13} /> Novo Cliente Rápido
                </span>
                <button
                  type="button"
                  onClick={() => setCreating(false)}
                  className="text-[#7DA0CA] hover:text-white p-0.5 rounded"
                  title="Voltar para busca"
                >
                  <X size={14} />
                </button>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-[#7DA0CA] mb-1">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  autoFocus
                  placeholder="Ex: João Silva"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSaveNewClient();
                    }
                  }}
                  className="w-full bg-[#052659]/40 border border-[#7DA0CA]/40 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#C1E8FF]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-[#7DA0CA] mb-1">
                    WhatsApp / Tel
                  </label>
                  <input
                    type="text"
                    placeholder="(66) 99999-9999"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full bg-[#052659]/40 border border-[#7DA0CA]/40 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#C1E8FF]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-[#7DA0CA] mb-1">
                    Origem
                  </label>
                  <select
                    value={newOrigem}
                    onChange={(e) => setNewOrigem(e.target.value)}
                    className="w-full bg-[#052659]/40 border border-[#7DA0CA]/40 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none"
                  >
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Google">Google</option>
                    <option value="Instagram">Instagram</option>
                    <option value="Indicação">Indicação</option>
                    <option value="Site">Site</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-[#7DA0CA] mb-1">
                  CPF / CNPJ (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Opcional"
                  value={newCpf}
                  onChange={(e) => setNewCpf(e.target.value)}
                  className="w-full bg-[#052659]/40 border border-[#7DA0CA]/40 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#C1E8FF]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setCreating(false)}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-[#7DA0CA] hover:bg-white/5"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  disabled={savingNew}
                  onClick={handleSaveNewClient}
                  className="px-3.5 py-1.5 rounded-lg bg-[#0029F5] hover:bg-[#19DDFF] hover:text-[#05050c] text-white text-[11px] font-bold transition-all disabled:opacity-50"
                >
                  {savingNew ? "Salvando..." : "Salvar e Vincular"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
