// RUNA — tela da mesa: junta regras, rede, mundo 3D, câmera e interface.
import { Mundo } from './mundo.js';
import { Rastreador } from './ar.js';
import * as Rede from './rede.js';
import * as Som from './som.js';

const R = window.RUNA;
const $ = (s) => document.querySelector(s);
const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const icones = () => window.lucide && window.lucide.createIcons();

const sala = (new URLSearchParams(location.search).get('sala') || '').toUpperCase();
const EU = Rede.meuId();
const ICONE_CLASSE = { guerreiro: 'shield', barbara: 'axe', maga: 'wand-sparkles', ladina: 'venetian-mask', cacadora: 'crosshair' };

let con, mundo, rast = null;
let E = null, ultimoSeq = 0, fila = [], tocando = false, pulando = false;
let heroiSel = null;
let sel = { modo: null, hab: null, item: null, previa: null };
let prefs = carregarPrefs();
let pularLegenda = null;

function carregarPrefs() {
  try { return Object.assign({ sons: true, voz: null, lente: 1 }, JSON.parse(localStorage.getItem('runa_prefs') || '{}')); } catch (e) { return { sons: true, voz: null, lente: 1 }; }
}
function salvarPrefs() { try { localStorage.setItem('runa_prefs', JSON.stringify(prefs)); } catch (e) { /* sem armazenamento */ } }

// ================================================================ início
async function iniciar() {
  if (!Rede.codigoValido(sala)) { location.href = 'index.html'; return; }
  icones();
  mundo = new Mundo($('#cena3d'));
  con = new Rede.Conexao(sala);
  con.aoMudar(receber);
  carga('Carregando heróis e monstros...', 0.1);
  try {
    await mundo.preparar((p) => carga('Carregando heróis e monstros...', 0.1 + p * 0.6));
  } catch (e) {
    return falhaFatal('Não foi possível carregar os modelos 3D. Verifique a internet e recarregue a página.');
  }
  carga('Abrindo a mesa ' + sala + '...', 0.8);
  try { await con.abrir(); } catch (e) { return falhaFatal(e.message); }
  if (!E.jogadores[EU]) {
    let nome = Rede.meuNome();
    if (!nome) nome = await pedirNome();
    const r = await con.enviar({ t: 'entrar', nome });
    if (!r.ok) return falhaFatal(r.erro);
  }
  if (prefs.voz == null) prefs.voz = E.host === EU;
  Som.configurar({ sons: prefs.sons, voz: prefs.voz });
  carga('Pronto.', 1);
  $('#carregando').hidden = true;
  ligarEventos();
  atualizarTudo();
  if (E.fase === 'jogo' && E.cenaIdx >= 0) {
    await mundo.sincronizar(E, R);
    const ult = [...E.eventos].reverse().find((v) => v.t === 'narra');
    if (ult) legenda(ult.texto, null, true);
    Som.ambienteDe(R.cena(E).tema);
  }
  setInterval(vigiarAR, 500);
}
function carga(txt, p) { $('#carga-txt').textContent = txt; $('#carga-barra').style.width = Math.round(p * 100) + '%'; }
function falhaFatal(msg) {
  $('#carregando').hidden = false;
  $('#carregando').innerHTML = `<div class="miolo" style="text-align:center;max-width:460px"><div class="marca" style="font-size:2.2rem">RUNA</div><p>${esc(msg)}</p><a class="btn ouro" href="index.html">Voltar ao início</a></div>`;
}
function pedirNome() {
  return new Promise((ok) => {
    const t = $('#carregando');
    t.innerHTML = `<div class="miolo painel ornato" style="max-width:420px;padding:22px;text-align:left">
      <h2>Mesa ${esc(sala)}</h2><p style="color:var(--texto2)">Como os outros jogadores vão te chamar?</p>
      <div class="campo"><label for="nm">Seu nome</label><input id="nm" maxlength="24" autocomplete="nickname" placeholder="Ex.: Cambraia"></div>
      <button class="btn ouro" id="nm-ok" style="width:100%">Sentar à mesa</button></div>`;
    const ir = () => { const n = $('#nm').value.trim(); if (!n) return $('#nm').focus(); Rede.salvarNome(n); ok(n); };
    $('#nm-ok').onclick = ir;
    $('#nm').onkeydown = (e) => { if (e.key === 'Enter') ir(); };
    $('#nm').focus();
  });
}

// ================================================================ estado
function receber(e) {
  const primeira = !E;
  const antes = E;
  E = e;
  if (primeira) { ultimoSeq = e.seq; return; }
  const novos = e.eventos.filter((v) => v.n > ultimoSeq);
  if (novos.length) {
    ultimoSeq = novos[novos.length - 1].n;
    fila.push(...novos);
  }
  if (antes && antes.fase !== e.fase) atualizarTudo();
  processar();
  if (!tocando) atualizarTudo();
}

async function processar() {
  if (tocando) return;
  tocando = true;
  limparSelecao(false);
  $('#dialogo').hidden = true;
  mundo.destacar(null);
  while (fila.length) {
    const ev = fila.shift();
    pulando = fila.length > 25;
    try { await tratar(ev, pulando); } catch (err) { console.warn('evento', ev, err); }
    atualizarTudo(true);
  }
  pulando = false;
  try { await mundo.sincronizar(E, R); } catch (err) { console.warn(err); }
  tocando = false;
  atualizarTudo();
}

function nomeDe(id) { const u = E.u[id] || mundo.info[id]; return u ? u.nome : ''; }
function ehMeu(id) { const u = E.u[id]; return u && u.lado === 'heroi' && u.dono === EU; }
function vozDe(ev) {
  const u = E.u[ev.quem];
  if (u && u.lado === 'heroi') return R.CLASSES[u.classe].voz;
  if (u && u.npc) return R.NPCS[u.npc].voz;
  const npc = Object.values(R.NPCS).find((n) => n.vis === ev.vis);
  if (npc) return npc.voz;
  if (ev.vis === 'vorag') return { tom: 0.35, vel: 0.8 };
  if (ev.vis === 'cavaleiro') return { tom: 0.4, vel: 0.85 };
  return { tom: 0.7, vel: 0.92 };
}

async function tratar(ev, rapido) {
  registrar(ev);
  switch (ev.t) {
    case 'cena': {
      const c = R.CENAS[ev.idx];
      await mundo.montarCena(c, E);
      await mundo.sincronizar(E, R);
      Som.ambienteDe(c.tema);
      if (!rapido) await faixa(c.titulo, c.sub, 2600);
      return;
    }
    case 'narra': if (!rapido) await legenda(ev.texto, ev.mestre ? null : R.NARRADOR.voz, false, ev.mestre); return;
    case 'fala': if (!rapido) await balao(ev); return;
    case 'teste': if (!rapido) { Som.sfx('dado'); await cartaDado({ titulo: nomeDe(ev.heroi) + ' — ' + ev.pericia, nat: ev.nat, bonus: ev.bonus, total: ev.total, alvo: 'CD ' + ev.cd, ok: ev.ok, crit: ev.nat === 20 }); } return;
    case 'ataque': {
      if (rapido) return mundo.animar(ev, E);
      Som.sfx('dado');
      const s = ev.fx === 'virote' || ev.fx === 'adaga' ? 'virote' : ev.fx === 'fogo' ? 'fogo' : ev.fx === 'necro' ? 'necro' : null;
      setTimeout(() => Som.sfx(s || (ev.acerto ? 'golpe' : 'erro')), 450);
      if (ev.acerto && !s) setTimeout(() => Som.sfx('aco'), 500);
      await Promise.all([
        cartaDado({ titulo: nomeDe(ev.de) + ' ataca ' + nomeDe(ev.alvo), sub: ev.arma, nat: ev.nat, dados: ev.dados, vant: ev.vant, bonus: ev.bonus, total: ev.total, alvo: 'CA ' + ev.ca, ok: ev.acerto, crit: ev.critico, curto: !ehMeu(ev.de) && E.u[ev.de] && E.u[ev.de].lado !== 'heroi' }),
        mundo.animar(ev, E)
      ]);
      if (ev.critico) Som.sfx('critico');
      return;
    }
    case 'dano': if (!rapido) { Som.sfx('golpe'); if (ehMeu(ev.alvo) && navigator.vibrate) navigator.vibrate(80); } return mundo.animar(ev, E);
    case 'cura': Som.sfx('cura'); return mundo.animar(ev, E);
    case 'morte': Som.sfx('morte'); return mundo.animar(ev, E);
    case 'caiu': toast(ev.texto, true); return mundo.animar(ev, E);
    case 'combate':
      if (ev.inicio) { Som.sfx('combate'); if (!rapido) await faixa('Combate!', 'Rolando iniciativa...', 1500); }
      else if (!rapido) await faixa('Vitória', 'O perigo passou. Por enquanto.', 1500);
      return;
    case 'vez':
      if (ehMeu(ev.id)) {
        heroiSel = ev.id;
        Som.sfx('vez');
        if (navigator.vibrate) navigator.vibrate([60, 60, 60]);
        if (!rapido) await faixa('Sua vez', nomeDe(ev.id), 1100);
        mundo.focar(ev.id);
      } else if (!rapido && E.u[ev.id] && E.u[ev.id].lado === 'heroi') toast('Vez de ' + nomeDe(ev.id));
      if (!rapido && E.u[ev.id] && E.u[ev.id].lado === 'inimigo') await esperar(250);
      return;
    case 'rodada': return;
    case 'nivel': Som.sfx('nivel'); if (!rapido) await faixa('Nível ' + ev.nivel, ev.texto, 2600); return;
    case 'item': case 'ouro': Som.sfx('moeda'); toast(ev.t === 'ouro' ? (ev.qtd > 0 ? '+' : '') + ev.qtd + ' moedas de prata (total ' + ev.total + ')' : ev.texto); return;
    case 'objetivo': toast('Novo objetivo: ' + ev.texto); return;
    case 'saida': toast('Caminho livre: vá até a casa ' + R.nomeCasa(ev.x, ev.y) + ' e toque em Seguir viagem.'); return;
    case 'som': Som.sfx(ev.som); return mundo.animar(ev, E);
    case 'hab': {
      const s = { fogo: null, misseis: 'magia', trovao: 'trovao', furia: 'combate', pocao: 'cura', balsamo: 'cura', folego: 'cura', marca: 'virote' }[ev.fx];
      if (s) Som.sfx(s);
      if (!rapido) toast(nomeDe(ev.de) + ': ' + ev.nome);
      return mundo.animar(ev, E);
    }
    case 'magia': Som.sfx('necro'); if (ev.texto && !rapido) toast(ev.texto); return mundo.animar(ev, E);
    case 'rende': toast(nomeDe(ev.alvo) + ' se rende!'); return mundo.animar(ev, E);
    case 'derrota': await faixa('Derrota', 'O grupo recomeça este capítulo.', 2400); return;
    case 'final': await mundo.animar(ev, E); mostrarFinal(ev.textos); return;
    case 'surge': if (!rapido) Som.sfx('pedra'); return mundo.animar(ev, E);
    default: return mundo.animar(ev, E);
  }
}

// ================================================================ crônica
function registrar(ev) {
  let txt = '', cls = '';
  switch (ev.t) {
    case 'narra': txt = ev.texto; cls = 'narra'; break;
    case 'fala': txt = '<b>' + esc(ev.nome) + ':</b> ' + esc(ev.texto); break;
    case 'ataque': txt = `${esc(nomeDe(ev.de))} ataca ${esc(nomeDe(ev.alvo))} (${esc(ev.arma)}): ${ev.nat}${R.modTxt(ev.bonus)} = ${ev.total} contra CA ${ev.ca} — ${ev.critico ? 'CRÍTICO' : ev.acerto ? 'acertou' : 'errou'}`; break;
    case 'dano': txt = `${esc(nomeDe(ev.alvo))} sofre ${ev.valor} de dano`; cls = 'dano'; break;
    case 'cura': txt = `${esc(nomeDe(ev.alvo))} recupera ${ev.valor} PV`; cls = 'cura'; break;
    case 'teste': txt = `${esc(nomeDe(ev.heroi))} — ${esc(ev.pericia)}: ${ev.nat}${R.modTxt(ev.bonus)} = ${ev.total} contra CD ${ev.cd} — ${ev.ok ? 'sucesso' : 'falha'}`; cls = 'teste'; break;
    case 'morte': txt = esc(nomeDe(ev.alvo)) + ' foi derrotado.'; break;
    case 'caiu': case 'nivel': case 'item': txt = esc(ev.texto); break;
    case 'objetivo': txt = 'Objetivo: ' + esc(ev.texto); break;
    case 'cena': txt = '<b>' + esc(ev.titulo) + '</b> — ' + esc(ev.sub); cls = 'narra'; break;
    case 'hab': txt = esc(nomeDe(ev.de)) + ' usa ' + esc(ev.nome); break;
    default: return;
  }
  const p = document.createElement('p');
  p.className = cls;
  p.innerHTML = cls === 'narra' && ev.t === 'narra' ? esc(txt) : txt;
  const log = $('#log');
  log.prepend(p);
  while (log.children.length > 200) log.lastChild.remove();
}

// ================================================================ efeitos de interface
function toast(msg, erro) {
  const d = document.createElement('div');
  d.className = 'toast' + (erro ? ' erro' : '');
  d.textContent = msg;
  $('#toast').appendChild(d);
  setTimeout(() => d.remove(), erro ? 4200 : 3200);
  while ($('#toast').children.length > 3) $('#toast').firstChild.remove();
}
async function faixa(titulo, sub, ms) {
  const f = $('#faixa');
  f.querySelector('h2').textContent = titulo;
  f.querySelector('p').textContent = sub || '';
  f.classList.add('visivel');
  await esperar(ms);
  f.classList.remove('visivel');
  await esperar(250);
}
async function legenda(texto, voz, fixa, mestre) {
  const l = $('#legenda');
  l.className = mestre ? 'mestre' : '';
  l.innerHTML = esc(texto) + (fixa ? '' : '<small>toque para continuar</small>');
  l.classList.add('visivel');
  if (fixa) { setTimeout(() => l.classList.remove('visivel'), 7000); return; }
  const leitura = esperar(Math.min(14000, 2200 + texto.length * 48));
  const fala = prefs.voz ? Som.falar(texto, voz || { tom: 0.9, vel: 1 }) : leitura;
  await Promise.race([prefs.voz ? fala : leitura, new Promise((ok) => { pularLegenda = ok; })]);
  pularLegenda = null;
  Som.calar();
  l.classList.remove('visivel');
  await esperar(200);
}
async function balao(ev) {
  const u = E.u[ev.quem];
  const lado = u ? u.lado : (ev.vis && /ossudo|vorag|cavaleiro|lobo|afogado|bandido|garra|besteiro|arqueiro/.test(ev.vis) ? 'inimigo' : 'npc');
  const b = document.createElement('div');
  b.className = 'balao ' + (lado === 'heroi' ? 'heroi' : lado === 'inimigo' ? 'inimigo' : '');
  b.innerHTML = '<b>' + esc(ev.nome) + '</b>' + esc(ev.texto);
  $('#baloes').appendChild(b);
  let vivo = true;
  const posicionar = () => {
    if (!vivo) return;
    const p = mundo.posTela(ev.quem);
    if (p) { b.style.left = Math.max(90, Math.min(innerWidth - 90, p.x)) + 'px'; b.style.top = Math.max(150, p.y) + 'px'; b.style.opacity = 1; }
    else { b.style.left = '50%'; b.style.top = '45%'; }
    requestAnimationFrame(posicionar);
  };
  posicionar();
  const leitura = esperar(Math.min(9000, 1400 + ev.texto.length * 52));
  await Promise.race([prefs.voz ? Som.falar(ev.texto, vozDe(ev)) : leitura, new Promise((ok) => { pularLegenda = ok; })]);
  pularLegenda = null;
  Som.calar();
  vivo = false;
  b.style.transition = 'opacity .25s'; b.style.opacity = 0;
  setTimeout(() => b.remove(), 260);
}
const D20 = '<svg viewBox="0 0 100 100"><polygon points="50,3 93,27 93,73 50,97 7,73 7,27" fill="#e9cf8e" stroke="#7a5a26" stroke-width="3"/><polygon points="50,18 80,66 20,66" fill="none" stroke="#7a5a26" stroke-width="2.5"/><path d="M50 3 50 18M93 27 80 66M93 73 80 66M50 97 50 66M7 73 20 66M7 27 20 66M7 27 50 18M93 27 50 18" stroke="#7a5a26" stroke-width="2" fill="none"/></svg>';
async function cartaDado(o) {
  const d = $('#dado');
  const dados = o.dados && o.dados.length > 1 ? ` <small style="color:var(--texto3)">(${o.dados.join(' e ')}, ${o.vant > 0 ? 'vantagem' : 'desvantagem'})</small>` : '';
  d.innerHTML = `<div class="d20 rolando">${D20}<b>${o.nat}</b></div>
    <div class="dado-titulo">${esc(o.titulo)}</div>${o.sub ? `<div style="font-size:.78rem;color:var(--texto3)">${esc(o.sub)}</div>` : ''}
    <div class="dado-conta" hidden>${o.nat} ${o.bonus >= 0 ? '+' : '−'} ${Math.abs(o.bonus)} = <b>${o.total}</b> contra ${esc(o.alvo)}${dados}</div>
    <div class="dado-veredito ${o.crit ? 'crit' : o.ok ? 'ok' : 'falha'}" hidden>${o.crit ? 'CRÍTICO!' : o.ok ? (o.alvo.startsWith('CA') ? 'Acertou' : 'Sucesso') : (o.alvo.startsWith('CA') ? 'Errou' : 'Falha')}</div>`;
  d.hidden = false;
  await esperar(o.curto ? 380 : 620);
  d.querySelector('.d20').classList.remove('rolando');
  d.querySelector('.dado-conta').hidden = false;
  d.querySelector('.dado-veredito').hidden = false;
  await esperar(o.curto ? 650 : 1150);
  d.hidden = true;
}

// ================================================================ telas
function atualizarTudo(parcial) {
  if (!E) return;
  const lobby = E.fase === 'lobby';
  $('#lobby').hidden = !lobby;
  if (lobby) { renderLobby(); return; }
  if (E.fase === 'fim' && !tocando && $('#final').hidden && !parcial) {
    const f = [...E.eventos].reverse().find((v) => v.t === 'final');
    mostrarFinal(f ? f.textos : R.EPILOGO(E.flags));
  }
  const c = R.cena(E);
  $('#cena-titulo').textContent = c ? c.titulo : 'RUNA';
  $('#cena-sub').textContent = c ? c.sub + ' · Mesa ' + sala : 'Mesa ' + sala;
  const ob = $('#objetivo');
  ob.hidden = !E.objetivo;
  ob.querySelector('span').textContent = E.objetivo || '';
  renderOrdem();
  if (parcial) return;
  renderHud();
  renderDialogo();
  atualizarDestaques();
}

function meusHerois() { return R.herois(E).filter((h) => h.dono === EU); }
function heroiAtivo() {
  const meus = meusHerois();
  if (!meus.length) return null;
  const vez = R.vezDe(E);
  if (vez && meus.some((h) => h.id === vez)) return E.u[vez];
  if (heroiSel && E.u[heroiSel] && E.u[heroiSel].dono === EU) return E.u[heroiSel];
  heroiSel = meus[0].id;
  return meus[0];
}
function minhaVez(h) { return h && (!E.combate || R.vezDe(E) === h.id) && !h.caido; }

// ---------------------------------------------------------------- lobby
function renderLobby() {
  const link = location.origin + location.pathname + '?sala=' + sala;
  const host = E.host === EU;
  const jog = Object.entries(E.jogadores).map(([id, j]) => `<span>${esc(j.nome)}${id === E.host ? ' <small style="color:var(--ouro)">anfitrião</small>' : ''}${id === EU ? ' (você)' : ''}</span>`).join('');
  const cards = Object.entries(R.CLASSES).map(([k, c]) => {
    const h = E.u['h_' + k];
    const meu = h && h.dono === EU, outro = h && !meu;
    const a = c.atr;
    return `<article class="card-heroi painel ornato ${meu ? 'meu' : outro ? 'outro' : ''}">
      <header><div class="retrato"><i data-lucide="${ICONE_CLASSE[k]}"></i></div><div><h3>${esc(h ? h.nome : c.heroi)}</h3><p>${esc(c.nome)}</p></div></header>
      <p>${esc(c.desc)}</p>
      <p class="frase">"${esc(c.frase)}"</p>
      <div class="stats"><span>PV <b>${c.pv}</b></span><span>CA <b>${c.ca}</b></span><span>Mov <b>${c.desl}</b></span><span>FOR <b>${R.modTxt(a.for)}</b></span><span>DES <b>${R.modTxt(a.des)}</b></span><span>INT <b>${R.modTxt(a.int)}</b></span></div>
      ${meu ? `<div class="campo" style="margin:4px 0 0"><input data-nome="${k}" maxlength="18" value="${esc(h.nome)}" aria-label="Nome do herói"></div>
               <button class="btn pequeno fantasma" data-soltar="${k}">Trocar de herói</button>`
        : outro ? `<p style="color:var(--ouro)">Escolhido por ${esc((E.jogadores[h.dono] || {}).nome || '?')}</p>`
          : `<button class="btn" data-escolher="${k}"><i data-lucide="hand"></i> Jogar com ${esc(c.heroi)}</button>`}
    </article>`;
  }).join('');
  const qtd = E.ordemHerois.length;
  $('#lobby-miolo').innerHTML = `
    <div style="text-align:center;margin-bottom:14px"><div class="marca" style="font-size:2.2rem">RUNA</div><p style="color:var(--texto2);margin:0">A Noite do Sino Morto · Capítulo I</p></div>
    <div class="codigo-mesa painel ornato">
      <div id="qr"></div>
      <div style="flex:1;min-width:200px"><div style="color:var(--texto2);font-size:.85rem">Código da mesa</div><div class="cod">${sala}</div>
        <p style="margin:4px 0 10px;font-size:.88rem;color:var(--texto2)">Os outros jogadores escaneiam o QR ou abrem o link no próprio celular.</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn pequeno" id="bt-link"><i data-lucide="share-2"></i> Compartilhar link</button><a class="btn pequeno fantasma" href="imprimir.html" target="_blank"><i data-lucide="printer"></i> Imprimir tabuleiro</a></div>
      </div>
    </div>
    ${Rede.remoto ? '' : `<p class="painel" style="padding:10px 14px;font-size:.88rem;color:var(--texto2)"><i data-lucide="info"></i> Modo local: sem servidor configurado, a mesa existe só neste navegador. Para jogar cada um no seu celular, configure o Google Apps Script (veja o GUIA). Dá para testar abrindo esta mesma página em outra aba.</p>`}
    <h3>Na mesa</h3><div class="jogadores">${jog}</div>
    <h3>Escolha seu herói</h3>
    <p style="color:var(--texto2);margin-top:-4px">Cada jogador escolhe um. Quem estiver sozinho pode controlar mais de um herói.</p>
    <div class="grade-herois">${cards}</div>
    <div style="margin:22px 0 10px;text-align:center">
      ${host ? `<button class="btn ouro" id="bt-iniciar" ${qtd ? '' : 'disabled'} style="min-width:260px"><i data-lucide="swords"></i> Começar a campanha (${qtd} herói${qtd === 1 ? '' : 's'})</button>
        <p style="color:var(--texto3);font-size:.85rem">Recomendado: 2 a 5 heróis. Quem chegar depois ainda pode entrar no meio da aventura.</p>`
        : `<p style="color:var(--texto2)">Aguardando ${esc((E.jogadores[E.host] || {}).nome || 'o anfitrião')} começar a campanha...</p>`}
    </div>`;
  if (window.qrcode) { const q = window.qrcode(0, 'M'); q.addData(link); q.make(); $('#qr').innerHTML = q.createImgTag(4, 6, 'QR code da mesa'); }
  icones();
  $('#bt-link').onclick = async () => {
    try { if (navigator.share) await navigator.share({ title: 'RUNA — mesa ' + sala, text: 'Entra na minha mesa de RUNA: ', url: link }); else { await navigator.clipboard.writeText(link); toast('Link copiado.'); } } catch (e) { /* cancelado */ }
  };
  document.querySelectorAll('[data-escolher]').forEach((b) => b.onclick = () => { Som.destravar(); enviar({ t: 'escolher', classe: b.dataset.escolher }); });
  document.querySelectorAll('[data-soltar]').forEach((b) => b.onclick = () => enviar({ t: 'soltar', classe: b.dataset.soltar }));
  document.querySelectorAll('[data-nome]').forEach((i) => i.onchange = () => enviar({ t: 'escolher', classe: i.dataset.nome, nome: i.value.trim() }));
  const bi = $('#bt-iniciar');
  if (bi) bi.onclick = () => { Som.destravar(); enviar({ t: 'iniciar' }); };
}

// ---------------------------------------------------------------- ordem de iniciativa
function renderOrdem() {
  const o = $('#ordem');
  if (!E.combate) { o.innerHTML = ''; return; }
  const vez = R.vezDe(E);
  o.innerHTML = E.combate.ordem.filter((id) => E.u[id]).map((id) => {
    const u = E.u[id];
    const ic = u.lado === 'heroi' ? ICONE_CLASSE[u.classe] : u.tipo === 'lobo' ? 'paw-print' : 'skull';
    return `<span class="chip-ordem ${u.lado} ${id === vez ? 'atual' : ''} ${u.caido ? 'caido' : ''}"><i data-lucide="${ic}"></i>${esc(u.nome.split(/[ ,]/)[0])}</span>`;
  }).join('') + `<span class="chip-ordem">Rodada ${E.combate.rodada}</span>`;
  icones();
}

// ---------------------------------------------------------------- HUD
function renderHud() {
  const hud = $('#hud');
  hud.hidden = E.fase !== 'jogo';
  const h = heroiAtivo();
  const ficha = $('#ficha'), acoes = $('#acoes');
  if (!h) {
    ficha.innerHTML = `<div class="ficha-dados"><b>Você está assistindo.</b><div class="ficha-info">Abra o menu para escolher um herói livre.</div></div>`;
    acoes.innerHTML = '';
    return;
  }
  const cls = R.CLASSES[h.classe];
  const f = h.pv / h.pvMax;
  const vez = R.vezDe(E);
  const minha = minhaVez(h);
  const cb = E.combate;
  const ef = [];
  if (h.efeitos.furia) ef.push('<span style="color:#ff7a5a"><i data-lucide="flame"></i>Fúria</span>');
  if (h.efeitos.esquiva) ef.push('<span style="color:var(--gelo)"><i data-lucide="shield"></i>Esquivando</span>');
  if (h.efeitos.marca && E.u[h.efeitos.marca]) ef.push('<span><i data-lucide="crosshair"></i>' + esc(E.u[h.efeitos.marca].nome) + '</span>');
  const outros = meusHerois().filter((o) => o.id !== h.id);
  ficha.innerHTML = `
    <div class="retrato ${h.caido ? 'caido' : ''}"><i data-lucide="${h.caido ? 'skull' : ICONE_CLASSE[h.classe]}"></i></div>
    <div class="ficha-dados">
      <div class="ficha-nome"><b>${esc(h.nome)}</b><span>${esc(cls.nome)} · nível ${E.nivel}</span></div>
      <div class="barra-pv ${f <= 0.25 ? 'baixo' : f <= 0.5 ? 'medio' : ''}"><i style="width:${Math.max(0, f * 100)}%"></i><em>${h.pv} / ${h.pvMax} PV</em></div>
      <div class="ficha-info">
        <span><i data-lucide="shield-half"></i>CA ${h.ca}</span>
        ${cls.magia ? `<span><i data-lucide="sparkles"></i>Magia ${h.magia}</span>` : ''}
        <span><i data-lucide="flask-round"></i>${E.inv.pocao || 0}</span>
        <span><i data-lucide="coins"></i>${E.ouro}</span>
        ${cb && vez === h.id ? `<span>Mov ${cb.mov}</span><span>Ação <i class="pip ${cb.acao ? '' : 'gasto'}"></i></span><span>Bônus <i class="pip ${cb.bonus ? '' : 'gasto'}"></i></span>` : ''}
        ${ef.join('')}
      </div>
    </div>
    ${outros.length ? `<div class="trocar-heroi">${outros.map((o) => `<button class="btn btn-icone fantasma" data-trocar="${o.id}" aria-label="${esc(o.nome)}"><i data-lucide="${ICONE_CLASSE[o.classe]}"></i></button>`).join('')}</div>` : ''}`;
  const cn = R.cena(E);
  const naSaida = cn && cn.saida && E.saida && h.x === cn.saida[0] && h.y === cn.saida[1];
  const btns = [];
  if (sel.previa) {
    const [x, y] = sel.previa.split(',').map(Number);
    btns.push(`<button class="btn ouro" id="bt-confirma-mover"><i data-lucide="footprints"></i> Mover para ${R.nomeCasa(x, y)}</button>`);
    btns.push(`<button class="btn fantasma icone-so" id="bt-cancela" aria-label="Cancelar"><i data-lucide="x"></i></button>`);
  } else if (cb && !minha) {
    btns.push(`<button class="btn fantasma" disabled>${h.caido ? 'Caído: um aliado precisa te levantar' : 'Aguardando a vez de ' + esc(nomeDe(vez))}</button>`);
  } else {
    btns.push(`<button class="btn" id="bt-habs" ${h.caido ? 'disabled' : ''}><i data-lucide="book-open"></i> Ações</button>`);
    btns.push(`<button class="btn" id="bt-pocao" ${!E.inv.pocao || h.caido ? 'disabled' : ''}><i data-lucide="flask-round"></i> Poção</button>`);
    if (naSaida && !cb) btns.push(`<button class="btn ouro" id="bt-seguir"><i data-lucide="door-open"></i> Seguir viagem</button>`);
    if (cb) btns.push(`<button class="btn ouro" id="bt-fim"><i data-lucide="hourglass"></i> Fim do turno</button>`);
  }
  acoes.innerHTML = btns.join('');
  icones();
  document.querySelectorAll('[data-trocar]').forEach((b) => b.onclick = () => { heroiSel = b.dataset.trocar; limparSelecao(); atualizarTudo(); mundo.focar(heroiSel); });
  const on = (id, fn) => { const b = document.getElementById(id); if (b) b.onclick = fn; };
  on('bt-confirma-mover', () => { const [x, y] = sel.previa.split(',').map(Number); limparSelecao(); enviar({ t: 'mover', heroi: h.id, x, y }); });
  on('bt-cancela', () => { limparSelecao(); atualizarTudo(); });
  on('bt-habs', () => abrirHabilidades(h));
  on('bt-pocao', () => usarPocao(h));
  on('bt-seguir', () => enviar({ t: 'sair', heroi: h.id }));
  on('bt-fim', () => { limparSelecao(); enviar({ t: 'fimTurno', heroi: h.id }); });
}

// ---------------------------------------------------------------- diálogo
function renderDialogo() {
  const box = $('#dialogo');
  const d = R.dialogoAtual(E);
  if (!d || tocando) { box.hidden = true; return; }
  const npc = E.u[d.npc];
  const meu = ehMeu(d.heroi);
  const h = E.u[d.heroi];
  const ops = d.opcoes.map((o, i) => {
    if (!o.vis) return '';
    let t = esc(o.t);
    const m = /^\[([^\]]+?) CD (\d+)\]\s*/.exec(o.t);
    if (m) {
      const chave = Object.keys(R.PERICIAS).find((k) => R.PERICIAS[k][1] === m[1]);
      const bonus = chave && h ? R.bonusPericia(h, chave) : 0;
      t = `<span class="teste">${esc(m[1])} CD ${m[2]} · seu ${R.modTxt(bonus)}</span>` + esc(o.t.slice(m[0].length));
    }
    return `<button class="dlg-op" data-op="${i}" ${!meu || o.bloq ? 'disabled' : ''}>${t}${o.bloq ? ' <small>(falta o necessário)</small>' : ''}</button>`;
  }).join('');
  box.innerHTML = `<div class="dlg-quem"><div class="retrato" style="width:40px;height:40px;font-size:1.1rem"><i data-lucide="message-circle"></i></div><div><b>${esc(npc ? npc.nome : '')}</b><br><span>${meu ? 'Você fala por ' + esc(h.nome) : esc(h ? h.nome : '') + ' está conversando'}</span></div></div>
    <p class="dlg-fala">"${esc(d.fala)}"</p>
    <div class="dlg-opcoes">${ops}</div>
    ${meu ? '<div style="text-align:right;margin-top:10px"><button class="btn pequeno fantasma" id="bt-sai-dlg">Encerrar conversa</button></div>' : '<p class="dlg-espera">As escolhas são de quem iniciou a conversa.</p>'}`;
  box.hidden = false;
  icones();
  box.querySelectorAll('[data-op]').forEach((b) => b.onclick = () => enviar({ t: 'escolha', opcao: +b.dataset.op }));
  const s = $('#bt-sai-dlg');
  if (s) s.onclick = () => enviar({ t: 'sairDialogo' });
}

// ---------------------------------------------------------------- destaques no tabuleiro
function atualizarDestaques() {
  if (!mundo || tocando || !E || E.fase !== 'jogo') { mundo && mundo.destacar(null); return; }
  const h = heroiAtivo();
  const mapa = {};
  if (h && !E.dialogo && minhaVez(h)) {
    if (sel.modo === 'alvo') {
      for (const id of alvosValidos(h, sel.hab, sel.item)) { const u = E.u[id]; mapa[u.x + ',' + u.y] = 'alvo'; }
    } else {
      if (E.combate) {
        const d = R.destinos(E, h.id);
        for (const k in d) mapa[k] = 'mover';
        for (const u of Object.values(E.u)) if ((R.hostil(u) || (u.alvoPv && R.ativa(u))) && R.ataquesDe(h).some((a) => R.dist(h, u) <= a.alc && (a.alc === 1 || R.visao(E, h, u)))) mapa[u.x + ',' + u.y] = 'atacar';
      }
      if (sel.previa) {
        for (const p of caminhoPrevia(h, sel.previa)) mapa[p[0] + ',' + p[1]] = 'caminho';
      }
    }
  }
  mundo.destacar(mapa);
  mundo.marcarCursor(sel.previa ? +sel.previa.split(',')[0] : null, sel.previa ? +sel.previa.split(',')[1] : null);
  $('#alvo-aviso').hidden = sel.modo !== 'alvo';
}
function caminhoPrevia(h, k) {
  const m = R.custos(E, h.id, R.movRestante(E, h.id));
  const out = [];
  while (k && m.dist[k] != null) { const [x, y] = k.split(',').map(Number); out.push([x, y]); k = m.prev[k]; }
  return out;
}
function limparSelecao(render = true) {
  sel = { modo: null, hab: null, item: null, previa: null };
  $('#folha').hidden = true;
  $('#alvo-aviso').hidden = true;
  if (render && mundo) atualizarDestaques();
}

// ================================================================ interação
function unidadeEm(x, y) {
  return Object.values(E.u).find((u) => R.ativa(u) && u.x === x && u.y === y && (u.lado !== 'objeto' || u.bloqueia || u.obj === 'alcapao')) || null;
}
function aoTocar(cx, cy) {
  if (!E || E.fase !== 'jogo') return;
  if (pularLegenda) { pularLegenda(); return; }
  if (tocando) return;
  const c = mundo.casaNoToque(cx, cy);
  if (!c) { limparSelecao(); atualizarTudo(); return; }
  Som.sfx('toque');
  const h = heroiAtivo();
  const u = c.uid && E.u[c.uid] ? E.u[c.uid] : unidadeEm(c.x, c.y);
  if (sel.modo === 'alvo') {
    if (u && alvosValidos(h, sel.hab, sel.item).includes(u.id)) {
      const cmd = sel.item ? { t: 'item', heroi: h.id, item: sel.item, alvo: u.id } : { t: 'habilidade', heroi: h.id, hab: sel.hab, alvo: u.id };
      limparSelecao();
      enviar(cmd);
    } else toast('Escolha um alvo destacado, ou cancele.');
    return;
  }
  if (u) { abrirFicha(u, h); return; }
  if (!h) return;
  if (!minhaVez(h)) { toast(h.caido ? h.nome + ' está caído.' : 'Espere a sua vez.'); return; }
  const k = c.x + ',' + c.y;
  const d = R.destinos(E, h.id);
  if (d[k] == null) { toast('Não dá para chegar em ' + R.nomeCasa(c.x, c.y) + (E.combate ? ' neste turno.' : '.')); return; }
  if (sel.previa === k) { limparSelecao(); enviar({ t: 'mover', heroi: h.id, x: c.x, y: c.y }); return; }
  sel = { modo: null, hab: null, item: null, previa: k };
  $('#folha').hidden = true;
  atualizarTudo();
}

function chanceAcerto(h, alvo, b) {
  const p = (21 - ((alvo.ca || 10) - b - R.bonusNivel(E))) / 20;
  return Math.round(Math.max(0.05, Math.min(0.95, p)) * 100);
}

function abrirFicha(u, h) {
  const f = $('#folha');
  const itens = [];
  const pode = h && minhaVez(h) && !E.dialogo;
  const vazio = (motivo) => `<small>${esc(motivo)}</small>`;
  let sub = '';
  if (u.lado === 'inimigo' || u.alvoPv) {
    sub = u.pv != null ? `PV ${u.pv}/${u.pvMax} · CA ${u.ca}` : '';
    if (u.pacifico) sub += ' · ainda não está hostil';
    if (h) {
      R.ataquesDe(h).forEach((a, i) => {
        const d = R.dist(h, u), alc = d <= a.alc, vis = a.alc === 1 || R.visao(E, h, u);
        const ok = pode && alc && vis && (!E.combate || E.combate.acao > 0);
        const motivo = !pode ? 'Espere a sua vez' : !alc ? `Alcance ${a.alc}, o alvo está a ${d}` : !vis ? 'Sem linha de visão' : E.combate && !E.combate.acao ? 'Ação já usada' : `Dano ${a.d}`;
        itens.push(`<button class="acao-item ataque" data-atk="${i}" ${ok ? '' : 'disabled'}><i data-lucide="sword"></i><div><b>${esc(a.n)}</b>${vazio(motivo)}</div><span class="tag">${chanceAcerto(h, u, a.b)}%</span></button>`);
      });
      for (const k of R.habsDe(h)) {
        const hb = R.HABS[k];
        if (hb.alvo !== 'inimigo') continue;
        const ok = pode && podeHab(h, k) && R.dist(h, u) <= hb.alc && R.visao(E, h, u);
        itens.push(`<button class="acao-item" data-habalvo="${k}" ${ok ? '' : 'disabled'}><i data-lucide="${hb.ic}"></i><div><b>${esc(hb.n)}</b>${vazio(hb.desc)}</div><span class="tag">${hb.custo === 'acao' ? 'Ação' : 'Bônus'}</span></button>`);
      }
    }
    if (u.dialogo && u.pacifico && h) itens.unshift(botaoInteragir(u, h, 'Conversar', 'message-circle'));
  } else if (u.lado === 'npc') {
    sub = 'Personagem';
    if (u.dialogo && h) itens.push(botaoInteragir(u, h, 'Conversar', 'message-circle'));
  } else if (u.lado === 'objeto') {
    const ob = R.OBJETOS[u.obj];
    sub = u.usado ? 'Já examinado' : ob.req ? 'Precisa de: ' + R.ITENS[ob.req].n + (ob.teste ? ' (ou um teste de ' + R.PERICIAS[ob.teste.p][1] + ')' : '') : ob.teste ? 'Teste de ' + R.PERICIAS[ob.teste.p][1] + ' CD ' + ob.teste.cd : '';
    if (h && !u.usado) itens.push(botaoInteragir(u, h, ob.acao, 'hand'));
  } else if (u.lado === 'heroi') {
    const c = R.CLASSES[u.classe];
    sub = `${c.nome} · PV ${u.pv}/${u.pvMax} · CA ${u.ca}` + (u.dono ? ' · jogador: ' + ((E.jogadores[u.dono] || {}).nome || '?') : '');
    if (u.dono === EU && (!h || u.id !== h.id)) itens.push(`<button class="acao-item" data-sel="${u.id}"><i data-lucide="user-check"></i><div><b>Controlar ${esc(u.nome)}</b></div></button>`);
    if (h && u.id !== h.id && u.caido) itens.push(`<button class="acao-item" data-habalvo="levantar" ${pode && R.dist(h, u) <= 1 ? '' : 'disabled'}><i data-lucide="hand-helping"></i><div><b>Levantar ${esc(u.nome)}</b><small>Precisa estar ao lado. Gasta a ação.</small></div></button>`);
    if (h && E.inv.pocao && R.dist(h, u) <= 1) itens.push(`<button class="acao-item" data-pocao="${u.id}" ${pode ? '' : 'disabled'}><i data-lucide="flask-round"></i><div><b>Dar poção a ${esc(u.id === h.id ? 'si mesmo' : u.nome)}</b><small>2d4+2 PV. Ação bônus.</small></div></button>`);
    const a = c.atr;
    sub += `<div class="atributos">${['for', 'des', 'con', 'int', 'sab', 'car'].map((k) => `<span>${k.toUpperCase()}<b>${R.modTxt(a[k])}</b></span>`).join('')}</div>`;
  }
  f.innerHTML = `<h3>${esc(u.nome)}</h3><div class="folha-sub">${sub}</div><div class="lista-acoes">${itens.join('') || '<p class="folha-sub">Nada a fazer aqui agora.</p>'}</div>
    <div style="text-align:right;margin-top:12px"><button class="btn pequeno fantasma" id="bt-fecha-folha">Fechar</button></div>`;
  f.hidden = false;
  icones();
  $('#bt-fecha-folha').onclick = () => limparSelecao();
  f.querySelectorAll('[data-atk]').forEach((b) => b.onclick = () => { limparSelecao(); enviar({ t: 'atacar', heroi: h.id, alvo: u.id, arma: +b.dataset.atk }); });
  f.querySelectorAll('[data-habalvo]').forEach((b) => b.onclick = () => { limparSelecao(); enviar({ t: 'habilidade', heroi: h.id, hab: b.dataset.habalvo, alvo: u.id }); });
  f.querySelectorAll('[data-pocao]').forEach((b) => b.onclick = () => { limparSelecao(); enviar({ t: 'item', heroi: h.id, item: 'pocao', alvo: b.dataset.pocao }); });
  f.querySelectorAll('[data-sel]').forEach((b) => b.onclick = () => { heroiSel = b.dataset.sel; limparSelecao(); atualizarTudo(); });
  f.querySelectorAll('[data-interagir]').forEach((b) => b.onclick = () => { limparSelecao(); interagirCom(u, h); });
}
function botaoInteragir(u, h, rotulo, ic) {
  const alc = u.dialogo ? 2 : 1;
  const longe = R.dist(h, u) > alc;
  const ok = minhaVez(h) && !E.dialogo;
  return `<button class="acao-item" data-interagir="1" ${ok ? '' : 'disabled'}><i data-lucide="${ic}"></i><div><b>${esc(rotulo)}</b><small>${longe ? 'Seu herói anda até lá primeiro.' : E.combate && !u.dialogo ? 'Gasta a ação.' : ''}</small></div></button>`;
}
async function interagirCom(u, h) {
  const alc = u.dialogo ? 2 : 1;
  if (R.dist(h, u) > alc) {
    const d = R.destinos(E, h.id);
    let best = null, bd = 99;
    for (const k in d) { const [x, y] = k.split(',').map(Number); if (R.dist({ x, y }, u) <= alc && d[k] < bd) { bd = d[k]; best = [x, y]; } }
    if (!best) { toast('Não dá para chegar perto de ' + u.nome + (E.combate ? ' neste turno.' : '.'), true); return; }
    const r = await enviar({ t: 'mover', heroi: h.id, x: best[0], y: best[1] });
    if (!r.ok) return;
    if (E.combate || E.dialogo) return;
  }
  enviar({ t: 'interagir', heroi: h.id, alvo: u.id });
}

function podeHab(h, k) {
  const hb = R.HABS[k];
  if (hb.usos && !(h.usos[k] > 0)) return false;
  if (hb.carga && h.magia < 1) return false;
  if (E.combate) {
    if (R.vezDe(E) !== h.id) return false;
    if (hb.custo === 'acao' && !E.combate.acao) return false;
    if (hb.custo === 'bonus' && !E.combate.bonus) return false;
  } else if (k === 'ardil') return false;
  return true;
}
function alvosValidos(h, k, item) {
  if (!h) return [];
  const out = [];
  for (const u of Object.values(E.u)) {
    if (!R.ativa(u)) continue;
    if (item === 'pocao') { if (u.lado === 'heroi' && R.dist(h, u) <= 1) out.push(u.id); continue; }
    const hb = R.HABS[k];
    if (!hb) continue;
    if (hb.alvo === 'inimigo' && (R.hostil(u) || u.alvoPv) && R.dist(h, u) <= hb.alc && R.visao(E, h, u)) out.push(u.id);
    if (hb.alvo === 'aliado' && u.lado === 'heroi' && R.dist(h, u) <= hb.alc) out.push(u.id);
    if (hb.alvo === 'caido' && u.lado === 'heroi' && u.caido && R.dist(h, u) <= hb.alc) out.push(u.id);
  }
  return out;
}
function abrirHabilidades(h) {
  const f = $('#folha');
  const lista = R.habsDe(h).map((k) => {
    const hb = R.HABS[k];
    const ok = podeHab(h, k) && !E.dialogo;
    const usos = hb.usos ? ` · ${h.usos[k] || 0} uso${h.usos[k] === 1 ? '' : 's'}` : hb.carga ? ` · magia ${h.magia}` : '';
    return `<button class="acao-item" data-hab="${k}" ${ok ? '' : 'disabled'}><i data-lucide="${hb.ic}"></i><div><b>${esc(hb.n)}</b><small>${esc(hb.desc)}</small></div><span class="tag">${hb.custo === 'acao' ? 'Ação' : 'Bônus'}${usos}</span></button>`;
  }).join('');
  f.innerHTML = `<h3>Ações de ${esc(h.nome)}</h3><p class="folha-sub">Para atacar, toque no inimigo no tabuleiro. Para andar, toque numa casa.</p><div class="lista-acoes">${lista}</div>
    <div style="text-align:right;margin-top:12px"><button class="btn pequeno fantasma" id="bt-fecha-folha">Fechar</button></div>`;
  f.hidden = false;
  icones();
  $('#bt-fecha-folha').onclick = () => limparSelecao();
  f.querySelectorAll('[data-hab]').forEach((b) => b.onclick = () => {
    const k = b.dataset.hab, hb = R.HABS[k];
    if (hb.alvo === 'si' || hb.alvo === 'area') { limparSelecao(); enviar({ t: 'habilidade', heroi: h.id, hab: k }); return; }
    const alvos = alvosValidos(h, k);
    if (!alvos.length) { toast(hb.alvo === 'inimigo' ? 'Nenhum inimigo ao alcance.' : 'Nenhum aliado ao seu lado.', true); return; }
    $('#folha').hidden = true;
    sel = { modo: 'alvo', hab: k, item: null, previa: null };
    $('#alvo-aviso span').textContent = 'Toque no alvo: ' + hb.n;
    atualizarDestaques();
  });
}
function usarPocao(h) {
  const alvos = alvosValidos(h, null, 'pocao');
  if (alvos.length <= 1) { enviar({ t: 'item', heroi: h.id, item: 'pocao', alvo: h.id }); return; }
  sel = { modo: 'alvo', hab: null, item: 'pocao', previa: null };
  $('#alvo-aviso span').textContent = 'Toque em quem vai beber a poção';
  atualizarDestaques();
}

let enviando = 0;
async function enviar(cmd) {
  Som.destravar();
  enviando++;
  document.body.style.cursor = 'progress';
  let r;
  try { r = await con.enviar(cmd); } catch (e) { r = { ok: false, erro: 'Sem conexão com o servidor. Tente de novo.' }; }
  enviando--;
  if (!enviando) document.body.style.cursor = '';
  if (!r.ok) { toast(r.erro, true); Som.sfx('erro'); }
  return r;
}

// ================================================================ AR
let arLigado = false, perdidoDesde = 0;
async function ligarAR() {
  Som.destravar();
  try {
    if (!rast) rast = new Rastreador($('#video'));
    rast.ajusteLente = prefs.lente;
    await rast.ligar();
    arLigado = true;
    mundo.definirModo('ar');
    document.body.classList.add('modo-ar', 'procurando');
    mundo.esconderAR();
    rast.aoMudar = () => { if (rast.rastreando) mundo.aplicarPose(rast.ultimaPose, rast.focoAtual(), rast.vw, rast.vh); };
    toast('Aponte a câmera para as folhas do tabuleiro.');
  } catch (e) {
    toast('Câmera indisponível: ' + (e.name === 'NotAllowedError' ? 'permissão negada.' : e.message), true);
    desligarAR();
  }
}
function desligarAR() {
  if (rast) rast.desligar();
  arLigado = false;
  document.body.classList.remove('modo-ar', 'procurando');
  mundo.definirModo('mesa');
}
function vigiarAR() {
  if (!arLigado || !rast) return;
  const s = $('#status-ar');
  if (rast.rastreando) {
    perdidoDesde = 0;
    document.body.classList.remove('procurando');
    s.classList.add('ok');
    s.textContent = `Tabuleiro encontrado · ${rast.marcadores} casas vistas`;
  } else {
    if (!perdidoDesde) perdidoDesde = performance.now();
    s.classList.remove('ok');
    s.textContent = 'Aponte a câmera para o tabuleiro impresso (de 30 a 60 cm, um pouco inclinado)';
    if (performance.now() - perdidoDesde > 1800) { mundo.esconderAR(); document.body.classList.add('procurando'); }
  }
}

// ================================================================ menu e final
function abrirMenu() {
  const host = E.host === EU;
  const livres = Object.keys(R.CLASSES).filter((k) => !E.u['h_' + k]);
  $('#menu-miolo').innerHTML = `
    <div class="cab-lateral"><h2>Menu</h2><button class="btn btn-icone fantasma" id="bt-fecha-menu" aria-label="Fechar"><i data-lucide="x"></i></button></div>
    <div class="painel ornato" style="padding:6px 16px 10px">
      <div class="opcao-linha"><div><b>Realidade aumentada</b><small>Usa a câmera traseira e o tabuleiro impresso.</small></div><label class="chave"><input type="checkbox" id="op-ar" ${arLigado ? 'checked' : ''}><span></span></label></div>
      <div class="opcao-linha"><div><b>Voz do narrador e dos personagens</b><small>Deixe ligada em um celular só, para não falarem todos juntos.</small></div><label class="chave"><input type="checkbox" id="op-voz" ${prefs.voz ? 'checked' : ''} ${Som.vozDisponivel() ? '' : 'disabled'}><span></span></label></div>
      <div class="opcao-linha"><div><b>Sons e ambiente</b></div><label class="chave"><input type="checkbox" id="op-sons" ${prefs.sons ? 'checked' : ''}><span></span></label></div>
      <div class="opcao-linha" style="display:block"><b>Ajuste da lente</b><small>Se os personagens parecerem flutuar fora das casas, mexa aqui. ${rast && rast.foco ? 'Calibração automática ativa.' : ''}</small>
        <input type="range" id="op-lente" min="0.8" max="1.25" step="0.01" value="${prefs.lente}" style="width:100%;margin-top:8px"></div>
    </div>
    ${livres.length && !meusHerois().length ? `<h3 style="margin-top:18px">Entrar na aventura</h3><div style="display:flex;gap:8px;flex-wrap:wrap">${livres.map((k) => `<button class="btn" data-entrar="${k}"><i data-lucide="${ICONE_CLASSE[k]}"></i> ${esc(R.CLASSES[k].heroi)}, ${esc(R.CLASSES[k].nome)}</button>`).join('')}</div>` : ''}
    <h3 style="margin-top:18px">Mesa ${sala}</h3>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn" id="bt-copiar"><i data-lucide="link"></i> Copiar link</button>
      <a class="btn" href="imprimir.html" target="_blank"><i data-lucide="printer"></i> Imprimir tabuleiro</a>
      <button class="btn" id="bt-ajuda"><i data-lucide="circle-help"></i> Como jogar</button>
      <a class="btn fantasma" href="index.html"><i data-lucide="log-out"></i> Sair</a>
    </div>
    ${host ? `<h3 style="margin-top:22px">Ferramentas do mestre</h3>
    <div class="painel ornato" style="padding:14px 16px">
      <div class="campo"><label for="m-narra">Narrar para todos</label><textarea id="m-narra" rows="2" maxlength="600" placeholder="Ex.: Um vento gelado apaga as tochas..."></textarea></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn pequeno" id="m-enviar"><i data-lucide="megaphone"></i> Narrar</button>
        <button class="btn pequeno" id="m-pular" ${E.combate ? '' : 'disabled'}><i data-lucide="skip-forward"></i> Pular a vez atual</button>
        <button class="btn pequeno" id="m-curar"><i data-lucide="heart"></i> Curar o grupo</button>
        <button class="btn pequeno perigo" id="m-reiniciar"><i data-lucide="rotate-ccw"></i> Reiniciar a cena</button>
      </div>
      <div class="campo" style="margin-top:12px"><label for="m-cena">Ir para a cena</label><select id="m-cena">${R.CENAS.map((c, i) => `<option value="${i}" ${i === E.cenaIdx ? 'selected' : ''}>${i + 1}. ${esc(c.titulo)}</option>`).join('')}</select></div>
      <button class="btn pequeno" id="m-ir"><i data-lucide="map"></i> Ir</button>
    </div>` : ''}
    <div id="ajuda" class="painel ornato" style="padding:16px;margin-top:18px" hidden>${AJUDA}</div>`;
  $('#menu').hidden = false;
  icones();
  $('#bt-fecha-menu').onclick = () => { $('#menu').hidden = true; };
  $('#op-ar').onchange = (e) => { $('#menu').hidden = true; e.target.checked ? ligarAR() : desligarAR(); };
  $('#op-voz').onchange = (e) => { prefs.voz = e.target.checked; salvarPrefs(); Som.configurar({ voz: prefs.voz }); if (prefs.voz) Som.falar('A voz do narrador está ligada.', R.NARRADOR.voz); };
  $('#op-sons').onchange = (e) => { prefs.sons = e.target.checked; salvarPrefs(); Som.configurar({ sons: prefs.sons }); };
  $('#op-lente').oninput = (e) => { prefs.lente = +e.target.value; salvarPrefs(); if (rast) rast.ajusteLente = prefs.lente; };
  $('#bt-copiar').onclick = async () => { try { await navigator.clipboard.writeText(location.origin + location.pathname + '?sala=' + sala); toast('Link copiado.'); } catch (e) { toast('Não deu para copiar.', true); } };
  $('#bt-ajuda').onclick = () => { $('#ajuda').hidden = !$('#ajuda').hidden; };
  document.querySelectorAll('[data-entrar]').forEach((b) => b.onclick = async () => { const r = await enviar({ t: 'escolher', classe: b.dataset.entrar }); if (r.ok) $('#menu').hidden = true; });
  if (host) {
    $('#m-enviar').onclick = () => { const t = $('#m-narra').value.trim(); if (t) { enviar({ t: 'mestre', op: 'narrar', texto: t }); $('#m-narra').value = ''; $('#menu').hidden = true; } };
    $('#m-pular').onclick = () => { enviar({ t: 'mestre', op: 'pularVez' }); $('#menu').hidden = true; };
    $('#m-curar').onclick = () => { enviar({ t: 'mestre', op: 'curar' }); $('#menu').hidden = true; };
    $('#m-reiniciar').onclick = () => { if (confirm('Reiniciar esta cena? O grupo volta ao começo dela.')) { enviar({ t: 'mestre', op: 'reiniciar' }); $('#menu').hidden = true; } };
    $('#m-ir').onclick = () => { if (confirm('Pular para outra cena?')) { enviar({ t: 'mestre', op: 'cena', idx: +$('#m-cena').value }); $('#menu').hidden = true; } };
  }
}
const AJUDA = `<h3>Como jogar</h3>
  <p><b>Seu turno.</b> Fora de combate, todos andam e conversam livremente. Em combate, cada herói tem um turno com movimento, uma ação e uma ação bônus.</p>
  <p><b>Andar.</b> Toque numa casa: o caminho aparece. Toque de novo (ou em Mover) para confirmar.</p>
  <p><b>Atacar, falar, examinar.</b> Toque no inimigo, no personagem ou no objeto. As opções e a chance de acerto aparecem.</p>
  <p><b>Dados.</b> Tudo usa o d20: rolagem + bônus contra a Classe de Armadura (CA) ou a Classe de Dificuldade (CD). 20 natural é crítico.</p>
  <p><b>Realidade aumentada.</b> Imprima as duas folhas em tamanho real (100%), junte lado a lado e deixe sobre a mesa com boa luz. Aponte o celular de 30 a 60 cm, um pouco inclinado. Basta ver algumas casas para o mundo inteiro aparecer.</p>
  <p><b>Caiu?</b> Um aliado ao lado usa "Levantar aliado" ou dá uma poção. Se todos caírem, o grupo recomeça a cena.</p>`;

function mostrarFinal(textos) {
  if (!$('#final').hidden) return;
  $('#final-miolo').innerHTML = `<div style="text-align:center"><div class="marca" style="font-size:2.4rem">RUNA</div><h2>A Noite do Sino Morto</h2></div>
    <div class="painel ornato epilogo" style="padding:20px 22px;margin:16px 0">${textos.map((t) => `<p>${esc(t)}</p>`).join('')}</div>
    <div class="painel" style="padding:14px 18px"><b>O grupo</b><div class="jogadores">${R.herois(E).map((h) => `<span>${esc(h.nome)}, ${esc(R.CLASSES[h.classe].nome)}</span>`).join('')}</div>
      <p style="margin:0;color:var(--texto2)">Nível ${E.nivel} · ${E.xp} de experiência · ${E.ouro} moedas de prata</p></div>
    <div style="display:flex;gap:10px;justify-content:center;margin-top:18px;flex-wrap:wrap"><a class="btn ouro" href="index.html#capitulo2"><i data-lucide="bell"></i> Quero o Capítulo II</a><button class="btn" id="bt-ver-mesa">Ver o tabuleiro</button></div>`;
  $('#final').hidden = false;
  icones();
  $('#bt-ver-mesa').onclick = () => { $('#final').hidden = true; };
  if (prefs.voz) Som.falar(textos.join(' '), R.NARRADOR.voz);
}

// ================================================================ eventos de tela
function ligarEventos() {
  const cv = $('#cena3d');
  let ini = null;
  cv.addEventListener('pointerdown', (e) => { ini = { x: e.clientX, y: e.clientY, t: performance.now() }; Som.destravar(); });
  cv.addEventListener('pointerup', (e) => {
    if (!ini) return;
    const mov = Math.hypot(e.clientX - ini.x, e.clientY - ini.y), dt = performance.now() - ini.t;
    ini = null;
    if (mov < 10 && dt < 600) aoTocar(e.clientX, e.clientY);
  });
  $('#legenda').addEventListener('click', () => { if (pularLegenda) pularLegenda(); });
  $('#bt-menu').onclick = abrirMenu;
  $('#bt-modo').onclick = () => (arLigado ? desligarAR() : ligarAR());
  $('#bt-cronica').onclick = () => { $('#cronica').hidden = !$('#cronica').hidden; };
  $('#bt-fecha-cronica').onclick = () => { $('#cronica').hidden = true; };
  $('#bt-cancela-alvo').onclick = () => limparSelecao();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) Som.destravar(); });
}

window.RUNA_DEBUG = { get mundo() { return mundo; }, get E() { return E; } };
iniciar();
