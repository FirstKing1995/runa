// RUNA — orientação do celular pelo giroscópio.
// A câmera lê o papel umas 20 vezes por segundo e com atraso; o giroscópio dá a rotação do
// celular a cada quadro. Juntando os dois, o tabuleiro fica parado no mundo e só a câmera gira.
// Guarda um histórico curto para casar a rotação com o instante de cada quadro do vídeo.
import * as THREE from 'three';

const GRAU = Math.PI / 180;
const Z = new THREE.Vector3(0, 0, 1);
// o celular olha para trás da tela: gira -90° em X (igual ao DeviceOrientationControls do three.js)
const PARA_TRAS = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5));

export class Giro {
  constructor() {
    this.hist = [];
    this.ligado = false;
    this._fn = (e) => this._ler(e);
    this._euler = new THREE.Euler();
    this._q0 = new THREE.Quaternion();
  }

  // Precisa ser chamado direto do toque do jogador (o iPhone pede permissão).
  async ligar() {
    if (typeof DeviceOrientationEvent === 'undefined') return false;
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      try { if (await DeviceOrientationEvent.requestPermission() !== 'granted') return false; } catch (e) { return false; }
    }
    window.addEventListener('deviceorientation', this._fn);
    this.ligado = true;
    return true;
  }
  desligar() {
    window.removeEventListener('deviceorientation', this._fn);
    this.ligado = false;
    this.hist = [];
  }
  // tem leitura recente? (computador e celular sem sensor nunca têm)
  get ativo() { return this.hist.length > 0 && performance.now() - this.hist[this.hist.length - 1].t < 500; }

  _ler(e) {
    if (e.alpha == null || e.beta == null || e.gamma == null) return;
    const tela = ((screen.orientation && screen.orientation.angle) || window.orientation || 0) * GRAU;
    this._euler.set(e.beta * GRAU, e.alpha * GRAU, -e.gamma * GRAU, 'YXZ');
    const q = new THREE.Quaternion().setFromEuler(this._euler);
    q.multiply(PARA_TRAS);
    q.multiply(this._q0.setFromAxisAngle(Z, -tela));
    const agora = performance.now();
    this.hist.push({ t: agora, q });
    while (this.hist.length > 2 && agora - this.hist[0].t > 1000) this.hist.shift();
  }

  // Rotação da câmera no instante t (interpolada entre as leituras vizinhas).
  em(t) {
    const h = this.hist;
    if (!h.length) return null;
    if (t <= h[0].t) return h[0].q.clone();
    for (let i = h.length - 1; i > 0; i--) {
      if (h[i - 1].t <= t) {
        const a = h[i - 1], b = h[i];
        if (t >= b.t) return b.q.clone();
        return a.q.clone().slerp(b.q, (t - a.t) / Math.max(1, b.t - a.t));
      }
    }
    return h[h.length - 1].q.clone();
  }
}
