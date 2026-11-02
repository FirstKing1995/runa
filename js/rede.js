// RUNA — conexão da mesa. Com API_URL: todos os celulares falam com o Google Apps Script
// (o servidor aplica as regras e guarda a mesa na planilha). Sem API_URL: modo local,
// a mesa fica no navegador e as abas do mesmo aparelho se enxergam.
const R = window.RUNA;
const API = (window.RUNA_CONFIG && window.RUNA_CONFIG.API_URL || '').trim();
export const remoto = !!API;

const LETRAS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function novoCodigo() {
  let s = '';
  const a = crypto.getRandomValues(new Uint32Array(5));
  for (const n of a) s += LETRAS[n % LETRAS.length];
  return s;
}
export function codigoValido(c) { return /^[A-Z2-9]{5}$/.test(c || ''); }

function guardar(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* modo privado */ } }
function ler(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }

export function meuId() {
  let id = ler('runa_jogador');
  if (!id) {
    id = 'j' + Array.from(crypto.getRandomValues(new Uint8Array(8))).map((b) => b.toString(16).padStart(2, '0')).join('');
    guardar('runa_jogador', id);
  }
  return id;
}
// Chave secreta do aparelho: prova para o servidor que este jogador é você.
function minhaChave() {
  let c = ler('runa_chave');
  if (!c) {
    c = Array.from(crypto.getRandomValues(new Uint8Array(24))).map((b) => b.toString(16).padStart(2, '0')).join('');
    guardar('runa_chave', c);
  }
  return c;
}
export function meuNome() { return ler('runa_nome') || ''; }
export function salvarNome(n) { guardar('runa_nome', n); }

async function post(corpo) {
  const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(corpo), redirect: 'follow' });
  if (!r.ok) throw new Error('Servidor respondeu ' + r.status);
  return r.json();
}
async function get(params) {
  const q = new URLSearchParams(params).toString();
  const r = await fetch(API + (API.includes('?') ? '&' : '?') + q, { redirect: 'follow' });
  if (!r.ok) throw new Error('Servidor respondeu ' + r.status);
  return r.json();
}

const chaveLocal = (s) => 'runa_mesa_' + s;
function lerLocal(s) { const t = ler(chaveLocal(s)); return t ? JSON.parse(t) : null; }
function gravarLocal(e) {
  guardar(chaveLocal(e.sala), JSON.stringify(e));
  const lista = JSON.parse(ler('runa_mesas') || '[]').filter((x) => x !== e.sala);
  lista.unshift(e.sala);
  guardar('runa_mesas', JSON.stringify(lista.slice(0, 20)));
}
export function mesasLocais() {
  return JSON.parse(ler('runa_mesas') || '[]').map(lerLocal).filter(Boolean);
}
export function apagarLocal(s) {
  try { localStorage.removeItem(chaveLocal(s)); } catch (e) { /* nada */ }
  guardar('runa_mesas', JSON.stringify(JSON.parse(ler('runa_mesas') || '[]').filter((x) => x !== s)));
}

export async function criarMesa(nome) {
  const jogador = meuId();
  if (remoto) {
    const r = await post({ a: 'criar', jogador, nome, chave: minhaChave() });
    if (!r.ok) throw new Error(r.erro || 'Não foi possível criar a mesa.');
    return r.sala;
  }
  const sala = novoCodigo();
  const e = R.novoEstado(sala, jogador, nome, crypto.getRandomValues(new Uint32Array(1))[0] | 0);
  gravarLocal(e);
  return sala;
}

export class Conexao {
  constructor(sala) {
    this.sala = sala;
    this.jogador = meuId();
    this.estado = null;
    this.ouvintes = [];
    this.erroRede = null;
    this.intervalo = 1600;
    this._timer = null;
    this._canal = null;
  }
  aoMudar(fn) { this.ouvintes.push(fn); }
  _avisar(e) {
    if (!e) return;
    if (this.estado && e.versao <= this.estado.versao && e.sala === this.estado.sala) return;
    this.estado = e;
    for (const f of this.ouvintes) f(e);
  }

  async abrir() {
    if (remoto) {
      const r = await get({ a: 'estado', sala: this.sala });
      if (!r.ok) throw new Error(r.erro || 'Mesa não encontrada.');
      this._avisar(r.estado);
    } else {
      const e = lerLocal(this.sala);
      if (!e) throw new Error('Mesa ' + this.sala + ' não existe neste aparelho. Sem servidor configurado, a mesa só existe no navegador de quem criou.');
      this._avisar(e);
      window.addEventListener('storage', (ev) => { if (ev.key === chaveLocal(this.sala) && ev.newValue) this._avisar(JSON.parse(ev.newValue)); });
    }
    this._ciclo();
    return this.estado;
  }

  _ciclo() {
    if (!remoto) return;
    clearTimeout(this._timer);
    this._timer = setTimeout(async () => {
      try {
        const r = await get({ a: 'estado', sala: this.sala, v: this.estado ? this.estado.versao : 0 });
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
    cmd = Object.assign({ jogador: this.jogador }, cmd);
    if (remoto) {
      const r = await post({ a: 'cmd', sala: this.sala, cmd, chave: minhaChave() });
      if (r.estado) this._avisar(r.estado);
      return { ok: r.ok, erro: r.erro };
    }
    const e = lerLocal(this.sala) || this.estado;
    const r = R.aplicar(e, cmd);
    if (r.ok) { gravarLocal(e); this._avisar(e); }
    return r;
  }
}
