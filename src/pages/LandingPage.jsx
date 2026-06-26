import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { trackPageView } from "../services/analytics";

const WA_LINK = "https://wa.me/5566999298666?text=Ol%C3%A1%2C%20vim%20pelo%20site%20e%20gostaria%20de%20solicitar%20um%20or%C3%A7amento!";
const WA_SERVICO = (servico) =>
  `https://wa.me/5566999298666?text=Ol%C3%A1%2C%20tenho%20interesse%20em%20${encodeURIComponent(servico)}.%20Pode%20me%20ajudar%3F`;

const marcas = [
  "DELL", "LENOVO", "APPLE", "HP", "INTEL", "AMD",
  "NVIDIA", "ASUS", "GIGABYTE", "MSI", "CORSAIR", "KINGSTON",
  "LOGITECH", "SAMSUNG", "INTELBRAS", "ACER",
];

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    trackPageView("Página Inicial", "/");
  }, []);

  return (
    <div className="overflow-x-hidden bg-[#05050c] text-[#e2e2e2] font-inter selection:bg-[#19DDFF]/30 selection:text-white">

      {/* ── TopNavBar ── */}
      <nav className="fixed top-0 left-0 w-full px-4 md:px-8 py-2 bg-[#05050c]/80 backdrop-blur-xl border-b border-white/5 shadow-[0_4px_30px_rgba(0,41,245,0.03)] z-50 transition-all duration-300">
        <div className="flex justify-between items-center h-full max-w-7xl mx-auto">
          {/* Logo */}
          <a href="#" className="shrink-0 group">
            <img src="/logo.png" alt="RG TECH Logo" className="h-16 md:h-20 w-auto object-contain transition-all duration-300 group-hover:scale-102 -ml-3 md:-ml-4" />
          </a>

          {/* Links - Desktop */}
          <div className="hidden md:flex gap-8 items-center justify-center">
            {["servicos:SERVIÇOS", "marcas:MARCAS", "sobre:SOBRE NÓS", "faq:FAQ"].map((item) => {
              const [id, label] = item.split(":");
              return (
                <a 
                  key={id}
                  className="text-slate-400 font-bold tracking-wider hover:text-[#19DDFF] transition-colors duration-300 text-xs uppercase" 
                  href={`#${id}`}
                >
                  {label}
                </a>
              );
            })}
          </div>

          {/* CTA buttons & Mobile Menu Toggle */}
          <div className="flex gap-3 md:gap-4 items-center shrink-0">
            <Link to="/login" className="px-4 py-2 border border-white/10 hover:border-[#0029F5]/30 text-white font-bold rounded-xl hover:bg-[#0029F5]/5 transition-all text-xs uppercase tracking-wider">
              LOGIN
            </Link>
            <a href={WA_LINK} target="_blank" rel="noreferrer" className="px-4 py-2 bg-[#0029F5] text-white font-bold rounded-xl hover:bg-[#19DDFF] hover:text-[#05050c] hover:shadow-[0_0_25px_rgba(25,221,255,0.45)] transition-all text-xs uppercase tracking-wider">
              ORÇAMENTO
            </a>
            <button 
              className="md:hidden text-white p-2 hover:bg-white/5 rounded-xl" 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <span className="material-symbols-outlined text-2xl">{isMenuOpen ? "close" : "menu"}</span>
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMenuOpen && (
          <div className="md:hidden absolute top-full left-0 w-full bg-[#05050c]/95 backdrop-blur-2xl border-b border-white/5 py-6 px-6 flex flex-col gap-4 shadow-2xl animate-fadeIn">
            {["servicos:SERVIÇOS", "marcas:MARCAS", "sobre:SOBRE NÓS", "faq:FAQ"].map((item) => {
              const [id, label] = item.split(":");
              return (
                <a 
                  key={id}
                  className="text-slate-400 hover:text-[#19DDFF] font-bold uppercase text-sm tracking-wider py-1 border-b border-white/5" 
                  href={`#${id}`} 
                  onClick={() => setIsMenuOpen(false)}
                >
                  {label}
                </a>
              );
            })}
            <Link className="text-slate-400 hover:text-[#19DDFF] font-bold uppercase text-sm tracking-wider py-1" to="/login" onClick={() => setIsMenuOpen(false)}>LOGIN</Link>
          </div>
        )}
      </nav>

      {/* ── Hero Section ── */}
      <section className="relative min-h-screen pt-36 pb-20 px-4 md:px-8 hero-gradient flex items-center overflow-hidden">
        {/* Glowing Blobs */}
        <div className="absolute w-[350px] h-[350px] bg-[#0029F5]/10 blur-[120px] rounded-full top-1/4 -left-32 animate-pulse pointer-events-none"></div>
        <div className="absolute w-[400px] h-[400px] bg-[#19DDFF]/5 blur-[130px] rounded-full bottom-1/4 right-0 pointer-events-none"></div>

        <div className="container mx-auto max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
          <div>
            <span className="inline-block px-3 py-1 mb-6 border border-[#19DDFF]/20 text-[#19DDFF] text-[10px] font-bold tracking-widest uppercase rounded-lg bg-[#19DDFF]/5">
              Sorriso - Mato Grosso
            </span>
            <h1 className="text-4xl md:text-[52px] font-extrabold text-white mb-6 leading-tight tracking-tight">
              Seu computador com problemas? Nós resolvemos <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#19DDFF] to-[#0029F5] drop-shadow-[0_0_20px_rgba(25,221,255,0.15)]">ainda hoje!</span>
            </h1>
            <p className="text-base md:text-[18px] text-slate-300 mb-10 max-w-lg leading-relaxed">
              Assistência técnica especializada de alta performance em Sorriso-MT. Orçamento transparente, atendimento rápido e serviços com garantia real.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a href={WA_LINK} target="_blank" rel="noreferrer"
                className="px-8 py-4 bg-[#0029F5] text-white font-bold rounded-xl hover:bg-[#19DDFF] hover:text-[#05050c] hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(25,221,255,0.4)] transition-all text-center uppercase tracking-wider text-sm">
                Solicitar Orçamento Grátis
              </a>
              <a href="#servicos"
                className="px-8 py-4 border border-white/10 text-white font-bold rounded-xl hover:bg-white/5 hover:border-[#19DDFF]/20 hover:text-[#19DDFF] transition-all text-center uppercase tracking-wider text-sm">
                Nossos Serviços
              </a>
            </div>
            <p className="mt-4 text-slate-500 text-xs">Sem compromisso. Avaliação e diagnóstico 100% gratuitos.</p>
          </div>

          {/* Hero image */}
          <div className="flex justify-center items-center relative">
            <div className="relative w-full max-w-lg group">
              <div className="absolute inset-0 bg-[#0029F5]/10 rounded-3xl blur-[80px] group-hover:bg-[#19DDFF]/10 transition-all duration-700"></div>
              <img 
                alt="PC Gamer RG TECH" 
                className="w-full h-full object-contain rounded-2xl relative z-10 drop-shadow-[0_10px_30px_rgba(0,41,245,0.15)] group-hover:scale-101 transition-transform duration-500" 
                src={`/pc.png?v=${Date.now()}`} 
              />
            </div>
          </div>
        </div>

        {/* Decorative Grid */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{ backgroundImage: "radial-gradient(#19DDFF 1px, transparent 1px)", backgroundSize: "32px 32px" }}>
        </div>
      </section>

      {/* ── Marcas Carrossel ── */}
      <section className="py-12 bg-[#030308] border-y border-white/5 overflow-hidden scroll-mt-28" id="marcas">
        <p className="text-center text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-8">Especialistas em Marcas Líderes do Mercado</p>
        <div className="overflow-hidden">
          <div className="marquee-track">
            {[...marcas, ...marcas].map((marca, i) => (
              <span key={i} className="text-white font-black text-2xl tracking-tighter opacity-30 hover:opacity-80 hover:text-[#19DDFF] transition-all duration-300 mx-12 shrink-0 cursor-default">
                {marca}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Serviços Section ── */}
      <section className="py-24 bg-[#070714] relative overflow-hidden" id="servicos">
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.02] pointer-events-none"
          style={{ backgroundImage: "radial-gradient(#0029F5 1px, transparent 1px)", backgroundSize: "24px 24px" }}>
        </div>
        <div className="absolute w-[300px] h-[300px] bg-[#19DDFF]/5 blur-[100px] rounded-full -top-40 right-10 pointer-events-none"></div>

        <div className="container mx-auto px-4 md:px-8 max-w-7xl relative z-10">
          <div className="flex flex-col md:flex-row justify-between md:items-end mb-16 gap-6">
            <div>
              <span className="text-[10px] font-bold text-[#19DDFF] mb-3 block tracking-widest uppercase">NOSSAS SOLUÇÕES</span>
              <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">Serviços Profissionais</h2>
            </div>
            <p className="text-slate-400 max-w-sm text-sm leading-relaxed">Diagnóstico de alta precisão e manutenção inteligente para extrair a máxima performance do seu hardware.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { icon: "laptop_mac", title: "PC & Notebook", desc: "Reparos estruturais, upgrades estratégicos e otimização de sistemas lentos ou travados." },
              { icon: "sports_esports", title: "Máquinas Gamer", desc: "Montagem personalizada com otimização, airflow planejado e cable management de elite." },
              { icon: "cleaning_services", title: "Limpeza Preventiva", desc: "Higienização interna profunda e troca de pasta térmica de alto desempenho (premium)." },
              { icon: "support_agent", title: "Consultoria Gamer/Pro", desc: "Projetos de hardware sob medida para o seu uso comercial, profissional ou de jogos." },
              { icon: "business_center", title: "Suporte Corporativo", desc: "Contratos de manutenção, suporte remoto ágil e consultoria em TI para pequenas e médias empresas." },
            ].map((s, i) => (
              <a key={i} href={WA_SERVICO(s.title)} target="_blank" rel="noreferrer"
                className="glass p-6 rounded-2xl hover:border-[#19DDFF]/30 hover:bg-[#0029F5]/5 hover:shadow-[0_10px_30px_rgba(0,41,245,0.08)] transition-all duration-300 group flex flex-col">
                <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center mb-6 text-[#19DDFF] group-hover:bg-[#0029F5] group-hover:text-white transition-all duration-300 shrink-0">
                  <span className="material-symbols-outlined text-2xl">{s.icon}</span>
                </div>
                <h3 className="text-base font-bold text-white mb-3 group-hover:text-[#19DDFF] transition-colors">{s.title}</h3>
                <p className="text-slate-400 text-xs leading-relaxed mb-6 flex-1">{s.desc}</p>
                <span className="text-[#19DDFF] font-bold text-xs flex items-center gap-2 group-hover:gap-4 transition-all mt-auto">
                  Solicitar <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── Sobre Nós / Benefícios Section ── */}
      <section className="py-24 bg-[#05050f] relative overflow-hidden" id="sobre">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#0029F5]/5 blur-[160px] rounded-full pointer-events-none"></div>

        <div className="container mx-auto px-4 md:px-8 max-w-7xl relative z-10">
          <div className="text-center mb-16">
            <span className="text-[10px] font-bold text-[#19DDFF] mb-3 block tracking-widest uppercase">Nossos Diferenciais</span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">Confiança construída com excelência</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: "payments", title: "Preço Justo & Transparência", desc: "Tabelas claras e orçamentos detalhados. Você sabe exatamente pelo que está pagando, sem surpresas na entrega." },
              { icon: "speed", title: "Diagnóstico Expresso", desc: "Sabemos que você não pode parar de trabalhar ou jogar. Entregamos seu laudo e orçamento em tempo recorde." },
              { icon: "dynamic_feed", title: "Suporte Presencial ou Remoto", desc: "Atendimento presencial especializado em nosso laboratório físico ou suporte de software remoto seguro." },
              { icon: "verified", title: "Orçamento 100% Sem Custos", desc: "Fazemos toda a análise técnica e orçamento de forma totalmente gratuita. Sem taxas de diagnóstico abusivas." },
              { icon: "handshake", title: "Foco em Solução PF & PJ", desc: "Atendimento humanizado para computadores domésticos e planos corporativos dedicados para empresas." },
              { icon: "star", title: "Referência 5 Estrelas no Google", desc: "Centenas de computadores otimizados com aprovação unânime de clientes da nossa região em Sorriso-MT." },
            ].map((b, i) => (
              <div key={i} className="glass p-8 rounded-2xl hover:bg-white/[0.04] hover:border-[#0029F5]/20 transition-all duration-300">
                <div className="text-[#19DDFF] mb-6">
                  <span className="material-symbols-outlined text-4xl">{b.icon}</span>
                </div>
                <h3 className="text-lg font-bold text-white mb-3">{b.title}</h3>
                <p className="text-slate-400 text-xs leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Prova Social Section ── */}
      <section className="py-24 bg-[#070714] text-white relative overflow-hidden">
        <div className="container mx-auto px-4 md:px-8 max-w-7xl relative z-10">
          <h2 className="text-2xl md:text-3xl font-extrabold mb-12 text-center tracking-tight">A Assistência Preferida de Sorriso - MT</h2>
          
          {/* Contadores */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
            {[
              { valor: "+100", label: "Equipamentos Otimizados" },
              { valor: "2+",   label: "Anos de Operação" },
              { valor: "5.0★", label: "Média de Avaliações Google" },
              { valor: "30min",label: "Tempo Médio de Retorno" },
            ].map((c, i) => (
              <div key={i} className="glass p-6 rounded-2xl text-center border-white/5 hover:border-[#19DDFF]/10 transition-colors">
                <div className="text-3xl md:text-4xl font-extrabold text-[#19DDFF] mb-1">{c.valor}</div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{c.label}</div>
              </div>
            ))}
          </div>

          {/* Depoimentos 2x2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { nome: "Patricq Souza",   texto: "Assistência com preço justo e de qualidade. Atendimento excelente, super recomendo!" },
              { nome: "Neto Martins",     texto: "Meu computador estava muito lento e travando bastante. Levei na RG TECH, sugeriram um upgrade preciso e agora meu PC está extremamente rápido! Preço justo e trabalho sério." },
              { nome: "Denisson de Araujo", texto: "Serviço prestado com muita agilidade e excelência. Suporte pós-venda impecável, indico a todos." },
              { nome: "Gustavo Karnopp",  texto: "Serviço de ótima qualidade, entrega no prazo e explicação muito didática de todas as peças e serviços efetuados no meu PC. Excelente!" },
            ].map((d, i) => (
              <div key={i} className="glass p-6 rounded-2xl flex flex-col hover:border-[#19DDFF]/10 transition-colors">
                <div className="flex gap-1 text-[#19DDFF] mb-4">
                  {[...Array(5)].map((_, j) => (
                    <span key={j} className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  ))}
                </div>
                <p className="text-slate-300 italic text-xs leading-relaxed mb-6 flex-1">"{d.texto}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#0029F5] flex items-center justify-center text-white font-bold text-xs shrink-0">
                    {d.nome[0]}
                  </div>
                  <span className="font-bold text-white text-xs">{d.nome}</span>
                </div>
              </div>
            ))}
          </div>

          {/* CTA Instagram */}
          <div className="mt-16 text-center">
            <p className="text-slate-400 text-xs mb-4">Acompanhe nossas montagens gamers e dicas diárias no Instagram</p>
            <a href="https://www.instagram.com/rgtechpc/" target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] text-white font-bold rounded-xl hover:scale-102 hover:shadow-[0_0_30px_rgba(253,29,29,0.25)] transition-all text-xs uppercase tracking-wider">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
              </svg>
              Ver Nossas Montagens no Instagram
            </a>
          </div>
        </div>
      </section>

      {/* ── FAQ Section ── */}
      <section className="py-24 bg-[#05050f] text-white relative overflow-hidden" id="faq">
        <div className="container mx-auto px-4 md:px-8 max-w-3xl relative z-10">
          <h2 className="text-2xl md:text-3xl font-extrabold text-center mb-16 tracking-tight">Perguntas Frequentes</h2>
          <div className="space-y-4">
            {[
              { q: "Vocês atendem empresas ou apenas computadores domésticos?", a: "Atendemos ambos! Fornecemos suporte técnico remoto/presencial e contratos de manutenção preventiva especializados para pequenas e médias empresas (PJ), além de computadores e notebooks para uso pessoal (PF)." },
              { q: "O orçamento é cobrado?", a: "Não. A análise técnica do seu equipamento e o orçamento são 100% gratuitos e sem qualquer tipo de compromisso. O serviço só inicia com o seu aval." },
              { q: "Prestam atendimento de suporte remoto?", a: "Sim! Problemas relacionados a lentidões, configurações de sistema, instalação de drivers ou limpeza de vírus podem ser resolvidos via acesso remoto de forma rápida e segura." },
              { q: "Vocês trabalham com a venda de peças?", a: "Sim, trabalhamos com uma ampla linha de componentes, peças de reposição de grandes marcas, SSDs, memórias RAM e periféricos gamers." },
              { q: "Quanto tempo demora o diagnóstico técnico?", a: "Prezamos pelo menor tempo de laboratório possível. Geralmente, em poucas horas realizamos a análise completa e te enviamos o laudo detalhado." },
            ].map((item, i) => (
              <div key={i} className="border-b border-white/5 py-6">
                <p className="text-base md:text-lg font-bold text-white">{item.q}</p>
                <p className="mt-3 text-slate-400 text-xs md:text-sm leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Final ── */}
      <section className="py-28 bg-[#030308] relative overflow-hidden">
        {/* Background glow blob */}
        <div className="absolute w-[500px] h-[300px] bg-[#0029F5]/10 blur-[150px] bottom-0 left-1/2 -translate-x-1/2 pointer-events-none"></div>

        <div className="container mx-auto px-4 text-center relative z-10">
          <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-6 tracking-tight">
            Pronto para resolver o problema do seu PC <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#19DDFF] to-[#0029F5] drop-shadow-[0_0_20px_rgba(25,221,255,0.15)]">ainda hoje?</span>
          </h2>
          <p className="text-sm md:text-base text-slate-400 mb-4 max-w-2xl mx-auto leading-relaxed">Avaliação transparente. Sem burocracia. Somente a solução correta para o seu uso diário.</p>
          <p className="text-slate-500 text-xs mb-10 font-medium">⚡ Resposta rápida no WhatsApp em até 30 minutos | Diagnóstico Gratuito</p>
          <a href={WA_LINK} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-4 px-10 py-5 bg-[#25D366] text-white font-bold text-lg md:text-xl rounded-2xl hover:scale-103 transition-all shadow-[0_10px_40px_rgba(37,211,102,0.3)]">
            <span className="material-symbols-outlined text-3xl">chat</span>
            Falar com a RG TECH no WhatsApp
          </a>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="w-full py-16 px-4 md:px-8 bg-[#020205] border-t border-white/5">
        <div className="container mx-auto max-w-7xl grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="flex flex-col items-center text-center">
            <img src="/logo.png" alt="RG TECH" className="h-24 mb-2 object-contain" />
            <p className="text-slate-500 text-xs max-w-[200px] leading-relaxed">Tecnologia que resolve<br />com transparência.</p>
          </div>
          <div>
            <p className="text-white font-bold mb-5 text-xs uppercase tracking-widest">Navegação</p>
            <div className="flex flex-col gap-2.5">
              {["#servicos:SERVIÇOS", "#marcas:MARCAS", "#sobre:SOBRE NÓS", "#faq:FAQ"].map(item => {
                const [href, label] = item.split(":");
                return <a key={href} href={href} className="text-slate-500 text-xs hover:text-[#19DDFF] transition-colors font-medium">{label}</a>;
              })}
            </div>
          </div>
          <div>
            <p className="text-white font-bold mb-5 text-xs uppercase tracking-widest">Contato</p>
            <div className="flex flex-col gap-2.5 text-slate-500 text-xs font-medium">
              <a href={WA_LINK} target="_blank" rel="noreferrer" className="hover:text-white transition-colors">📱 (66) 9 9929-8666</a>
              <a href="mailto:rgtechpc@gmail.com" className="hover:text-white transition-colors">✉️ rgtechpc@gmail.com</a>
              <a href="https://instagram.com/rgtechpc" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">📸 @rgtechpc</a>
            </div>
          </div>
          <div>
            <p className="text-white font-bold mb-5 text-xs uppercase tracking-widest">Localização</p>
            <div className="text-slate-500 text-xs flex flex-col gap-1.5 font-medium leading-relaxed">
              <a href="https://maps.google.com/?q=Rua+Celeste+670+Sorriso+MT" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">
                📍 Rua Celeste, Nº 670, Bela Vista<br />Sorriso - MT
              </a>
              <p className="mt-2 text-[11px] text-slate-600">⏰ Segunda a Sábado: 07:00 às 19:00</p>
            </div>
          </div>
        </div>
        <div className="container mx-auto max-w-7xl mt-12 pt-8 border-t border-white/5 text-center text-slate-600 text-xs">
          © 2026 RG TECH COMPUTADORES. Todos os direitos reservados.
        </div>
      </footer>

      {/* ── WhatsApp Floating Button ── */}
      <a href={WA_LINK} target="_blank" rel="noreferrer"
        className="fixed bottom-8 right-8 w-16 h-16 bg-[#25D366] rounded-full flex items-center justify-center text-white shadow-2xl hover:scale-110 transition-all z-[100] group">
        <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>chat</span>
        <span className="absolute right-full mr-4 bg-[#05050c]/90 backdrop-blur border border-white/10 text-white px-4 py-2 rounded-xl font-bold text-xs tracking-wider uppercase whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-xl">
          Falar com técnico ⚡
        </span>
      </a>

    </div>
  );
}
