export const initGA = () => {
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
  if (!measurementId) {
    console.log("GA4: Nenhum ID de medição configurado em VITE_GA_MEASUREMENT_ID. Monitoramento desativado.");
    return;
  }

  // Evitar duplicar a injeção do script se ele já existir
  if (document.getElementById("google-analytics")) {
    return;
  }

  // 1. Criar e injetar o script gtag.js na tag <head>
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  script.id = "google-analytics";
  document.head.appendChild(script);

  // 2. Inicializar a fila de eventos do dataLayer e a função global gtag
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () {
    window.dataLayer.push(arguments);
  };

  // 3. Registrar o carregamento inicial do script
  window.gtag("js", new Date());
  
  // Desabilitamos o envio automático de visualizações de páginas (send_page_view: false)
  // Isso impede que o GA4 rastreie automaticamente as transições de rotas internas (ERP/Login) no SPA
  window.gtag("config", measurementId, {
    send_page_view: false
  });

  console.log(`GA4: Inicializado para o ID ${measurementId} (apenas rastreamento manual ativado).`);
};

/**
 * Registra manualmente a visualização de uma página específica
 * @param {string} title - Título da página (ex: 'Home')
 * @param {string} path - Caminho/Rota (ex: '/')
 */
export const trackPageView = (title, path) => {
  if (window.gtag) {
    window.gtag("event", "page_view", {
      page_title: title,
      page_path: path
    });
  }
};

/**
 * Função para registrar eventos customizados dentro da aplicação
 */
export const trackEvent = (action, category, label, value) => {
  if (window.gtag) {
    window.gtag("event", action, {
      event_category: category,
      event_label: label,
      value: value
    });
  }
};
