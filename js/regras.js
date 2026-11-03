// RUNA — motor de regras (d20, estilo D&D 5e simplificado).
// Script clássico, sem DOM: roda no navegador e no Google Apps Script (vira Regras.gs).
// Tudo que é aleatório sai de estado.semente, então o servidor é a fonte da verdade.
var RUNA = (typeof RUNA !== 'undefined' && RUNA) || {};

(function (R) {
  R.VERSAO_REGRAS = 2;
  R.XP_NIVEL = [0, 400, 1100, 3000, 5200];
  // Tabuleiro impresso (4 folhas A4): a "janela" de 12 x 8 casas que cada celular mostra.
  // Os mapas das cenas podem ser maiores: a janela acompanha o herói de cada jogador.
  R.COLS = 12;
  R.LINHAS = 8;
  var MAX_EVENTOS = 90;

  // ------------------------------------------------------------- utilidades
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  R.clone = clone;
  function rnd(e) {
    var t = (e.semente = (e.semente + 0x6D2B79F5) | 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function d(e, n) { return 1 + Math.floor(rnd(e) * n); }
  function escolha(e, lista) { return lista[Math.floor(rnd(e) * lista.length)]; }
  // "2d6+3" -> { total, dados: [..], mod }
  function rolar(e, expr, critico) {
    var m = /^(\d+)d(\d+)([+-]\d+)?$/.exec(String(expr).replace(/\s/g, ''));
    if (!m) { var n = parseInt(expr, 10) || 0; return { total: n, dados: [], mod: n }; }
    var q = parseInt(m[1], 10) * (critico ? 2 : 1), f = parseInt(m[2], 10), mod = parseInt(m[3] || '0', 10);
    var dados = [], t = 0;
    for (var i = 0; i < q; i++) { var v = d(e, f); dados.push(v); t += v; }
    return { total: Math.max(0, t + mod), dados: dados, mod: mod };
  }
  R.rolarTeste = rolar;
  function chave(x, y) { return x + ',' + y; }
  function dist(a, b) { return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)); }
  R.dist = dist;
  // tamanho do mapa da cena atual (colunas, linhas)
  R.dims = function (e) { var c = R.cena(e); return c ? [c.mapa[0].length, c.mapa.length] : [R.COLS, R.LINHAS]; };
  function dentro(e, x, y) { var c = R.cena(e); return c && x >= 0 && y >= 0 && y < c.mapa.length && x < c.mapa[0].length; }
  R.nomeCasa = function (x, y) { return 'ABCDEFGH'.charAt(x) + (y + 1); };
  function mod(v) { return v >= 0 ? '+' + v : String(v); }

  function ev(e, o) {
    e.seq = (e.seq || 0) + 1;
    o.n = e.seq;
    e.eventos.push(o);
    if (e.eventos.length > MAX_EVENTOS) e.eventos.splice(0, e.eventos.length - MAX_EVENTOS);
    return o;
  }

  R.capitulo = function (e) { return R.CAPITULOS[e.cap] || R.CAPITULOS.sino; };
  R.cenasDe = function (e) { return R.capitulo(e).cenas; };
  R.cena = function (e) { return R.cenasDe(e)[e.cenaIdx] || null; };

  // ---------------------------------------------------------------- estado
  R.novoEstado = function (sala, jogador, nome, semente, cap) {
    var capi = R.CAPITULOS[cap] || R.CAPITULOS.sino;
    var e = {
      cap: capi.id,
      versao: 0, regras: R.VERSAO_REGRAS, sala: sala, host: jogador,
      semente: (semente | 0) || 12345, fase: 'lobby', criado: Date.now(),
      jogadores: {}, u: {}, ordemHerois: [], flags: {}, mortos: {}, disp: {},
      inv: {}, ouro: 0, xp: 0, nivel: 1, cenaIdx: -1, combate: null, dialogo: null,
      objetivo: '', saida: false, armadilhas: {}, eventos: [], seq: 0, fotoCena: null
    };
    e.jogadores[jogador] = { nome: nome || 'Anfitrião' };
    if (capi.nivelInicial > 1) { e.nivel = capi.nivelInicial; e.xp = R.XP_NIVEL[capi.nivelInicial - 1]; e.ouro = capi.ouroInicial || 0; }
    return e;
  };
  // Novo capítulo com o mesmo grupo: heróis, nível, ouro e itens seguem; escolhas viram lembranças (c1_...).
  R.continuarEstado = function (antigo, sala, cap, semente) {
    var e = R.novoEstado(sala, antigo.host, '', semente, cap);
    e.jogadores = clone(antigo.jogadores);
    e.xp = Math.max(e.xp, antigo.xp); e.nivel = Math.max(e.nivel, antigo.nivel); e.ouro = antigo.ouro;
    e.inv = clone(antigo.inv); delete e.inv.chave;
    var lembrar = R.capitulo(antigo).lembrar || [];
    lembrar.forEach(function (f) { if (antigo.flags[f]) e.flags['c1_' + f] = true; });
    e.origem = antigo.sala;
    antigo.ordemHerois.forEach(function (id) {
      var v = antigo.u[id];
      if (!v) return;
      var h = novoHeroi(v.classe, v.nome, v.dono);
      heroiNoNivel(h, e.nivel);
      h.memoria = v.memoria || 0;
      h.pvMax = Math.max(4, h.pvMax - h.memoria); h.pv = h.pvMax;
      e.u[id] = h; e.ordemHerois.push(id);
    });
    return e;
  };

  // ----------------------------------------------------------------- mapa
  R.terreno = function (e, x, y) {
    var c = R.cena(e);
    if (!c || !dentro(e, x, y)) return { b: 1, o: 1, fora: true };
    var ch = c.mapa[y].charAt(x);
    var t = { ch: ch, b: 0, o: 0, dificil: 0, saida: 0 };
    if (ch === '#') { t.b = 1; t.o = 1; }
    else if (ch === '~') t.dificil = 1;
    else if (ch === 'S') t.saida = 1;
    else if (ch !== '.' && ch !== '^') {
      var l = (c.legenda || {})[ch] || {};
      t.b = l.b ? 1 : 0; t.o = l.o ? 1 : 0;
    }
    var a = e.armadilhas[chave(x, y)];
    if (a && !a.desarmada) t.armadilha = a;
    return t;
  };

  function ativa(u) { return u && !u.oculto && !u.morto; }
  // Há algum objeto deste tipo ainda não usado na cena? (ex.: braseiros acesos)
  function objetoAtivo(e, tipo) {
    for (var id in e.u) if (e.u[id].obj === tipo && !e.u[id].usado) return true;
    return false;
  }
  R.objetoAtivo = objetoAtivo;
  function bloqueia(u) { return ativa(u) && (u.lado !== 'objeto' || u.bloqueia); }
  R.ocupante = function (e, x, y, ignorar) {
    for (var id in e.u) {
      var u = e.u[id];
      if (id !== ignorar && bloqueia(u) && u.x === x && u.y === y) return u;
    }
    return null;
  };
  function mesmoLado(a, b) { return a.lado === b.lado && (a.lado === 'heroi' || a.lado === 'inimigo'); }

  // Dijkstra em 8 direções. Diagonal não corta quina de parede.
  R.custos = function (e, uid, limite) {
    var u = e.u[uid];
    var distm = {}, prev = {}, aberto = [chave(u.x, u.y)];
    distm[aberto[0]] = 0;
    if (limite == null) limite = 99;
    while (aberto.length) {
      var mi = 0;
      for (var i = 1; i < aberto.length; i++) if (distm[aberto[i]] < distm[aberto[mi]]) mi = i;
      var k = aberto.splice(mi, 1)[0], p = k.split(','), cx = +p[0], cy = +p[1];
      for (var dx = -1; dx <= 1; dx++) for (var dy = -1; dy <= 1; dy++) {
        if (!dx && !dy) continue;
        var nx = cx + dx, ny = cy + dy;
        if (!dentro(e, nx, ny)) continue;
        var t = R.terreno(e, nx, ny);
        if (t.b) continue;
        if (dx && dy && (R.terreno(e, cx + dx, cy).b || R.terreno(e, cx, cy + dy).b)) continue;
        var oc = R.ocupante(e, nx, ny, uid);
        if (oc && !mesmoLado(u, oc) && !(oc.lado === 'heroi' && oc.caido)) continue; // dá para passar por cima de um herói caído
        var nd = distm[k] + (t.dificil || (t.armadilha && t.armadilha.revelada) ? 2 : 1);
        if (nd > limite) continue;
        var nk = chave(nx, ny);
        if (distm[nk] == null || nd < distm[nk]) {
          if (distm[nk] == null) aberto.push(nk);
          distm[nk] = nd; prev[nk] = k;
        }
      }
    }
    return { dist: distm, prev: prev };
  };
  function caminhoAte(mapa, x, y) {
    var k = chave(x, y), cam = [];
    if (mapa.dist[k] == null) return null;
    while (k) { var p = k.split(','); cam.unshift([+p[0], +p[1]]); k = mapa.prev[k]; }
    return cam;
  }
  // Casas para onde a unidade pode ir agora: { "x,y": custo }
  R.destinos = function (e, uid) {
    var u = e.u[uid];
    var lim = R.movRestante(e, uid);
    var m = R.custos(e, uid, lim), out = {};
    for (var k in m.dist) {
      var p = k.split(',');
      if (m.dist[k] > 0 && !R.ocupante(e, +p[0], +p[1], uid)) out[k] = m.dist[k];
    }
    return out;
  };
  R.movRestante = function (e, uid) {
    if (!e.combate) return 30;
    var cur = e.combate.ordem[e.combate.i];
    return cur === uid ? e.combate.mov : 0;
  };

  R.visao = function (e, a, b) {
    var ax = a.x + 0.5, ay = a.y + 0.5, bx = b.x + 0.5, by = b.y + 0.5;
    var n = Math.ceil(Math.max(Math.abs(bx - ax), Math.abs(by - ay)) * 4);
    for (var i = 1; i < n; i++) {
      var x = Math.floor(ax + (bx - ax) * i / n), y = Math.floor(ay + (by - ay) * i / n);
      if ((x === a.x && y === a.y) || (x === b.x && y === b.y)) continue;
      if (R.terreno(e, x, y).o) return false;
    }
    return true;
  };

  // ------------------------------------------------------------- unidades
  function novoHeroi(classe, nome, dono) {
    var c = R.CLASSES[classe];
    return {
      id: 'h_' + classe, lado: 'heroi', classe: classe, nome: nome || c.heroi, vis: c.vis, dono: dono,
      x: 0, y: 0, pv: c.pv, pvMax: c.pv, ca: c.ca, desl: c.desl, nivel: 1,
      usos: {}, magia: c.magia || 0, efeitos: {}, caido: false
    };
  }
  function novoMonstro(def, id, x, y) {
    var m = R.MONSTROS[def.m];
    return {
      id: id, lado: 'inimigo', tipo: def.m, nome: m.nome, vis: m.vis, x: x, y: y,
      pv: m.pv, pvMax: m.pv, ca: m.ca, desl: m.desl, efeitos: {}, oculto: !!def.oculto,
      dialogo: def.dialogo || null
    };
  }
  function atr(u, a) {
    if (u.lado === 'heroi') return R.CLASSES[u.classe].atr[a] || 0;
    return a === 'des' ? (R.MONSTROS[u.tipo] ? R.MONSTROS[u.tipo].iniciativa : 0) : 1;
  }
  R.ataquesDe = function (u) {
    if (u.lado === 'heroi') return R.CLASSES[u.classe].ataques;
    if (R.MONSTROS[u.tipo]) return R.MONSTROS[u.tipo].ataques;
    return [];
  };
  R.habsDe = function (u) {
    if (u.lado !== 'heroi') return [];
    var nv = u.nivel || 1;
    return R.CLASSES[u.classe].habs.concat(R.HABS_COMUNS).filter(function (k) { return !R.HABS[k].nivel || nv >= R.HABS[k].nivel; });
  };
  function bonusNivel(e) { return e.nivel >= 5 ? 2 : e.nivel >= 3 ? 1 : 0; }
  function magiaExtra(n) { return (n >= 2 ? 1 : 0) + (n >= 5 ? 1 : 0); }
  R.magiaExtra = magiaExtra;
  function heroiNoNivel(h, n) {
    var c = R.CLASSES[h.classe];
    h.nivel = n; h.pvMax = c.pv + (n - 1) * c.pvNivel; h.pv = h.pvMax;
    h.magia = (c.magia || 0) + magiaExtra(n);
  }
  R.bonusNivel = bonusNivel;
  function hostil(u) { return ativa(u) && u.lado === 'inimigo' && !u.pacifico && !u.rendido; }
  function inimigosAtivos(e) {
    var l = [];
    for (var id in e.u) if (ativa(e.u[id]) && e.u[id].lado === 'inimigo') l.push(e.u[id]);
    return l;
  }
  function herois(e) {
    var l = [];
    for (var i = 0; i < e.ordemHerois.length; i++) if (e.u[e.ordemHerois[i]]) l.push(e.u[e.ordemHerois[i]]);
    return l;
  }
  R.herois = herois;
  function heroisDePe(e) { return herois(e).filter(function (h) { return !h.caido; }); }

  function casaLivreProxima(e, x, y) {
    if (dentro(e, x, y) && !R.terreno(e, x, y).b && !R.ocupante(e, x, y)) return [x, y];
    for (var r = 1; r < 12; r++)
      for (var dx = -r; dx <= r; dx++) for (var dy = -r; dy <= r; dy++) {
        var nx = x + dx, ny = y + dy;
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r || !dentro(e, nx, ny)) continue;
        var t = R.terreno(e, nx, ny);
        if (!t.b && !t.saida && !R.ocupante(e, nx, ny)) return [nx, ny];
      }
    return [x, y];
  }

  // ------------------------------------------------------------- nível/xp
  function ganharXp(e, n) {
    if (!n) return;
    e.xp += n;
    var nv = 1;
    for (var i = 1; i < R.XP_NIVEL.length; i++) if (e.xp >= R.XP_NIVEL[i]) nv = i + 1;
    var TXT = { 2: ', mais magia e mais usos de habilidade.', 3: ' e +1 em ataques e dano.', 4: ' e uma habilidade nova para cada classe.', 5: ', mais magia e +2 em ataques e dano.' };
    while (e.nivel < nv) {
      e.nivel++;
      herois(e).forEach(function (h) {
        var c = R.CLASSES[h.classe];
        h.pvMax += c.pvNivel; h.pv += c.pvNivel; h.nivel = e.nivel;
        if (c.magia && (e.nivel === 2 || e.nivel === 5)) h.magia += 1;
      });
      ev(e, { t: 'nivel', nivel: e.nivel, texto: 'O grupo alcançou o nível ' + e.nivel + '! Mais vida' + (TXT[e.nivel] || '.') });
    }
  }

  // ----------------------------------------------------------------- dano
  function curar(e, alvo, n, fonte) {
    var antes = alvo.pv;
    alvo.pv = Math.min(alvo.pvMax, alvo.pv + n);
    if (alvo.caido && alvo.pv > 0) alvo.caido = false;
    ev(e, { t: 'cura', alvo: alvo.id, de: fonte || alvo.id, valor: alvo.pv - antes, pv: alvo.pv });
  }
  function aplicarDano(e, alvo, n, tipo, fonte) {
    if (alvo.lado === 'heroi') {
      if (alvo.efeitos.furia) n = Math.floor(n / 2);
      if (alvo.efeitos.aura) n = Math.max(0, n - 3);
      if (tipo === 'necro' && e.inv.amuleto) n = Math.max(0, n - 3);
    }
    var mdef = alvo.lado === 'inimigo' ? R.MONSTROS[alvo.tipo] : null;
    if (mdef) {
      if (mdef.duro && tipo !== 'trovao' && tipo !== 'forca') n = Math.max(1, n - mdef.duro);
      if (mdef.protegido && objetoAtivo(e, mdef.protegido)) n = Math.max(1, Math.floor(n / 2));
      if (tipo === 'fogo' && alvo.efeitos) alvo.efeitos.queimado = true;
    }
    alvo.pv -= n;
    ev(e, { t: 'dano', alvo: alvo.id, de: fonte, valor: n, pv: Math.max(0, alvo.pv), tipo: tipo || '' });
    if (alvo.lado === 'heroi') {
      // fora de combate (armadilha, agulha envenenada) ninguém cai: escapa por pouco com 1 PV
      if (alvo.pv <= 0 && !e.combate) { alvo.pv = 1; ev(e, { t: 'narra', texto: alvo.nome + ' cambaleia, mas fica de pé por pouco.' }); return; }
      if (alvo.pv <= 0) {
        alvo.pv = 0;
        if (!alvo.caido) { alvo.caido = true; ev(e, { t: 'caiu', alvo: alvo.id, texto: alvo.nome + ' caiu! Um aliado precisa levantá-lo.' }); }
      }
      return;
    }
    var m = R.MONSTROS[alvo.tipo];
    if (m && m.rende && alvo.pv > 0 && alvo.pv <= m.rende && !alvo.rendido) {
      alvo.rendido = true;
      e.flags[alvo.tipo + '_rendeu'] = true;
      ev(e, { t: 'rende', alvo: alvo.id });
      return;
    }
    if (alvo.pv <= 0) matar(e, alvo);
  }
  function matar(e, u) {
    u.pv = 0; u.morto = true; e.mortos[u.id] = true;
    ev(e, { t: 'morte', alvo: u.id });
    if (u.lado === 'inimigo' && R.MONSTROS[u.tipo]) ganharXp(e, R.MONSTROS[u.tipo].xp);
    delete e.u[u.id];
  }

  // -------------------------------------------------------------- ataques
  function inimigoAdjacente(e, u) {
    for (var id in e.u) {
      var o = e.u[id];
      if (!ativa(o) || dist(o, u) !== 1) continue;
      if (u.lado === 'heroi' ? hostil(o) : (o.lado === 'heroi' && !o.caido)) return true;
    }
    return false;
  }
  function vantagem(e, at, alvo, atq) {
    var v = 0;
    if (alvo.efeitos && alvo.efeitos.esquiva) v--;
    if (atq.alc > 1 && inimigoAdjacente(e, at)) v--;
    if (at.efeitos && at.efeitos.zombado) { v--; delete at.efeitos.zombado; }
    if (alvo.lado === 'heroi' && alvo.caido) v++;
    if (at.lado === 'inimigo' && R.MONSTROS[at.tipo] && R.MONSTROS[at.tipo].matilha) {
      for (var id in e.u) {
        var o = e.u[id];
        if (o !== at && hostil(o) && dist(o, alvo) === 1) { v++; break; }
      }
    }
    return v > 0 ? 1 : v < 0 ? -1 : 0;
  }
  function aliadoAoLado(e, at, alvo) {
    for (var id in e.u) {
      var o = e.u[id];
      if (o !== at && o.lado === 'heroi' && !o.caido && dist(o, alvo) === 1) return true;
    }
    return false;
  }
  function rolarD20(e, v) {
    var a = d(e, 20), b = d(e, 20);
    var nat = v > 0 ? Math.max(a, b) : v < 0 ? Math.min(a, b) : a;
    return { nat: nat, dados: v ? [a, b] : [a], vant: v };
  }

  // Resolve um ataque com rolagem. fx/anim vão para a animação no celular.
  function atacar(e, at, alvo, atq, extra) {
    extra = extra || {};
    var v = vantagem(e, at, alvo, atq);
    var r = rolarD20(e, v);
    var bon = (atq.b || 0) + (at.lado === 'heroi' ? bonusNivel(e) + (e.flags.lamina_estelar ? 1 : 0) : 0);
    if (at.efeitos && at.efeitos.bencao) bon += 2;
    if (at.efeitos && at.efeitos.inspirado) { bon += d(e, 6); delete at.efeitos.inspirado; }
    var total = r.nat + bon;
    var ca = alvo.ca || 10;
    var crit = r.nat === 20;
    var acerto = crit || (r.nat !== 1 && total >= ca);
    var o = { t: 'ataque', de: at.id, alvo: alvo.id, arma: atq.n, anim: atq.anim || 'golpe', fx: atq.fx || '', nat: r.nat, dados: r.dados, vant: v, bonus: bon, total: total, ca: ca, acerto: acerto, critico: crit };
    ev(e, o);
    if (!acerto) return o;
    var dano = rolar(e, atq.d, crit).total + (at.lado === 'heroi' ? bonusNivel(e) : 0);
    var notas = [];
    if (at.lado === 'heroi') {
      if (at.efeitos.furia && atq.alc === 1) { dano += 2; notas.push('fúria'); }
      if (at.efeitos.marca === alvo.id) { dano += rolar(e, '1d6', crit).total; notas.push('marca'); }
      var cls = R.CLASSES[at.classe];
      if (cls.furtivo && e.combate && !e.combate.furtivo && v >= 0 && (v > 0 || aliadoAoLado(e, at, alvo))) {
        dano += rolar(e, e.nivel >= 5 ? '3d6' : e.nivel >= 3 ? '2d6' : '1d6', crit).total; e.combate.furtivo = true; notas.push('furtivo');
      }
      if (at.efeitos.veneno) { dano += rolar(e, '2d6', crit).total; delete at.efeitos.veneno; notas.push('veneno'); }
      if (at.efeitos.divino && atq.alc === 1) {
        var morto = alvo.lado === 'inimigo' && R.MONSTROS[alvo.tipo] && R.MONSTROS[alvo.tipo].mv;
        dano += rolar(e, morto ? '3d8' : '2d8', crit).total; delete at.efeitos.divino; notas.push('golpe divino');
      }
      if (e.flags.lamina_estelar) { dano += rolar(e, '1d4', crit).total; notas.push('aço estelar'); }
      if (e.inv.oleo && alvo.lado === 'inimigo' && R.MONSTROS[alvo.tipo] && R.MONSTROS[alvo.tipo].mv) { dano += rolar(e, '1d4', crit).total; notas.push('prata'); }
      if (alvo.lado === 'objeto' && alvo.obj === 'sino' && e.flags.segredo_sino) { dano *= 2; notas.push('ponto fraco'); }
    }
    if (extra.dano) dano += extra.dano;
    o.notas = notas;
    aplicarDano(e, alvo, Math.max(1, dano), atq.tipo, at.id);
    return o;
  }

  // ----------------------------------------------------------- gatilhos
  function cond(e, s) {
    if (!s) return true;
    if (s.qualquer) { for (var i = 0; i < s.qualquer.length; i++) if (cond(e, s.qualquer[i])) return true; return false; }
    if (s.flag && !e.flags[s.flag]) return false;
    if (s.flags) for (var j = 0; j < s.flags.length; j++) if (!e.flags[s.flags[j]]) return false;
    if (s.semFlag && e.flags[s.semFlag]) return false;
    if (s.min && !((e.flags[s.min[0]] | 0) >= s.min[1])) return false;
    if (s.vivo && !(e.u[s.vivo] && ativa(e.u[s.vivo]))) return false;
    if (s.todosUsados && objetoAtivo(e, s.todosUsados)) return false;
    if (s.morto && !e.mortos[s.morto]) return false;
    if (s.semInimigos && (inimigosAtivos(e).length || e.combate)) return false;
    if (s.area) {
      var a = s.area, ok = false;
      heroisDePe(e).forEach(function (h) { if (h.x >= a[0] && h.y >= a[1] && h.x <= a[2] && h.y <= a[3]) ok = true; });
      if (!ok) return false;
    }
    return true;
  }
  function verificarGatilhos(e) {
    var c = R.cena(e);
    if (!c || e.fase !== 'jogo') return;
    for (var volta = 0; volta < 10; volta++) {
      var disparou = false;
      for (var i = 0; i < c.gatilhos.length; i++) {
        var g = c.gatilhos[i];
        if (e.disp[g.id] || !cond(e, g.se)) continue;
        e.disp[g.id] = 1; disparou = true;
        executar(e, g.faz, {});
        if (e.cenaIdx !== R.cenasDe(e).indexOf(c) || e.fase !== 'jogo') return;
      }
      if (!disparou) return;
    }
  }

  function darItem(e, k, n) {
    e.inv[k] = (e.inv[k] || 0) + n;
    if (e.inv[k] <= 0) delete e.inv[k];
    ev(e, { t: 'item', item: k, qtd: n, texto: (n > 0 ? 'Recebido: ' : 'Perdido: ') + R.ITENS[k].n + (Math.abs(n) > 1 ? ' x' + Math.abs(n) : '') });
  }

  function executar(e, acoes, ctx) {
    for (var i = 0; i < (acoes || []).length; i++) {
      var a = acoes[i];
      if (a.narrar) ev(e, { t: 'narra', texto: a.narrar });
      if (a.falar) {
        var u = e.u[a.falar[0]];
        ev(e, { t: 'fala', quem: a.falar[0], nome: u ? u.nome : a.falar[0], vis: u ? u.vis : '', texto: a.falar[1] });
      }
      if (a.som) ev(e, { t: 'som', som: a.som });
      if (a.flag) e.flags[a.flag] = true;
      if (a.conta) e.flags[a.conta] = (e.flags[a.conta] | 0) + 1;
      if (a.revelar) for (var ka in e.armadilhas) if (!e.armadilhas[ka].revelada) { var pa = ka.split(','); e.armadilhas[ka].revelada = true; ev(e, { t: 'armadilha', revela: true, x: +pa[0], y: +pa[1] }); }
      if (a.danoArea) {
        var da = a.danoArea;
        inimigosAtivos(e).filter(function (m) { return m.x >= da[0] && m.y >= da[1] && m.x <= da[2] && m.y <= da[3]; }).forEach(function (m) { aplicarDano(e, m, rolar(e, da[4]).total, da[5] || '', ctx.heroi || null); });
      }
      if (a.objetivo) { e.objetivo = a.objetivo; ev(e, { t: 'objetivo', texto: a.objetivo }); }
      if (a.saida) { e.saida = true; ev(e, { t: 'saida', x: R.cena(e).saida[0], y: R.cena(e).saida[1] }); }
      if (a.xp) ganharXp(e, a.xp);
      if (a.ouro) { e.ouro = Math.max(0, e.ouro + a.ouro); ev(e, { t: 'ouro', qtd: a.ouro, total: e.ouro }); }
      if (a.item) darItem(e, a.item[0], a.item[1]);
      if (a.tirarItem) darItem(e, a.tirarItem, -1);
      if (a.surgir) a.surgir.forEach(function (id) {
        var s = e.u[id];
        if (!s || !s.oculto) return;
        var p = casaLivreProxima(e, s.x, s.y);
        s.x = p[0]; s.y = p[1]; s.oculto = false;
        ev(e, { t: 'surge', id: id, x: s.x, y: s.y });
      });
      if (a.remover) a.remover.forEach(function (id) { if (id === '$objeto') id = ctx.objeto; if (e.u[id]) { delete e.u[id]; ev(e, { t: 'remover', id: id }); } });
      if (a.flagObjeto && ctx.objeto) e.flags[ctx.objeto] = true;
      if (a.fugir) a.fugir.forEach(function (id) { if (e.u[id]) { delete e.u[id]; ev(e, { t: 'foge', id: id }); } });
      if (a.custoMemoria && ctx.heroi) {
        var h = e.u[ctx.heroi];
        h.pvMax = Math.max(4, h.pvMax - a.custoMemoria); h.pv = Math.min(h.pv, h.pvMax);
        h.memoria = (h.memoria || 0) + a.custoMemoria;
        ev(e, { t: 'narra', texto: 'Mãe Lodo encosta o dedo na testa de ' + h.nome + '. Uma lembrança feliz some para sempre. (' + h.nome + ' perde ' + a.custoMemoria + ' PV máximos.)' });
      }
      if (a.danoHeroi && ctx.heroi) aplicarDano(e, e.u[ctx.heroi], rolar(e, a.danoHeroi).total, '', null);
      if (a.virar && ctx.objeto && e.u[ctx.objeto]) e.u[ctx.objeto].virado = true;
      if (a.curarTodos) herois(e).forEach(function (h) { curar(e, h, h.pvMax, null); });
      if (a.matarTodos) inimigosAtivos(e).slice().forEach(function (m) { matar(e, m); });
      if (a.combate) iniciarCombate(e);
      if (a.final) {
        e.fase = 'fim'; e.combate = null; e.dialogo = null;
        ev(e, { t: 'final', textos: R.capitulo(e).epilogo(e.flags), cap: e.cap });
        return;
      }
    }
  }

  // ------------------------------------------------------------- cenas
  function carregarCena(e, idx, foto) {
    var c = R.cenasDe(e)[idx];
    e.cenaIdx = idx; e.combate = null; e.dialogo = null; e.disp = {}; e.mortos = {};
    e.saida = false; e.objetivo = c.objetivo; e.armadilhas = {};
    for (var id in e.u) if (e.u[id].lado !== 'heroi') delete e.u[id];
    if (foto) {
      e.inv = foto.inv; e.ouro = foto.ouro; e.flags = foto.flags; e.xp = foto.xp; e.nivel = foto.nivel;
      foto.herois.forEach(function (h) { if (e.u[h.id]) { var dono = e.u[h.id].dono; e.u[h.id] = h; h.dono = dono; } });
    }
    for (var y = 0; y < c.mapa.length; y++) for (var x = 0; x < c.mapa[0].length; x++)
      if (c.mapa[y].charAt(x) === '^') e.armadilhas[chave(x, y)] = { revelada: false, desarmada: false };
    var hs = herois(e);
    hs.forEach(function (h) { h.x = -9; h.y = -9; });
    hs.forEach(function (h, i) {
      var ent = c.entrada[Math.min(i, c.entrada.length - 1)];
      var p = casaLivreProxima(e, ent[0], ent[1]);
      h.x = p[0]; h.y = p[1];
      h.pv = h.pvMax; h.caido = false; h.efeitos = {}; h.usos = {};
      R.habsDe(h).forEach(function (k) { if (R.HABS[k].usos) h.usos[k] = R.HABS[k].usos + (e.nivel >= 2 ? 1 : 0); });
      h.magia = (R.CLASSES[h.classe].magia || 0) + magiaExtra(e.nivel);
    });
    var n = hs.length;
    c.unidades.forEach(function (def) {
      if (def.min && n < def.min) return;
      var u;
      if (def.m) {
        u = novoMonstro(def, def.id, def.x, def.y);
        if (c.pacifico) u.pacifico = true;
        // grupo pequeno, ou derrotas seguidas na mesma cena: inimigos mais frágeis
        var k = (n === 1 ? 0.7 : n > 5 ? 1 + 0.15 * (n - 5) : 1) * (1 - Math.min(0.4, 0.1 * ((e.tentativas || {})[idx] || 0)));
        if (k < 1) u.pv = u.pvMax = Math.max(1, Math.ceil(u.pvMax * k));
      }
      else if (def.npc) {
        var np = R.NPCS[def.npc];
        u = { id: def.id, lado: 'npc', npc: def.npc, nome: np.nome, vis: np.vis, x: def.x, y: def.y, dialogo: def.dialogo, pose: def.pose || np.pose || '', oculto: !!def.oculto };
      } else if (def.obj) {
        var ob = R.OBJETOS[def.obj];
        u = { id: def.id, lado: 'objeto', obj: def.obj, nome: ob.nome, vis: ob.vis, x: def.x, y: def.y, bloqueia: ob.bloqueia !== false, efeitos: {} };
        if (ob.alvoPv) { u.pv = u.pvMax = ob.pv; u.ca = ob.ca; u.alvoPv = true; }
      }
      e.u[u.id] = u;
    });
    e.fotoCena = { herois: clone(hs), inv: clone(e.inv), ouro: e.ouro, flags: clone(e.flags), xp: e.xp, nivel: e.nivel };
    ev(e, { t: 'cena', idx: idx, id: c.id, titulo: c.titulo, sub: c.sub });
    executar(e, c.inicio, {});
    verificarGatilhos(e);
  }
  R._carregarCena = carregarCena;

  // ----------------------------------------------------------- combate
  function iniciarCombate(e) {
    var novos = [];
    inimigosAtivos(e).forEach(function (m) { m.pacifico = false; });
    var jaNa = e.combate ? e.combate.ordem : [];
    var part = herois(e).concat(inimigosAtivos(e)).filter(function (u) { return jaNa.indexOf(u.id) < 0; });
    part.forEach(function (u) { u.ini = d(e, 20) + atr(u, 'des'); novos.push(u); });
    if (e.combate) {
      novos.forEach(function (u) { e.combate.ordem.push(u.id); });
      return;
    }
    novos.sort(function (a, b) { return b.ini - a.ini || (a.lado === 'heroi' ? -1 : 1); });
    e.combate = { ordem: novos.map(function (u) { return u.id; }), i: -1, rodada: 1, mov: 0, acao: 0, bonus: 0, furtivo: false };
    ev(e, { t: 'combate', inicio: true, ordem: novos.map(function (u) { return { id: u.id, ini: u.ini }; }) });
    e._proximo = true;
  }

  function fimCombateSePreciso(e) {
    if (!e.combate) return false;
    if (heroisDePe(e).length === 0) { derrota(e); return true; }
    var algum = inimigosAtivos(e).some(hostil);
    if (algum) return false;
    e.combate = null;
    herois(e).forEach(function (h) {
      h.efeitos = {};
      if (h.caido) { h.caido = false; h.pv = 1; }
    });
    for (var id in e.u) if (e.u[id].efeitos) e.u[id].efeitos = {};
    ev(e, { t: 'combate', fim: true });
    verificarGatilhos(e);
    return true;
  }

  function derrota(e) {
    ev(e, { t: 'narra', texto: 'A escuridão engole o grupo... Mas o destino ainda não terminou com vocês. Vocês despertam no começo deste caminho, com a lembrança amarga da derrota.' });
    ev(e, { t: 'derrota' });
    e.tentativas = e.tentativas || {};
    e.tentativas[e.cenaIdx] = (e.tentativas[e.cenaIdx] || 0) + 1;
    if (e.tentativas[e.cenaIdx] >= 2) ev(e, { t: 'narra', texto: 'Desta vez vocês conhecem o caminho. Os inimigos parecem mais cansados do que antes.' });
    carregarCena(e, e.cenaIdx, clone(e.fotoCena));
  }

  function proximoTurno(e) {
    for (var guarda = 0; guarda < 200 && e.combate; guarda++) {
      var cb = e.combate;
      cb.ordem = cb.ordem.filter(function (id) { return e.u[id] && ativa(e.u[id]) && !e.u[id].rendido; });
      if (fimCombateSePreciso(e)) return;
      cb.i++;
      if (cb.i >= cb.ordem.length) { cb.i = 0; cb.rodada++; ev(e, { t: 'rodada', rodada: cb.rodada }); }
      var u = e.u[cb.ordem[cb.i]];
      if (!u) continue;
      if (u.efeitos) {
        delete u.efeitos.esquiva;
        if (u.efeitos.furia) { u.efeitos.furia--; if (!u.efeitos.furia) delete u.efeitos.furia; }
        ['bencao', 'aura'].forEach(function (k) { if (u.efeitos[k]) { u.efeitos[k]--; if (!u.efeitos[k]) delete u.efeitos[k]; } });
        if (u.efeitos.provocado && u.efeitos.provocado.ate < cb.rodada) delete u.efeitos.provocado;
      }
      if (u.lado === 'heroi') {
        if (u.caido) continue;
        cb.mov = u.desl; cb.acao = 1; cb.bonus = 1; cb.furtivo = false;
        ev(e, { t: 'vez', id: u.id, rodada: cb.rodada });
        return;
      }
      ev(e, { t: 'vez', id: u.id, rodada: cb.rodada });
      turnoInimigo(e, u);
      if (!e.combate) return;
      if (fimCombateSePreciso(e)) return;
    }
  }

  // ------------------------------------------------------------- IA
  function turnoInimigo(e, m) {
    var def = R.MONSTROS[m.tipo];
    var cb = e.combate;
    if (def.falas && !m.falou && rnd(e) < 0.45) { m.falou = true; ev(e, { t: 'fala', quem: m.id, nome: m.nome, vis: m.vis, texto: escolha(e, def.falas) }); }
    // Trolls se regeneram, a não ser que o fogo os tenha queimado desde o último turno.
    if (def.regenera) {
      if (m.efeitos.queimado) { delete m.efeitos.queimado; ev(e, { t: 'narra', texto: 'As queimaduras de ' + m.nome + ' não fecham. O fogo impede a regeneração!' }); }
      else if (m.pv < m.pvMax) curar(e, m, def.regenera, m.id);
    }
    // Chefes erguem servos (Vorag e o sino, o Rei Corvo e os braseiros) enquanto a condição valer.
    var iv = def.invoca;
    if (iv && cb.rodada % iv.cada === 0 && m.invocou !== cb.rodada && !(iv.semFlag && e.flags[iv.semFlag]) && !(iv.enquantoObj && !objetoAtivo(e, iv.enquantoObj))) {
      var vivos = inimigosAtivos(e).filter(function (o) { return o.tipo === iv.tipo; }).length;
      if (vivos < iv.max) {
        m.invocou = cb.rodada;
        var base = e.u[iv.perto] || m;
        ev(e, { t: 'magia', de: m.id, fx: 'invocar', anim: 'invocar', texto: iv.texto });
        if (iv.som) ev(e, { t: 'som', som: iv.som });
        for (var k = 0; k < (e.ordemHerois.length <= 2 ? 1 : iv.qtd || 2); k++) {
          var p = casaLivreProxima(e, base.x + (k ? 2 : -1), base.y + 1);
          var id = 'inv' + e.seq + k;
          e.u[id] = novoMonstro({ m: iv.tipo }, id, p[0], p[1]);
          if (e.ordemHerois.length === 1) e.u[id].pv = e.u[id].pvMax = Math.ceil(e.u[id].pvMax * 0.7);
          ev(e, { t: 'surge', id: id, x: p[0], y: p[1] });
        }
        iniciarCombate(e);
        return;
      }
    }
    var alvos = heroisDePe(e);
    if (!alvos.length) return;
    var prov = m.efeitos.provocado && e.u[m.efeitos.provocado.por];
    var mapa = R.custos(e, m.id, 99);
    function custoAte(h) {
      var best = 999;
      for (var dx = -1; dx <= 1; dx++) for (var dy = -1; dy <= 1; dy++) {
        var k = chave(h.x + dx, h.y + dy);
        if ((dx || dy) && mapa.dist[k] != null && (!R.ocupante(e, h.x + dx, h.y + dy, m.id))) best = Math.min(best, mapa.dist[k]);
      }
      if (dist(m, h) === 1) best = 0;
      return best;
    }
    var alvo = prov && !prov.caido ? prov : null;
    if (!alvo) {
      alvos.sort(function (a, b) { return (custoAte(a) - custoAte(b)) || (a.pv - b.pv); });
      alvo = alvos[0];
    }
    var ataques = def.ataques;
    var longe = ataques.filter(function (a) { return a.alc > 1; })[0];
    var perto = ataques.filter(function (a) { return a.alc === 1; })[0];
    function tenta() {
      if (perto && dist(m, alvo) === 1) { atacar(e, m, alvo, perto); return true; }
      if (longe && dist(m, alvo) <= longe.alc && R.visao(e, m, alvo) && !(perto && dist(m, alvo) === 1)) { atacar(e, m, alvo, longe); return true; }
      return false;
    }
    if (tenta()) return;
    // anda: atiradores buscam uma casa com visão; os outros, encostar no alvo
    var melhor = null, melhorC = 999;
    for (var k2 in mapa.dist) {
      var p2 = k2.split(','), cx = +p2[0], cy = +p2[1];
      if (R.ocupante(e, cx, cy, m.id)) continue;
      var c = mapa.dist[k2], pos = { x: cx, y: cy }, serve;
      if (perto && !longe) serve = dist(pos, alvo) === 1;
      else if (longe) serve = dist(pos, alvo) <= longe.alc && dist(pos, alvo) > 1 && R.visao(e, pos, alvo);
      else serve = dist(pos, alvo) === 1;
      if (!serve) continue;
      var pref = c + (longe ? -dist(pos, alvo) * 0.1 : 0);
      if (pref < melhorC) { melhorC = pref; melhor = [cx, cy]; }
    }
    if (!melhor) {
      // sem caminho até o alvo: chega o mais perto que conseguir
      for (var k3 in mapa.dist) {
        var p3 = k3.split(',');
        if (R.ocupante(e, +p3[0], +p3[1], m.id)) continue;
        var dd = dist({ x: +p3[0], y: +p3[1] }, alvo) * 10 + mapa.dist[k3];
        if (dd < melhorC) { melhorC = dd; melhor = [+p3[0], +p3[1]]; }
      }
    }
    if (melhor) {
      var cam = caminhoAte(mapa, melhor[0], melhor[1]);
      andar(e, m, cam, m.desl);
    }
    tenta();
  }

  // Anda pelo caminho até gastar o limite. Para em armadilha escondida.
  function andar(e, u, cam, limite) {
    if (!cam || cam.length < 2) return 0;
    var gasto = 0, feito = [[u.x, u.y]], ultimoLivre = 0;
    for (var i = 1; i < cam.length; i++) {
      var t = R.terreno(e, cam[i][0], cam[i][1]);
      var c = t.dificil || (t.armadilha && t.armadilha.revelada) ? 2 : 1;
      if (gasto + c > limite) break;
      gasto += c;
      feito.push(cam[i]);
      if (!R.ocupante(e, cam[i][0], cam[i][1], u.id)) ultimoLivre = feito.length - 1;
      if (t.armadilha && !t.armadilha.revelada && u.lado === 'heroi') break;
    }
    feito = feito.slice(0, ultimoLivre + 1);
    if (feito.length < 2) return 0;
    var fim = feito[feito.length - 1];
    u.x = fim[0]; u.y = fim[1];
    ev(e, { t: 'mover', id: u.id, caminho: feito });
    var tr = R.terreno(e, u.x, u.y);
    if (tr.armadilha && !tr.armadilha.revelada && u.lado === 'heroi') {
      tr.armadilha.revelada = true;
      var s = d(e, 20) + atr(u, 'des');
      ev(e, { t: 'armadilha', id: u.id, x: u.x, y: u.y });
      ev(e, { t: 'teste', heroi: u.id, pericia: 'Destreza (resistência)', nat: s - atr(u, 'des'), bonus: atr(u, 'des'), total: s, cd: 12, ok: s >= 12 });
      if (s < 12) aplicarDano(e, u, rolar(e, '2d6').total, 'perfurante', null);
      else ev(e, { t: 'narra', texto: u.nome + ' salta para trás no último instante, e as lanças passam raspando.' });
    }
    return gasto;
  }

  // ------------------------------------------------------------ testes
  function teste(e, h, pericia, cd) {
    var p = R.PERICIAS[pericia];
    var b = atr(h, p[0]) + (R.CLASSES[h.classe].prof.indexOf(pericia) >= 0 ? 2 : 0);
    if (h.efeitos && h.efeitos.inspirado) { b += d(e, 6); delete h.efeitos.inspirado; }
    var nat = d(e, 20), total = nat + b;
    var ok = nat === 20 || (nat !== 1 && total >= cd);
    ev(e, { t: 'teste', heroi: h.id, pericia: p[1], nat: nat, bonus: b, total: total, cd: cd, ok: ok });
    return ok;
  }
  R.bonusPericia = function (h, pericia) {
    var p = R.PERICIAS[pericia];
    return atr(h, p[0]) + (R.CLASSES[h.classe].prof.indexOf(pericia) >= 0 ? 2 : 0);
  };

  // ----------------------------------------------------------- diálogos
  R.dialogoAtual = function (e) {
    if (!e.dialogo) return null;
    var dl = R.cena(e).dialogos[e.dialogo.dlg];
    var no = dl.nos[e.dialogo.no];
    var ops = (no.opcoes || []).map(function (o) {
      var vis = !(o.seNao && e.flags[o.seNao]) && !(o.se && !e.flags[o.se]);
      var bloq = false;
      if (o.req && o.req.ouro && e.ouro < o.req.ouro) bloq = true;
      if (o.req && o.req.item && !e.inv[o.req.item]) bloq = true;
      if (o.req && o.req.flag && !e.flags[o.req.flag]) bloq = true;
      return { t: o.t, vis: vis, bloq: bloq };
    });
    return { npc: e.dialogo.npc, heroi: e.dialogo.heroi, fala: no.fala, opcoes: ops };
  };
  function entrarNo(e, noId, ctx) {
    var dl = R.cena(e).dialogos[e.dialogo.dlg];
    var no = dl.nos[noId];
    // nó de ramo: escolhe o próximo nó pelas condições, sem falar nada
    for (var guarda = 0; no.ramo && guarda < 8; guarda++) {
      var ir = null;
      for (var i = 0; i < no.ramo.length && !ir; i++) if (cond(e, no.ramo[i].se)) ir = no.ramo[i].vai;
      noId = ir; no = dl.nos[noId];
    }
    e.dialogo.no = noId;
    var u = e.u[e.dialogo.npc];
    ev(e, { t: 'fala', quem: e.dialogo.npc, nome: u ? u.nome : '', vis: u ? u.vis : '', texto: no.fala, dialogo: true, heroi: e.dialogo.heroi });
    var cenaAntes = e.cenaIdx;
    executar(e, no.faz, ctx);
    if (e.cenaIdx !== cenaAntes) return;
    if (no.fim || !(no.opcoes && no.opcoes.length) || !e.u[e.dialogo.npc]) { e.dialogo = null; ev(e, { t: 'dialogo', fim: true }); }
  }

  // ----------------------------------------------------- validações comuns
  function heroiDe(e, cmd) {
    var h = e.u[cmd.heroi];
    if (!h || h.lado !== 'heroi') throw 'Herói não encontrado.';
    if (!cmd.admin && h.dono !== cmd.jogador) throw 'Este herói é de outro jogador.';
    if (e.fase !== 'jogo') throw 'O jogo não está em andamento.';
    return h;
  }
  function exigirVez(e, h, custo) {
    if (h.caido) throw h.nome + ' está caído.';
    if (!e.combate) return;
    if (e.combate.ordem[e.combate.i] !== h.id) throw 'Não é a vez de ' + h.nome + '.';
    if (custo === 'acao' && e.combate.acao < 1) throw 'Você já usou sua ação neste turno.';
    if (custo === 'bonus' && e.combate.bonus < 1) throw 'Você já usou sua ação bônus neste turno.';
  }
  function gastar(e, custo) { if (e.combate && custo) e.combate[custo]--; }
  // A conversa só prende quem está nela (e todo mundo no combate ou na saída da cena).
  function semDialogo(e, h) {
    if (!e.dialogo) return;
    if (!h || e.combate || e.dialogo.heroi === h.id) throw 'Termine a conversa primeiro.';
  }

  // ------------------------------------------------------------ comandos
  var CMD = {};

  CMD.entrar = function (e, c) {
    if (!c.jogador) throw 'Jogador sem identificação.';
    e.jogadores[c.jogador] = { nome: String(c.nome || 'Jogador').slice(0, 24) };
  };
  CMD.escolher = function (e, c) {
    var cl = R.CLASSES[c.classe];
    if (!cl) throw 'Classe inválida.';
    if (!e.jogadores[c.jogador]) throw 'Entre na mesa primeiro.';
    if (e.fase === 'fim') throw 'A campanha terminou.';
    var id = 'h_' + c.classe;
    if (e.u[id]) {
      if (e.u[id].dono === c.jogador) { e.u[id].nome = String(c.nome || e.u[id].nome).slice(0, 18); return; }
      throw 'Outro jogador já escolheu ' + cl.nome + '.';
    }
    // cada pessoa joga com um herói só (o anfitrião pode assumir o de quem saiu, pelo mestre)
    var meu = herois(e).filter(function (o) { return o.dono === c.jogador; })[0];
    if (meu && !c.admin) {
      if (e.fase !== 'lobby') throw 'Você já está jogando com ' + meu.nome + '.';
      delete e.u[meu.id];
      e.ordemHerois = e.ordemHerois.filter(function (x) { return x !== meu.id; });
    }
    var h = novoHeroi(c.classe, String(c.nome || cl.heroi).slice(0, 18), c.jogador);
    e.u[id] = h; e.ordemHerois.push(id);
    heroiNoNivel(h, e.nivel);
    if (e.fase === 'jogo') {
      R.habsDe(h).forEach(function (k) { if (R.HABS[k].usos) h.usos[k] = R.HABS[k].usos; });
      var ent = R.cena(e).entrada[0], p = casaLivreProxima(e, ent[0], ent[1]);
      h.x = p[0]; h.y = p[1];
      ev(e, { t: 'surge', id: id, x: h.x, y: h.y });
      ev(e, { t: 'narra', texto: h.nome + ', ' + cl.nome.toLowerCase() + ', se junta ao grupo.' });
      if (e.combate) iniciarCombate(e);
      if (!e.inv.pocao) e.inv.pocao = 1;
    }
  };
  CMD.soltar = function (e, c) {
    var id = 'h_' + c.classe, h = e.u[id];
    if (!h || (h.dono !== c.jogador && !c.admin)) throw 'Herói não é seu.';
    if (e.fase !== 'lobby') throw 'Só dá para trocar de herói antes de começar.';
    delete e.u[id];
    e.ordemHerois = e.ordemHerois.filter(function (x) { return x !== id; });
  };
  CMD.iniciar = function (e, c) {
    if (c.jogador !== e.host && !c.admin) throw 'Só quem criou a mesa pode começar.';
    if (e.fase !== 'lobby') throw 'A campanha já começou.';
    if (!e.ordemHerois.length) throw 'Escolha pelo menos um herói.';
    e.fase = 'jogo';
    e.inv = { pocao: e.ordemHerois.length };
    carregarCena(e, 0);
  };

  CMD.mover = function (e, c) {
    var h = heroiDe(e, c);
    semDialogo(e, h);
    exigirVez(e, h);
    var lim = R.movRestante(e, h.id);
    if (lim < 1) throw 'Sem movimento sobrando.';
    var mapa = R.custos(e, h.id, lim);
    if (R.ocupante(e, c.x, c.y, h.id)) throw 'Casa ocupada.';
    var cam = caminhoAte(mapa, c.x, c.y);
    if (!cam) throw 'Não dá para chegar ali.';
    var g = andar(e, h, cam, lim);
    if (e.combate) e.combate.mov -= g;
  };

  CMD.atacar = function (e, c) {
    var h = heroiDe(e, c);
    semDialogo(e, h);
    exigirVez(e, h, 'acao');
    var alvo = e.u[c.alvo];
    if (!alvo || !ativa(alvo)) throw 'Alvo inválido.';
    if (!(alvo.lado === 'inimigo' || alvo.alvoPv)) throw 'Esse alvo não pode ser atacado.';
    var atq = R.ataquesDe(h)[c.arma || 0];
    if (!atq) throw 'Arma inválida.';
    if (dist(h, alvo) > atq.alc) throw 'Alvo fora de alcance (' + atq.alc + ' casa' + (atq.alc > 1 ? 's' : '') + ').';
    if (atq.alc > 1 && !R.visao(e, h, alvo)) throw 'Sem linha de visão.';
    if (alvo.lado === 'inimigo' && alvo.pacifico) {
      // atacar quem está em paz começa a briga
      e.flags.briga = true;
      iniciarCombate(e);
      e._proximo = false;
      // o atacante ganha a surpresa: age primeiro
      var ord = e.combate.ordem.filter(function (x) { return x !== h.id; });
      ord.unshift(h.id);
      e.combate.ordem = ord; e.combate.i = 0;
      e.combate.mov = h.desl; e.combate.acao = 1; e.combate.bonus = 1;
      ev(e, { t: 'vez', id: h.id, rodada: 1 });
    }
    gastar(e, 'acao');
    atacar(e, h, alvo, atq);
  };

  CMD.habilidade = function (e, c) {
    var h = heroiDe(e, c);
    semDialogo(e, h);
    var hb = R.HABS[c.hab];
    if (!hb || R.habsDe(h).indexOf(c.hab) < 0) throw 'Habilidade inválida.';
    exigirVez(e, h, hb.custo);
    if (hb.usos && !(h.usos[c.hab] > 0)) throw hb.n + ' já foi usada nesta cena.';
    if (hb.carga && h.magia < 1) throw 'Sem magia sobrando nesta cena.';
    var alvo = c.alvo ? e.u[c.alvo] : h;
    if (!alvo) throw 'Alvo inválido.';
    if (hb.alvo === 'inimigo') {
      if (!(alvo.lado === 'inimigo' || alvo.alvoPv) || !ativa(alvo)) throw 'Escolha um inimigo.';
      if (dist(h, alvo) > hb.alc) throw 'Fora de alcance.';
      if (!R.visao(e, h, alvo)) throw 'Sem linha de visão.';
    }
    if (hb.alvo === 'aliado' || hb.alvo === 'caido') {
      if (alvo.lado !== 'heroi') throw 'Escolha um aliado.';
      if (dist(h, alvo) > hb.alc) throw 'Precisa estar ao lado.';
      if (hb.alvo === 'caido' && !alvo.caido) throw alvo.nome + ' não está caído.';
    }
    if ((c.hab === 'ardil' || c.hab === 'surto') && !e.combate) throw 'Só faz sentido em combate.';
    if (c.hab === 'giro' && !inimigosAtivos(e).some(function (m) { return hostil(m) && dist(m, h) === 1; })) throw 'Nenhum inimigo ao seu lado.';
    gastar(e, hb.custo);
    if (hb.usos) h.usos[c.hab]--;
    if (hb.carga) h.magia--;
    ev(e, { t: 'hab', de: h.id, hab: c.hab, nome: hb.n, alvo: alvo.id, fx: hb.fx || c.hab });
    switch (c.hab) {
      case 'folego': curar(e, h, rolar(e, hb.cura).total + e.nivel, h.id); break;
      case 'desafio': alvo.efeitos.provocado = { por: h.id, ate: (e.combate ? e.combate.rodada : 0) + 1 }; ev(e, { t: 'narra', texto: alvo.nome + ' só tem olhos para ' + h.nome + '.' }); break;
      case 'furia': h.efeitos.furia = hb.dur + 1; break;
      case 'fogo': atacar(e, h, alvo, { n: hb.n, b: hb.ataque.b, d: hb.ataque.d, alc: hb.alc, anim: 'magia', fx: 'fogo', tipo: 'fogo' }); break;
      case 'misseis': aplicarDano(e, alvo, rolar(e, hb.dano).total, 'forca', h.id); break;
      case 'trovao':
        inimigosAtivos(e).filter(function (m) { return dist(m, h) === 1; }).forEach(function (m) {
          var s = d(e, 20) + 1, dn = rolar(e, hb.dano).total;
          aplicarDano(e, m, s >= hb.salva.cd ? Math.floor(dn / 2) : dn, 'trovao', h.id);
        });
        break;
      case 'ardil': e.combate.mov += h.desl; break;
      case 'marca': h.efeitos.marca = alvo.id; break;
      case 'balsamo': curar(e, alvo, rolar(e, hb.cura).total, h.id); break;
      case 'levantar': alvo.caido = false; alvo.pv = Math.max(1, alvo.pv); ev(e, { t: 'cura', alvo: alvo.id, de: h.id, valor: 1, pv: alvo.pv }); break;
      case 'esquivar': h.efeitos.esquiva = true; break;
      case 'palavra': curar(e, alvo, rolar(e, hb.cura).total, h.id); break;
      case 'chama':
        var sc = d(e, 20) + 1;
        if (sc >= hb.salva.cd) ev(e, { t: 'narra', texto: alvo.nome + ' desvia da luz sagrada.' });
        else aplicarDano(e, alvo, rolar(e, (R.MONSTROS[alvo.tipo] || {}).mv ? '2d8' : hb.dano).total, 'luz', h.id);
        break;
      case 'bencao':
        heroisDePe(e).filter(function (o) { return dist(o, h) <= 3; }).forEach(function (o) { o.efeitos.bencao = hb.dur + 1; });
        ev(e, { t: 'narra', texto: h.nome + ' ergue o símbolo do sol. O grupo sente as mãos firmes.' });
        break;
      case 'cura_massa': heroisDePe(e).concat(herois(e).filter(function (o) { return o.caido; })).filter(function (o) { return dist(o, h) <= 3; }).forEach(function (o) { curar(e, o, rolar(e, hb.cura).total, h.id); }); break;
      case 'inspirar': alvo.efeitos.inspirado = 1; ev(e, { t: 'narra', texto: h.nome + ' toca um acorde para ' + alvo.nome + '. Coragem!' }); break;
      case 'zombaria':
        var sz = d(e, 20) + 1;
        if (sz >= hb.salva.cd) ev(e, { t: 'narra', texto: alvo.nome + ' ignora a provocação.' });
        else { alvo.efeitos.zombado = 1; aplicarDano(e, alvo, rolar(e, hb.dano).total, 'psiquico', h.id); }
        break;
      case 'cancao':
        herois(e).filter(function (o) { return dist(o, h) <= 4; }).forEach(function (o) { curar(e, o, rolar(e, hb.cura).total, h.id); o.efeitos.inspirado = 1; });
        break;
      case 'impor': curar(e, alvo, rolar(e, hb.cura).total, h.id); break;
      case 'divino': h.efeitos.divino = 1; ev(e, { t: 'narra', texto: 'A espada de ' + h.nome + ' brilha com luz dourada.' }); break;
      case 'aura':
        heroisDePe(e).filter(function (o) { return dist(o, h) <= 2; }).forEach(function (o) { o.efeitos.aura = hb.dur + 1; });
        ev(e, { t: 'narra', texto: 'Uma aura dourada envolve os aliados ao redor de ' + h.nome + '.' });
        break;
      case 'surto': e.combate.acao += 1; ev(e, { t: 'narra', texto: h.nome + ' respira fundo e ganha uma ação extra!' }); break;
      case 'giro':
        inimigosAtivos(e).filter(function (m) { return hostil(m) && dist(m, h) === 1; }).forEach(function (m) { if (ativa(m)) atacar(e, h, m, R.ataquesDe(h)[0]); });
        break;
      case 'veneno': h.efeitos.veneno = 1; ev(e, { t: 'narra', texto: h.nome + ' passa veneno nas lâminas. O próximo golpe vai doer.' }); break;
      case 'bola': case 'chuva':
        inimigosAtivos(e).filter(function (m) { return dist(m, alvo) <= hb.raio; }).forEach(function (m) {
          var sv = d(e, 20) + 1, dn = rolar(e, hb.dano).total;
          aplicarDano(e, m, sv >= hb.salva.cd ? Math.floor(dn / 2) : dn, c.hab === 'bola' ? 'fogo' : '', h.id);
        });
        break;
      case 'procurar':
        var achou = false, ok = teste(e, h, 'percepcao', 12);
        if (ok) for (var k in e.armadilhas) {
          var p = k.split(','), a = e.armadilhas[k];
          if (!a.revelada && dist(h, { x: +p[0], y: +p[1] }) <= 2) { a.revelada = true; achou = true; ev(e, { t: 'armadilha', revela: true, x: +p[0], y: +p[1] }); }
        }
        ev(e, { t: 'narra', texto: achou ? h.nome + ' encontra placas soltas no chão: armadilha! Agora todos sabem onde não pisar.' : ok ? h.nome + ' examina tudo ao redor. Nada suspeito aqui perto.' : h.nome + ' não percebe nada de estranho.' });
        break;
    }
    fimCombateSePreciso(e);
    verificarGatilhos(e);
  };

  CMD.item = function (e, c) {
    var h = heroiDe(e, c);
    semDialogo(e, h);
    if (c.item !== 'pocao') throw 'Este item age sozinho, não precisa usar.';
    exigirVez(e, h, 'bonus');
    if (!e.inv.pocao) throw 'O grupo não tem poções.';
    var alvo = c.alvo ? e.u[c.alvo] : h;
    if (!alvo || alvo.lado !== 'heroi' || dist(h, alvo) > 1) throw 'Escolha você ou um aliado ao lado.';
    gastar(e, 'bonus');
    e.inv.pocao--; if (!e.inv.pocao) delete e.inv.pocao;
    ev(e, { t: 'hab', de: h.id, hab: 'pocao', nome: 'Poção de Cura', alvo: alvo.id, fx: 'pocao' });
    curar(e, alvo, rolar(e, R.ITENS.pocao.cura).total, h.id);
  };

  CMD.interagir = function (e, c) {
    var h = heroiDe(e, c);
    semDialogo(e, h);
    exigirVez(e, h);
    var u = e.u[c.alvo];
    if (!u || !ativa(u)) throw 'Nada para interagir aqui.';
    if (u.dialogo && (u.lado === 'npc' || (u.lado === 'inimigo' && u.pacifico))) {
      if (e.dialogo) throw 'Outro herói está conversando. Espere a conversa terminar.';
      if (dist(h, u) > 2) throw 'Chegue mais perto para conversar (até 2 casas).';
      e.dialogo = { npc: u.id, dlg: u.dialogo, no: R.cena(e).dialogos[u.dialogo].inicio, heroi: h.id };
      entrarNo(e, e.dialogo.no, { heroi: h.id });
      verificarGatilhos(e);
      return;
    }
    if (u.lado !== 'objeto') throw 'Não há o que fazer com ' + u.nome + '.';
    if (dist(h, u) > 1) throw 'Fique ao lado de ' + u.nome + '.';
    var ob = R.OBJETOS[u.obj];
    if (u.usado) throw 'Não há mais nada aqui.';
    var custo = e.combate ? 'acao' : null;
    if (custo) exigirVez(e, h, custo);
    gastar(e, custo);
    ev(e, { t: 'interage', de: h.id, alvo: u.id });
    var ctx = { heroi: h.id, objeto: u.id };
    if (ob.reqFlag && !e.flags[ob.reqFlag]) executar(e, ob.semFlag, ctx);
    else if (ob.req && e.inv[ob.req]) { u.usado = true; executar(e, ob.okReq, ctx); }
    else if (ob.teste) {
      var ok = teste(e, h, ob.teste.p, ob.teste.cd);
      if (ok || !ob.req) u.usado = true;
      executar(e, ok ? ob.ok : ob.falha, ctx);
    } else {
      if (ob.uma) u.usado = true;
      executar(e, ob.ok, ctx);
    }
    fimCombateSePreciso(e);
    verificarGatilhos(e);
  };

  CMD.escolha = function (e, c) {
    if (!e.dialogo) throw 'Nenhuma conversa aberta.';
    var h = heroiDe(e, { heroi: e.dialogo.heroi, jogador: c.jogador, admin: c.admin });
    var dl = R.cena(e).dialogos[e.dialogo.dlg];
    var no = dl.nos[e.dialogo.no];
    var vis = R.dialogoAtual(e).opcoes;
    var o = (no.opcoes || [])[c.opcao];
    if (!o || !vis[c.opcao].vis) throw 'Opção inválida.';
    if (vis[c.opcao].bloq) throw 'Vocês não têm o necessário para isso.';
    if (o.acao && e.combate) { exigirVez(e, h, 'acao'); gastar(e, 'acao'); }
    ev(e, { t: 'fala', quem: h.id, nome: h.nome, vis: h.vis, texto: o.t.replace(/^\[[^\]]+\]\s*/, ''), dialogo: true, heroi: h.id });
    var ctx = { heroi: h.id };
    var cenaAntes = e.cenaIdx;
    executar(e, o.faz, ctx);
    if (e.cenaIdx !== cenaAntes || e.fase !== 'jogo') return;
    var destino = o.vai;
    if (o.teste) destino = teste(e, h, o.teste.p, o.teste.cd) ? o.teste.ok : o.teste.falha;
    if (o.fim || !destino) { e.dialogo = null; ev(e, { t: 'dialogo', fim: true }); }
    else entrarNo(e, destino, ctx);
    verificarGatilhos(e);
  };
  CMD.sairDialogo = function (e, c) {
    if (!e.dialogo) return;
    heroiDe(e, { heroi: e.dialogo.heroi, jogador: c.jogador, admin: c.admin });
    e.dialogo = null; ev(e, { t: 'dialogo', fim: true });
  };

  CMD.fimTurno = function (e, c) {
    var h = heroiDe(e, c);
    if (!e.combate) throw 'Fora de combate não há turnos.';
    if (e.combate.ordem[e.combate.i] !== h.id) throw 'Não é sua vez.';
    e.dialogo = null;
    proximoTurno(e);
  };

  CMD.sair = function (e, c) {
    var h = heroiDe(e, c);
    semDialogo(e);
    var cn = R.cena(e);
    if (!e.saida || !cn.saida) throw 'O caminho ainda não está livre.';
    if (e.combate) throw 'Não dá para fugir no meio do combate.';
    if (h.x !== cn.saida[0] || h.y !== cn.saida[1]) throw 'Vá até a saída, o círculo dourado.';
    ev(e, { t: 'narra', texto: 'O grupo segue viagem...' });
    carregarCena(e, e.cenaIdx + 1);
  };

  // Comandos do anfitrião ou do painel admin.
  CMD.mestre = function (e, c) {
    if (c.jogador !== e.host && !c.admin) throw 'Só o anfitrião pode fazer isso.';
    if (c.op === 'narrar') ev(e, { t: 'narra', texto: String(c.texto || '').slice(0, 600), mestre: true });
    else if (c.op === 'pularVez') { if (e.combate) proximoTurno(e); }
    else if (c.op === 'reiniciar') carregarCena(e, e.cenaIdx, clone(e.fotoCena));
    else if (c.op === 'cena') {
      var i = Math.max(0, Math.min(R.cenasDe(e).length - 1, c.idx | 0));
      if (e.fase === 'lobby') { e.fase = 'jogo'; e.inv = { pocao: e.ordemHerois.length }; }
      e.fase = 'jogo';
      carregarCena(e, i);
    } else if (c.op === 'curar') herois(e).forEach(function (h) { h.caido = false; curar(e, h, h.pvMax, null); });
    else if (c.op === 'expulsar') {
      herois(e).forEach(function (h) { if (h.dono === c.alvo) h.dono = e.host; });
      delete e.jogadores[c.alvo];
    } else if (c.op === 'passarHeroi') {
      var hh = e.u[c.heroi]; if (hh && e.jogadores[c.alvo]) hh.dono = c.alvo;
    } else throw 'Comando do mestre desconhecido.';
  };

  // Ponto de entrada único: aplica o comando no estado (que é alterado).
  R.aplicar = function (e, cmd) {
    var f = CMD[cmd.t];
    if (!f) return { ok: false, erro: 'Comando desconhecido: ' + cmd.t };
    try {
      e._proximo = false;
      f(e, cmd);
      for (var volta = 0; volta < 4; volta++) {
        verificarGatilhos(e);
        if (!fimCombateSePreciso(e)) break;
      }
      for (var g = 0; g < 6 && e._proximo && e.combate; g++) { e._proximo = false; proximoTurno(e); }
      // outro herói puxou um combate enquanto alguém conversava: a conversa acaba
      if (e.dialogo && e.combate && cmd.t !== 'escolha' && cmd.t !== 'interagir') { e.dialogo = null; ev(e, { t: 'dialogo', fim: true }); }
      delete e._proximo;
      e.versao = (e.versao || 0) + 1;
      e.atualizado = Date.now();
      return { ok: true };
    } catch (err) {
      delete e._proximo;
      return { ok: false, erro: typeof err === 'string' ? err : (err && err.message) || String(err) };
    }
  };

  // Ajudas para a interface
  R.vezDe = function (e) { return e.combate ? e.combate.ordem[e.combate.i] : null; };
  R.ativa = ativa;
  R.hostil = hostil;
  R.modTxt = mod;
})(RUNA);
