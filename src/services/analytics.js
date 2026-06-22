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

  // 3. Registrar o carregamento inicial do script e configurar o ID
  window.gtag("js", new Date());
  window.gtag("config", measurementId, {
    send_page_view: true // Rastreia visualizações automaticamente (incluindo SPAs via histórico de rotas)
  });

  console.log(`GA4: Inicializado com sucesso para o ID ${measurementId}`);
};

/**
 * Função para registrar eventos customizados dentro da aplicação
 * @param {string} action - Nome do evento (ex: 'click_whatsapp')
 * @param {string} category - Categoria (ex: 'Lead')
 * @param {string} label - Rótulo do evento (ex: 'Origem: Ficha Cliente')
 * @param {number} [value] - Valor associado ao evento
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
