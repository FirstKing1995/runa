// RUNA — efeitos sintetizados na hora (Web Audio), música de fundo por cena e vozes
// (síntese de fala do aparelho).
let ctx = null, mestre = null, ambiente = null;
const cfg = { sons: true, musica: true, voz: false, volume: 0.8 };
let falando = false;

export function configurar(c) { Object.assign(cfg, c); if (mestre) mestre.gain.value = cfg.sons ? cfg.volume : 0; ajustarMusica(); }
export function config() { return Object.assign({}, cfg); }

export function destravar() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume();
    if (pedida && (!faixa || faixa.nome !== pedida)) musica(pedida);
    else if (faixa && faixa.a.paused) faixa.a.play().then(() => ajustarMusica(2)).catch(() => {});
    return;
  }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  mestre = ctx.createGain();
  mestre.gain.value = cfg.sons ? cfg.volume : 0;
  const comp = ctx.createDynamicsCompressor();
  mestre.connect(comp); comp.connect(ctx.destination);
  if ('speechSynthesis' in window) speechSynthesis.getVoices();
  if (pedida) musica(pedida);
}

function ruidoBuf(seg = 1) {
  const b = ctx.createBuffer(1, ctx.sampleRate * seg, ctx.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}
function env(g, t, a, dur, pico = 1) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(pico, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
}
function ruido(t, dur, freq, q, tipo = 'bandpass', vol = 0.6) {
  const s = ctx.createBufferSource(); s.buffer = ruidoBuf(Math.max(0.1, dur));
  const f = ctx.createBiquadFilter(); f.type = tipo; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain(); env(g, t, 0.005, dur, vol);
  s.connect(f); f.connect(g); g.connect(mestre); s.start(t); s.stop(t + dur + 0.05);
  return f;
}
function tom(t, freq, dur, tipo = 'sine', vol = 0.3, para) {
  const o = ctx.createOscillator(); o.type = tipo; o.frequency.setValueAtTime(freq, t);
  if (para) o.frequency.exponentialRampToValueAtTime(para, t + dur);
  const g = ctx.createGain(); env(g, t, 0.01, dur, vol);
  o.connect(g); g.connect(mestre); o.start(t); o.stop(t + dur + 0.05);
}
function sino(t, base = 110, dur = 5, vol = 0.35) {
  [0.5, 1, 1.183, 1.506, 2, 2.514, 2.662, 3.011, 4.166].forEach((r, i) => tom(t, base * r * 2, dur / (1 + i * 0.35), 'sine', vol / (1 + i * 0.6)));
  ruido(t, 0.08, 2500, 1, 'highpass', 0.3);
}

export function sfx(nome) {
  if (!ctx || !cfg.sons) return;
  const t = ctx.currentTime + 0.01;
  switch (nome) {
    case 'golpe': ruido(t, 0.18, 900, 0.8, 'bandpass', 0.7); tom(t, 140, 0.15, 'triangle', 0.35, 60); break;
    case 'aco': ruido(t, 0.25, 3200, 6, 'bandpass', 0.5); tom(t, 1800, 0.3, 'square', 0.04, 1200); break;
    case 'erro': ruido(t, 0.3, 1200, 0.5, 'highpass', 0.25); break;
    case 'virote': ruido(t, 0.2, 2200, 2, 'bandpass', 0.35); tom(t + 0.15, 220, 0.08, 'triangle', 0.25, 90); break;
    case 'fogo': ruido(t, 0.7, 500, 0.6, 'lowpass', 0.6); tom(t, 90, 0.6, 'sawtooth', 0.12, 40); break;
    case 'magia': tom(t, 400, 0.5, 'sine', 0.2, 1400); tom(t + 0.05, 600, 0.5, 'triangle', 0.1, 1900); break;
    case 'necro': tom(t, 300, 0.7, 'sawtooth', 0.12, 70); ruido(t, 0.6, 300, 1, 'lowpass', 0.3); break;
    case 'trovao': ruido(t, 1.2, 160, 0.4, 'lowpass', 0.9); tom(t, 60, 1, 'sine', 0.5, 30); break;
    case 'cura': [523, 659, 784, 1046].forEach((f, i) => tom(t + i * 0.08, f, 0.6, 'sine', 0.12)); break;
    case 'dado': for (let i = 0; i < 6; i++) ruido(t + i * 0.06 + Math.random() * 0.03, 0.04, 2500 + Math.random() * 2000, 3, 'bandpass', 0.35); break;
    case 'critico': [392, 523, 659, 784].forEach((f, i) => tom(t + i * 0.07, f, 0.5, 'triangle', 0.15)); break;
    case 'sino': sino(t, 98, 5.5, 0.4); break;
    case 'sino_quebra': sino(t, 98, 2, 0.35); ruido(t + 0.05, 0.8, 1800, 0.7, 'highpass', 0.7); tom(t, 70, 1.4, 'sawtooth', 0.15, 30); break;
    case 'uivo': { const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(380, t); o.frequency.linearRampToValueAtTime(620, t + 0.6); o.frequency.linearRampToValueAtTime(420, t + 2.2);
      const lfo = ctx.createOscillator(); lfo.frequency.value = 6; const lg = ctx.createGain(); lg.gain.value = 12; lfo.connect(lg); lg.connect(o.frequency);
      const g = ctx.createGain(); env(g, t, 0.3, 2.4, 0.18); o.connect(g); g.connect(mestre); o.start(t); lfo.start(t); o.stop(t + 2.5); lfo.stop(t + 2.5); break; }
    case 'agua': for (let i = 0; i < 8; i++) tom(t + i * 0.09, 300 + Math.random() * 500, 0.08, 'sine', 0.15, 900 + Math.random() * 600); break;
    case 'pedra': ruido(t, 1.4, 120, 0.5, 'lowpass', 0.8); ruido(t, 0.6, 600, 1, 'bandpass', 0.2); break;
    case 'morte': tom(t, 220, 0.6, 'triangle', 0.18, 70); ruido(t, 0.4, 700, 1, 'bandpass', 0.25); break;
    case 'nivel': [392, 494, 587, 784, 988].forEach((f, i) => tom(t + i * 0.1, f, 0.8, 'triangle', 0.13)); break;
    case 'moeda': tom(t, 1800, 0.12, 'square', 0.05); tom(t + 0.08, 2400, 0.2, 'square', 0.05); break;
    case 'vez': tom(t, 660, 0.15, 'sine', 0.15); tom(t + 0.12, 880, 0.25, 'sine', 0.15); break;
    case 'toque': tom(t, 900, 0.05, 'sine', 0.06); break;
    case 'combate': tom(t, 110, 0.9, 'sawtooth', 0.12, 55); ruido(t, 0.5, 200, 1, 'lowpass', 0.4); tom(t + 0.3, 146, 0.7, 'sawtooth', 0.1, 73); break;
  }
}

// ------------------------------------------------------------- música
// Faixas feitas no Suno pelo dono do jogo (assets/musica). Passam pelo Web Audio para o volume
// e as transições funcionarem também no iPhone (lá o volume do <audio> é só leitura).
const FAIXA_TEMA = { taverna: 'taverna', vila: 'vila', floresta: 'floresta', pantano: 'floresta', lago: 'floresta', cripta: 'masmorra', salao: 'masmorra', mina: 'masmorra', forja: 'masmorra', ninho: 'masmorra', trono: 'masmorra' };
const VOL_MUSICA = 0.5;
let faixa = null, pedida = null;
function volMusica() { return cfg.musica ? VOL_MUSICA * (falando ? 0.35 : 1) : 0.0001; }
function ajustarMusica(seg = 0.8) { if (faixa && ctx) faixa.g.gain.setTargetAtTime(volMusica(), ctx.currentTime, seg / 3); }
export function ambienteDe(tema) { musica(FAIXA_TEMA[tema] || 'masmorra'); }
export function musica(nome) {
  pedida = nome;
  if (!ctx) return; // começa no primeiro toque (destravar)
  if (faixa && faixa.nome === nome) { if (faixa.a.paused) faixa.a.play().catch(() => {}); return; }
  if (faixa) {
    const velha = faixa;
    velha.g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.6);
    setTimeout(() => { velha.a.pause(); velha.a.removeAttribute('src'); velha.a.load(); velha.g.disconnect(); }, 2500);
  }
  const a = new Audio('assets/musica/' + nome + '.mp3');
  a.loop = true; a.preload = 'auto'; a.crossOrigin = 'anonymous';
  const g = ctx.createGain(); g.gain.value = 0.0001;
  ctx.createMediaElementSource(a).connect(g); g.connect(mestre);
  faixa = { nome, a, g };
  a.play().then(() => ajustarMusica(2.5)).catch(() => { /* toca no próximo toque */ });
}

// ------------------------------------------------------------- vozes
let vozPt = null;
function escolherVoz() {
  if (vozPt || !('speechSynthesis' in window)) return vozPt;
  const vs = speechSynthesis.getVoices();
  vozPt = vs.find((v) => /pt[-_]BR/i.test(v.lang) && /google|luciana|felipe|francisca|antonio/i.test(v.name)) || vs.find((v) => /pt[-_]BR/i.test(v.lang)) || vs.find((v) => /^pt/i.test(v.lang)) || null;
  return vozPt;
}
export function vozDisponivel() { return 'speechSynthesis' in window; }
export function calar() { if ('speechSynthesis' in window) speechSynthesis.cancel(); }
export function falar(texto, voz) {
  return new Promise((ok) => {
    if (!cfg.voz || !('speechSynthesis' in window) || !texto) return ok(false);
    const u = new SpeechSynthesisUtterance(texto);
    const v = escolherVoz();
    if (v) u.voice = v;
    u.lang = v ? v.lang : 'pt-BR';
    u.pitch = Math.max(0.1, Math.min(2, (voz && voz.tom) || 1));
    u.rate = Math.max(0.5, Math.min(1.6, ((voz && voz.vel) || 1) * 1.02));
    u.volume = cfg.volume;
    falando = true; ajustarMusica(0.4);
    const fim = () => { falando = false; ajustarMusica(1.2); };
    const limite = setTimeout(() => { fim(); ok(true); }, 1500 + texto.length * 95);
    u.onend = u.onerror = () => { clearTimeout(limite); fim(); ok(true); };
    speechSynthesis.speak(u);
  });
}

// aba no fundo ou tela bloqueada: a música para (volta no próximo toque ou ao reabrir)
export function pausar() { if (faixa) faixa.a.pause(); }
