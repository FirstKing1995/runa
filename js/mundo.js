// RUNA — o mundo 3D em cima do tabuleiro (three.js).
// Unidade do mundo = 1 casa. x = coluna, z = linha, y = altura. O papel fica em y = 0.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

const BASE = 'assets/m/';
const PISO = 0.12;
// Tamanho do mapa da cena atual (muda a cada cena) e do tabuleiro impresso (fixo).
let COLS = 12, LINHAS = 8;
const TAB_C = 12, TAB_L = 8;

// ------------------------------------------------------------ catálogo visual
const VIS = {
  guerreiro: { m: 'Knight', ver: ['1H_Sword', 'Badge_Shield'], h: 0.95 },
  barbara: { m: 'Barbarian', ver: ['2H_Axe'], h: 0.95 },
  maga: { m: 'Mage', ver: ['2H_Staff'], h: 0.95 },
  ladina: { m: 'Rogue', ver: ['Knife', 'Knife_Offhand'], h: 0.9 },
  cacadora: { m: 'Rogue_Hooded', ver: ['2H_Crossbow'], h: 0.92 },
  clerigo: { m: 'Mage', ver: ['2H_Staff'], tint: 0xfff2d8, h: 0.95, contorno: 0xffe08a },
  bardo: { m: 'Rogue', ver: ['Knife'], tint: 0xe09080, h: 0.9 },
  paladino: { m: 'Knight', ver: ['2H_Sword'], tint: 0xfff0c0, h: 0.98, contorno: 0xffe08a },
  bjorn: { m: 'Barbarian', ver: ['Mug'], tint: 0xe8d6b8, h: 1.02 },
  alda: { m: 'Mage', ver: ['2H_Staff'], tint: 0xa8a2b4, h: 0.86 },
  ravna: { m: 'Rogue_Hooded', ver: ['Knife'], tint: 0x6c6a78, h: 0.93 },
  edvin: { m: 'Rogue', ver: [], tint: 0xc09a70, h: 0.88 },
  garra: { m: 'Barbarian', ver: ['1H_Axe', '1H_Axe_Offhand'], tint: 0xb06a58, h: 1.06 },
  bandido: { m: 'Rogue', ver: ['Knife'], tint: 0x9a7a5a, h: 0.9 },
  besteiro: { m: 'Rogue_Hooded', ver: ['1H_Crossbow'], tint: 0x8a7050, h: 0.9 },
  lodo: { m: 'Mage', ver: ['1H_Wand'], tint: 0x7f9a52, h: 0.8 },
  liv: { m: 'Rogue', ver: [], tint: 0xf0d2b2, h: 0.62 },
  ossudo: { m: 'Skeleton_Minion', mao: { r: 'Skeleton_Blade' }, h: 0.86 },
  arqueiro: { m: 'Skeleton_Rogue', mao: { r: 'Skeleton_Crossbow' }, h: 0.86 },
  afogado: { m: 'Skeleton_Minion', mao: {}, tint: 0x6aa59a, h: 0.86 },
  cavaleiro: { m: 'Skeleton_Warrior', mao: { r: 'Skeleton_Axe', l: 'Skeleton_Shield_Small_A' }, h: 1.08 },
  vorag: { m: 'Skeleton_Mage', mao: { r: 'Skeleton_Staff' }, h: 1.12, brilho: 0x50ff90 },
  lobo: { m: 'q/Wolf', tint: 0x8a8a96, h: 0.62, proprio: 'Wolf', investe: true },
  // Capítulo II
  hedda: { m: 'Rogue', ver: [], tint: 0xe0b8a0, h: 0.9 },
  gunnar: { m: 'Barbarian', ver: ['Mug'], tint: 0xc0a888, h: 0.92 },
  velho: { m: 'Barbarian', ver: [], tint: 0xb0a8a0, h: 0.88 },
  brokk: { m: 'Barbarian', ver: ['1H_Axe'], tint: 0xc08a60, h: 0.74 },
  mineiro: { m: 'Barbarian', ver: [], tint: 0x9a8f86, h: 0.95 },
  cativo: { m: 'Rogue_Hooded', ver: [], tint: 0x7a3a48, h: 0.9 },
  cultista: { m: 'Rogue_Hooded', ver: ['Knife', 'Knife_Offhand'], tint: 0x8a3242, h: 0.92, contorno: 0xff6a8a },
  cultista_arc: { m: 'Mage', ver: ['1H_Wand'], tint: 0x6a4a7a, h: 0.92, contorno: 0xc080ff },
  corvina: { m: 'Mage', ver: ['2H_Staff'], tint: 0x55306a, h: 1.0, contorno: 0xc070ff },
  aranha: { m: 'q/Spider', tint: 0x6a6070, h: 0.42, proprio: 'Spider', investe: true },
  aranha_mae: { m: 'q/Spider', tint: 0x9a5a6a, h: 0.78, proprio: 'Spider', investe: true, contorno: 0xff6a8a },
  rato: { m: 'q/Rat', tint: 0x9a8a80, h: 0.34, proprio: 'Rat', investe: true },
  troll: { m: 'q/Big_arm', tint: 0x9ab09a, h: 1.3, proprio: 'Big_arm' },
  golem: { m: 'q/Big_arm', tint: 0x8a8580, h: 1.25, proprio: 'Big_arm', contorno: 0x6ad8ff },
  espectro: { m: 'Skeleton_Rogue', mao: { r: 'Skeleton_Blade' }, tint: 0x9ac4ff, h: 0.9, brilho: 0x80c8ff, fantasma: true },
  rei_corvo: { m: 'Skeleton_Mage', mao: { r: 'Skeleton_Staff' }, tint: 0x6a6a8a, h: 1.35, brilho: 0x6ab8ff, contorno: 0x6ab8ff }
};
// Animais e criaturas Quaternius trazem as próprias animações.
const CLIP_PROPRIO = {
  Wolf: { idle: 'Idle', andar: 'Walk', correr: 'Gallop', ataque: 'Attack', dano: 'Idle_HitReact_Left', morte: 'Death' },
  Spider: { idle: 'Spider_Idle', andar: 'Spider_Walk', correr: 'Spider_Walk', ataque: 'Spider_Attack', dano: 'Spider_Jump', morte: 'Spider_Death' },
  Rat: { idle: 'Rat_Idle', andar: 'Rat_Walk', correr: 'Rat_Run', ataque: 'Rat_Attack', dano: 'Rat_Idle', morte: 'Rat_Death' },
  Big_arm: { idle: 'Idle', andar: 'Walk', correr: 'Run', ataque: 'Punch', dano: 'HitReact', morte: 'Death', provocar: 'No', festa: 'Jump_Land' }
};
// Peças de cenário agrupadas num arquivo só (texturas baixadas uma vez).
const PACOTES = { nat: 'q/natureza', vila: 'q/vila', mas: 'q/masmorra' };

// Luz de contorno: brilho suave nas bordas do personagem, destaca do cenário.
function contorno(mat, cor, forca) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.corContorno = { value: new THREE.Color(cor) };
    sh.uniforms.forcaContorno = { value: forca };
    sh.fragmentShader = ['uniform vec3 corContorno;', 'uniform float forcaContorno;', ''].join(String.fromCharCode(10)) +
      sh.fragmentShader.replace('#include <emissivemap_fragment>', [
        '#include <emissivemap_fragment>',
        'float fr = pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 2.6);',
        'totalEmissiveRadiance += corContorno * fr * forcaContorno;'
      ].join(String.fromCharCode(10)));
  };
  mat.customProgramCacheKey = () => 'contorno';
}
const OPCIONAIS = new Set(['1H_Axe_Offhand', 'Barbarian_Round_Shield', '1H_Axe', '2H_Axe', 'Mug', '1H_Sword_Offhand', 'Badge_Shield',
  'Rectangle_Shield', 'Round_Shield', 'Spike_Shield', '1H_Sword', '2H_Sword', 'Spellbook', 'Spellbook_open', '1H_Wand', '2H_Staff',
  'Knife_Offhand', '1H_Crossbow', '2H_Crossbow', 'Knife', 'Throwable']);
const CLIP = {
  idle: ['Idle'], andar: ['Walking_A'], correr: ['Running_A'], golpe: ['1H_Melee_Attack_Chop'], golpe2: ['2H_Melee_Attack_Chop'],
  facas: ['Dualwield_Melee_Attack_Stab'], besta: ['2H_Ranged_Shoot', '1H_Ranged_Shoot'], arremesso: ['1H_Melee_Attack_Slice_Diagonal'],
  magia: ['Spellcast_Shoot'], erguer: ['Spellcast_Raise'], invocar: ['Spellcast_Summon', 'Spellcast_Raise'], dano: ['Hit_A'],
  morte: ['Death_A'], morto: ['Death_A'], festa: ['Cheer'], interagir: ['Interact'], bloquear: ['Block'], usar: ['Use_Item'],
  sentar: ['Sit_Chair_Idle'], provocar: ['Taunt', 'Cheer'], mordida: ['1H_Melee_Attack_Chop'], garra: ['Unarmed_Melee_Attack_Punch_A', '1H_Melee_Attack_Chop'],
  despertar: ['Skeletons_Awaken_Floor']
};

const TEMAS = {
  taverna: { piso: 'madeira', lado: 'pedra', fundo: 0x140d09, nevoa: [0x1a110b, 9, 26], ceu: 0xffd2a0, chao: 0x2a1a10, amb: 0.55, sol: [0xffc890, 0.9], part: 'brasas', parede: 'pedra' },
  floresta: { piso: 'neve', lado: 'terra', fundo: 0x0b1220, nevoa: [0x0e1726, 8, 24], ceu: 0x9fb8ff, chao: 0x1c2430, amb: 0.6, sol: [0xbcd0ff, 1.3], part: 'neve' },
  pantano: { piso: 'lama', lado: 'terra', fundo: 0x0c120c, nevoa: [0x18241a, 6, 22], ceu: 0xb9d6a0, chao: 0x1a2416, amb: 0.55, sol: [0xd8e8a8, 1.0], part: 'vagalumes' },
  cripta: { piso: 'lajota', lado: 'pedra', fundo: 0x07090b, nevoa: [0x0a0e10, 7, 22], ceu: 0x8fa8b0, chao: 0x101418, amb: 0.4, sol: [0x9fd8c8, 0.55], part: 'poeira', parede: 'pedra' },
  salao: { piso: 'antiga', lado: 'pedra', fundo: 0x090b14, nevoa: [0x10141f, 8, 26], ceu: 0xaab8ff, chao: 0x141824, amb: 0.5, sol: [0xc8d4ff, 1.1], part: 'neve' },
  // Capítulo II
  vila: { piso: 'neve', lado: 'terra', fundo: 0x0d1322, nevoa: [0x121a2a, 9, 26], ceu: 0xa8c0ff, chao: 0x20242c, amb: 0.6, sol: [0xc8d8ff, 1.15], part: 'neve', contra: 0xffa860, forcaContra: 0.7 },
  mina: { piso: 'terra', lado: 'pedra', fundo: 0x0a0806, nevoa: [0x0e0b08, 6, 20], ceu: 0xffc890, chao: 0x1a120a, amb: 0.42, sol: [0xffb070, 0.6], part: 'poeira', contra: 0x6a8aff, forcaContra: 0.6 },
  lago: { piso: 'rocha', lado: 'pedra', fundo: 0x040910, nevoa: [0x07111c, 6, 22], ceu: 0x80c8ff, chao: 0x0a1420, amb: 0.45, sol: [0x8ac8ff, 0.7], part: 'vagalumes', contra: 0x40b0ff, forcaContra: 1.1, corPart: 0x7ad8ff },
  forja: { piso: 'antiga', lado: 'pedra', fundo: 0x0e0905, nevoa: [0x140c06, 8, 24], ceu: 0xffc080, chao: 0x20140a, amb: 0.45, sol: [0xffa860, 0.8], part: 'brasas', parede: 'pedra', contra: 0x8ab0ff, forcaContra: 0.7 },
  ninho: { piso: 'rocha', lado: 'pedra', fundo: 0x0a060c, nevoa: [0x100a14, 7, 22], ceu: 0xd0b8ff, chao: 0x1c1224, amb: 0.6, sol: [0xc8b0ff, 0.85], part: 'poeira', contra: 0xff6aa0, forcaContra: 0.8 },
  trono: { piso: 'antiga', lado: 'pedra', fundo: 0x060a10, nevoa: [0x0a1018, 8, 26], ceu: 0x90ffc0, chao: 0x0c1418, amb: 0.42, sol: [0xa0c8ff, 0.95], part: 'poeira', contra: 0x60ffa0, forcaContra: 1.0 }
};

// ------------------------------------------------------------ texturas
function rng(seed) { let s = seed | 0 || 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; }
function canvasTex(w, h, desenha, repetir) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  desenha(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repetir) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  return t;
}
function ruido(ctx, w, h, r, cores, n, tam) {
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = cores[Math.floor(r() * cores.length)];
    ctx.globalAlpha = 0.15 + r() * 0.35;
    const s = tam * (0.3 + r());
    ctx.fillRect(r() * w, r() * h, s, s * (0.5 + r()));
  }
  ctx.globalAlpha = 1;
}
const PISOS = {
  madeira(ctx, w, h, r) {
    const tons = ['#6b4528', '#5c3a21', '#7a5030', '#4f321d'];
    const n = 4;
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = tons[Math.floor(r() * tons.length)];
      ctx.fillRect(0, i * h / n, w, h / n);
      ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 3;
      ctx.strokeRect(0, i * h / n, w, h / n);
      for (let k = 0; k < 14; k++) {
        ctx.strokeStyle = 'rgba(30,15,5,' + (0.08 + r() * 0.15) + ')'; ctx.lineWidth = 1;
        ctx.beginPath(); const yy = i * h / n + r() * h / n; ctx.moveTo(0, yy); ctx.bezierCurveTo(w * 0.3, yy + 4 * (r() - 0.5), w * 0.6, yy - 4 * (r() - 0.5), w, yy); ctx.stroke();
      }
      ctx.fillStyle = 'rgba(20,10,4,.7)';
      ctx.beginPath(); ctx.arc(w * (0.15 + r() * 0.7), i * h / n + h / n / 2, 2, 0, 7); ctx.fill();
    }
  },
  neve(ctx, w, h, r) {
    ctx.fillStyle = '#dfe8f2'; ctx.fillRect(0, 0, w, h);
    ruido(ctx, w, h, r, ['#c4d2e2', '#f6faff', '#b8c6d8'], 220, 14);
    ruido(ctx, w, h, r, ['#6f6458', '#857a6c'], 12, 10);
  },
  lama(ctx, w, h, r) {
    ctx.fillStyle = '#3c3a24'; ctx.fillRect(0, 0, w, h);
    ruido(ctx, w, h, r, ['#2e2c1a', '#4a4a2c', '#556b2f', '#2a3a1e'], 260, 16);
  },
  lajota(ctx, w, h, r) {
    ctx.fillStyle = '#4d5256'; ctx.fillRect(0, 0, w, h);
    const q = 2;
    for (let i = 0; i < q; i++) for (let j = 0; j < q; j++) {
      const v = 70 + Math.floor(r() * 25);
      ctx.fillStyle = `rgb(${v},${v + 3},${v + 6})`;
      ctx.fillRect(i * w / q + 3, j * h / q + 3, w / q - 6, h / q - 6);
    }
    ruido(ctx, w, h, r, ['#3a3e42', '#6a7074', '#2f4a3a'], 160, 8);
    musgo(ctx, w, h, r, 0.7);
  },
  terra(ctx, w, h, r) {
    ctx.fillStyle = '#4a3622'; ctx.fillRect(0, 0, w, h);
    ruido(ctx, w, h, r, ['#3a2a1a', '#5a4430', '#6b5a48', '#2e2014'], 240, 14);
    ruido(ctx, w, h, r, ['#8a7a68', '#5e5e62'], 30, 6);
  },
  rocha(ctx, w, h, r) {
    ctx.fillStyle = '#2e3440'; ctx.fillRect(0, 0, w, h);
    for (let k = 0; k < 5; k++) {
      const v = 44 + Math.floor(r() * 26);
      ctx.fillStyle = `rgb(${v},${v + 4},${v + 14})`;
      ctx.beginPath(); ctx.ellipse(r() * w, r() * h, 26 + r() * 30, 18 + r() * 24, r() * 3, 0, 7); ctx.fill();
    }
    ruido(ctx, w, h, r, ['#232832', '#4a5466', '#3a4a5a'], 140, 10);
    musgo(ctx, w, h, r, 0.5);
  },
  antiga(ctx, w, h, r) {
    ctx.fillStyle = '#3e4048'; ctx.fillRect(0, 0, w, h);
    for (let k = 0; k < 7; k++) {
      const v = 58 + Math.floor(r() * 30);
      ctx.fillStyle = `rgb(${v},${v},${v + 8})`;
      ctx.beginPath(); ctx.ellipse(r() * w, r() * h, 20 + r() * 30, 16 + r() * 24, r() * 3, 0, 7); ctx.fill();
    }
    ruido(ctx, w, h, r, ['#2d4a2a', '#3b5a32', '#25262c'], 120, 10);
    musgo(ctx, w, h, r, 0.8);
  }
};
// manchas de musgo nas bordas das lajotas (como nas masmorras pintadas à mão)
function musgo(ctx, w, h, r, forca) {
  const n = Math.floor(3 + r() * 5 * forca);
  for (let i = 0; i < n; i++) {
    const x = r() < 0.5 ? r() * w * 0.25 : w - r() * w * 0.25, y = r() * h;
    const g = ctx.createRadialGradient(x, y, 0, x, y, 10 + r() * 18);
    g.addColorStop(0, 'rgba(88,130,52,' + (0.55 * forca) + ')'); g.addColorStop(1, 'rgba(60,96,40,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  }
}
const LADOS = {
  pedra(ctx, w, h, r) { ctx.fillStyle = '#3b3632'; ctx.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 16) for (let x = (y / 16) % 2 * 12; x < w; x += 24) { const v = 50 + Math.floor(r() * 30); ctx.fillStyle = `rgb(${v},${v - 4},${v - 8})`; ctx.fillRect(x + 1, y + 1, 22, 14); } },
  terra(ctx, w, h, r) { const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#4a3624'); g.addColorStop(1, '#22160c'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); ruido(ctx, w, h, r, ['#5e4630', '#2c1e12', '#6b6b6b'], 140, 8); }
};

// ------------------------------------------------------------ util 3D
function textoSprite(texto, cor, tam = 64, borda = '#000') {
  const c = document.createElement('canvas');
  const ctx = c.getContext('2d');
  ctx.font = `700 ${tam}px Cinzel, Georgia, serif`;
  const w = Math.ceil(ctx.measureText(texto).width) + 24;
  c.width = w; c.height = tam + 24;
  ctx.font = `700 ${tam}px Cinzel, Georgia, serif`;
  ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
  ctx.lineWidth = tam / 7; ctx.strokeStyle = borda; ctx.strokeText(texto, w / 2, c.height / 2);
  ctx.fillStyle = cor; ctx.fillText(texto, w / 2, c.height / 2);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false }));
  s.renderOrder = 20;
  const k = 0.0045;
  s.scale.set(w * k, c.height * k, 1);
  return s;
}
let texPonto = null;
function pontoTex() {
  if (texPonto) return texPonto;
  texPonto = canvasTex(64, 64, (ctx) => {
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,.6)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
  });
  return texPonto;
}
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const facil = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

// ================================================================ Mundo
export class Mundo {
  constructor(canvas) {
    this.canvas = canvas;
    this.celular = matchMedia('(pointer: coarse)').matches || /Android|iPhone|iPad/i.test(navigator.userAgent);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    // resolução: começa moderada no celular e se ajusta ao desempenho (ver _ajustarResolucao)
    this.prMax = Math.min(window.devicePixelRatio || 1, this.celular ? 1.5 : 1.75);
    this.pr = this.prMax;
    this.desemp = { soma: 0, n: 0, bons: 0, teto: this.prMax };
    this.renderer.setPixelRatio(this.pr);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.cena = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.05, 200);
    this.raiz = new THREE.Group(); // recebe a pose do tabuleiro em AR
    this.raiz.matrixAutoUpdate = false;
    this.mundo = new THREE.Group(); // sistema de casas
    this.raiz.add(this.mundo);
    this.cena.add(this.raiz);
    this.camadaCena = new THREE.Group(); // piso, props e luzes da cena atual
    this.mundo.add(this.camadaCena);
    this.camadaUn = new THREE.Group();
    this.mundo.add(this.camadaUn);
    this.camadaFx = new THREE.Group();
    this.mundo.add(this.camadaFx);
    this.loader = new GLTFLoader();
    this.cache = new Map();
    this.clipes = { kay: [], esq: [] };
    this.un = new Map(); // id -> visual
    this.info = {};
    this.relogio = new THREE.Clock();
    this.anim = [];
    this.particulas = null;
    this.luzesTremulas = [];
    this.agua = [];
    this.destaques = [];
    this.modo = 'mesa';
    this.cenaId = null;
    this.tremer = 0;
    this.tpose = { p: new THREE.Vector3(), q: new THREE.Quaternion(), ok: false };
    // Luzes pontuais: um número fixo, sempre na cena. Mudar a quantidade de luzes obriga o
    // navegador a recompilar todos os materiais (era o travão a cada magia e troca de cena).
    this.poolLuz = [];
    for (let i = 0; i < (this.celular ? 7 : 10); i++) {
      const l = new THREE.PointLight(0xffffff, 0, 4.5, 1.6);
      l.userData = { usada: false, base: 0, segue: null };
      this.mundo.add(l);
      this.poolLuz.push(l);
    }
    this.luzProj = new THREE.PointLight(0xffffff, 0, 2.5, 1.5);
    this.mundo.add(this.luzProj);
    this._montarDestaques();
    this._montarControles();
    this.redimensionar();
    this.enquadrar();
    window.addEventListener('resize', () => this.redimensionar());
    this.renderer.setAnimationLoop(() => this._quadro());
  }

  // ----------------------------------------------------------- carga
  carregar(nome) {
    if (!this.cache.has(nome)) {
      const url = (nome.includes('/') ? 'assets/' : BASE) + nome + '.glb';
      this.cache.set(nome, new Promise((ok, erro) => this.loader.load(url, ok, undefined, erro)));
    }
    return this.cache.get(nome);
  }
  async preparar(progresso) {
    const base = ['Knight', 'Skeleton_Minion'];
    let n = 0;
    const tudo = await Promise.all(base.map((b) => this.carregar(b).then((g) => { n++; if (progresso) progresso(n / base.length); return g; })));
    this.clipes.kay = tudo[0].animations;
    this.clipes.esq = tudo[1].animations;
    // aquece os modelos mais comuns em segundo plano
    ['Barbarian', 'Mage', 'Rogue', 'Rogue_Hooded', 'Skeleton_Blade'].forEach((m) => this.carregar(m).catch(() => {}));
  }

  // ----------------------------------------------------------- câmera/modos
  _montarControles() {
    this.controles = new OrbitControls(this.camera, this.canvas);
    this.controles.target.set(4, 0.2, 3);
    this.controles.enableDamping = true;
    this.controles.maxPolarAngle = Math.PI * 0.46;
    this.controles.minDistance = 4;
    this.controles.maxDistance = 18;
    this.controles.enablePan = true;
    this.camera.position.set(4, 7.2, 11);
    this.controles.update();
  }
  definirModo(modo) {
    this.modo = modo;
    const ar = modo === 'ar';
    this.controles.enabled = !ar;
    if (ar) {
      this.camera.position.set(0, 0, 0);
      this.camera.quaternion.identity();
      this.cena.background = null;
      this.cena.fog = null;
      this.raiz.visible = false;
      if (this.saia) this.saia.visible = false;
      if (this.mesa) this.mesa.visible = false;
    } else {
      this.raiz.matrix.identity();
      this.raiz.matrixWorldNeedsUpdate = true;
      this.renderer.clippingPlanes = [];
      this.raiz.visible = true;
      this.camera.fov = 45;
      this.redimensionar();
      this.enquadrar();
      this._aplicarFundo();
      if (this.saia) this.saia.visible = true;
      if (this.mesa) this.mesa.visible = true;
    }
  }
  // Distância da câmera conforme a tela: celular em pé precisa de mais recuo.
  enquadrar() {
    const a = (this.W || 1) / (this.H || 1);
    const d = (a < 0.6 ? 2.05 : a < 0.85 ? 1.7 : a < 1.2 ? 1.3 : 1) * 0.85;
    this.controles.target.set(COLS / 2, 0.2, LINHAS / 2);
    this.camera.position.set(COLS / 2, 6.6 * d, LINHAS / 2 + 7.6 * d);
    this.controles.maxDistance = 18 * d;
    this.controles.update();
  }
  redimensionar() {
    const w = this.canvas.clientWidth || window.innerWidth, h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.W = w; this.H = h;
  }

  // po = { R (linhas), t } do tabuleiro na câmera (OpenCV). f em px do vídeo.
  aplicarPose(po, f, vw, vh) {
    if (!po) return;
    const s = Math.max(this.W / vw, this.H / vh);
    const fy = f * s;
    const fov = 2 * Math.atan(this.H / (2 * fy)) * 180 / Math.PI;
    if (Math.abs(this.camera.fov - fov) > 0.05) { this.camera.fov = fov; this.camera.updateProjectionMatrix(); }
    const R = po.R, t = po.t;
    // C * [R|t], com C = diag(1,-1,-1): passa do sistema OpenCV para o do three.js
    const m = new THREE.Matrix4().set(
      R[0], R[1], R[2], t[0],
      -R[3], -R[4], -R[5], -t[1],
      -R[6], -R[7], -R[8], -t[2],
      0, 0, 0, 1);
    // casas (x, y para cima, z = linha) -> tabuleiro (X, Y para baixo, Z para dentro do papel)
    const base = new THREE.Matrix4().makeBasis(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 1, 0));
    m.multiply(base);
    const p = new THREE.Vector3(), q = new THREE.Quaternion(), e = new THREE.Vector3();
    m.decompose(p, q, e);
    const tp = this.tpose;
    if (!tp.ok || tp.p.distanceTo(p) > 2.5) { tp.p.copy(p); tp.q.copy(q); tp.ok = true; }
    else {
      const k = Math.min(1, 0.35 + tp.p.distanceTo(p) * 0.4);
      tp.p.lerp(p, k); tp.q.slerp(q, k);
    }
    this.raiz.matrix.compose(tp.p, tp.q, new THREE.Vector3(1, 1, 1));
    this.raiz.matrixWorldNeedsUpdate = true;
    this.raiz.visible = true;
  }
  // Em AR, o papel (12 x 8) mostra um pedaço do mapa da cena, centrado no herói do jogador.
  _janelaQuadro(dt) {
    if (this.modo !== 'ar') {
      this.mundo.position.set(0, 0, 0);
      this.renderer.clippingPlanes = [];
      return;
    }
    const v = this.alvoSeguir && this.un.get(this.alvoSeguir);
    const maxX = Math.max(0, COLS - TAB_C), maxZ = Math.max(0, LINHAS - TAB_L);
    let ax = maxX / 2, az = maxZ / 2;
    if (v) {
      ax = Math.min(maxX, Math.max(0, v.raiz.position.x - TAB_C / 2));
      az = Math.min(maxZ, Math.max(0, v.raiz.position.z - TAB_L / 2));
    }
    if (!this.janela) this.janela = { x: ax, z: az };
    const k = Math.min(1, dt * 2.5);
    this.janela.x += (ax - this.janela.x) * k;
    this.janela.z += (az - this.janela.z) * k;
    // mapas menores que o papel ficam centralizados nele
    const cx = COLS < TAB_C ? -(TAB_C - COLS) / 2 : this.janela.x;
    const cz = LINHAS < TAB_L ? -(TAB_L - LINHAS) / 2 : this.janela.z;
    this.mundo.position.set(-cx, 0, -cz);
    // recorte: só aparece o que está em cima da folha
    if (!this.planos) this.planos = [new THREE.Plane(), new THREE.Plane(), new THREE.Plane(), new THREE.Plane()];
    this.raiz.updateMatrixWorld();
    const m = this.raiz.matrixWorld, mg = 0.04;
    const def = [[1, 0, 0, mg], [-1, 0, 0, TAB_C + mg], [0, 0, 1, mg], [0, 0, -1, TAB_L + mg]];
    def.forEach((d, i) => { this.planos[i].set(new THREE.Vector3(d[0], d[1], d[2]), d[3]).applyMatrix4(m); });
    this.renderer.clippingPlanes = this.raiz.visible ? this.planos : [];
  }
  esconderAR() { this.raiz.visible = false; this.tpose.ok = false; }

  _aplicarFundo() {
    const t = this.tema;
    if (!t || this.modo === 'ar') return;
    this.cena.background = new THREE.Color(t.fundo);
    const extra = Math.max(0, Math.max(COLS - 8, LINHAS - 6));
    this.cena.fog = new THREE.Fog(t.nevoa[0], t.nevoa[1] + extra, t.nevoa[2] + extra * 1.5);
  }

  // ----------------------------------------------------------- montagem da cena
  async montarCena(c, estado) {
    if (this.cenaId === c.id) return;
    this.cenaId = c.id;
    this.cenaDados = c;
    COLS = c.mapa[0].length; LINHAS = c.mapa.length;
    this._montarDestaques();
    this.janela = null;
    for (const v of this.un.values()) this.camadaUn.remove(v.raiz);
    this.un.clear();
    this.camadaCena.clear();
    this.luzesTremulas = [];
    for (const l of this.poolLuz) { l.intensity = 0; l.userData.usada = false; l.userData.segue = null; }
    this.fogueiras = [];
    this.agua = [];
    this.tema = TEMAS[c.tema] || TEMAS.taverna;
    const t = this.tema;
    this._aplicarFundo();

    // luzes
    const hemi = new THREE.HemisphereLight(t.ceu, t.chao, t.amb);
    this.camadaCena.add(hemi);
    const sol = new THREE.DirectionalLight(t.sol[0], t.sol[1]);
    // a sombra cobre o mapa inteiro, qualquer que seja o tamanho da cena
    const meio = Math.max(COLS, LINHAS) / 2 + 1.5;
    sol.position.set(COLS / 2 - 6, 9, LINHAS / 2 + 1);
    sol.target.position.set(COLS / 2, 0, LINHAS / 2);
    sol.castShadow = true;
    sol.shadow.mapSize.set(1024, 1024);
    Object.assign(sol.shadow.camera, { left: -meio, right: meio, top: meio, bottom: -meio, near: 1, far: 30 });
    sol.shadow.bias = -0.0015;
    this.camadaCena.add(sol, sol.target);
    // contraluz frio: recorta os personagens do fundo
    const contra = new THREE.DirectionalLight(t.contra || 0x8fb4ff, t.forcaContra || 0.9);
    contra.position.set(7, 5, -5);
    contra.target.position.set(4, 0, 3);
    this.camadaCena.add(contra, contra.target);

    // base da maquete
    const r = rng(c.id.length * 977 + 13);
    this._montando = true;
    this.carregandoCena = true;
    this._pedidosLuz = [];
    const texL = canvasTex(256, 64, (ctx, w, h) => LADOS[t.lado](ctx, w, h, r), true);
    texL.repeat.set(4, 1);
    const matLado = new THREE.MeshStandardMaterial({ map: texL, roughness: 0.95 });
    const slab = new THREE.Mesh(new THREE.BoxGeometry(COLS + 0.12, PISO, LINHAS + 0.12), [matLado, matLado, new THREE.MeshStandardMaterial({ color: 0x222222 }), matLado, matLado, matLado]);
    slab.position.set(COLS / 2, PISO / 2 - 0.001, LINHAS / 2);
    slab.receiveShadow = true;
    this.camadaCena.add(slab);
    // saia de terra e mesa de madeira só no modo mesa 3D
    this.saia = new THREE.Mesh(new THREE.CylinderGeometry(5.6, 3.2, 1.4, 9, 1), new THREE.MeshStandardMaterial({ map: texL, roughness: 1, flatShading: true }));
    this.saia.position.set(COLS / 2, -0.7, LINHAS / 2);
    this.saia.scale.set(COLS / 8, 1, LINHAS / 6 * 0.82);
    this.saia.visible = this.modo !== 'ar';
    this.camadaCena.add(this.saia);
    this.mesa = new THREE.Group();
    this.mesa.visible = this.modo !== 'ar';
    this.camadaCena.add(this.mesa);

    // piso: 4 variações de textura
    const mats = [];
    for (let i = 0; i < 4; i++) {
      const rr = rng(c.id.length * 31 + i * 101 + 7);
      mats.push(new THREE.MeshStandardMaterial({ map: canvasTex(128, 128, (ctx, w, h) => PISOS[t.piso](ctx, w, h, rr)), roughness: 0.9 }));
    }
    const geoPiso = new THREE.BoxGeometry(0.98, 0.04, 0.98);
    for (let y = 0; y < LINHAS; y++) for (let x = 0; x < COLS; x++) {
      const ch = c.mapa[y][x];
      if (ch === '~') { this._agua(x, y); continue; }
      const m = new THREE.Mesh(geoPiso, mats[Math.floor(r() * 4)]);
      m.position.set(x + 0.5, PISO + 0.02 * (r() - 0.5) * 0.5, y + 0.5);
      m.receiveShadow = true; m.userData.estatico = true;
      this.camadaCena.add(m);
    }


    // props do mapa
    const tarefas = [];
    for (let y = 0; y < LINHAS; y++) for (let x = 0; x < COLS; x++) {
      const ch = c.mapa[y][x];
      if (ch === '#') tarefas.push(this._parede(c, x, y));
      const l = (c.legenda || {})[ch];
      if (l && l.m) {
        let nome = l.m;
        if (l.var) nome = l.var[Math.floor(r() * l.var.length)];
        tarefas.push(this._prop(nome, x + 0.5 + (l.dx || 0), y + 0.5 + (l.dz || 0), l.s || 1, (l.r || 0) + (l.var ? Math.floor(r() * 4) * 90 : 0), true));
      }
      if (l && l.trilho) this._trilho(x, y, c.mapa);
      if (l && l.cristal) this._cristais(x + 0.5, y + 0.5, 1, r);
    }
    this._entorno(c, r, tarefas);
    this._enfeites(c, r, tarefas);
    // mapas grandes: luzes espalhadas para nenhum canto ficar no escuro
    const LUZ_TEMA = { taverna: 0xffa860, cripta: 0x7dffc0, forja: 0xff9a50, ninho: 0xc890ff, mina: 0xffa860, salao: 0x80ffb0, trono: 0x80ffb0, lago: 0x5ac8ff };
    if (LUZ_TEMA[c.tema] && (COLS > 8 || LINHAS > 6)) {
      for (let lz = 2.5; lz < LINHAS; lz += 4.5) for (let lx = 3; lx < COLS; lx += 6) {
        if (lx < 8 && lz < 6) continue; // o canto original já tem luz
        this._luz(lx, 1.1, lz, LUZ_TEMA[c.tema], 0.9);
      }
    }
    this._particulas(t.part);
    // anel de saída
    this.anelSaida = this._anelSaida();
    this.camadaCena.add(this.anelSaida);
    this.anelSaida.visible = false;
    this.armadilhasVis = new Map();
    await Promise.all(tarefas.map((p) => p.catch((e) => console.warn('prop', e))));
    this._montando = false;
    this._distribuirLuzes();
    this._instanciar();
    // compila os shaders agora, na tela de carga, e não no meio da jogada
    try { await this.renderer.compileAsync(this.cena, this.camera); } catch (e) { /* navegador antigo: compila ao desenhar */ }
    this.carregandoCena = false;
  }

  // Cenário parado: peças iguais (mesma malha e material) viram um desenho só (InstancedMesh).
  // Uma cena grande tinha 400+ desenhos por quadro; assim cai para algumas dezenas.
  _instanciar() {
    const raizC = this.camadaCena;
    raizC.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(raizC.matrixWorld).invert();
    const grupos = new Map();
    for (const filho of raizC.children) {
      if (!filho.userData.estatico) continue;
      filho.traverse((m) => {
        if (!m.isMesh || m.isSkinnedMesh || m.isInstancedMesh || Array.isArray(m.material) || m.morphTargetInfluences) return;
        const k = m.geometry.uuid + '|' + m.material.uuid + '|' + (m.castShadow ? 1 : 0);
        if (!grupos.has(k)) grupos.set(k, []);
        grupos.get(k).push(m);
      });
    }
    const mt = new THREE.Matrix4();
    for (const lista of grupos.values()) {
      if (lista.length < 3) continue;
      const a = lista[0];
      const im = new THREE.InstancedMesh(a.geometry, a.material, lista.length);
      lista.forEach((m, i) => { im.setMatrixAt(i, mt.multiplyMatrices(inv, m.matrixWorld)); m.parent.remove(m); });
      im.castShadow = a.castShadow; im.receiveShadow = a.receiveShadow;
      im.instanceMatrix.needsUpdate = true;
      im.computeBoundingSphere();
      raizC.add(im);
    }
  }

  _agua(x, y) {
    const geo = new THREE.PlaneGeometry(1, 1, 6, 6);
    const mat = new THREE.MeshStandardMaterial({ color: 0x1f3a34, roughness: 0.15, metalness: 0.3, transparent: true, opacity: 0.88, emissive: 0x0a1a14 });
    const m = new THREE.Mesh(geo, mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x + 0.5, PISO - 0.03, y + 0.5);
    m.receiveShadow = true;
    this.camadaCena.add(m);
    this.agua.push(m);
    if (Math.random() < 0.5) this._prop(Math.random() < 0.5 ? 'waterlily_A' : 'waterplant_B', x + 0.3 + Math.random() * 0.4, y + 0.3 + Math.random() * 0.4, 0.35, Math.random() * 360, false).catch(() => {});
  }

  async _parede(c, x, y) {
    const mp = c.mapa;
    const eh = (xx, yy) => mp[yy] && mp[yy][xx] === '#';
    const horiz = eh(x - 1, y) || eh(x + 1, y);
    const vert = eh(x, y - 1) || eh(x, y + 1);
    if (this.tema.parede || c.tema === 'cripta' || c.tema === 'salao') {
      const g = await this._prop(Math.random() < 0.2 ? 'wall_broken' : 'wall', x + 0.5, y + 0.5, 1.02, horiz || !vert ? 0 : 90, true);
      if (g && !horiz && !vert) { const g2 = await this._prop('wall', x + 0.5, y + 0.5, 1.02, 90, true); return g2; }
      return g;
    }
    return this._prop('nat:Rock_Medium_' + (1 + ((x * 7 + y * 3) % 3)), x + 0.5, y + 0.5, 0.95, (x * 37 + y * 53) % 360, true);
  }

  // Coloca um modelo encaixado em s casas, com a base no piso.
  async _prop(nome, x, z, s, rotGraus, sombra, pai) {
    if (nome === '@fogueira') return this._fogueira(x, z);
    let o;
    if (nome.includes(':')) {
      const [pac, item] = nome.split(':');
      const g = await this.carregar(PACOTES[pac]);
      const n = g.scene.getObjectByName(item);
      if (!n) throw new Error('peça ' + nome);
      o = n.clone(true); o.position.set(0, 0, 0);
    } else o = (await this.carregar(nome)).scene.clone(true);
    o.updateMatrixWorld(true);
    const caixa = new THREE.Box3().setFromObject(o);
    const tam = caixa.getSize(new THREE.Vector3());
    const k = s / Math.max(tam.x, tam.z, 0.0001);
    o.scale.setScalar(k);
    const grupo = new THREE.Group();
    o.position.set(-(caixa.min.x + tam.x / 2) * k, -caixa.min.y * k, -(caixa.min.z + tam.z / 2) * k);
    grupo.add(o);
    grupo.position.set(x, PISO, z);
    grupo.rotation.y = (rotGraus || 0) * Math.PI / 180;
    o.traverse((m) => { if (m.isMesh) { m.castShadow = !!sombra; m.receiveShadow = true; } });
    if (!pai && this._montando) grupo.userData.estatico = true;
    (pai || this.camadaCena).add(grupo);
    return grupo;
  }

  _entorno(c, r, tarefas) {
    // no celular, o que fica em volta do mapa não projeta sombra (economiza a passada de sombra)
    const add = (nome, x, z, s, rot) => tarefas.push(nome === null ? x : this._prop(nome, x, z, s, rot, !this.celular));
    if (['vila', 'mina', 'lago', 'forja', 'ninho', 'trono'].includes(c.tema)) return this._entornoCap2(c, r, add);
    const pinta = (x, z) => x < -0.2 || x > COLS + 0.2 || z < -0.2 || z > LINHAS + 0.2;
    if (c.tema === 'taverna') {
      for (let x = 0; x < COLS; x++) add('wall', x + 0.5, -0.12, 1.02, 0);
      for (let z = 0; z < LINHAS; z++) { add('wall', -0.12, z + 0.5, 1.02, 90); add('wall', COLS + 0.12, z + 0.5, 1.02, 90); }
      add('torch_mounted', 1.5, 0.05, 0.25, 0); add('torch_mounted', 6.5, 0.05, 0.25, 0);
      add('banner_patternA_red', 3.5, 0.02, 0.6, 0);
      add('barrel_small_stack', COLS + 0.6, 0.6, 0.8, 0); add('crates_stacked', -0.7, 5.2, 0.8, 30);
      this._luz(1.5, 0.95, 0.35, 0xff9a40, 1.6); this._luz(6.5, 0.95, 0.35, 0xff9a40, 1.6);
      this._luz(3.2, 0.6, 2.3, 0xffb060, 0.9);
      this.mesa.add(this._tampoMesa(0x3a2414));
    } else if (c.tema === 'floresta' || c.tema === 'pantano') {
      const arv = c.tema === 'floresta' ? ['nat:Pine_1', 'nat:Pine_2', 'nat:Pine_3', 'nat:Pine_4', 'nat:Pine_5'] : ['nat:Dead_Tree_1', 'nat:Dead_Tree_2', 'nat:Dead_Tree_3', 'nat:Twisted_Tree_1'];
      for (let i = 0; i < 26 + COLS * 2; i++) {
        const a = (i / (26 + COLS * 2)) * Math.PI * 2, d = 1 + r() * 0.25;
        const x = COLS / 2 + Math.cos(a) * d * (COLS / 2 + 1.3), z = LINHAS / 2 + Math.sin(a) * d * (LINHAS / 2 + 1.3);
        if (pinta(x, z)) add(arv[Math.floor(r() * arv.length)], x, z, 1.1 + r() * 0.7, r() * 360);
      }
      for (let i = 0; i < 10; i++) { const x = -1 + r() * (COLS + 2), z = r() < 0.5 ? -0.8 - r() : LINHAS + 0.7 + r(); add('nat:Rock_Medium_' + (1 + i % 3), x, z, 0.5 + r() * 0.5, r() * 360); }
      for (let i = 0; i < 18; i++) { const x = -1.2 + r() * (COLS + 2.4), z = r() < 0.5 ? -0.4 - r() * 1.4 : LINHAS + 0.4 + r() * 1.4; tarefas.push(this._prop(['nat:Fern_1', 'nat:Bush_1', 'nat:Grass_Wispy_1', 'nat:Tall_Grass_1', 'nat:Mushroom_1'][i % 5], x, z, 0.35 + r() * 0.3, r() * 360, false)); }
      if (c.tema === 'pantano') { this._luz(3.5, 0.6, 2.3, 0x9dff6a, 0.8); add('lantern_standing', 2.6, 1.6, 0.25, 0); }
      if (c.id === 'acampamento') { add('tent', -1.2, 1.5, 1.4, 70); add('flag_red', COLS + 0.6, 2.5, 0.5, 0); }
      this.mesa.add(this._tampoMesa(0x2a2016));
    } else if (c.tema === 'cripta') {
      for (let x = 0; x < COLS; x++) add('wall', x + 0.5, -0.12, 1.02, 0);
      for (let z = 0; z < LINHAS - 1; z++) { add('wall', -0.12, z + 0.5, 1.02, 90); add('wall', COLS + 0.12, z + 0.5, 1.02, 90); }
      add('coffin_decorated', 2.5, 0.4, 0.9, 90); add('skull_candle', 4.5, 2.5, 0.22, 0);
      add('candle_triple', 0.4, 1.6, 0.3, 0); add('ribcage', 6.6, 4.3, 0.4, 20); add('bone_A', 2.2, 2.7, 0.3, 40);
      add('gravestone', -0.8, 5.3, 0.6, 10); add('gravestone', COLS + 0.8, 5.4, 0.6, -10); add('post_skull', 1.2, LINHAS + 0.6, 0.35, 0);
      add('crypt', COLS / 2, -2.1, 2.4, 0);
      this._luz(0.5, 0.8, 1.6, 0x7dffc0, 1.0); this._luz(6.5, 0.8, 2.6, 0x7dffc0, 1.0); this._luz(3.5, 0.8, 5.0, 0xffa050, 0.8);
      this.mesa.add(this._tampoMesa(0x1c1e22));
    } else if (c.tema === 'salao') {
      for (let i = 0; i < COLS; i++) add(i % 3 ? 'wall_broken' : 'wall', i + 0.5, -0.15, 1.02, 0);
      add('pillar_decorated', -0.5, 0.5, 0.7, 0); add('pillar_decorated', COLS + 0.5, 0.5, 0.7, 0);
      add('gravestone', -0.9, 3.5, 0.6, 15); add('grave_A', COLS + 0.9, 3.3, 0.9, 80); add('tree_dead_large', -1.4, 5.5, 1.6, 0); add('tree_dead_medium', COLS + 1.3, 5.2, 1.3, 40);
      add('building_church_green', COLS / 2, -2.6, 3.2, 0);
      this._luz(3.5, 1.4, 0.5, 0x60ff90, 1.4);
      this.mesa.add(this._tampoMesa(0x161a26));
    }
  }
  // Vegetação e detalhes pequenos nas casas livres (não bloqueiam nada).
  _enfeites(c, r, tarefas) {
    const ocupada = new Set((c.unidades || []).map((u) => u.x + ',' + u.y).concat((c.entrada || []).map((p) => p[0] + ',' + p[1])));
    if (c.saida) ocupada.add(c.saida[0] + ',' + c.saida[1]);
    const kits = {
      floresta: ['nat:Grass_1', 'nat:Grass_Wispy_1', 'nat:Fern_1', 'nat:Clover_1', 'nat:Mushroom_1', 'nat:Pebble_Round_1', 'nat:Flower_Single_1'],
      pantano: ['nat:Tall_Grass_1', 'nat:Grass_Wispy_1', 'nat:Mushroom_Laetiporus_1', 'nat:Fern_1', 'nat:Plant_Big_1'],
      cripta: ['mas:Skull', 'mas:Skull_2', 'mas:Cobweb', 'nat:Pebble_Round_1'],
      salao: ['mas:Skull_3', 'nat:Pebble_Round_1', 'nat:Grass_Wispy_1'],
      mina: ['vila:Mineral', 'nat:Pebble_Round_1', 'vila:Gold_rocks', 'mas:Skull'],
      vila: ['nat:Grass_Wispy_1', 'nat:Flower_Group_1', 'vila:Hay', 'nat:Pebble_Round_1']
    };
    const kit = kits[c.tema];
    if (!kit) return;
    const chance = c.tema === 'floresta' || c.tema === 'pantano' ? 0.45 : 0.18;
    for (let y = 0; y < LINHAS; y++) for (let x = 0; x < COLS; x++) {
      if (c.mapa[y][x] !== '.' || ocupada.has(x + ',' + y) || r() > chance) continue;
      const nome = kit[Math.floor(r() * kit.length)];
      const cantoX = r() < 0.5 ? 0.18 : 0.82, cantoZ = r() < 0.5 ? 0.18 : 0.82;
      const s = /Cobweb/.test(nome) ? 0.4 : /Skull|Pebble|Mineral|Gold/.test(nome) ? 0.16 : 0.26 + r() * 0.12;
      tarefas.push(this._prop(nome, x + cantoX, y + cantoZ, s, r() * 360, false));
    }
  }
  // trilhos de mina: dois ferros e dormentes; seguem a linha dos vizinhos
  _trilho(x, y, mapa) {
    const g = new THREE.Group();
    // peças compartilhadas entre todos os trilhos (viram um desenho só em _instanciar)
    const T = this._trilhoKit || (this._trilhoKit = {
      ferro: new THREE.MeshStandardMaterial({ color: 0x8a8278, metalness: 0.5, roughness: 0.45 }),
      madeira: new THREE.MeshStandardMaterial({ color: 0x5a4028, roughness: 1 }),
      dormente: new THREE.BoxGeometry(0.12, 0.03, 0.7),
      barra: new THREE.BoxGeometry(1, 0.04, 0.035)
    });
    const vert = (mapa[y - 1] && mapa[y - 1][x] === 't') || (mapa[y + 1] && mapa[y + 1][x] === 't');
    for (let i = 0; i < 3; i++) { const d = new THREE.Mesh(T.dormente, T.madeira); d.position.set(-0.33 + i * 0.33, 0.015, 0); d.receiveShadow = true; g.add(d); }
    for (const z of [-0.2, 0.2]) { const t = new THREE.Mesh(T.barra, T.ferro); t.position.set(0, 0.05, z); t.castShadow = true; g.add(t); }
    g.position.set(x + 0.5, PISO + 0.035, y + 0.5);
    g.userData.estatico = true;
    if (vert) g.rotation.y = Math.PI / 2;
    this.camadaCena.add(g);
  }
  // cristais que brilham sozinhos (lago subterrâneo)
  _cristais(x, z, tam, r) {
    const g = new THREE.Group();
    const cor = r() < 0.7 ? 0x5ac8ff : 0xa07aff;
    // malha e material compartilhados: os cristais da cena viram um desenho só
    if (!this._cristalGeo) this._cristalGeo = new THREE.ConeGeometry(1, 1, 5);
    this._cristalMat = this._cristalMat || {};
    const mat = this._cristalMat[cor] || (this._cristalMat[cor] = new THREE.MeshStandardMaterial({ color: cor, emissive: cor, emissiveIntensity: 0.9, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.88, flatShading: true }));
    const n = 4 + Math.floor(r() * 4);
    for (let i = 0; i < n; i++) {
      const alt = (0.25 + r() * 0.6) * tam;
      const raio = 0.06 + r() * 0.08;
      const m = new THREE.Mesh(this._cristalGeo, mat);
      m.scale.set(raio, alt, raio);
      m.position.set((r() - 0.5) * 0.5 * tam, alt / 2, (r() - 0.5) * 0.5 * tam);
      m.rotation.set((r() - 0.5) * 0.7, r() * 3, (r() - 0.5) * 0.7);
      m.castShadow = true;
      g.add(m);
    }
    g.position.set(x, PISO, z);
    g.userData.estatico = true;
    this.camadaCena.add(g);
    if (r() < 0.6) this._luz(x, PISO + 0.5, z, cor, 0.6);
    return g;
  }
  _paredes(semFrente) {
    const t = [];
    for (let x = 0; x < COLS; x++) t.push(this._prop('wall', x + 0.5, -0.12, 1.02, 0, true));
    for (let z = 0; z < LINHAS - (semFrente ? 1 : 0); z++) { t.push(this._prop('wall', -0.12, z + 0.5, 1.02, 90, true)); t.push(this._prop('wall', COLS + 0.12, z + 0.5, 1.02, 90, true)); }
    return t;
  }
  _rochedo(r, add) {
    // paredão de rocha em volta da caverna
    const n = 22 + COLS * 2;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, d = 1 + r() * 0.15;
      const x = COLS / 2 + Math.cos(a) * d * (COLS / 2 + 1.1), z = LINHAS / 2 + Math.sin(a) * d * (LINHAS / 2 + 1.1);
      add('nat:Rock_Medium_' + (1 + (i % 3)), x, z, 1.2 + r() * 1.3, r() * 360);
    }
  }
  _entornoCap2(c, r, add) {
    if (c.tema === 'vila') {
      add('vila:Bell_Tower', COLS / 2 + 0.6, -2.2, 2.4, 0);
      add('vila:Fantasy_Inn', -2.2, 3.2, 2.4, 90);
      add('vila:Market_Stand_2', COLS + 1.2, 3.6, 1.0, -90);
      for (let i = 0; i < 18 + COLS * 2; i++) {
        const a = (i / (18 + COLS * 2)) * Math.PI * 2, d = 1.05 + r() * 0.25;
        const x = COLS / 2 + Math.cos(a) * d * (COLS / 2 + 1.4), z = LINHAS / 2 + Math.sin(a) * d * (LINHAS / 2 + 1.4);
        if (z < -1 && Math.abs(x - COLS / 2) < 2) continue;
        add('nat:Pine_' + (1 + (i % 5)), x, z, 1.2 + r() * 0.6, r() * 360);
      }
      this._luz(6.8, 0.8, 0.9, 0xff9a40, 1.6); this._luz(1.2, 1.0, 1.2, 0xffb060, 1.1);
      add('lantern_standing', 3.6, LINHAS + 0.4, 0.3, 0);
      this.mesa.add(this._tampoMesa(0x22252c));
    } else if (c.tema === 'mina') {
      this._rochedo(r, add);
      add('vila:Mine', 1.4, -1.6, 2.2, 0);
      add('vila:Gold_Rocks', COLS + 0.9, 1.2, 0.8, 30); add('vila:Mineral', -0.9, 2.0, 0.5, 0);
      add('torch_mounted', 2.5, 0.05, 0.25, 0); add('torch_mounted', 5.5, 0.05, 0.25, 0);
      this._luz(2.5, 0.9, 0.4, 0xff9a40, 1.4); this._luz(5.5, 0.9, 0.4, 0xff9a40, 1.4); this._luz(4.0, 0.7, 4.2, 0xffa860, 0.8);
      this.mesa.add(this._tampoMesa(0x1a140e));
    } else if (c.tema === 'lago') {
      this._rochedo(r, add);
      for (let i = 0; i < 10 + COLS; i++) {
        const a = (i / (10 + COLS)) * Math.PI * 2, d = 0.95 + r() * 0.1;
        this._cristais(COLS / 2 + Math.cos(a) * d * (COLS / 2 + 0.8), LINHAS / 2 + Math.sin(a) * d * (LINHAS / 2 + 0.8), 1.6 + r() * 1.2, r);
      }
      const lago = new THREE.Mesh(new THREE.CircleGeometry(7.5, 40), new THREE.MeshStandardMaterial({ color: 0x0a2a3a, roughness: 0.1, metalness: 0.4, emissive: 0x041824 }));
      lago.rotation.x = -Math.PI / 2; lago.position.set(COLS / 2, PISO - 0.08, LINHAS / 2); lago.scale.set(COLS / 8, LINHAS / 6 * 0.8, 1);
      this.camadaCena.add(lago); this.agua.push(lago);
      this.mesa.add(this._tampoMesa(0x0a1218));
    } else if (c.tema === 'forja') {
      this._paredes(true).forEach((p) => add(null, p));
      add('pillar_decorated', -0.5, 0.5, 0.7, 0); add('pillar_decorated', COLS + 0.5, 0.5, 0.7, 0);
      add('mas:Torch', 1.5, 0.1, 0.3, 0); add('mas:Torch_2', 6.5, 0.1, 0.3, 0);
      add('barrel_large', -0.7, 4.5, 0.7, 0); add('crates_stacked', COLS + 0.7, 4.2, 0.8, 0);
      this._luz(1.5, 0.9, 0.3, 0xff9a40, 1.2); this._luz(6.5, 0.9, 0.3, 0xff9a40, 1.2);
      this.mesa.add(this._tampoMesa(0x1e1610));
    } else if (c.tema === 'ninho') {
      this._rochedo(r, add);
      add('candle_triple', 3.2, 0.3, 0.3, 0); add('candle_triple', 5.0, 0.3, 0.3, 0); add('mas:Cobweb', -0.4, 0.4, 0.9, 0); add('mas:Cobweb', COLS + 0.4, 0.4, 0.9, 180);
      add('mas:Skull_3', 0.4, 4.6, 0.25, 30); add('banner_patternA_red', 2.5, -0.1, 0.6, 0);
      this._luz(4.3, 0.8, 0.6, 0xc070ff, 1.4); this._luz(1.5, 0.8, 3.5, 0xff8a40, 0.8);
      this.mesa.add(this._tampoMesa(0x150e18));
    } else if (c.tema === 'trono') {
      for (let i = 0; i < COLS; i++) add(i % 3 ? 'wall_broken' : 'wall', i + 0.5, -0.15, 1.02, 0);
      add('pillar_decorated', -0.5, 0.5, 0.75, 0); add('pillar_decorated', COLS + 0.5, 0.5, 0.75, 0);
      add('pillar_decorated', -0.5, 4.5, 0.75, 0); add('pillar_decorated', COLS + 0.5, 4.5, 0.75, 0);
      add('mas:Skull_2', 0.5, 5.6, 0.2, 0); add('mas:Skull', 7.4, 5.4, 0.2, 90);
      this._luz(4.0, 1.4, 0.4, 0x60ffa0, 1.2);
      this.mesa.add(this._tampoMesa(0x0e141c));
    }
  }
  _tampoMesa(cor) {
    const m = new THREE.Mesh(new THREE.CircleGeometry(16 + Math.max(COLS, LINHAS), 40), new THREE.MeshStandardMaterial({ color: cor, roughness: 1 }));
    m.rotation.x = -Math.PI / 2; m.position.set(COLS / 2, -1.4, LINHAS / 2);
    return m;
  }
  // Pega uma luz livre do conjunto fixo. Sem luz livre, reforça a mais próxima
  // (ou devolve uma luz de mentira, que aceita intensidade mas não ilumina).
  _pegarLuz(x, y, z, cor, forca, alcance, queda) {
    const l = this.poolLuz.find((p) => !p.userData.usada);
    if (!l) {
      let perto = null, d = 3.5;
      for (const p of this.poolLuz) { const dd = Math.hypot(p.position.x - x, p.position.z - z); if (dd < d && !p.userData.segue) { d = dd; perto = p; } }
      if (perto && perto.userData.base) perto.userData.base = Math.min(perto.userData.base * 1.15, perto.userData.base + forca * 0.3);
      return { intensity: 0, position: new THREE.Vector3(), color: new THREE.Color(), userData: {}, falsa: true };
    }
    l.userData.usada = true; l.userData.segue = null;
    l.color.set(cor); l.intensity = forca; l.distance = alcance; l.decay = queda;
    l.position.set(x, y, z);
    return l;
  }
  _luz(x, y, z, cor, i) {
    // durante a montagem só anota o pedido; _distribuirLuzes escolhe as que cabem
    if (this._montando) {
      const p = { x, y, z, cor, base: i * 2.2, distance: 4.5 };
      this._pedidosLuz.push(p);
      return p;
    }
    const l = this._pegarLuz(x, y, z, cor, i * 2.2, 4.5, 1.6);
    l.userData.base = i * 2.2;
    if (!l.falsa) this.luzesTremulas.push(l);
    return l;
  }
  // Escolhe luzes bem espalhadas pelo mapa (a mais forte primeiro, depois sempre a mais
  // longe das já escolhidas). As que sobram reforçam a escolhida mais próxima.
  _distribuirLuzes() {
    const pedidos = this._pedidosLuz || [];
    this._pedidosLuz = [];
    const limite = this.poolLuz.length - 2; // 2 ficam para sino, forja, altar e braseiro
    const escolhidas = [];
    const resto = pedidos.slice().sort((a, b) => b.base - a.base);
    while (resto.length && escolhidas.length < limite) {
      let iMelhor = 0;
      if (escolhidas.length) {
        let dMelhor = -1;
        resto.forEach((p, i) => { const d = Math.min(...escolhidas.map((q) => Math.hypot(p.x - q.x, p.z - q.z))); if (d > dMelhor) { dMelhor = d; iMelhor = i; } });
      }
      escolhidas.push(resto.splice(iMelhor, 1)[0]);
    }
    for (const p of resto) {
      let q = escolhidas[0], d = 1e9;
      for (const e of escolhidas) { const dd = Math.hypot(p.x - e.x, p.z - e.z); if (dd < d) { d = dd; q = e; } }
      if (q && d < 6) { q.extra = (q.extra || 0) + p.base * 0.3; q.distance = Math.max(q.distance, Math.min(7, 4.5 + d * 0.5)); }
    }
    for (const p of escolhidas) {
      const l = this._pegarLuz(p.x, p.y, p.z, p.cor, p.base, p.distance, 1.6);
      l.userData.base = Math.min(p.base * 1.6, p.base + (p.extra || 0));
      if (!l.falsa) this.luzesTremulas.push(l);
    }
  }
  // luz presa a um objeto (sino, forja, altar, braseiro): acompanha a posição dele
  _luzPresa(obj, cor, forca, alcance, queda, dx, dy, dz) {
    const l = this._pegarLuz(0, 0, 0, cor, forca, alcance, queda);
    if (!l.falsa) l.userData.segue = { obj, off: new THREE.Vector3(dx, dy, dz) };
    return l;
  }
  _moverLuzesPresas() {
    const v = new THREE.Vector3();
    for (const l of this.poolLuz) {
      const s = l.userData.segue;
      if (!s) continue;
      let p = s.obj;
      while (p && p !== this.mundo) p = p.parent;
      if (!p) { if (s.visto) { l.intensity = 0; l.userData.usada = false; l.userData.segue = null; } continue; }
      s.visto = true;
      v.copy(s.off);
      s.obj.localToWorld(v);
      l.position.copy(this.mundo.worldToLocal(v));
    }
  }
  _fogueira(x, z) {
    const g = new THREE.Group();
    const madeira = new THREE.MeshStandardMaterial({ color: 0x5a3a1e, roughness: 1 });
    for (let i = 0; i < 4; i++) {
      const l = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.6, 6), madeira);
      l.rotation.z = Math.PI / 2.3; l.rotation.y = i * Math.PI / 4;
      l.position.y = 0.08; l.castShadow = true;
      g.add(l);
    }
    const pedra = new THREE.MeshStandardMaterial({ color: 0x55504a, roughness: 1, flatShading: true });
    for (let i = 0; i < 9; i++) { const p = new THREE.Mesh(new THREE.DodecahedronGeometry(0.07), pedra); p.position.set(Math.cos(i / 9 * 6.28) * 0.33, 0.04, Math.sin(i / 9 * 6.28) * 0.33); g.add(p); }
    const chamas = [];
    const mat = new THREE.SpriteMaterial({ map: pontoTex(), color: 0xff8a2a, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false });
    for (let i = 0; i < 14; i++) { const s = new THREE.Sprite(mat.clone()); g.add(s); chamas.push({ s, f: Math.random() }); }
    g.userData.chamas = chamas;
    g.position.set(x, PISO, z);
    this.camadaCena.add(g);
    const l = this._luz(x, PISO + 0.5, z, 0xff8a3a, 1.8);
    l.distance = 5;
    this.fogueiras = (this.fogueiras || []).concat([g]);
    return Promise.resolve(g);
  }
  _anelSaida() {
    const g = new THREE.Group();
    const anel = new THREE.Mesh(new THREE.RingGeometry(0.28, 0.42, 40), new THREE.MeshBasicMaterial({ color: 0xffd36a, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }));
    anel.rotation.x = -Math.PI / 2;
    g.add(anel);
    const coluna = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.38, 1.4, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd36a, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
    coluna.position.y = 0.7;
    g.add(coluna);
    g.userData.anel = anel;
    return g;
  }

  _particulas(tipo) {
    if (this.particulas) { this.camadaFx.remove(this.particulas.obj); this.particulas = null; }
    if (!tipo) return;
    const n = { neve: 260, brasas: 70, vagalumes: 40, poeira: 120 }[tipo] || 100;
    const pos = new Float32Array(n * 3), vel = [];
    for (let i = 0; i < n; i++) {
      pos[i * 3] = -1 + Math.random() * (COLS + 2); pos[i * 3 + 1] = Math.random() * 3; pos[i * 3 + 2] = -1 + Math.random() * (LINHAS + 2);
      vel.push(Math.random());
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const cor = (this.tema && this.tema.corPart) || { neve: 0xeef4ff, brasas: 0xff9a40, vagalumes: 0xc8ff6a, poeira: 0xb8c8c0 }[tipo];
    const tam = { neve: 0.06, brasas: 0.05, vagalumes: 0.09, poeira: 0.035 }[tipo];
    const mat = new THREE.PointsMaterial({ color: cor, size: tam, map: pontoTex(), transparent: true, depthWrite: false, blending: tipo === 'neve' || tipo === 'poeira' ? THREE.NormalBlending : THREE.AdditiveBlending, opacity: tipo === 'poeira' ? 0.5 : 0.9 });
    const obj = new THREE.Points(geo, mat);
    this.camadaFx.add(obj);
    this.particulas = { obj, tipo, vel, n };
  }

  // ----------------------------------------------------------- destaques de casa
  _montarDestaques() {
    const geo = new THREE.PlaneGeometry(0.92, 0.92);
    geo.rotateX(-Math.PI / 2);
    if (this.grupoDest) this.mundo.remove(this.grupoDest);
    this.destaques = [];
    this.grupoDest = new THREE.Group();
    this.mundo.add(this.grupoDest);
    for (let i = 0; i < COLS * LINHAS; i++) {
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x4aa8ff, transparent: true, opacity: 0, depthWrite: false }));
      m.position.set(i % COLS + 0.5, PISO + 0.05, Math.floor(i / COLS) + 0.5);
      m.renderOrder = 5;
      this.grupoDest.add(m);
      this.destaques.push(m);
    }
    const borda = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.5, 4, 1, Math.PI / 4), new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.95, depthWrite: false }));
    borda.rotation.x = -Math.PI / 2;
    borda.visible = false;
    borda.renderOrder = 6;
    if (this.cursor) this.mundo.remove(this.cursor);
    this.cursor = borda;
    this.mundo.add(borda);
  }
  // mapa: { "x,y": "mover" | "atacar" | "alvo" | "aliado" | "caminho" }
  destacar(mapa) {
    const cores = { mover: [0x4aa8ff, 0.28], caminho: [0x8fd0ff, 0.5], atacar: [0xff4a3a, 0.35], alvo: [0xffc23a, 0.45], aliado: [0x5aff8a, 0.35] };
    this.destaques.forEach((m, i) => {
      const k = (i % COLS) + ',' + Math.floor(i / COLS);
      const c = mapa && mapa[k];
      if (c) { m.material.color.setHex(cores[c][0]); m.material.opacity = cores[c][1]; m.userData.pulsa = c === 'alvo' || c === 'atacar'; }
      else { m.material.opacity = 0; m.userData.pulsa = false; }
    });
  }
  marcarCursor(x, y) {
    if (x == null) { this.cursor.visible = false; return; }
    this.cursor.visible = true;
    this.cursor.position.set(x + 0.5, PISO + 0.07, y + 0.5);
  }

  // ----------------------------------------------------------- unidades
  async _criarVisual(id, info) {
    const def = VIS[info.vis];
    const raiz = new THREE.Group();
    const v = { id, raiz, info, mixer: null, acoes: {}, atual: null, ocupado: 0, modelo: null };
    if (def) {
      const g = await this.carregar(def.m);
      const o = SkeletonUtils.clone(g.scene);
      if (!def.proprio) {
        o.traverse((m) => {
          if (m.isMesh && OPCIONAIS.has(m.name)) m.visible = (def.ver || []).includes(m.name);
        });
      }
      o.traverse((m) => {
        if (m.isMesh) {
          m.castShadow = true; m.receiveShadow = false; m.frustumCulled = false;
          m.material = m.material.clone();
          if (def.tint) m.material.color.multiply(new THREE.Color(def.tint));
          if (def.brilho && /Eyes/.test(m.name)) { m.material.emissive = new THREE.Color(def.brilho); m.material.emissiveIntensity = 2.5; }
          if (def.fantasma) { m.material.transparent = true; m.material.opacity = 0.62; m.material.emissive = new THREE.Color(def.brilho || 0x80c8ff); m.material.emissiveIntensity = 0.35; m.castShadow = false; }
          const corC = def.contorno || (info.lado === 'heroi' ? 0xffd8a0 : info.lado === 'inimigo' ? 0xc89a8a : 0xa8d8ff);
          contorno(m.material, corC, def.contorno ? 0.8 : info.lado === 'inimigo' ? 0.35 : 0.5);
        }
      });
      if (def.mao) {
        for (const lado of ['r', 'l']) {
          if (!def.mao[lado]) continue;
          const osso = o.getObjectByName('handslot.' + lado);
          if (osso) { const a = await this.carregar(def.mao[lado]); const arma = a.scene.clone(true); arma.traverse((m) => { if (m.isMesh) m.castShadow = true; }); osso.add(arma); }
        }
      }
      o.updateMatrixWorld(true);
      const caixa = new THREE.Box3().setFromObject(o);
      const alt = caixa.max.y - caixa.min.y || 1;
      const k = def.h / alt;
      o.scale.setScalar(k);
      o.position.y = -caixa.min.y * k;
      raiz.add(o);
      v.modelo = o;
      v.altura = def.h;
      v.mixer = new THREE.AnimationMixer(o);
      v.clipes = def.proprio ? g.animations : /^Skeleton/.test(def.m) ? this.clipes.esq : this.clipes.kay;
      v.proprio = def.proprio || null;
      v.investe = !!def.investe;
    } else {
      const o = this._objetoProc(info);
      raiz.add(o);
      v.modelo = o;
      v.altura = o.userData.altura || 0.6;
    }
    // anel no chão
    const corAnel = info.lado === 'heroi' ? 0x5ab0ff : info.lado === 'inimigo' ? 0xff4a3a : info.lado === 'npc' ? 0x7dff9a : 0xffd36a;
    if (info.lado !== 'objeto') {
      const anel = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.37, 32), new THREE.MeshBasicMaterial({ color: corAnel, transparent: true, opacity: 0.75, depthWrite: false }));
      anel.rotation.x = -Math.PI / 2; anel.position.y = 0.012; anel.renderOrder = 4;
      raiz.add(anel);
      v.anel = anel;
      const vez = new THREE.Mesh(new THREE.RingGeometry(0.4, 0.47, 32), new THREE.MeshBasicMaterial({ color: 0xffd36a, transparent: true, opacity: 0.95, depthWrite: false }));
      vez.rotation.x = -Math.PI / 2; vez.position.y = 0.014; vez.visible = false; vez.renderOrder = 4;
      raiz.add(vez);
      v.anelVez = vez;
    }
    // barra de vida
    if (info.lado === 'heroi' || info.lado === 'inimigo' || info.alvoPv) {
      const c = document.createElement('canvas'); c.width = 128; c.height = 18;
      const tex = new THREE.CanvasTexture(c);
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
      s.scale.set(0.62, 0.087, 1);
      s.position.y = v.altura + 0.16;
      s.renderOrder = 15;
      raiz.add(s);
      v.barra = { s, c, tex, ult: null };
    }
    raiz.position.set(info.x + 0.5, PISO, info.y + 0.5);
    raiz.rotation.y = info.lado === 'heroi' ? Math.PI : 0;
    if (info.lado === 'inimigo' || info.lado === 'npc') raiz.rotation.y = 0;
    this.camadaUn.add(raiz);
    this.un.set(id, v);
    this._tocar(v, 'idle', true);
    return v;
  }

  _objetoProc(info) {
    const g = new THREE.Group();
    const madeira = new THREE.MeshStandardMaterial({ color: 0x6b4a2a, roughness: 0.9 });
    const ferro = new THREE.MeshStandardMaterial({ color: 0x3a3a40, roughness: 0.5, metalness: 0.7 });
    const pedra = new THREE.MeshStandardMaterial({ color: 0x5a5a5e, roughness: 1 });
    const v = info.vis;
    const sub = (nome, s, rot = 0, dx = 0, dz = 0) => this._prop(nome, dx, dz, s, rot, true, g).then((p) => { p.position.y = 0; return p; });
    if (v === 'alcapao') {
      const tampa = new THREE.Group();
      const t = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.04, 0.78), madeira); t.position.set(0, 0.02, 0.39); t.castShadow = true;
      tampa.add(t);
      for (let i = -1; i <= 1; i++) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 0.05), ferro); r.position.set(0, 0.03, 0.39 + i * 0.25); tampa.add(r); }
      tampa.position.z = -0.39;
      g.add(tampa);
      const buraco = new THREE.Mesh(new THREE.PlaneGeometry(0.76, 0.76), new THREE.MeshBasicMaterial({ color: 0x050302 }));
      buraco.rotation.x = -Math.PI / 2; buraco.position.y = 0.004;
      g.add(buraco);
      g.userData.tampa = tampa; g.userData.altura = 0.1;
    } else if (v === 'carroca') {
      sub('wheelbarrow', 0.9, 25).then((p) => { p.rotation.z = 0.35; });
      sub('crate_A_big', 0.38, 15, 0.25, 0.3); sub('barrel', 0.3, 0, -0.3, -0.25);
      g.userData.altura = 0.6;
    } else if (v === 'bau') { sub('trunk_large_A', 0.6, 0); g.userData.altura = 0.45; g.userData.brilha = true; }
    else if (v === 'bau_ouro') { sub('chest_gold', 0.6, 0); sub('coin_stack_large', 0.22, 0, 0.32, 0.2); g.userData.altura = 0.45; g.userData.brilha = true; }
    else if (v === 'porta') {
      sub('wall_doorway', 1.02, 0);
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.7, 0.06), madeira); p.position.set(0, 0.36, 0); p.castShadow = true;
      const caveira = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshStandardMaterial({ color: 0xd8d0b8 })); caveira.position.set(0, 0.45, 0.05);
      const folha = new THREE.Group(); folha.add(p, caveira);
      g.add(folha); g.userData.folha = folha; g.userData.altura = 1.0; g.userData.fica = true;
    } else if (v === 'portao') {
      const grade = new THREE.Group();
      for (let i = -3; i <= 3; i++) { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.9, 6), ferro); b.position.set(i * 0.12, 0.45, 0); b.castShadow = true; grade.add(b); }
      for (const yy of [0.2, 0.7]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.04, 0.04), ferro); b.position.y = yy; grade.add(b); }
      g.add(grade); g.userData.folha = grade; g.userData.altura = 0.95; g.userData.fica = true; g.userData.portao = true;
    } else if (v === 'alavanca') {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.25, 0.22), pedra); b.position.y = 0.125; b.castShadow = true; g.add(b);
      const braco = new THREE.Group();
      const haste = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.42, 8), ferro); haste.position.y = 0.21; braco.add(haste);
      const bola = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), new THREE.MeshStandardMaterial({ color: 0x8a1a1a })); bola.position.y = 0.43; braco.add(bola);
      braco.position.y = 0.25; braco.rotation.z = 0.6;
      g.add(braco); g.userData.braco = braco; g.userData.altura = 0.7;
    } else if (v === 'sino') {
      const bronze = new THREE.MeshStandardMaterial({ color: 0x6a5a2e, roughness: 0.35, metalness: 0.85 });
      const perfil = [];
      for (let i = 0; i <= 12; i++) { const t = i / 12; perfil.push(new THREE.Vector2(0.08 + Math.pow(t, 1.6) * 0.36 + (t > 0.9 ? (t - 0.9) * 0.8 : 0), 0.95 - t * 0.62)); }
      const sino = new THREE.Mesh(new THREE.LatheGeometry(perfil, 32), bronze);
      sino.material.side = THREE.DoubleSide; sino.castShadow = true;
      const pivo = new THREE.Group(); pivo.position.y = 1.02; sino.position.y = -1.02;
      pivo.add(sino);
      const badalo = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 10), new THREE.MeshStandardMaterial({ color: 0xe8e0c8, emissive: 0x30ff80, emissiveIntensity: 1.2 }));
      badalo.position.y = -0.62; pivo.add(badalo);
      g.add(pivo);
      for (const sx of [-0.55, 0.55]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.15, 0.1), madeira); p.position.set(sx, 0.575, 0); p.castShadow = true; g.add(p); }
      const viga = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.1, 0.12), madeira); viga.position.y = 1.1; g.add(viga);
      const luz = this._luzPresa(g, 0x40ff80, 2.5, 3.2, 1.5, 0, 0.5, 0);
      g.userData.pivo = pivo; g.userData.badalo = badalo; g.userData.luzSino = luz; g.userData.altura = 1.2;
      g.position.x = 0.5;
    } else if (v === 'runa') {
      const pedraR = new THREE.MeshStandardMaterial({ color: 0x6a6e74, roughness: 1, flatShading: true });
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.26, 0.85, 6), pedraR); m.position.y = 0.42; m.rotation.y = 0.4; m.castShadow = true; g.add(m);
      const s = textoSprite('ᚱ', '#8ae0ff', 54); s.position.set(0, 0.5, 0.2); s.scale.multiplyScalar(0.7); s.material.depthTest = true; g.add(s);
      g.userData.altura = 0.9; g.userData.brilha = true;
    } else if (v === 'ervas') { sub('nat:Bush_with_Flowers_1', 0.55, 0); g.userData.altura = 0.4; g.userData.brilha = true;
    } else if (v === 'vagonete') {
      const caixa = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.32, 0.46), madeira); caixa.position.y = 0.26; caixa.castShadow = true; g.add(caixa);
      for (const yy of [0.16, 0.36]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.04, 0.48), ferro); b.position.y = yy; g.add(b); }
      for (const [xx, zz] of [[-0.2, -0.24], [0.2, -0.24], [-0.2, 0.24], [0.2, 0.24]]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.04, 12), ferro); w.rotation.x = Math.PI / 2; w.position.set(xx, 0.09, zz); g.add(w); }
      const minerio = new THREE.MeshStandardMaterial({ color: 0x6a6460, roughness: 0.9, flatShading: true });
      const ouro = new THREE.MeshStandardMaterial({ color: 0xd8a83a, metalness: 0.8, roughness: 0.3, flatShading: true });
      for (let i = 0; i < 7; i++) { const p = new THREE.Mesh(new THREE.DodecahedronGeometry(0.07 + Math.random() * 0.04), i % 3 ? minerio : ouro); p.position.set((Math.random() - 0.5) * 0.45, 0.43 + Math.random() * 0.05, (Math.random() - 0.5) * 0.3); g.add(p); }
      g.userData.altura = 0.55;
    } else if (v === 'forja') {
      const base = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.55, 0.75), pedra); base.position.set(0.5, 0.275, 0); base.castShadow = true; base.receiveShadow = true; g.add(base);
      const capuz = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.55, 0.7, 4, 1, true), pedra); capuz.position.set(0.5, 1.0, -0.1); capuz.rotation.y = Math.PI / 4; g.add(capuz);
      const brasa = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.05, 0.5), new THREE.MeshStandardMaterial({ color: 0x2a1a10, emissive: 0xff5a10, emissiveIntensity: 0 }));
      brasa.position.set(0.5, 0.56, 0); g.add(brasa);
      const luz = this._luzPresa(g, 0xff7a2a, 0, 5, 1.4, 0.5, 0.9, 0.3);
      const runa = textoSprite('ᚱ', '#5a4a3a', 60); runa.position.set(0.5, 0.3, 0.4); runa.material.depthTest = true; g.add(runa);
      g.userData.forja = { brasa, luz }; g.userData.altura = 1.1;
    } else if (v === 'bigorna') {
      const pe = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 0.3, 8), madeira); pe.position.y = 0.15; g.add(pe);
      const corpo = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.2), ferro); corpo.position.y = 0.37; corpo.castShadow = true; g.add(corpo);
      const bico = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.2, 4), ferro); bico.rotation.z = -Math.PI / 2; bico.position.set(0.3, 0.39, 0); g.add(bico);
      const barra = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.04, 0.06), new THREE.MeshStandardMaterial({ color: 0x8ad0ff, emissive: 0x3aa8ff, emissiveIntensity: 1.4, metalness: 0.6, roughness: 0.2 }));
      barra.position.y = 0.47; g.add(barra);
      g.userData.barra = barra; g.userData.altura = 0.6; g.userData.brilha = true;
    } else if (v === 'jaula') {
      const piso = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.05, 16), ferro); piso.position.y = 0.025; g.add(piso);
      const topo = piso.clone(); topo.position.y = 0.95; g.add(topo);
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; const b = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.92, 5), ferro); b.position.set(Math.cos(a) * 0.36, 0.49, Math.sin(a) * 0.36); b.castShadow = true; g.add(b); }
      const preso = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.3, 4, 8), new THREE.MeshStandardMaterial({ color: 0x7a6a5a, roughness: 1 })); preso.position.y = 0.3; preso.rotation.z = 0.5; g.add(preso);
      g.userData.altura = 1.0;
    } else if (v === 'altar') {
      const mesa = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.45, 0.55), pedra); mesa.position.y = 0.225; mesa.castShadow = true; g.add(mesa);
      const pano = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.02, 0.3), new THREE.MeshStandardMaterial({ color: 0x3a1020 })); pano.position.y = 0.46; g.add(pano);
      const cera = new THREE.MeshStandardMaterial({ color: 0xe8dcc0, emissive: 0x3a2a10 });
      for (const xx of [-0.35, -0.2, 0.25, 0.38]) { const v1 = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.12 + Math.random() * 0.1, 8), cera); v1.position.set(xx, 0.52, (Math.random() - 0.5) * 0.3); g.add(v1); }
      this._luzPresa(g, 0xffa050, 1.4, 2.5, 1.6, 0, 0.8, 0.2);
      g.userData.altura = 0.6;
    } else if (v === 'braseiro') {
      const tripe = new THREE.Group();
      for (let i = 0; i < 3; i++) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.55, 5), ferro); const a = i / 3 * Math.PI * 2; p.position.set(Math.cos(a) * 0.13, 0.27, Math.sin(a) * 0.13); p.rotation.set(Math.sin(a) * 0.25, 0, -Math.cos(a) * 0.25); tripe.add(p); }
      const bacia = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), ferro); bacia.position.y = 0.62; bacia.rotation.x = Math.PI; bacia.material = ferro; tripe.add(bacia);
      g.add(tripe);
      const chamas = [];
      const mat = new THREE.SpriteMaterial({ map: pontoTex(), color: 0x50ff90, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false });
      for (let i = 0; i < 12; i++) { const s = new THREE.Sprite(mat.clone()); s.position.y = 0.62; g.add(s); chamas.push({ s, f: Math.random() }); }
      const luz = this._luzPresa(g, 0x50ff90, 2.2, 3, 1.5, 0, 0.95, 0);
      g.userData.chamas = chamas; g.userData.chamaBase = 0.62; g.userData.corVerde = true; g.userData.luzBraseiro = luz; g.userData.tripe = tripe; g.userData.altura = 0.9;
      this.fogueiras = (this.fogueiras || []).concat([g]);
    } else if (v === 'trono') {
      const osso = new THREE.MeshStandardMaterial({ color: 0xd8ccb0, roughness: 0.8 });
      const assento = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.4, 0.6), pedra); assento.position.set(0.5, 0.2, 0); assento.castShadow = true; g.add(assento);
      const encosto = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.3, 0.16), pedra); encosto.position.set(0.5, 0.85, -0.24); encosto.castShadow = true; g.add(encosto);
      for (let i = 0; i < 7; i++) { const e = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.35 + (i % 2) * 0.2, 5), osso); e.position.set(0.05 + i * 0.15, 1.6 + (i % 2) * 0.1, -0.24); g.add(e); }
      for (const xx of [0.02, 0.98]) { const cr = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), osso); cr.position.set(xx, 0.5, 0.22); g.add(cr); }
      g.userData.altura = 1.6;
    } else {
      const c = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), madeira); c.position.y = 0.2; g.add(c); g.userData.altura = 0.45;
    }
    return g;
  }

  _clipe(v, nome) {
    if (v.proprio) {
      const t = CLIP_PROPRIO[v.proprio];
      const ataque = /golpe|mordida|garra|facas|besta|magia|arremesso/.test(nome);
      const f = t[nome === 'morto' ? 'morte' : ataque ? 'ataque' : nome] || (nome === 'bloquear' ? t.dano : t.idle);
      return v.clipes.find((c) => c.name === f);
    }
    for (const n of (CLIP[nome] || [nome])) {
      const c = v.clipes.find((k) => k.name === n);
      if (c) return c;
    }
    return null;
  }
  _tocar(v, nome, loop, vel = 1) {
    if (!v.mixer) return 0;
    const clipe = this._clipe(v, nome);
    if (!clipe) return 0;
    let a = v.acoes[clipe.name];
    if (!a) { a = v.mixer.clipAction(clipe); v.acoes[clipe.name] = a; }
    if (v.atual === a && loop) return clipe.duration;
    a.reset();
    a.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
    a.clampWhenFinished = !loop;
    a.timeScale = vel;
    a.enabled = true;
    if (v.atual && v.atual !== a) a.crossFadeFrom(v.atual, 0.18, false);
    a.play();
    // pose de caído: pula direto para o fim da animação de morte
    if (nome === 'morto') { a.time = clipe.duration - 0.001; a.weight = 1; if (v.atual && v.atual !== a) v.atual.stop(); }
    v.atual = a;
    return clipe.duration / vel;
  }
  async _umaVez(v, nome, depois = 'idle', vel = 1) {
    const d = this._tocar(v, nome, false, vel);
    if (!d) return;
    await esperar(d * 1000 - 120);
    if (depois && !v.morto) this._tocar(v, depois, true);
  }
  _pose(v, info) {
    if (info.lado === 'heroi' && info.caido) { this._tocar(v, 'morto', false); return; }
    if (info.pose === 'sentada') { this._tocar(v, 'sentar', true); return; }
    if (info.pose === 'caido') { this._tocar(v, 'morto', false); return; }
    this._tocar(v, 'idle', true);
  }

  _barra(v, info) {
    if (!v.barra || info.pv == null) return;
    const chave = info.pv + '/' + info.pvMax;
    if (v.barra.ult === chave) return;
    v.barra.ult = chave;
    const ctx = v.barra.c.getContext('2d');
    const w = 128, h = 18, f = Math.max(0, Math.min(1, info.pv / (info.pvMax || 1)));
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(10,8,6,.85)'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = info.lado === 'heroi' ? (f > 0.5 ? '#3fcf6a' : f > 0.25 ? '#e0b030' : '#e04030') : '#c8302a';
    ctx.fillRect(2, 2, (w - 4) * f, h - 4);
    ctx.strokeStyle = '#d8b878'; ctx.lineWidth = 2; ctx.strokeRect(1, 1, w - 2, h - 2);
    v.barra.tex.needsUpdate = true;
  }

  // Mostra o estado: cria o que falta, tira o que sumiu, encaixa posições.
  async sincronizar(e, R) {
    const c = R.cena(e);
    if (!c) return;
    if (this.cenaId !== c.id) await this.montarCena(c, e);
    const vivos = new Set();
    const vez = R.vezDe(e);
    for (const id in e.u) {
      const u = e.u[id];
      this.info[id] = { vis: u.vis, lado: u.lado, nome: u.nome, x: u.x, y: u.y, pv: u.pv, pvMax: u.pvMax, caido: u.caido, pose: u.pose, alvoPv: u.alvoPv };
      if (u.oculto || u.morto) continue;
      vivos.add(id);
      let v = this.un.get(id);
      if (!v) {
        if (this._criando && this._criando.has(id)) continue;
        (this._criando = this._criando || new Set()).add(id);
        try { v = await this._criarVisual(id, this.info[id]); } finally { this._criando.delete(id); }
        if (!v) continue;
        this._pose(v, this.info[id]);
      }
      v.info = this.info[id];
      if (!v.ocupado) {
        v.raiz.position.x = u.x + 0.5; v.raiz.position.z = u.y + 0.5;
        if (u.lado === 'heroi') {
          const caido = !!u.caido;
          if (caido !== !!v.caido) { v.caido = caido; this._pose(v, u); }
        }
      }
      this._barra(v, u);
      if (v.anelVez) v.anelVez.visible = vez === id;
      if (u.virado && v.modelo.userData.braco) v.modelo.userData.braco.rotation.z = -0.6;
      if (v.modelo.userData.brilha) v.modelo.userData.usado = !!u.usado;
      if (u.obj === 'alcapao' && v.modelo.userData.tampa) v.modelo.userData.tampa.rotation.x = e.flags.aceitou_trabalho ? -1.9 : 0;
      const ud = v.modelo.userData;
      if (ud.forja) { const acesa = !!e.flags.forja_acesa; ud.forja.brasa.material.emissiveIntensity = acesa ? 2.2 : 0; ud.forja.luz.intensity = acesa ? 5 : 0; if (acesa && !ud.fogo) { ud.fogo = true; this._fogueira(u.x + 1, u.y + 0.5).then((f) => { f.position.y = PISO + 0.5; f.scale.setScalar(1.4); }); } }
      if (ud.barra) { ud.barra.visible = !u.usado; if (u.usado) ud.usado = true; }
      if (ud.luzBraseiro && u.usado && !ud.apagado) { ud.apagado = true; ud.luzBraseiro.intensity = 0; ud.chamas.forEach((c) => { c.s.visible = false; }); ud.tripe.rotation.z = 0.5; ud.tripe.position.y = -0.08; }
    }
    for (const [id, v] of this.un) if (!vivos.has(id) && !v.ocupado && !v.fica) { this.camadaUn.remove(v.raiz); this.un.delete(id); }
    // saída e armadilhas
    if (c.saida && e.saida) { this.anelSaida.visible = true; this.anelSaida.position.set(c.saida[0] + 0.5, PISO + 0.02, c.saida[1] + 0.5); }
    else this.anelSaida.visible = false;
    for (const k in e.armadilhas) {
      const a = e.armadilhas[k];
      if (a.revelada && !this.armadilhasVis.has(k)) {
        const [x, y] = k.split(',').map(Number);
        this.armadilhasVis.set(k, true);
        this._prop('floor_tile_big_spikes', x + 0.5, y + 0.5, 0.92, 0, false).catch(() => {});
      }
    }
  }

  // ----------------------------------------------------------- animações de eventos
  async animar(ev, e) {
    const v = (id) => this.un.get(id);
    switch (ev.t) {
      case 'mover': return this._andar(v(ev.id), ev.caminho);
      case 'ataque': return this._ataque(ev);
      case 'dano': return this._dano(ev);
      case 'cura': return this._cura(ev);
      case 'morte': return this._morte(ev);
      case 'caiu': { const a = v(ev.alvo); if (a) { a.caido = true; await this._umaVez(a, 'morte', null); this._tocar(a, 'morto', false); } return; }
      case 'surge': return this._surge(ev, e);
      case 'remover': return this._remover(ev.id, false);
      case 'foge': return this._remover(ev.id, true);
      case 'hab': return this._hab(ev);
      case 'magia': { const a = v(ev.de); if (a) { this._umaVez(a, 'invocar'); } this._anelMagico(a ? a.raiz.position : new THREE.Vector3(4, PISO, 1), 0x50ff90); return esperar(700); }
      case 'interage': { const a = v(ev.de); if (a) { const alvo = v(ev.alvo); if (alvo) this._olhar(a, alvo.raiz.position); await this._umaVez(a, 'interagir'); } return; }
      case 'armadilha': {
        const k = ev.x + ',' + ev.y;
        if (!this.armadilhasVis.has(k)) { this.armadilhasVis.set(k, true); const p = await this._prop('floor_tile_big_spikes', ev.x + 0.5, ev.y + 0.5, 0.92, 0, false); p.position.y = PISO - 0.3; this._tween(400, (t) => { p.position.y = PISO - 0.3 + 0.3 * facil(t); }); }
        if (!ev.revela) this.tremer = 0.25;
        return esperar(350);
      }
      case 'rende': { const a = v(ev.alvo); if (a) await this._umaVez(a, 'bloquear', 'idle'); return; }
      case 'final': for (const [, a] of this.un) if (a.info.lado === 'heroi' && !a.caido) this._umaVez(a, 'festa', 'idle'); return esperar(600);
      case 'som': if (ev.som === 'sino' || ev.som === 'sino_quebra') this._sinoBalanca(ev.som === 'sino_quebra'); return;
      default: return;
    }
  }

  _olhar(v, alvo) {
    if (!v) return;
    const dx = alvo.x - v.raiz.position.x, dz = alvo.z - v.raiz.position.z;
    if (Math.abs(dx) + Math.abs(dz) < 0.01) return;
    v.raiz.rotation.y = Math.atan2(dx, dz);
  }
  _tween(ms, fn) {
    return new Promise((ok) => { this.anim.push({ ini: performance.now(), ms, fn, ok }); });
  }
  async _andar(v, cam) {
    if (!v || !cam || cam.length < 2) return;
    v.ocupado++;
    this._tocar(v, cam.length > 4 ? 'correr' : 'andar', true, 1.1);
    const passo = cam.length > 4 ? 230 : 300;
    for (let i = 1; i < cam.length; i++) {
      const a = { x: cam[i - 1][0] + 0.5, z: cam[i - 1][1] + 0.5 }, b = { x: cam[i][0] + 0.5, z: cam[i][1] + 0.5 };
      v.raiz.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
      const diag = a.x !== b.x && a.z !== b.z;
      await this._tween(passo * (diag ? 1.3 : 1), (t) => { v.raiz.position.x = a.x + (b.x - a.x) * t; v.raiz.position.z = a.z + (b.z - a.z) * t; });
    }
    this._tocar(v, 'idle', true);
    v.ocupado--;
  }
  async _ataque(ev) {
    const a = this.un.get(ev.de), b = this.un.get(ev.alvo);
    if (!a) return;
    if (b) { this._olhar(a, b.raiz.position); if (b.info.lado !== 'objeto') this._olhar(b, a.raiz.position); }
    const d = this._tocar(a, ev.anim, false);
    if (a.investe && b) {
      const o = a.raiz.position.clone(), alvo = b.raiz.position;
      this._tween(380, (t) => { const k = Math.sin(t * Math.PI) * 0.35; a.raiz.position.set(o.x + (alvo.x - o.x) * k, o.y, o.z + (alvo.z - o.z) * k); });
    }
    await esperar(Math.min(520, (d || 0.8) * 450));
    if (ev.fx && b) await this._projetil(ev.fx, a, b);
    if (!ev.acerto && b) {
      const s = textoSprite('Errou', '#d8d0c0', 46);
      this._flutuar(s, b.raiz.position, v => v);
      if (b.mixer && b.info.lado !== 'objeto') this._umaVez(b, 'bloquear', 'idle', 1.4);
    }
    if (ev.critico) this.tremer = 0.35;
    setTimeout(() => { if (!a.morto && !a.caido) this._tocar(a, 'idle', true); }, Math.max(0, (d || 0.8) * 1000 - 500));
  }
  async _dano(ev) {
    const b = this.un.get(ev.alvo);
    if (!b) return;
    const s = textoSprite('-' + ev.valor, ev.valor >= 10 ? '#ffcf4a' : '#ff5a4a', ev.valor >= 10 ? 70 : 58);
    this._flutuar(s, b.raiz.position);
    this._faiscas(b.raiz.position, ev.tipo === 'necro' ? 0x60ff90 : ev.tipo === 'fogo' ? 0xff8a2a : 0xff3a2a, 14);
    if (b.info) { b.info.pv = ev.pv; this._barra(b, b.info); }
    if (b.modelo.userData.pivo) this._sinoBalanca(false);
    if (b.mixer && ev.pv > 0) this._umaVez(b, 'dano', 'idle');
    else if (!b.mixer) { const o = b.raiz.position.x; await this._tween(200, (t) => { b.raiz.position.x = o + Math.sin(t * 20) * 0.03 * (1 - t); }); }
    await esperar(260);
  }
  async _cura(ev) {
    const b = this.un.get(ev.alvo);
    if (!b) return;
    this._flutuar(textoSprite('+' + ev.valor, '#6aff9a', 58), b.raiz.position);
    this._faiscas(b.raiz.position, 0x8aff9a, 20, true);
    if (b.caido && ev.pv > 0) { b.caido = false; this._tocar(b, 'idle', true); }
    if (b.info) { b.info.pv = ev.pv; this._barra(b, b.info); }
    await esperar(400);
  }
  async _morte(ev) {
    const b = this.un.get(ev.alvo);
    if (!b) return;
    b.ocupado++; b.morto = true;
    if (b.anel) b.anel.visible = false;
    if (b.barra) b.barra.s.visible = false;
    if (b.modelo.userData.pivo) {
      // o sino racha e cai
      const pv = b.modelo.userData.pivo;
      b.modelo.userData.luzSino.intensity = 0;
      b.modelo.userData.badalo.material.emissiveIntensity = 0;
      this._faiscas(b.raiz.position.clone().add(new THREE.Vector3(0.5, 0.8, 0)), 0x50ff90, 40);
      await this._tween(900, (t) => { pv.rotation.z = facil(t) * 1.2; pv.position.y = 1.02 - facil(t) * 0.55; });
      b.fica = true; b.ocupado--;
      return;
    }
    if (b.mixer) await this._umaVez(b, 'morte', null);
    else await this._tween(500, (t) => { b.raiz.rotation.z = facil(t) * Math.PI / 2; });
    this._faiscas(b.raiz.position, 0x9a9a9a, 12);
    await this._tween(600, (t) => { b.raiz.position.y = PISO - facil(t) * 0.6; });
    this.camadaUn.remove(b.raiz);
    this.un.delete(ev.alvo);
  }
  async _surge(ev, e) {
    let v = this.un.get(ev.id);
    const u = e.u[ev.id] || this.info[ev.id] || { vis: 'ossudo', lado: 'inimigo', x: ev.x, y: ev.y };
    const info = { vis: u.vis, lado: u.lado, nome: u.nome, x: ev.x, y: ev.y, pv: u.pv, pvMax: u.pvMax };
    if (!v) v = await this._criarVisual(ev.id, info);
    v.ocupado++;
    v.raiz.position.set(ev.x + 0.5, PISO - 0.9, ev.y + 0.5);
    this._faiscas(v.raiz.position.clone().setY(PISO + 0.1), u.lado === 'inimigo' ? 0x7a6a50 : 0xffd36a, 24, true);
    this._anelMagico(new THREE.Vector3(ev.x + 0.5, PISO, ev.y + 0.5), u.lado === 'inimigo' ? 0x50ff90 : 0xffd36a);
    await this._tween(650, (t) => { v.raiz.position.y = PISO - 0.9 + 0.9 * facil(t); });
    v.ocupado--;
  }
  async _remover(id, foge) {
    const v = this.un.get(id);
    if (!v) return;
    v.ocupado++;
    if (v.modelo.userData.fica) {
      const f = v.modelo.userData.folha;
      if (v.modelo.userData.portao) await this._tween(900, (t) => { f.position.y = facil(t) * 0.85; });
      else await this._tween(800, (t) => { f.rotation.y = -facil(t) * 1.7; f.position.x = -facil(t) * 0.2; });
      v.fica = true; v.ocupado--;
      return;
    }
    if (foge) {
      this._tocar(v, 'correr', true, 1.2);
      const o = v.raiz.position.clone();
      const dir = new THREE.Vector3(o.x < 4 ? -1 : 1, 0, o.z < 3 ? -0.5 : 0.5).normalize();
      v.raiz.rotation.y = Math.atan2(dir.x, dir.z);
      await this._tween(1100, (t) => { v.raiz.position.set(o.x + dir.x * 5 * t, o.y, o.z + dir.z * 5 * t); });
    } else {
      this._faiscas(v.raiz.position, 0xc8c0ff, 16, true);
      await this._tween(500, (t) => { v.raiz.scale.setScalar(1 - facil(t)); });
    }
    this.camadaUn.remove(v.raiz);
    this.un.delete(id);
  }
  async _hab(ev) {
    const a = this.un.get(ev.de), b = this.un.get(ev.alvo);
    if (!a) return;
    if (b && b !== a) this._olhar(a, b.raiz.position);
    const fx = ev.fx;
    if (fx === 'fogo') { this._tocar(a, 'magia', false); await esperar(420); return; }
    if (fx === 'misseis') {
      this._umaVez(a, 'magia');
      await esperar(380);
      if (b) await Promise.all([0, 1, 2].map((i) => esperar(i * 120).then(() => this._projetil('missil', a, b, i))));
      return;
    }
    if (fx === 'trovao') {
      this._umaVez(a, 'erguer');
      await esperar(350);
      this._onda(a.raiz.position, 0xa8c8ff);
      this.tremer = 0.4;
      return esperar(300);
    }
    if (fx === 'furia') { this._umaVez(a, 'provocar'); this._faiscas(a.raiz.position, 0xff3a2a, 30, true); this._anelMagico(a.raiz.position, 0xff3a2a); return esperar(500); }
    if (fx === 'desafio') { this._umaVez(a, 'provocar'); if (b) this._flutuar(textoSprite('!', '#ff6a3a', 80), b.raiz.position); return esperar(500); }
    if (fx === 'marca') { if (b) { this._anelMagico(b.raiz.position, 0xff4a3a); this._flutuar(textoSprite('Marcado', '#ff8a5a', 40), b.raiz.position); } return esperar(400); }
    if (fx === 'esquivar') { this._umaVez(a, 'bloquear'); this._anelMagico(a.raiz.position, 0x8ac8ff); return esperar(400); }
    if (fx === 'ardil') { this._faiscas(a.raiz.position, 0xd0d0ff, 16, true); return esperar(250); }
    if (fx === 'bola') {
      this._umaVez(a, 'magia');
      await esperar(380);
      if (b) { await this._projetil('fogo', a, b); this._onda(b.raiz.position, 0xff7a1a, 1.8); this._faiscas(b.raiz.position, 0xffa040, 40, true); this.tremer = 0.4; }
      return esperar(250);
    }
    if (fx === 'chuva') {
      this._umaVez(a, 'besta');
      await esperar(300);
      if (b) await Promise.all([0, 1, 2, 3, 4].map((i) => esperar(i * 90).then(() => {
        const alvo = { raiz: { position: b.raiz.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 1.6, 0, (Math.random() - 0.5) * 1.6)) }, altura: 0.2, modelo: { userData: {} } };
        return this._projetil('virote', a, alvo);
      })));
      return;
    }
    if (fx === 'giro') {
      this._tocar(a, 'golpe2', false);
      const r0 = a.raiz.rotation.y;
      await this._tween(520, (t) => { a.raiz.rotation.y = r0 + facil(t) * Math.PI * 2; });
      this._onda(a.raiz.position, 0xffd0a0, 1.4);
      return;
    }
    if (fx === 'luz') {
      this._umaVez(a, 'magia');
      await esperar(300);
      if (b) {
        const raio = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.3, 4, 12, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff0a0, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
        raio.position.copy(b.raiz.position).setY(2); this.camadaFx.add(raio);
        this._faiscas(b.raiz.position, 0xfff0a0, 24, true);
        await this._tween(500, (t) => { raio.material.opacity = 0.7 * (1 - t); });
        this.camadaFx.remove(raio);
      }
      return;
    }
    if (fx === 'zombaria') { this._umaVez(a, 'provocar'); if (b) this._flutuar(textoSprite('Ha!', '#ffb0e0', 70), b.raiz.position); return esperar(450); }
    if (fx === 'palavra' || fx === 'impor' || fx === 'inspirar') { this._umaVez(a, 'magia'); if (b) this._faiscas(b.raiz.position, fx === 'inspirar' ? 0xffb0ff : 0xfff0a0, 22, true); return esperar(400); }
    if (fx === 'cura_massa' || fx === 'cancao' || fx === 'bencao' || fx === 'aura') { this._umaVez(a, 'erguer'); this._onda(a.raiz.position, fx === 'cancao' ? 0xffb0ff : 0xffe08a, fx === 'aura' ? 2.2 : 3); return esperar(450); }
    if (fx === 'divino') { this._umaVez(a, 'provocar'); this._anelMagico(a.raiz.position, 0xffe08a); return esperar(400); }
    if (fx === 'veneno') { this._umaVez(a, 'usar'); this._faiscas(a.raiz.position, 0x8aff5a, 22, true); return esperar(400); }
    if (fx === 'surto') { this._umaVez(a, 'provocar'); this._anelMagico(a.raiz.position, 0xffd36a); this._faiscas(a.raiz.position, 0xffe08a, 24, true); return esperar(450); }
    if (fx === 'procurar') { this._umaVez(a, 'interagir'); this._onda(a.raiz.position, 0xffe08a, 2.5); return esperar(500); }
    if (fx === 'pocao' || fx === 'balsamo' || fx === 'folego' || fx === 'levantar') { this._umaVez(a, fx === 'levantar' ? 'interagir' : 'usar'); return esperar(450); }
    return esperar(200);
  }

  async _projetil(fx, a, b, i = 0) {
    const ini = a.raiz.position.clone().add(new THREE.Vector3(0, (a.altura || 0.8) * 0.65, 0));
    const fim = b.raiz.position.clone().add(new THREE.Vector3(b.modelo.userData.pivo ? 0.5 : 0, (b.altura || 0.8) * 0.55, 0));
    let obj, luz = null, cor = 0xffffff, rastro = false;
    if (fx === 'virote' || fx === 'adaga') {
      obj = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.025, fx === 'adaga' ? 0.16 : 0.26), new THREE.MeshStandardMaterial({ color: fx === 'adaga' ? 0xd8d8e0 : 0x6b4a2a, metalness: 0.6 }));
    } else {
      cor = { fogo: 0xff7a1a, necro: 0x50ff90, missil: 0xb07aff }[fx] || 0xffffff;
      obj = new THREE.Sprite(new THREE.SpriteMaterial({ map: pontoTex(), color: cor, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
      obj.scale.setScalar(fx === 'missil' ? 0.18 : 0.32);
      luz = this.luzProj; luz.color.set(cor); luz.intensity = 3;
      rastro = true;
    }
    this.camadaFx.add(obj);
    const ms = fx === 'virote' ? 260 : fx === 'adaga' ? 300 : 420;
    const curva = fx === 'missil' ? (i - 1) * 0.6 : 0;
    const lado = new THREE.Vector3().subVectors(fim, ini).cross(new THREE.Vector3(0, 1, 0)).normalize();
    await this._tween(ms, (t) => {
      const p = ini.clone().lerp(fim, t);
      p.y += Math.sin(t * Math.PI) * (fx === 'virote' ? 0.08 : 0.3);
      p.addScaledVector(lado, Math.sin(t * Math.PI) * curva);
      obj.position.copy(p);
      if (luz) luz.position.copy(p);
      if (obj.isMesh) obj.lookAt(fim);
      if (fx === 'adaga') obj.rotation.x += 0.5;
      if (rastro && Math.random() < 0.6) this._faiscas(p, cor, 1, false, 0.12);
    });
    this.camadaFx.remove(obj);
    if (luz) luz.intensity = 0;
    this._faiscas(fim, cor === 0xffffff ? 0xd8c8a0 : cor, fx === 'fogo' ? 26 : 10);
  }

  _flutuar(sprite, pos) {
    sprite.position.copy(pos).add(new THREE.Vector3((Math.random() - 0.5) * 0.2, 1.05, 0));
    this.camadaFx.add(sprite);
    const y0 = sprite.position.y;
    this._tween(1100, (t) => { sprite.position.y = y0 + t * 0.55; sprite.material.opacity = t < 0.7 ? 1 : 1 - (t - 0.7) / 0.3; }).then(() => this.camadaFx.remove(sprite));
  }
  _faiscas(pos, cor, n, subir = false, vida = 0.6) {
    const mat = new THREE.SpriteMaterial({ map: pontoTex(), color: cor, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false });
    for (let i = 0; i < n; i++) {
      const s = new THREE.Sprite(mat);
      s.scale.setScalar(0.05 + Math.random() * 0.07);
      s.position.copy(pos);
      if (!subir) s.position.y += 0.4;
      const vel = new THREE.Vector3((Math.random() - 0.5) * 1.6, subir ? 0.6 + Math.random() * 1.2 : (Math.random() - 0.2) * 1.6, (Math.random() - 0.5) * 1.6);
      if (subir) { s.position.x += (Math.random() - 0.5) * 0.5; s.position.z += (Math.random() - 0.5) * 0.5; vel.x *= 0.15; vel.z *= 0.15; }
      this.camadaFx.add(s);
      const p0 = s.position.clone();
      const dur = (vida + Math.random() * 0.4) * 1000;
      this._tween(dur, (t) => { s.position.copy(p0).addScaledVector(vel, t * dur / 1000); if (!subir) s.position.y -= t * t * 0.5; s.material.opacity = 1 - t; }).then(() => this.camadaFx.remove(s));
    }
  }
  _anelMagico(pos, cor) {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.32, 40), new THREE.MeshBasicMaterial({ color: cor, transparent: true, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(pos.x, PISO + 0.03, pos.z);
    this.camadaFx.add(m);
    this._tween(900, (t) => { m.scale.setScalar(1 + t * 1.6); m.material.opacity = 1 - t; m.rotation.z = t * 2; }).then(() => this.camadaFx.remove(m));
  }
  _onda(pos, cor, raio = 1.6) {
    const m = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.05, 8, 40), new THREE.MeshBasicMaterial({ color: cor, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.rotation.x = -Math.PI / 2;
    m.position.set(pos.x, PISO + 0.3, pos.z);
    this.camadaFx.add(m);
    this._tween(600, (t) => { m.scale.setScalar(1 + t * raio * 2); m.material.opacity = 1 - t; }).then(() => this.camadaFx.remove(m));
  }
  _sinoBalanca(quebra) {
    for (const [, v] of this.un) {
      const pv = v.modelo && v.modelo.userData.pivo;
      if (!pv || v.morto) continue;
      this._tween(1600, (t) => { pv.rotation.z = Math.sin(t * Math.PI * 4) * 0.35 * (1 - t); });
      if (!quebra) this._onda(v.raiz.position.clone().add(new THREE.Vector3(0.5, 0, 0)), 0x50ff90, 3);
    }
  }

  // ----------------------------------------------------------- toque e tela
  casaNoToque(cx, cy) {
    const r = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.camera);
    // primeiro tenta acertar um personagem
    const alvos = [];
    for (const [id, v] of this.un) v.raiz.traverse((m) => { if (m.isMesh) { m.userData.uid = id; alvos.push(m); } });
    const hit = ray.intersectObjects(alvos, false)[0];
    if (hit) { const v = this.un.get(hit.object.userData.uid); if (v) return { x: Math.floor(v.raiz.position.x), y: Math.floor(v.raiz.position.z), uid: hit.object.userData.uid }; }
    this.mundo.updateMatrixWorld();
    const inv = new THREE.Matrix4().copy(this.mundo.matrixWorld).invert();
    const o = ray.ray.origin.clone().applyMatrix4(inv);
    const d = ray.ray.direction.clone().transformDirection(inv);
    if (Math.abs(d.y) < 1e-6) return null;
    const t = (PISO - o.y) / d.y;
    if (t < 0) return null;
    const p = o.addScaledVector(d, t);
    const x = Math.floor(p.x), y = Math.floor(p.z);
    if (x < 0 || y < 0 || x >= COLS || y >= LINHAS) return null;
    return { x, y };
  }
  posTela(id) {
    const v = this.un.get(id);
    if (!v || !this.raiz.visible) return null;
    const p = new THREE.Vector3(0, (v.altura || 0.8) + 0.35, 0);
    v.raiz.localToWorld(p);
    p.project(this.camera);
    if (p.z > 1) return null;
    return { x: (p.x + 1) / 2 * this.W, y: (1 - p.y) / 2 * this.H };
  }
  // A câmera da Mesa 3D acompanha o herói do jogador (dá para girar e dar zoom à vontade).
  seguir(id) {
    if (!this.alvoSeguir && this.modo !== 'ar') {
      // primeira vez: chega mais perto, com o grupo em volta ainda à vista
      const off = this.camera.position.clone().sub(this.controles.target).multiplyScalar(0.62);
      this.camera.position.copy(this.controles.target).add(off);
    }
    this.alvoSeguir = id;
  }
  _seguirQuadro(dt) {
    const v = this.alvoSeguir && this.un.get(this.alvoSeguir);
    if (!v || this.modo === 'ar') return;
    const desejado = v.raiz.position.clone().setY(0.3);
    const delta = desejado.sub(this.controles.target);
    if (delta.lengthSq() < 1e-6) return;
    delta.multiplyScalar(Math.min(1, dt * 3.5));
    this.controles.target.add(delta);
    this.camera.position.add(delta);
  }
  focar(id) {
    const v = this.un.get(id);
    if (!v || this.modo === 'ar') return;
    // desliza a câmera junto com o alvo, sem girar; puxa só até metade do caminho
    const ini = this.controles.target.clone();
    const alvo = new THREE.Vector3(COLS / 2, 0.2, LINHAS / 2).lerp(v.raiz.position.clone().setY(0.2), 0.5);
    const camIni = this.camera.position.clone();
    this._tween(600, (t) => {
      const k = facil(t);
      const p = ini.clone().lerp(alvo, k);
      this.camera.position.copy(camIni).add(p.clone().sub(ini));
      this.controles.target.copy(p);
    });
  }

  // ----------------------------------------------------------- laço
  _quadro() {
    const dt = Math.min(0.05, this.relogio.getDelta());
    const agora = performance.now();
    for (let i = this.anim.length - 1; i >= 0; i--) {
      const a = this.anim[i];
      const t = Math.min(1, (agora - a.ini) / a.ms);
      a.fn(t);
      if (t >= 1) { this.anim.splice(i, 1); a.ok(); }
    }
    for (const [, v] of this.un) {
      if (v.mixer) v.mixer.update(dt);
      if (v.anelVez && v.anelVez.visible) v.anelVez.material.opacity = 0.6 + Math.sin(agora / 200) * 0.35;
      if (v.modelo && v.modelo.userData.brilha && !v.modelo.userData.usado && Math.random() < 0.04) this._faiscas(v.raiz.position.clone().setY(PISO + 0.4), 0xffe08a, 1, true, 0.8);
      if (v.modelo && v.modelo.userData.badalo && !v.morto) v.modelo.userData.badalo.material.emissiveIntensity = 0.8 + Math.sin(agora / 300) * 0.6;
    }
    for (const l of this.luzesTremulas) l.intensity = l.userData.base * (0.85 + Math.sin(agora / 90 + l.position.x * 7) * 0.08 + Math.random() * 0.07);
    for (const m of this.destaques) if (m.userData.pulsa) m.material.opacity = 0.3 + Math.sin(agora / 180) * 0.12;
    if (this.anelSaida && this.anelSaida.visible) { this.anelSaida.userData.anel.rotation.z = agora / 900; this.anelSaida.children[1].material.opacity = 0.14 + Math.sin(agora / 300) * 0.06; }
    for (const w of this.agua) w.position.y = PISO - 0.03 + Math.sin(agora / 700 + w.position.x) * 0.006;
    if (this.fogueiras) for (const f of this.fogueiras) for (const c of f.userData.chamas) {
      c.f += dt * (0.9 + Math.random() * 0.3);
      if (c.f > 1) c.f = 0;
      c.s.position.set(Math.sin(c.f * 9 + c.s.id) * 0.06, (f.userData.chamaBase || 0.08) + c.f * 0.5, Math.cos(c.f * 7 + c.s.id) * 0.06);
      c.s.scale.setScalar(0.28 * (1 - c.f) + 0.04);
      if (f.userData.corVerde) c.s.material.color.setHSL(0.36 + c.f * 0.05, 1, 0.55 - c.f * 0.2);
      else c.s.material.color.setHSL(0.05 + c.f * 0.06, 1, 0.55 - c.f * 0.2);
      c.s.material.opacity = 1 - c.f;
    }
    if (this.particulas) this._moverParticulas(dt, agora);
    this._janelaQuadro(dt);
    this._moverLuzesPresas();
    this._ajustarResolucao(dt);
    if (this.modo !== 'ar') {
      this._seguirQuadro(dt);
      this.controles.update();
      if (this.tremer > 0) {
        this.tremer = Math.max(0, this.tremer - dt);
        this.camera.position.x += (Math.random() - 0.5) * this.tremer * 0.2;
        this.camera.position.y += (Math.random() - 0.5) * this.tremer * 0.2;
      }
    }
    this.renderer.render(this.cena, this.camera);
  }
  // Celular lento: baixa a resolução aos poucos até o jogo voltar a rodar liso.
  // Sobe de novo só se sobrar folga, e nunca acima de um nível que já engasgou.
  _ajustarResolucao(dt) {
    const d = this.desemp;
    if (document.hidden || this.carregandoCena) { d.soma = 0; d.n = 0; return; }
    d.soma += dt; d.n++;
    if (d.soma < 1.5) return;
    const media = d.soma / d.n * 1000;
    d.soma = 0; d.n = 0;
    let novo = this.pr;
    if (media > 26 && this.pr > 0.75) { d.teto = this.pr - 0.05; novo = Math.max(0.75, this.pr - 0.25); d.bons = 0; }
    else if (media < 18) { if (++d.bons >= 4 && this.pr + 0.25 <= Math.min(this.prMax, d.teto)) { novo = this.pr + 0.25; d.bons = 0; } }
    else d.bons = 0;
    if (novo !== this.pr) {
      this.pr = novo;
      this.renderer.setPixelRatio(novo);
      this.renderer.setSize(this.W, this.H, false);
    }
  }
  _moverParticulas(dt, agora) {
    const p = this.particulas, pos = p.obj.geometry.attributes.position;
    for (let i = 0; i < p.n; i++) {
      const v = p.vel[i];
      let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      if (p.tipo === 'neve') { y -= dt * (0.25 + v * 0.3); x += Math.sin(agora / 1000 + i) * dt * 0.15; if (y < PISO) y = 3; }
      else if (p.tipo === 'brasas') { y += dt * (0.2 + v * 0.3); x += Math.sin(agora / 400 + i) * dt * 0.1; if (y > 2.2) { y = PISO; x = 3 + Math.random() * 1.5; z = 1 + Math.random() * 3; } }
      else if (p.tipo === 'vagalumes') { x += Math.sin(agora / 900 + i * 3) * dt * 0.3; y = 0.4 + Math.sin(agora / 700 + i) * 0.3 + v * 0.5; z += Math.cos(agora / 1100 + i * 2) * dt * 0.3; }
      else { y += Math.sin(agora / 1500 + i) * dt * 0.03; x += dt * 0.04; if (x > COLS + 1) x = -1; }
      pos.setXYZ(i, x, y, z);
    }
    pos.needsUpdate = true;
    if (p.tipo === 'vagalumes') p.obj.material.opacity = 0.6 + Math.sin(agora / 300) * 0.3;
  }
}
