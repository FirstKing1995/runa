// RUNA — câmera + rastreamento do tabuleiro impresso.
// Liga a câmera traseira, manda quadros reduzidos ao worker, recebe os marcadores
// e entrega a pose do tabuleiro (já suavizada) para o mundo 3D.
import * as P from './pose.js';

const LARGURA_DETECCAO = 640;

export class Rastreador {
  constructor(video) {
    this.video = video;
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    this.worker = null;
    this.ocupado = false;
    this.ativo = false;
    this.focos = [];
    this.foco = null; // em pixels do vídeo
    this.ajusteLente = 1;
    this.ultimaPose = null;
    this.ultimoVisto = 0;
    this.marcadores = 0;
    this.ms = 0;
    this.buf = null;
    this.aoMudar = null;
  }

  async ligar() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('Este navegador não libera a câmera. Use o Chrome ou o Safari atualizado, pelo link https.');
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
    });
    this.video.srcObject = stream;
    this.video.setAttribute('playsinline', '');
    this.video.muted = true;
    await this.video.play();
    this.worker = new Worker(new URL('./ar-worker.js', import.meta.url));
    this.worker.onmessage = (m) => this._resultado(m.data);
    this.ativo = true;
    this._laco();
  }

  desligar() {
    this.ativo = false;
    const s = this.video.srcObject;
    if (s) s.getTracks().forEach((t) => t.stop());
    this.video.srcObject = null;
    if (this.worker) this.worker.terminate();
    this.worker = null;
    this.ultimaPose = null;
  }

  get vw() { return this.video.videoWidth || 1280; }
  get vh() { return this.video.videoHeight || 720; }
  focoAtual() {
    const base = this.foco || this.vw * 0.82;
    return base * this.ajusteLente;
  }

  _laco() {
    if (!this.ativo) return;
    requestAnimationFrame(() => this._laco());
    if (this.ocupado || this.video.readyState < 2) return;
    const esc = LARGURA_DETECCAO / this.vw;
    const w = Math.round(this.vw * esc), h = Math.round(this.vh * esc);
    if (this.canvas.width !== w) { this.canvas.width = w; this.canvas.height = h; }
    this.ctx.drawImage(this.video, 0, 0, w, h);
    const img = this.ctx.getImageData(0, 0, w, h);
    this.ocupado = true;
    this.escala = esc;
    this.worker.postMessage({ w, h, buf: img.data.buffer }, [img.data.buffer]);
  }

  _resultado(d) {
    this.ocupado = false;
    this.ms = d.ms;
    this.marcadores = d.marcadores.length;
    if (d.marcadores.length) {
      const esc = this.escala;
      const marc = d.marcadores.map((m) => ({ id: m.id, corners: m.corners.map((c) => ({ x: c.x / esc, y: c.y / esc })) }));
      const r = P.homografiaDosMarcadores(marc);
      if (r && r.erro < 6) {
        const cx = this.vw / 2, cy = this.vh / 2;
        if (r.n >= 6) {
          const f = P.focalDaHomografia(r.H, cx, cy);
          if (f && f > this.vw * 0.45 && f < this.vw * 1.8) {
            this.focos.push(f);
            if (this.focos.length > 40) this.focos.shift();
            const ord = this.focos.slice().sort((a, b) => a - b);
            if (ord.length >= 8) this.foco = ord[ord.length >> 1];
          }
        }
        const po = P.pose(r.H, this.focoAtual(), cx, cy);
        this.ultimaPose = po;
        this.ultimoVisto = performance.now();
      }
    }
    if (this.aoMudar) this.aoMudar(this);
  }

  get rastreando() { return this.ultimaPose && performance.now() - this.ultimoVisto < 900; }
}
