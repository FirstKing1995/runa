// RUNA — dicionário de marcadores: 96 códigos do ArUco 4x4_1000, um por casa (12 x 8).
// Escolhidos por tools/escolher-codigos.mjs: entre quaisquer dois, mesmo girados, há pelo menos
// 4 bits diferentes, então 1 bit lido errado ainda aponta a casa certa.
// Script clássico: usado no worker da câmera, na página de impressão e nos testes.
(function (g) {
  var INDICES = [955,449,118,191,158,179,230,51,14,597,26,708,198,45,120,30,504,577,165,56,755,58,173,100,510,633,204,680,210,224,552,718,541,340,673,170,350,714,647,264,262,53,152,248,641,32,162,677,167,892,947,417,126,13,547,442,65,971,690,658,486,24,101,479,163,967,318,203,865,868,757,483,105,782,193,358,494,800,242,390,557,617,306,509,38,39,63,793,733,839,147,364,108,626,559,361];
  g.RUNA_CASAS = INDICES.length;
  g.definirDicionarioRuna = function (AR) {
    if (AR.DICTIONARIES.RUNA96) return;
    var base = AR.DICTIONARIES.ARUCO_4X4_1000;
    // tau 2: aceita no máximo 1 bit lido errado por marcador
    AR.DICTIONARIES.RUNA96 = { nBits: 16, tau: 2, codeList: INDICES.map(function (i) { return base.codeList[i]; }) };
  };
})(typeof self !== 'undefined' ? self : globalThis);
