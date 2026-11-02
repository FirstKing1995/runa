// RUNA — conexão com o servidor (Google Apps Script; no computador, tools/servidor.mjs em /api).
// Cada jogador tem conta: a sessão (token) fica neste aparelho. O servidor aplica as regras,
// guarda as campanhas na planilha e só mostra cada mesa para quem entrou nela.
const API = (window.RUNA_CONFIG && window.RUNA_CONFIG.API_URL || '').trim();

export function codigoValido(c) { return /^[A-Z2-9]{5}$/.test(c || ''); }

function guardar(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* modo privado */ } }
function ler(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }

// ------------------------------------------------------------------ sessão
export function sessao() {
  const token = ler('runa_token');
  let conta = null;
  try { conta = JSON.parse(ler('runa_conta') || 'null'); } catch (e) { conta = null; }
  return token && conta ? { token, conta } : null;
}
function guardarSessao(r) {
  if (r && r.ok && r.token) { guardar('runa_token', r.token); guardar('runa_conta', JSON.stringify(r.conta)); }
  return r;
}
export function sair() { guardar('runa_token', null); guardar('runa_conta', null); }
// Sessão vencida ou senha trocada: limpa e manda entrar de novo.
function sessaoCaiu(r) {
  return r && !r.ok && /Entre de novo|Entre na sua conta|sessão|Conta não encontrada/i.test(r.erro || '');
}

async function post(corpo) {
  let r;
  try {
    r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(corpo), redirect: 'follow' });
  } catch (e) { throw new Error('Sem conexão com o servidor. Confira a internet.'); }
  if (!r.ok) throw new Error('Servidor respondeu ' + r.status);
  return r.json();
}
// Chamada autenticada. Se a sessão caiu, volta para a tela de conta.
export async function chamar(a, dados = {}) {
  const s = sessao();
  const r = await post(Object.assign({ a, token: s ? s.token : '' }, dados));
  if (sessaoCaiu(r)) {
    sair();
    if (!/conta\.html/.test(location.pathname)) location.href = 'conta.html?volta=' + encodeURIComponent(location.pathname.split('/').pop() + location.search);
  }
  return r;
}

export const cadastrar = (d) => post(Object.assign({ a: 'cadastro' }, d)).then(guardarSessao);
export const entrar = (email, senha) => post({ a: 'login', email, senha }).then(guardarSessao);
export const esqueci = (email) => post({ a: 'esqueci', email });
export const redefinir = (email, codigo, senha) => post({ a: 'redefinir', email, codigo, senha }).then(guardarSessao);
export const eu = () => chamar('eu');
export const atualizarPerfil = (d) => chamar('perfil', d).then(guardarSessao);
export const previa = (sala) => chamar('previa', { sala });
export const convidar = (sala, email) => chamar('convidar', { sala, email });
export const esquecerMesa = (sala) => chamar('esquecerMesa', { sala });
export const interesse = (email) => post({ a: 'interesse', email });
export async function criarMesa(opcoes) {
  const r = await chamar('criar', opcoes);
  if (!r.ok) throw new Error(r.erro || 'Não foi possível criar a campanha.');
  return r.sala;
}
export function linkConvite(sala) {
  return new URL('jogo.html?sala=' + sala, location.href).href;
}

// ------------------------------------------------------------------ mesa
export class Conexao {
  constructor(sala) {
    this.sala = sala;
    this.jogador = (sessao() || { conta: {} }).conta.id;
    this.estado = null;
    this.ouvintes = [];
    this.erroRede = null;
    this.intervalo = 1600;
    this._timer = null;
  }
  aoMudar(fn) { this.ouvintes.push(fn); }
  _avisar(e) {
    if (!e) return;
    if (this.estado && e.versao <= this.estado.versao && e.sala === this.estado.sala) return;
    this.estado = e;
    for (const f of this.ouvintes) f(e);
  }
  // Abre a mesa. Se a pessoa ainda não entrou, devolve { naoMembro } sem ligar o ciclo.
  async abrir() {
    const r = await chamar('estado', { sala: this.sala });
    if (!r.ok) {
      if (r.naoMembro) return { naoMembro: true };
      throw new Error(r.erro || 'Campanha não encontrada.');
    }
    if (r.eu) this.jogador = r.eu;
    this._avisar(r.estado);
    this._ciclo();
    return { estado: this.estado };
  }
  _ciclo() {
    clearTimeout(this._timer);
    this._timer = setTimeout(async () => {
      try {
        const r = await chamar('estado', { sala: this.sala, v: this.estado ? this.estado.versao : 0 });
        this.erroRede = null;
        if (r.ok && r.estado) this._avisar(r.estado);
        this.intervalo = document.hidden ? 5000 : 1600;
      } catch (e) {
        this.erroRede = e.message;
        this.intervalo = Math.min(8000, this.intervalo * 1.5);
      }
      this._ciclo();
    }, this.intervalo);
  }
  async enviar(cmd) {
    try {
      const r = await chamar('cmd', { sala: this.sala, cmd });
      if (r.estado) this._avisar(r.estado);
      return { ok: r.ok, erro: r.erro };
    } catch (e) {
      return { ok: false, erro: e.message };
    }
  }
}
