// RUNA — dicionário de marcadores: os 48 primeiros códigos do ArUco 4x4 (um por casa).
// Script clássico: usado no worker da câmera, na página de impressão e nos testes.
(function (g) {
  g.definirDicionarioRuna = function (AR) {
    if (AR.DICTIONARIES.RUNA48) return;
    var base = AR.DICTIONARIES.ARUCO_4X4_1000;
    // tau 2: aceita no máximo 1 bit lido errado por marcador
    AR.DICTIONARIES.RUNA48 = { nBits: 16, tau: 2, codeList: base.codeList.slice(0, 48) };
  };
})(typeof self !== 'undefined' ? self : globalThis);
