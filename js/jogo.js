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
const SESSAO = Rede.sessao();
const EU = SESSAO ? SESSAO.conta.id : null;
const ICONE_CLASSE = { guerreiro: 'shield', barbara: 'axe', maga: 'wand-sparkles', ladina: 'venetian-mask', cacadora: 'crosshair', clerigo: 'sun', bardo: 'music', paladino: 'shield-plus' };
const ANIMAIS = new Set(['lobo', 'aranha', 'aranha_mae', 'rato', 'troll', 'golem']);
// Retrato ilustrado (assets/retratos); se a imagem faltar, fica o ícone da classe.
function retrato(classe, extra = '', icone) {
  return `<div class="retrato ${extra}"><img src="assets/retratos/${classe}.webp" alt="" onerror="this.remove()"><i data-lucide="${icone || ICONE_CLASSE[classe] || 'user'}"></i></div>`;
}
// rosto de quem fala (NPCs e vilões têm retrato pelo nome do visual)
const RETRATO_VIS = { troll: 'gorm', garra: 'garra' };
function retratoDe(u) {
  if (!u) return retrato('', '', 'message-circle');
  if (u.lado === 'heroi') return retrato(u.classe);
  return retrato(RETRATO_VIS[u.vis] || u.vis, '', 'message-circle');
}

let con, mundo, rast = null;
let E = null, ultimoSeq = 0, fila = [], tocando = false, pulando = false;
let previsto = null; // jogada mostrada antes da resposta do servidor (ver preverJogada)
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
  if (!Rede.codigoValido(sala)) { location.href = 'conta.html'; return; }
  if (!SESSAO) { location.href = 'conta.html?volta=' + encodeURIComponent('jogo.html?sala=' + sala); return; }
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
  carga('Abrindo a campanha ' + sala + '...', 0.8);
  try {
    let r = await con.abrir();
    if (r.naoMembro) {
      await telaConvite();
      r = await con.abrir();
      if (r.naoMembro) return falhaFatal('Não foi possível entrar na campanha.');
    }
  } catch (e) { return falhaFatal(e.message); }
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
  $('#carregando').innerHTML = `<div class="miolo" style="text-align:center;max-width:460px"><div class="marca" style="font-size:2.2rem">RUNA</div><p>${esc(msg)}</p><a class="btn ouro" href="conta.html">Minhas campanhas</a></div>`;
}
// Quem abriu o link do convite e ainda não está na campanha.
async function telaConvite() {
  const pv = await Rede.previa(sala);
  if (!pv.ok) throw new Error(pv.erro);
  const m = pv.mesa;
  const telaCarga = $('#carregando').innerHTML;
  return new Promise((ok) => {
    $('#carregando').innerHTML = `<div class="miolo painel ornato convite" style="max-width:460px;padding:24px;text-align:left">
      <div class="marca" style="font-size:1.6rem">RUNA</div>
      <p class="sobretitulo">Convite para a campanha ${esc(sala)}</p>
      <h2>Capítulo ${esc(m.capNum)}: ${esc(m.capTitulo)}</h2>
      <p><b>${esc(m.anfitriao)}</b> está montando o grupo. ${m.fase === 'lobby' ? 'Vocês ainda estão escolhendo os heróis.' : m.fase === 'fim' ? 'Esta campanha já terminou.' : 'A aventura já começou: ' + esc(m.cena) + '.'}</p>
      ${m.jogadores.length ? `<div class="jogadores">${m.jogadores.map((j) => `<span>${esc(j)}</span>`).join('')}</div>` : ''}
      <p style="color:var(--texto2);font-size:.9rem">Você entra como <b>${esc(SESSAO.conta.apelido)}</b>. A campanha fica salva na sua conta para continuar outro dia.</p>
      ${m.cheia ? '<p class="msg erro">A campanha está cheia.</p>' : `<button class="btn ouro" id="bt-aceitar" style="width:100%"><i data-lucide="door-open"></i> Entrar na campanha</button>`}
      <p class="msg erro" id="conv-msg"></p>
      <a class="btn fantasma pequeno" href="conta.html" style="margin-top:8px">Agora não</a></div>`;
    icones();
    const b = $('#bt-aceitar');
    if (b) b.onclick = async () => {
      b.disabled = true;
      const r = await con.enviar({ t: 'entrar' });
      if (r.ok) { $('#carregando').innerHTML = telaCarga; ok(); } else { $('#conv-msg').textContent = r.erro; b.disabled = false; }
    };
  });
}

// ================================================================ estado
function receber(e) {
  const primeira = !E;
  const antes = E;
  if (previsto && !e._local) {
    // jogada já mostrada pela previsão: o servidor confirma; só toca o que não foi previsto
    if (e.versao < previsto.versao) return; // estado de antes da jogada
    for (const v of e.eventos.filter((x) => x.n > previsto.seqServ)) {
      if (previsto.eventos.length && previsto.eventos[0] === assinatura(v)) previsto.eventos.shift();
      else fila.push(v);
    }
    previsto.seqServ = e.seq;
    E = e;
    ultimoSeq = e.seq;
    if (antes && antes.fase !== e.fase) atualizarTudo();
    processar();
    if (!tocando) atualizarTudo();
    return;
  }
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
  if (ev.vis === 'rei_corvo') return { tom: 0.3, vel: 0.75 };
  if (ev.vis === 'corvina') return { tom: 1.3, vel: 0.9 };
  if (ev.vis === 'golem' || ev.vis === 'troll') return { tom: 0.2, vel: 0.7 };
  if (ev.vis === 'cavaleiro') return { tom: 0.4, vel: 0.85 };
  return { tom: 0.7, vel: 0.92 };
}

async function tratar(ev, rapido) {
  registrar(ev);
  switch (ev.t) {
    case 'cena': {
      const c = R.cenasDe(E)[ev.idx];
      await mundo.montarCena(c, E);
      await mundo.sincronizar(E, R);
      Som.ambienteDe(c.tema);
      if (!rapido) await faixa(c.titulo, c.sub, 2600);
      return;
    }
    case 'narra': if (!rapido) await legenda(ev.texto, ev.mestre ? null : R.NARRADOR.voz, false, ev.mestre); return;
    case 'fala': if (!rapido && falaVisivel(ev)) await balao(ev); return;
    case 'teste': if (!rapido && !conversaAlheia(ev.heroi)) { Som.sfx('dado'); await cartaDado({ titulo: nomeDe(ev.heroi) + ' — ' + ev.pericia, nat: ev.nat, bonus: ev.bonus, total: ev.total, alvo: 'CD ' + ev.cd, ok: ev.ok, crit: ev.nat === 20 }); } return;
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
      } else if (!rapido && E.u[ev.id] && E.u[ev.id].lado === 'heroi') toast('Vez de ' + nomeDe(ev.id));
      if (!rapido && E.u[ev.id] && E.u[ev.id].lado === 'inimigo') await esperar(250);
      return;
    case 'rodada': return;
    case 'nivel': Som.sfx('nivel'); if (!rapido) await faixa('Nível ' + ev.nivel, ev.texto, 2600); return;
    case 'item': case 'ouro': Som.sfx('moeda'); toast(ev.t === 'ouro' ? (ev.qtd > 0 ? '+' : '') + ev.qtd + ' moedas de prata (total ' + ev.total + ')' : ev.texto); return;
    case 'objetivo': toast('Novo objetivo: ' + ev.texto); return;
    case 'saida': toast('Caminho livre: vá até o círculo dourado e toque em Seguir viagem.'); return;
    case 'som': Som.sfx(ev.som); return mundo.animar(ev, E);
    case 'hab': {
      const s = { luz: 'magia', zombaria: 'erro', palavra: 'cura', cura_massa: 'cura', impor: 'cura', cancao: 'cura', inspirar: 'magia', bencao: 'nivel', divino: 'aco', aura: 'magia', fogo: null, bola: 'fogo', chuva: 'virote', misseis: 'magia', trovao: 'trovao', furia: 'combate', surto: 'combate', giro: 'aco', veneno: 'moeda', pocao: 'cura', balsamo: 'cura', folego: 'cura', marca: 'virote' }[ev.fx];
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
  const lado = u ? u.lado : (ev.vis && Object.values(R.MONSTROS).some((m) => m.vis === ev.vis) ? 'inimigo' : 'npc');
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
    mostrarFinal(f ? f.textos : R.capitulo(E).epilogo(E.flags));
  }
  const c = R.cena(E);
  $('#cena-titulo').textContent = c ? c.titulo : 'RUNA';
  $('#cena-sub').textContent = (c ? c.sub + ' · ' : '') + 'Cap. ' + R.capitulo(E).num + ' · ' + sala;
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
  const link = Rede.linkConvite(sala);
  const cap = R.capitulo(E);
  const host = E.host === EU;
  const jog = Object.entries(E.jogadores).map(([id, j]) => `<span>${esc(j.nome)}${id === E.host ? ' <small style="color:var(--ouro)">anfitrião</small>' : ''}${id === EU ? ' (você)' : ''}</span>`).join('');
  const cards = Object.entries(R.CLASSES).map(([k, c]) => {
    const h = E.u['h_' + k];
    const meu = h && h.dono === EU, outro = h && !meu;
    const a = c.atr;
    return `<article class="card-heroi painel ornato ${meu ? 'meu' : outro ? 'outro' : ''}">
      <header>${retrato(k)}<div><h3>${esc(h ? h.nome : c.heroi)}</h3><p>${esc(c.nome)}${E.nivel > 1 ? ' · nível ' + E.nivel : ''}</p></div></header>
      <p>${esc(c.desc)}</p>
      <p class="frase">"${esc(c.frase)}"</p>
      <div class="stats"><span>PV <b>${c.pv + (E.nivel - 1) * c.pvNivel}</b></span><span>CA <b>${c.ca}</b></span><span>Mov <b>${c.desl}</b></span><span>FOR <b>${R.modTxt(a.for)}</b></span><span>DES <b>${R.modTxt(a.des)}</b></span><span>INT <b>${R.modTxt(a.int)}</b></span></div>
      ${meu ? `<div class="campo" style="margin:4px 0 0"><input data-nome="${k}" maxlength="18" value="${esc(h.nome)}" aria-label="Nome do herói"></div>
               <button class="btn pequeno fantasma" data-soltar="${k}">Trocar de herói</button>`
        : outro ? `<p style="color:var(--ouro)">Escolhido por ${esc((E.jogadores[h.dono] || {}).nome || '?')}</p>`
          : `<button class="btn" data-escolher="${k}"><i data-lucide="hand"></i> Jogar com ${esc(c.heroi)}</button>`}
    </article>`;
  }).join('');
  const qtd = E.ordemHerois.length;
  $('#lobby-miolo').innerHTML = `
    <div class="capa-lobby" style="background-image:url(assets/arte/${cap.id === 'sino' ? 'capitulo1' : 'capitulo2'}.webp)"></div>
    <div style="text-align:center;margin-bottom:14px"><a class="marca" href="conta.html" style="font-size:2.2rem;text-decoration:none">RUNA</a><p style="color:var(--texto2);margin:0">Capítulo ${esc(cap.num)} · ${esc(cap.titulo)}</p></div>
    ${E.origem ? `<p class="painel" style="padding:10px 14px;font-size:.9rem;color:var(--texto2)"><i data-lucide="scroll-text"></i> O grupo do Capítulo I continua aqui: mesmos heróis, nível ${E.nivel}, ${E.ouro} moedas e as escolhas que vocês fizeram.</p>` : ''}
    <div class="codigo-mesa painel ornato">
      <div id="qr"></div>
      <div style="flex:1;min-width:200px"><div style="color:var(--texto2);font-size:.85rem">Convide o grupo</div><div class="cod">${sala}</div>
        <p style="margin:4px 0 10px;font-size:.88rem;color:var(--texto2)">Quem estiver ao seu lado escaneia o QR. De longe, mande o link. Cada pessoa entra com a própria conta, e a campanha fica salva para continuar outro dia.</p>
        <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn pequeno" id="bt-link"><i data-lucide="share-2"></i> Compartilhar link</button>
          <a class="btn pequeno" id="bt-zap" target="_blank" rel="noopener"><i data-lucide="message-circle"></i> WhatsApp</a>
          <a class="btn pequeno fantasma" href="imprimir.html" target="_blank"><i data-lucide="printer"></i> Imprimir tabuleiro</a></div>
        <form id="f-convite" class="linha-convite"><input type="email" id="conv-email" placeholder="ou convide por e-mail" autocomplete="off" required><button class="btn pequeno">Enviar</button></form>
      </div>
    </div>
    <h3>Na mesa</h3><div class="jogadores">${jog}</div>
    <h3>Escolha seu herói</h3>
    <p style="color:var(--texto2);margin-top:-4px">Cada pessoa joga com um herói, no próprio celular. Escolher outro troca o seu.</p>
    <div class="grade-herois">${cards}</div>
    <div style="margin:22px 0 10px;text-align:center">
      ${host ? `<button class="btn ouro" id="bt-iniciar" ${qtd ? '' : 'disabled'} style="min-width:260px"><i data-lucide="swords"></i> Começar a campanha (${qtd} herói${qtd === 1 ? '' : 's'})</button>
        <p style="color:var(--texto3);font-size:.85rem">De 1 a 8 heróis. Grupos maiores enfrentam inimigos mais fortes. Quem chegar depois ainda pode entrar no meio da aventura.</p>`
        : `<p style="color:var(--texto2)">Aguardando ${esc((E.jogadores[E.host] || {}).nome || 'o anfitrião')} começar a campanha...</p>`}
    </div>`;
  if (window.qrcode) { const q = window.qrcode(0, 'M'); q.addData(link); q.make(); $('#qr').innerHTML = q.createImgTag(4, 6, 'QR code da mesa'); }
  icones();
  const texto = 'Bora jogar RUNA comigo? Capítulo ' + cap.num + ': ' + cap.titulo + '. Entra pela minha campanha: ';
  $('#bt-link').onclick = async () => {
    try { if (navigator.share) await navigator.share({ title: 'RUNA — campanha ' + sala, text: texto, url: link }); else { await navigator.clipboard.writeText(link); toast('Link copiado.'); } } catch (e) { /* cancelado */ }
  };
  $('#bt-zap').href = 'https://wa.me/?text=' + encodeURIComponent(texto + link);
  $('#f-convite').onsubmit = async (ev) => {
    ev.preventDefault();
    const em = $('#conv-email').value.trim();
    const r = await Rede.convidar(sala, em).catch((e) => ({ ok: false, erro: e.message }));
    if (r.ok) { toast('Convite enviado para ' + em + '.'); $('#conv-email').value = ''; } else toast(r.erro, true);
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
  const aviso = $('#vez-aviso');
  const meu = meusHerois()[0];
  if (meu && mundo) mundo.seguir(meu.id);
  if (!E.combate) { o.innerHTML = ''; aviso.hidden = true; return; }
  const vez = R.vezDe(E);
  const uv = E.u[vez];
  aviso.hidden = !uv;
  if (uv) {
    const minha = uv.lado === 'heroi' && uv.dono === EU;
    aviso.className = 'vez-aviso painel ' + (minha ? 'minha' : uv.lado);
    aviso.innerHTML = minha ? `<i data-lucide="sword"></i> Sua vez, ${esc(uv.nome)}`
      : uv.lado === 'heroi' ? `<i data-lucide="hourglass"></i> Vez de ${esc(uv.nome)} <small>jogada por ${esc((E.jogadores[uv.dono] || {}).nome || '?')}</small>`
        : `<i data-lucide="skull"></i> Os inimigos agem: ${esc(uv.nome)}`;
  }
  o.innerHTML = E.combate.ordem.filter((id) => E.u[id]).map((id) => {
    const u = E.u[id];
    const ic = u.lado === 'heroi' ? ICONE_CLASSE[u.classe] : ANIMAIS.has(u.tipo) ? 'paw-print' : 'skull';
    return `<span class="chip-ordem ${u.lado} ${id === vez ? 'atual' : ''} ${u.caido ? 'caido' : ''}"><i data-lucide="${ic}"></i>${esc(u.nome.replace(/^(O|A|Os|As) /, '').split(/[ ,]/)[0])}</span>`;
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
  if (h.efeitos.veneno) ef.push('<span style="color:#9aff6a"><i data-lucide="droplets"></i>Veneno</span>');
  const outros = meusHerois().filter((o) => o.id !== h.id);
  ficha.innerHTML = `
    <button class="retrato-botao" id="bt-ficha" aria-label="Abrir a ficha de ${esc(h.nome)}">${retrato(h.classe, h.caido ? 'caido' : '')}<span class="selo-ficha"><i data-lucide="scroll-text"></i></span></button>
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
    ${outros.length ? `<div class="trocar-heroi ${outros.length > 2 ? 'muitos' : ''}">${outros.map((o) => `<button class="btn btn-icone fantasma" data-trocar="${o.id}" aria-label="${esc(o.nome)}"><i data-lucide="${ICONE_CLASSE[o.classe]}"></i></button>`).join('')}</div>` : ''}`;
  const cn = R.cena(E);
  const naSaida = cn && cn.saida && E.saida && h.x === cn.saida[0] && h.y === cn.saida[1];
  const btns = [];
  if (sel.previa) {
    const [x, y] = sel.previa.split(',').map(Number);
    btns.push(`<button class="btn ouro" id="bt-confirma-mover"><i data-lucide="footprints"></i> Mover para cá</button>`);
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
  on('bt-ficha', () => abrirFichaCompleta(h.id));
  on('bt-pocao', () => usarPocao(h));
  on('bt-seguir', () => enviar({ t: 'sair', heroi: h.id }));
  on('bt-fim', () => { limparSelecao(); enviar({ t: 'fimTurno', heroi: h.id }); });
}

// ---------------------------------------------------------------- diálogo
// A conversa só prende o herói que está nela (no combate, prende todos).
function presoNaConversa(h) { return !!E.dialogo && (!!E.combate || !h || E.dialogo.heroi === h.id); }
// Só quem puxou a conversa vê a conversa; os outros recebem um aviso e assistem se quiserem.
let conversa = { chave: null, ver: false, heroi: null };
function falaVisivel(ev) {
  if (!ev.dialogo) return true;
  const hid = ev.heroi || (E.dialogo && E.dialogo.heroi) || conversa.heroi;
  return !hid || ehMeu(hid) || conversa.ver;
}
// teste de perícia feito dentro da conversa de outro jogador
function conversaAlheia(hid) { return !!conversa.chave && conversa.heroi === hid && !ehMeu(hid) && !conversa.ver; }
function renderDialogo() {
  const box = $('#dialogo');
  const aviso = $('#conversa-aviso');
  const d = R.dialogoAtual(E);
  if (!d) { conversa = { chave: null, ver: false, heroi: null }; aviso.hidden = true; box.hidden = true; return; }
  const chave = d.npc + '|' + d.heroi;
  if (conversa.chave !== chave) conversa = { chave, ver: false, heroi: d.heroi };
  const npc = E.u[d.npc];
  const meu = ehMeu(d.heroi);
  const h = E.u[d.heroi];
  if (!meu && !conversa.ver) {
    box.hidden = true;
    aviso.innerHTML = `<i data-lucide="message-circle"></i><span><b>${esc(h ? h.nome : '')}</b> conversa com ${esc(npc ? npc.nome : '')}</span><button class="btn pequeno" id="bt-ver-conversa">Ver conversa</button>`;
    aviso.hidden = false;
    icones();
    $('#bt-ver-conversa').onclick = () => { conversa.ver = true; renderDialogo(); };
    return;
  }
  aviso.hidden = true;
  if (tocando) { box.hidden = true; return; }
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
  box.innerHTML = `<div class="dlg-quem">${retratoDe(npc)}<div><b>${esc(npc ? npc.nome : '')}</b><br><span>${meu ? 'Você fala por ' + esc(h.nome) : esc(h ? h.nome : '') + ' está conversando'}</span></div></div>
    <p class="dlg-fala">"${esc(d.fala)}"</p>
    <div class="dlg-opcoes">${ops}</div>
    ${meu ? '<div style="text-align:right;margin-top:10px"><button class="btn pequeno fantasma" id="bt-sai-dlg">Encerrar conversa</button></div>' : '<p class="dlg-espera">As escolhas são de quem iniciou a conversa. <button class="btn pequeno fantasma" id="bt-fecha-dlg">Fechar</button></p>'}`;
  box.hidden = false;
  icones();
  box.querySelectorAll('[data-op]').forEach((b) => b.onclick = () => enviar({ t: 'escolha', opcao: +b.dataset.op }));
  const s = $('#bt-sai-dlg');
  if (s) s.onclick = () => enviar({ t: 'sairDialogo' });
  const f = $('#bt-fecha-dlg');
  if (f) f.onclick = () => { conversa.ver = false; renderDialogo(); };
}

// ---------------------------------------------------------------- destaques no tabuleiro
function atualizarDestaques() {
  if (!mundo || tocando || !E || E.fase !== 'jogo') { mundo && mundo.destacar(null); return; }
  const h = heroiAtivo();
  const mapa = {};
  if (h && !presoNaConversa(h) && minhaVez(h)) {
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
  if (d[k] == null) { toast('Não dá para chegar ali' + (E.combate ? ' neste turno.' : '.')); return; }
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
  const pode = h && minhaVez(h) && !presoNaConversa(h);
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
  const ok = minhaVez(h) && !presoNaConversa(h);
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
    if (E.combate || presoNaConversa(h)) return;
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
    const ok = podeHab(h, k) && !presoNaConversa(h);
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

// Previsão: as regras rodam iguais no celular e no servidor (mesma semente), então a
// jogada aparece na hora e o servidor só confirma. Se ele recusar, volta ao estado dele.
const PREVER = new Set(['mover', 'atacar', 'habilidade', 'item', 'interagir', 'fimTurno', 'escolha', 'sairDialogo']);

function assinatura(v) { const { n, ...resto } = v; return JSON.stringify(resto); }
function preverJogada(cmd) {
  if (!E || E.fase !== 'jogo' || previsto || !PREVER.has(cmd.t) || typeof structuredClone !== 'function') return null;
  const local = structuredClone(E);
  delete local._local;
  if (!R.aplicar(local, Object.assign({}, cmd, { jogador: EU })).ok) return null;
  local._local = true;
  previsto = { versao: local.versao, seqServ: E.seq, eventos: local.eventos.filter((v) => v.n > E.seq).map(assinatura) };
  const p = previsto;
  receber(local);
  return p;
}

let enviando = 0;
async function enviar(cmd) {
  Som.destravar();
  const p = preverJogada(cmd);
  enviando++;
  document.body.style.cursor = 'progress';
  let r;
  try { r = await con.enviar(cmd); } catch (e) { r = { ok: false, erro: 'Sem conexão com o servidor. Tente de novo.' }; }
  enviando--;
  if (!enviando) document.body.style.cursor = '';
  if (p) {
    previsto = null;
    if (!r.ok && con.estado) {
      // servidor recusou: desfaz a previsão
      E = con.estado;
      ultimoSeq = E.seq;
      if (!tocando) mundo.sincronizar(E, R).catch(() => {});
      atualizarTudo();
    }
  }
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
      <button class="btn" id="bt-menu-ficha"><i data-lucide="scroll-text"></i> Fichas do grupo</button>
      <a class="btn fantasma" href="conta.html"><i data-lucide="log-out"></i> Minhas campanhas</a>
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
      <div class="campo" style="margin-top:12px"><label for="m-cena">Ir para a cena</label><select id="m-cena">${R.cenasDe(E).map((c, i) => `<option value="${i}" ${i === E.cenaIdx ? 'selected' : ''}>${i + 1}. ${esc(c.titulo)}</option>`).join('')}</select></div>
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
  $('#bt-copiar').onclick = async () => { try { await navigator.clipboard.writeText(Rede.linkConvite(sala)); toast('Link copiado.'); } catch (e) { toast('Não deu para copiar.', true); } };
  $('#bt-menu-ficha').onclick = () => { $('#menu').hidden = true; abrirFichaCompleta((heroiAtivo() || R.herois(E)[0] || {}).id); };
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
  <p><b>Explorar.</b> Os mapas são maiores que o papel. A janela acompanha o seu herói: ande até a borda e o mundo desliza. A saída de cada cena é o círculo dourado.</p>
  <p><b>Realidade aumentada.</b> Imprima as folhas do tabuleiro em tamanho real (100%), junte na ordem indicada e deixe sobre a mesa com boa luz. Aponte o celular de 30 a 60 cm, um pouco inclinado. Basta ver algumas casas para o mundo inteiro aparecer.</p>
  <p><b>Caiu?</b> Um aliado ao lado usa "Levantar aliado" ou dá uma poção. Se todos caírem, o grupo recomeça a cena.</p>`;

function mostrarFinal(textos) {
  if (!$('#final').hidden) return;
  const cap = R.capitulo(E);
  const prox = cap.proximo && R.CAPITULOS[cap.proximo];
  const host = E.host === EU;
  const seguir = E.continuacao ? `<a class="btn ouro" href="jogo.html?sala=${esc(E.continuacao)}"><i data-lucide="arrow-right"></i> Ir para o Capítulo ${esc(prox ? prox.num : '')}</a>`
    : prox && host ? `<button class="btn ouro" id="bt-continuar"><i data-lucide="arrow-right"></i> Continuar no Capítulo ${esc(prox.num)} com este grupo</button>`
      : prox ? `<p style="color:var(--texto2);width:100%;text-align:center">${esc((E.jogadores[E.host] || {}).nome || 'O anfitrião')} pode levar o grupo para o Capítulo ${esc(prox.num)}.</p>`
        : `<a class="btn ouro" href="index.html#capitulo3"><i data-lucide="bell"></i> Quero o próximo capítulo</a>`;
  $('#final-miolo').innerHTML = `<div style="text-align:center"><div class="marca" style="font-size:2.4rem">RUNA</div><p class="sobretitulo">Capítulo ${esc(cap.num)}</p><h2>${esc(cap.titulo)}</h2></div>
    <div class="painel ornato epilogo" style="padding:20px 22px;margin:16px 0">${textos.map((t) => `<p>${esc(t)}</p>`).join('')}</div>
    <div class="painel" style="padding:14px 18px"><b>O grupo</b><div class="jogadores">${R.herois(E).map((h) => `<span>${esc(h.nome)}, ${esc(R.CLASSES[h.classe].nome)}</span>`).join('')}</div>
      <p style="margin:0;color:var(--texto2)">Nível ${E.nivel} · ${E.xp} de experiência · ${E.ouro} moedas de prata</p></div>
    <div style="display:flex;gap:10px;justify-content:center;margin-top:18px;flex-wrap:wrap">${seguir}<button class="btn" id="bt-ver-mesa">Ver o tabuleiro</button><a class="btn fantasma" href="conta.html">Minhas campanhas</a></div>`;
  $('#final').hidden = false;
  icones();
  $('#bt-ver-mesa').onclick = () => { $('#final').hidden = true; };
  const bc = $('#bt-continuar');
  if (bc) bc.onclick = async () => {
    bc.disabled = true; bc.textContent = 'Preparando o próximo capítulo...';
    try { const s = await Rede.criarMesa({ deMesa: sala }); location.href = 'jogo.html?sala=' + s; }
    catch (e) { toast(e.message, true); bc.disabled = false; }
  };
  if (prefs.voz) Som.falar(textos.join(' '), R.NARRADOR.voz);
}

// ================================================================ ficha do personagem
const ROTULO_ATR = { for: 'Força', des: 'Destreza', con: 'Constituição', int: 'Inteligência', sab: 'Sabedoria', car: 'Carisma' };
function abrirFichaCompleta(id) {
  const hs = R.herois(E);
  const h = E.u[id] || hs[0];
  if (!h) { toast('Ninguém escolheu herói ainda.'); return; }
  const c = R.CLASSES[h.classe];
  const nv = h.nivel || E.nivel;
  const prox = R.XP_NIVEL[nv] || null, ant = R.XP_NIVEL[nv - 1] || 0;
  const fxp = prox ? Math.min(1, (E.xp - ant) / (prox - ant)) : 1;
  const bn = R.bonusNivel(E) + (E.flags.lamina_estelar ? 1 : 0);
  const dono = (E.jogadores[h.dono] || {}).nome || '?';
  const habs = c.habs.concat(R.HABS_COMUNS).map((k) => {
    const hb = R.HABS[k], travada = hb.nivel && nv < hb.nivel;
    const usos = hb.usos ? `${h.usos[k] != null ? h.usos[k] : hb.usos} uso${(h.usos[k] != null ? h.usos[k] : hb.usos) === 1 ? '' : 's'} por cena` : hb.carga ? 'gasta magia' : 'à vontade';
    return `<div class="ficha-hab ${travada ? 'travada' : ''}"><i data-lucide="${travada ? 'lock' : hb.ic}"></i><div><b>${esc(hb.n)}</b><small>${esc(hb.desc)}</small></div><span class="tag">${travada ? 'nível ' + hb.nivel : (hb.custo === 'acao' ? 'Ação' : 'Bônus') + ' · ' + usos}</span></div>`;
  }).join('');
  const atks = R.ataquesDe(h).map((a) => `<tr><td>${esc(a.n)}</td><td>${R.modTxt(a.b + bn)}</td><td>${esc(a.d)}${bn ? R.modTxt(R.bonusNivel(E)) : ''}${E.flags.lamina_estelar ? ' +1d4' : ''}</td><td>${a.alc === 1 ? 'corpo a corpo' : a.alc + ' casas'}</td></tr>`).join('');
  const pericias = Object.keys(R.PERICIAS).filter((k) => !/^(for|des|con)$/.test(k)).map((k) => {
    const prof = c.prof.indexOf(k) >= 0;
    return `<span class="${prof ? 'prof' : ''}">${prof ? '<i data-lucide="star"></i>' : ''}${esc(R.PERICIAS[k][1])}<b>${R.modTxt(R.bonusPericia(h, k))}</b></span>`;
  }).join('');
  const inv = Object.keys(E.inv).map((k) => R.ITENS[k] ? `<div class="ficha-hab"><i data-lucide="${R.ITENS[k].ic}"></i><div><b>${esc(R.ITENS[k].n)}${E.inv[k] > 1 ? ' x' + E.inv[k] : ''}</b><small>${esc(R.ITENS[k].desc)}</small></div></div>` : '').join('') || '<p class="folha-sub">Nada na mochila do grupo.</p>';
  const ef = [];
  if (h.efeitos.furia) ef.push('Fúria'); if (h.efeitos.esquiva) ef.push('Esquivando'); if (h.efeitos.veneno) ef.push('Lâmina envenenada'); if (h.caido) ef.push('Caído');
  if (E.flags.lamina_estelar) ef.push('Armas de aço estelar (+1 e +1d4)');
  if (h.memoria) ef.push('Perdeu uma lembrança para Mãe Lodo (-' + h.memoria + ' PV máximos)');
  $('#ficha-miolo').innerHTML = `
    <div class="cab-lateral"><h2>Ficha</h2><button class="btn btn-icone fantasma" id="bt-fecha-ficha" aria-label="Fechar"><i data-lucide="x"></i></button></div>
    ${hs.length > 1 ? `<div class="abas-ficha">${hs.map((o) => `<button class="${o.id === h.id ? 'ativa' : ''}" data-ficha="${o.id}">${esc(o.nome)}</button>`).join('')}</div>` : ''}
    <section class="ficha-topo painel ornato">
      ${retrato(h.classe, 'grande' + (h.caido ? ' caido' : ''))}
      <div class="ficha-topo-txt">
        <h3>${esc(h.nome)}</h3>
        <p>${esc(c.nome)} · nível ${nv} · jogador: ${esc(dono)}</p>
        <p class="frase">"${esc(c.frase)}"</p>
        <div class="barra-xp"><i style="width:${Math.round(fxp * 100)}%"></i><em>${prox ? E.xp + ' / ' + prox + ' XP para o nível ' + (nv + 1) : E.xp + ' XP · nível máximo'}</em></div>
      </div>
    </section>
    <div class="ficha-numeros">
      <div class="painel"><small>Vida</small><b>${h.pv}<span>/${h.pvMax}</span></b></div>
      <div class="painel"><small>Armadura</small><b>${h.ca}</b></div>
      <div class="painel"><small>Movimento</small><b>${h.desl}<span> casas</span></b></div>
      <div class="painel"><small>Iniciativa</small><b>${R.modTxt(c.atr.des)}</b></div>
      ${c.magia ? `<div class="painel"><small>Magia</small><b>${h.magia}<span>/${c.magia + R.magiaExtra(nv)}</span></b></div>` : ''}
      <div class="painel"><small>Bônus de nível</small><b>${R.modTxt(R.bonusNivel(E))}</b></div>
    </div>
    <h4>Atributos</h4>
    <div class="ficha-atr">${['for', 'des', 'con', 'int', 'sab', 'car'].map((k) => `<div class="painel"><small>${ROTULO_ATR[k]}</small><b>${R.modTxt(c.atr[k])}</b></div>`).join('')}</div>
    <h4>Ataques</h4>
    <table class="ficha-tabela"><thead><tr><th>Arma</th><th>Acerto</th><th>Dano</th><th>Alcance</th></tr></thead><tbody>${atks}</tbody></table>
    <h4>Habilidades</h4><div class="lista-acoes">${habs}</div>
    <h4>Perícias <small>(estrela = treinada, +2)</small></h4><div class="ficha-pericias">${pericias}</div>
    ${ef.length ? `<h4>Estado</h4><div class="jogadores">${ef.map((t) => `<span>${esc(t)}</span>`).join('')}</div>` : ''}
    <h4>Mochila do grupo <small>${E.ouro} moedas de prata</small></h4><div class="lista-acoes">${inv}</div>
    <h4>Sobre ${esc(c.heroi === h.nome ? h.nome : c.nome)}</h4><p class="folha-sub">${esc(c.desc)}</p>`;
  $('#ficha-tela').hidden = false;
  icones();
  $('#bt-fecha-ficha').onclick = () => { $('#ficha-tela').hidden = true; };
  document.querySelectorAll('[data-ficha]').forEach((b) => b.onclick = () => abrirFichaCompleta(b.dataset.ficha));
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
