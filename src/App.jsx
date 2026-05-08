import { useState } from "react";

const WA_LINK = "https://wa.me/5566999298666?text=Ol%C3%A1%2C%20vim%20pelo%20site%20e%20gostaria%20de%20solicitar%20um%20or%C3%A7amento!";
const WA_SERVICO = (servico) =>
  `https://wa.me/5566999298666?text=Ol%C3%A1%2C%20tenho%20interesse%20em%20${encodeURIComponent(servico)}.%20Pode%20me%20ajudar%3F`;

const marcas = [
  "DELL", "LENOVO", "APPLE", "HP", "INTEL", "AMD",
  "NVIDIA", "ASUS", "GIGABYTE", "MSI", "CORSAIR", "KINGSTON",
  "LOGITECH", "SAMSUNG", "INTELBRAS", "ACER",
];

export default function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="overflow-x-hidden bg-[#0D0D0D] text-[#e2e2e2] font-inter">

      {/* ── TopNavBar ── */}
      <nav className="fixed top-0 left-0 w-full px-4 md:px-8 py-2 bg-[#0D0D0D]/90 backdrop-blur-xl border-b border-white/10 shadow-[0_0_15px_rgba(59,130,246,0.1)] z-50">
        <div className="flex justify-between items-center h-full">
          {/* Logo */}
          <a href="#" className="shrink-0">
            <img src="/logo.png" alt="RG TECH Logo" className="h-16 md:h-24 w-auto object-contain" />
          </a>

          {/* Links - Desktop */}
          <div className="hidden md:flex gap-8 items-center justify-center">
            <a className="text-blue-400 font-bold border-b-2 border-blue-500 tracking-tight hover:text-blue-400 transition-colors duration-300 uppercase text-sm" href="#servicos">SERVIÇOS</a>
            <a className="text-slate-400 font-medium tracking-tight hover:text-blue-400 transition-colors duration-300 uppercase text-sm" href="#marcas">MARCAS</a>
            <a className="text-slate-400 font-medium tracking-tight hover:text-blue-400 transition-colors duration-300 uppercase text-sm" href="#sobre">SOBRE NÓS</a>
            <a className="text-slate-400 font-medium tracking-tight hover:text-blue-400 transition-colors duration-300 uppercase text-sm" href="#faq">FAQ</a>
          </div>

          {/* CTA buttons & Mobile Menu Toggle */}
          <div className="flex gap-3 md:gap-4 items-center shrink-0">
            <a href={WA_LINK} target="_blank" rel="noreferrer" className="hidden lg:block px-5 py-2 text-slate-400 font-medium hover:text-white transition-all text-sm whitespace-nowrap">
              📞 (66) 9 9929-8666
            </a>
            <a href={WA_LINK} target="_blank" rel="noreferrer" className="px-4 py-2 bg-[#2D2B7A] text-white font-bold rounded-lg hover:bg-[#4A47FF] transition-all text-xs md:text-sm whitespace-nowrap">
              ORÇAMENTO
            </a>
            <button 
              className="md:hidden text-white p-2" 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              <span className="material-symbols-outlined text-2xl">{isMenuOpen ? "close" : "menu"}</span>
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {isMenuOpen && (
          <div className="md:hidden absolute top-full left-0 w-full bg-[#0D0D0D] border-b border-white/10 py-4 px-6 flex flex-col gap-4 shadow-xl">
            <a className="text-white font-bold uppercase text-sm" href="#servicos" onClick={() => setIsMenuOpen(false)}>SERVIÇOS</a>
            <a className="text-slate-400 hover:text-white font-medium uppercase text-sm" href="#marcas" onClick={() => setIsMenuOpen(false)}>MARCAS</a>
            <a className="text-slate-400 hover:text-white font-medium uppercase text-sm" href="#sobre" onClick={() => setIsMenuOpen(false)}>SOBRE NÓS</a>
            <a className="text-slate-400 hover:text-white font-medium uppercase text-sm" href="#faq" onClick={() => setIsMenuOpen(false)}>FAQ</a>
          </div>
        )}
      </nav>

      {/* ── Hero Section ── */}
      <section className="relative min-h-screen pt-32 pb-20 px-8 hero-gradient flex items-center overflow-hidden">
        <div className="container mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="z-10">
            <span className="inline-block px-3 py-1 mb-6 border border-blue-500/30 text-blue-400 text-xs tracking-widest uppercase rounded-sm bg-blue-500/5">
              Sorriso - Mato Grosso
            </span>
            <h1 className="text-[48px] font-bold text-white mb-6 leading-tight max-w-xl">
              Seu computador está com problema? Nós resolvemos <span className="text-[#c2c1ff]">ainda hoje!</span>
            </h1>
            <p className="text-[18px] text-slate-300 mb-10 max-w-lg">
              Assistência técnica especializada em Sorriso-MT. Orçamento transparente, sem jargões técnicos e sem enrolação. Seu hardware em boas mãos.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a href={WA_LINK} target="_blank" rel="noreferrer"
                className="px-8 py-4 bg-[#2D2B7A] text-white font-bold rounded-xl hover:bg-[#4A47FF] hover:scale-[1.02] transition-all shadow-lg shadow-blue-900/20 text-center">
                Solicitar Orçamento
              </a>
              <a href="#servicos"
                className="px-8 py-4 border border-white/20 text-white font-bold rounded-xl hover:bg-white/5 transition-all text-center">
                Ver Nossos Serviços
              </a>
            </div>
            <p className="mt-4 text-slate-500 text-sm">Sem compromisso. Orçamento 100% gratuito.</p>
          </div>

          {/* Hero image */}
          <div className="relative z-10 flex justify-center items-center">
            <div className="relative w-full max-w-lg">
              <div className="absolute inset-0 bg-blue-500/10 rounded-full blur-[100px] animate-pulse"></div>
              <img alt="PC Gamer RG TECH" className="w-full h-full object-contain rounded-2xl" src={`/pc.png?v=${Date.now()}`} />
            </div>
          </div>
        </div>
        {/* Decorative Grid */}
        <div className="absolute inset-0 opacity-10 pointer-events-none"
          style={{ backgroundImage: "radial-gradient(#2d2b7a 1px, transparent 1px)", backgroundSize: "32px 32px" }}>
        </div>
      </section>

      {/* ── Marcas Carrossel ── */}
      <section className="py-12 bg-[#0D0D0D] border-y border-white/5 overflow-hidden scroll-mt-28" id="marcas">
        <p className="text-center text-xs text-slate-500 uppercase tracking-widest mb-8">Especialistas em marcas líderes</p>
        <div className="overflow-hidden">
          <div className="marquee-track">
            {[...marcas, ...marcas].map((marca, i) => (
              <span key={i} className="text-white font-bold text-xl tracking-tighter opacity-50 hover:opacity-100 transition-opacity mx-10 shrink-0">
                {marca}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Serviços Section ── */}
      <section className="py-24 bg-[#F4F4F4] text-[#0D0D0D]" id="servicos">
        <div className="container mx-auto px-8">
          <div className="flex flex-col md:flex-row justify-between md:items-end mb-16 gap-4">
            <div>
              <span className="text-xs font-bold text-[#2410e2] mb-4 block tracking-widest">NOSSAS SOLUÇÕES</span>
              <h2 className="text-3xl font-bold text-[#0D0D0D]">Serviços Profissionais</h2>
            </div>
            <p className="text-slate-600 max-w-sm">Diagnóstico preciso e reparos de alta performance para elevar sua produtividade.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { icon: "laptop_mac", title: "Manutenção de PC/Notebook", desc: "Reparos estruturais, troca de componentes e upgrade de hardware para máquinas lentas." },
              { icon: "sports_esports", title: "Montagem de PC Gamer", desc: "Projetos personalizados com otimização de performance e gerenciamento de cabos profissional." },
              { icon: "cleaning_services", title: "Limpeza Preventiva", desc: "Troca de pasta térmica premium para evitar superaquecimento e prolongar a vida útil." },
              { icon: "support_agent", title: "Consultoria e Vendas", desc: "Auxiliamos na escolha do melhor hardware para seu uso, garantindo o melhor custo-benefício." },
              { icon: "business_center", title: "Suporte a Empresas", desc: "Manutenção preventiva, suporte técnico e consultoria para pequenas e médias empresas. Atendimento presencial e remoto." },
            ].map((s, i) => (
              <a key={i} href={WA_SERVICO(s.title)} target="_blank" rel="noreferrer"
                className="bg-white p-5 rounded-xl border border-slate-200 hover:shadow-2xl hover:border-[#2D2B7A] hover:-translate-y-1 transition-all group flex flex-col">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center mb-4 text-blue-600 group-hover:bg-[#2D2B7A] group-hover:text-white transition-all shrink-0">
                  <span className="material-symbols-outlined text-2xl">{s.icon}</span>
                </div>
                <h3 className="text-base font-bold mb-2">{s.title}</h3>
                <p className="text-slate-500 text-sm mb-4 flex-1">{s.desc}</p>
                <span className="text-blue-600 font-bold flex items-center gap-2 group-hover:gap-4 transition-all mt-auto">
                  Solicitar orçamento <span className="material-symbols-outlined">arrow_forward</span>
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── Sobre Nós / Benefícios Section ── */}
      <section className="py-24 bg-[#2D2B7A] relative overflow-hidden" id="sobre">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-blue-600/10 blur-[150px]"></div>
        <div className="container mx-auto px-8 relative z-10">
          <div className="text-center mb-16">
            <span className="text-sm font-bold text-[#c2c1ff] mb-4 block tracking-[0.2em] uppercase">Por que nós?</span>
            <h2 className="text-4xl font-bold text-white">Diferenciais que entregam confiança</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: "payments", title: "Preço Justo", desc: "Tabelas transparentes e sem cobranças ocultas. Você sabe exatamente pelo que está pagando." },
              { icon: "speed", title: "Diagnóstico Rápido", desc: "Sabemos que você não pode parar. Entregamos o diagnóstico em tempo recorde." },
              { icon: "dynamic_feed", title: "Híbrido (Presencial/Remoto)", desc: "Atendimento em nossa loja física ou suporte remoto especializado para software." },
              { icon: "verified", title: "Orçamento 100% Gratuito", desc: "Nenhum serviço é iniciado sem aprovação prévia. Diagnóstico sem compromisso." },
              { icon: "handshake", title: "Atendimento PF e PJ", desc: "Suporte técnico para pessoas físicas e empresas de todos os tamanhos." },
              { icon: "star", title: "5 Estrelas no Google", desc: "Mais de 100 clientes atendidos e 2 anos de mercado. Confiança que fala por si." },
            ].map((b, i) => (
              <div key={i} className="glass p-8 rounded-2xl hover:bg-white/10 transition-all">
                <div className="text-[#c2c1ff] mb-4">
                  <span className="material-symbols-outlined text-4xl">{b.icon}</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{b.title}</h3>
                <p className="text-slate-300 text-sm">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Prova Social Section ── */}
      <section className="py-24 bg-[#121414] text-white overflow-hidden">
        <div className="container mx-auto px-8">
          <h2 className="text-3xl font-bold mb-12 text-center">O que dizem nossos clientes em Sorriso-MT</h2>
          {/* Contadores */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
            {[
              { valor: "+100", label: "Clientes Atendidos" },
              { valor: "2+",   label: "Anos de Experiência" },
              { valor: "5★",   label: "Avaliação no Google" },
              { valor: "30min",label: "Resposta Média" },
            ].map((c, i) => (
              <div key={i} className="glass p-6 rounded-2xl text-center">
                <div className="text-4xl font-bold text-[#c2c1ff] mb-1">{c.valor}</div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">{c.label}</div>
              </div>
            ))}
          </div>
          {/* Depoimentos 2x2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { nome: "Patricq Souza",   texto: "Assistência com preço justo e de qualidade. Atendimento excelente, super recomendo!" },
              { nome: "Neto Martins",     texto: "Meu computador estava lento e achei que precisaria trocar tudo. Levei na RG TECH, fizeram um upgrade e agora meu PC tá voando! Profissionais sérios e com preço justo." },
              { nome: "Denisson de Araujo", texto: "Serviço prestado com agilidade e excelência. Suporte incrível, agradeço pela parceria e prontidão no atendimento." },
              { nome: "Gustavo Karnopp",  texto: "Serviço de ótima qualidade, entrega rápida, muito bem explicado sobre as peças do PC, recomendo demais." },
            ].map((d, i) => (
              <div key={i} className="glass p-6 rounded-xl flex flex-col">
                <div className="flex gap-1 text-amber-400 mb-3">
                  {[...Array(5)].map((_, j) => (
                    <span key={j} className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  ))}
                </div>
                <p className="text-slate-300 italic mb-4 flex-1">"{d.texto}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#2D2B7A] flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {d.nome[0]}
                  </div>
                  <span className="font-bold text-white text-sm">{d.nome}</span>
                </div>
              </div>
            ))}
          </div>

          {/* CTA Instagram */}
          <div className="mt-16 text-center">
            <p className="text-slate-400 text-sm mb-4">Quer ver nossos resultados na prática?</p>
            <a href="https://www.instagram.com/rgtechpc/" target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] text-white font-bold rounded-xl hover:scale-105 transition-all shadow-lg shadow-pink-900/20">
              <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
              </svg>
              Veja alguns de nossos Trabalhos
            </a>
          </div>
        </div>
      </section>

      {/* ── FAQ Section ── */}
      <section className="py-24 bg-white text-[#0D0D0D]" id="faq">
        <div className="container mx-auto px-8 max-w-4xl">
          <h2 className="text-3xl font-bold text-center mb-16">Perguntas Frequentes</h2>
          <div className="space-y-4">
            {[
              { q: "Vocês atendem empresas?", a: "Sim! Oferecemos suporte técnico, consultoria e manutenção para pequenas e médias empresas." },
              { q: "Fazem orçamento antes do serviço?", a: "Sempre. Nenhum serviço é iniciado sem aprovação prévia do cliente." },
              { q: "Atendem de forma remota?", a: "Sim, oferecemos suporte técnico remoto para agilizar o atendimento." },
              { q: "Vendem peças avulsas?", a: "Sim, trabalhamos com componentes, periféricos e equipamentos completos." },
              { q: "Quanto tempo leva uma manutenção?", a: "Depende do problema, mas prezamos pela agilidade. O prazo é sempre informado no diagnóstico." },
            ].map((item, i) => (
              <div key={i} className="border-b border-slate-200 py-6">
                <p className="text-xl font-bold">{item.q}</p>
                <p className="mt-3 text-slate-500">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Final ── */}
      <section className="py-24 bg-[#0D0D0D] relative overflow-hidden">
        <div className="container mx-auto px-8 text-center relative z-10">
          <h2 className="text-[44px] font-bold text-white mb-6">Pronto para resolver seu problema de tecnologia <span className="text-[#c2c1ff]">hoje?</span></h2>
          <p className="text-lg text-slate-400 mb-4 max-w-2xl mx-auto">Sem enrolação. Sem produto empurrado. Só a solução certa para você.</p>
          <p className="text-slate-500 text-sm mb-10">⚡ Atendimento rápido — resposta em até 30 minutos | Sem compromisso</p>
          <a href={WA_LINK} target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-4 px-10 py-5 bg-[#25D366] text-white font-bold text-xl rounded-full hover:scale-105 transition-all shadow-[0_0_40px_rgba(37,211,102,0.3)]">
            <span className="material-symbols-outlined text-3xl">chat</span>
            Entrar em contato com a RG TECH agora
          </a>
        </div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-blue-600/10 blur-[150px]"></div>
      </section>

      {/* ── Footer ── */}
      <footer className="w-full py-12 px-8 bg-[#0D0D0D] border-t border-white/10">
        <div className="container mx-auto grid grid-cols-1 md:grid-cols-4 gap-10">
          <div>
            <img src="/logo.png" alt="RG TECH" className="h-28 mb-4 object-contain" />
            <p className="text-slate-500 text-sm">Tecnologia que resolve.</p>
          </div>
          <div>
            <p className="text-white font-bold mb-4 text-sm uppercase tracking-widest">Menu Rápido</p>
            <div className="flex flex-col gap-2">
              {["#servicos:SERVIÇOS", "#marcas:MARCAS", "#sobre:SOBRE NÓS", "#faq:FAQ"].map(item => {
                const [href, label] = item.split(":");
                return <a key={href} href={href} className="text-slate-500 text-sm hover:text-white transition-colors">{label}</a>;
              })}
            </div>
          </div>
          <div>
            <p className="text-white font-bold mb-4 text-sm uppercase tracking-widest">Contato</p>
            <div className="flex flex-col gap-2 text-slate-500 text-sm">
              <a href={WA_LINK} target="_blank" rel="noreferrer" className="hover:text-white transition-colors">📱 (66) 9 9929-8666</a>
              <a href="mailto:rgtechpc@gmail.com" className="hover:text-white transition-colors">✉️ rgtechpc@gmail.com</a>
              <a href="https://instagram.com/rgtechpc" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">📸 @rgtechpc</a>
            </div>
          </div>
          <div>
            <p className="text-white font-bold mb-4 text-sm uppercase tracking-widest">Endereço</p>
            <div className="text-slate-500 text-sm flex flex-col gap-1">
              <a href="https://maps.google.com/?q=Rua+Celeste+670+Sorriso+MT" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">
                📍 Rua Celeste, Nº 670, Bela Vista<br />Sorriso - MT
              </a>
              <p className="mt-2">⏰ Seg a Sáb: 07:00 às 19:00</p>
            </div>
          </div>
        </div>
        <div className="container mx-auto mt-10 pt-6 border-t border-white/10 text-center text-slate-600 text-sm">
          © 2024 RG TECH COMPUTADORES. Todos os direitos reservados.
        </div>
      </footer>

      {/* ── WhatsApp Floating Button ── */}
      <a href={WA_LINK} target="_blank" rel="noreferrer"
        className="fixed bottom-8 right-8 w-16 h-16 bg-[#25D366] rounded-full flex items-center justify-center text-white shadow-2xl hover:scale-110 transition-all z-[100] group">
        <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>chat</span>
        <span className="absolute right-full mr-4 bg-white text-slate-900 px-4 py-2 rounded-lg font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
          Falar com técnico
        </span>
      </a>

    </div>
  );
}
