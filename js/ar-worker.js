// RUNA — detector de marcadores rodando fora da tela principal (Web Worker).
importScripts('../vendor/cv.js', '../vendor/aruco.js', '../vendor/aruco_4x4_1000.js', 'dicionario.js');
self.definirDicionarioRuna(self.AR);
var detector = new self.AR.Detector({ dictionaryName: 'RUNA96' });

self.onmessage = function (m) {
  var d = m.data;
  var t0 = performance.now();
  var lista = [];
  try {
    var achados = detector.detectImage(d.w, d.h, new Uint8ClampedArray(d.buf));
    for (var i = 0; i < achados.length; i++) {
      var a = achados[i];
      if (a.id < 96) lista.push({ id: a.id, corners: a.corners.map(function (c) { return { x: c.x, y: c.y }; }) });
    }
  } catch (e) { /* quadro ruim: ignora */ }
  self.postMessage({ marcadores: lista, ms: performance.now() - t0, buf: d.buf, w: d.w, h: d.h }, [d.buf]);
};
