// RUNA — configuração. API_URL = URL do App da Web do Google Apps Script (termina em /exec).
// No computador (localhost) o jogo usa o servidor de teste de tools/servidor.mjs (/api).
window.RUNA_CONFIG = {
  API_URL: /^(localhost|127\.0\.0\.1)$/.test(location.hostname)
    ? '/api'
    : 'https://script.google.com/macros/s/AKfycbzHvRB9iwyeBYCWso1S_15EoO7L7OHrEvQkco9ENvAfLNvmFmc5epeKINpaoOHtCy9Kjg/exec'
};
