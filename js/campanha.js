// RUNA — dados da campanha "A Noite do Sino Morto" (Capítulo I).
// Script clássico: roda no navegador e no Google Apps Script (vira Campanha.gs).
var RUNA = (typeof RUNA !== 'undefined' && RUNA) || {};

(function (R) {
  // ---------------------------------------------------------------- classes
  R.CLASSES = {
    guerreiro: {
      nome: 'Guerreiro', heroi: 'Torvald', vis: 'guerreiro',
      desc: 'Muralha de aço. Aguenta o pior e protege quem está atrás.',
      frase: 'Fiquem atrás de mim. Ninguém passa.',
      pv: 12, pvNivel: 7, ca: 17, desl: 5,
      atr: { for: 3, des: 0, con: 2, int: -1, sab: 1, car: 0 },
      prof: ['atletismo', 'intimidacao', 'percepcao', 'sobrevivencia'],
      ataques: [{ n: 'Espada longa', b: 5, d: '1d8+3', alc: 1, anim: 'golpe' }],
      habs: ['folego', 'desafio'],
      voz: { tom: 0.75, vel: 0.95 }
    },
    barbara: {
      nome: 'Bárbara', heroi: 'Hilda', vis: 'barbara',
      desc: 'Fúria das montanhas. Bate mais forte que qualquer um.',
      frase: 'Que venham. Meu machado está com fome.',
      pv: 15, pvNivel: 8, ca: 14, desl: 5,
      atr: { for: 3, des: 1, con: 3, int: -1, sab: 0, car: 0 },
      prof: ['atletismo', 'intimidacao', 'sobrevivencia', 'percepcao'],
      ataques: [{ n: 'Machado grande', b: 5, d: '1d12+3', alc: 1, anim: 'golpe2' }],
      habs: ['furia'],
      voz: { tom: 1.05, vel: 1.0 }
    },
    maga: {
      nome: 'Maga', heroi: 'Elara', vis: 'maga',
      desc: 'Fogo, trovão e saber antigo. Frágil, mas devastadora.',
      frase: 'O conhecimento queima mais que qualquer chama.',
      pv: 8, pvNivel: 5, ca: 12, desl: 5,
      atr: { for: -1, des: 2, con: 1, int: 3, sab: 1, car: 0 },
      prof: ['arcanismo', 'historia', 'investigacao', 'intuicao'],
      ataques: [{ n: 'Cajado', b: 1, d: '1d6-1', alc: 1, anim: 'golpe' }],
      habs: ['fogo', 'misseis', 'trovao'],
      magia: 2,
      voz: { tom: 1.2, vel: 1.0 }
    },
    ladina: {
      nome: 'Ladina', heroi: 'Vex', vis: 'ladina',
      desc: 'Rápida, silenciosa e letal quando o inimigo se distrai.',
      frase: 'Já roubei coisa pior que um sino.',
      pv: 10, pvNivel: 6, ca: 14, desl: 6,
      atr: { for: 0, des: 3, con: 1, int: 1, sab: 0, car: 2 },
      prof: ['furtividade', 'acrobacia', 'enganacao', 'investigacao', 'persuasao', 'percepcao'],
      ataques: [
        { n: 'Adagas', b: 5, d: '1d6+3', alc: 1, anim: 'facas' },
        { n: 'Adaga arremessada', b: 5, d: '1d4+3', alc: 4, anim: 'arremesso', fx: 'adaga' }
      ],
      habs: ['ardil'],
      furtivo: true,
      voz: { tom: 1.3, vel: 1.1 }
    },
    cacadora: {
      nome: 'Caçadora', heroi: 'Sigrun', vis: 'cacadora',
      desc: 'Olhos de falcão. Conhece a floresta, as ervas e os monstros.',
      frase: 'Rastros frescos. Eles estão perto.',
      pv: 11, pvNivel: 6, ca: 14, desl: 6,
      atr: { for: 0, des: 3, con: 1, int: 0, sab: 2, car: 0 },
      prof: ['sobrevivencia', 'percepcao', 'medicina', 'furtividade'],
      ataques: [
        { n: 'Besta', b: 5, d: '1d8+3', alc: 8, anim: 'besta', fx: 'virote' },
        { n: 'Faca de caça', b: 5, d: '1d4+3', alc: 1, anim: 'golpe' }
      ],
      habs: ['marca', 'balsamo'],
      voz: { tom: 0.95, vel: 0.95 }
    }
  };

  // ---------------------------------------------------------- habilidades
  // custo: acao | bonus. usos: por cena (null = à vontade). carga: usa R.estado.magia.
  R.HABS = {
    folego: { n: 'Retomar Fôlego', ic: 'heart-pulse', custo: 'bonus', usos: 1, alvo: 'si', cura: '1d10+1', desc: 'Recupera 1d10+1 PV (+ nível).' },
    desafio: { n: 'Desafio', ic: 'swords', custo: 'bonus', usos: 2, alvo: 'inimigo', alc: 4, desc: 'O inimigo fica obrigado a atacar você.' },
    furia: { n: 'Fúria', ic: 'flame', custo: 'bonus', usos: 1, alvo: 'si', dur: 3, desc: 'Por 3 rodadas: +2 de dano e metade do dano recebido.' },
    fogo: { n: 'Raio de Fogo', ic: 'flame-kindling', custo: 'acao', usos: null, alvo: 'inimigo', alc: 6, ataque: { b: 5, d: '1d10' }, fx: 'fogo', desc: 'Ataque mágico à distância: 1d10 de fogo.' },
    misseis: { n: 'Mísseis Mágicos', ic: 'sparkles', custo: 'acao', carga: true, alvo: 'inimigo', alc: 6, dano: '3d4+3', fx: 'misseis', desc: 'Nunca erra: 3d4+3. Gasta 1 magia.' },
    trovao: { n: 'Onda Trovejante', ic: 'zap', custo: 'acao', carga: true, alvo: 'area', salva: { atr: 'con', cd: 13 }, dano: '2d8', fx: 'trovao', desc: 'Todos os inimigos ao seu redor: 2d8 (metade se resistirem). Gasta 1 magia.' },
    ardil: { n: 'Ação Ardilosa', ic: 'wind', custo: 'bonus', usos: null, alvo: 'si', desc: 'Dobra seu movimento neste turno.' },
    marca: { n: 'Marca do Caçador', ic: 'crosshair', custo: 'bonus', usos: null, alvo: 'inimigo', alc: 8, desc: 'Seus ataques contra o alvo causam +1d6.' },
    balsamo: { n: 'Bálsamo de Ervas', ic: 'leaf', custo: 'acao', usos: 1, alvo: 'aliado', alc: 1, cura: '1d8+2', desc: 'Cura um aliado ao lado (ou você): 1d8+2.' },
    levantar: { n: 'Levantar aliado', ic: 'hand-helping', custo: 'acao', usos: null, alvo: 'caido', alc: 1, desc: 'Ajuda um aliado caído a voltar com 1 PV.' },
    esquivar: { n: 'Esquivar', ic: 'shield', custo: 'acao', usos: null, alvo: 'si', desc: 'Até seu próximo turno, ataques contra você têm desvantagem.' },
    procurar: { n: 'Procurar', ic: 'search', custo: 'acao', usos: null, alvo: 'si', desc: 'Teste de Percepção: revela armadilhas e segredos por perto.' }
  };
  R.HABS_COMUNS = ['esquivar', 'levantar', 'procurar'];

  R.PERICIAS = {
    atletismo: ['for', 'Atletismo'], acrobacia: ['des', 'Acrobacia'], furtividade: ['des', 'Furtividade'],
    arcanismo: ['int', 'Arcanismo'], historia: ['int', 'História'], investigacao: ['int', 'Investigação'],
    intuicao: ['sab', 'Intuição'], medicina: ['sab', 'Medicina'], percepcao: ['sab', 'Percepção'], sobrevivencia: ['sab', 'Sobrevivência'],
    enganacao: ['car', 'Enganação'], intimidacao: ['car', 'Intimidação'], persuasao: ['car', 'Persuasão'],
    for: ['for', 'Força'], des: ['des', 'Destreza'], con: ['con', 'Constituição']
  };

  R.ITENS = {
    pocao: { n: 'Poção de Cura', ic: 'flask-round', cura: '2d4+2', desc: 'Recupera 2d4+2 PV. Pode dar a um aliado ao lado.' },
    oleo: { n: 'Óleo de Prata', ic: 'droplet', desc: 'Passado nas armas do grupo: +1d4 contra mortos-vivos.' },
    chave: { n: 'Chave de Osso', ic: 'key-round', desc: 'Feita de um fêmur. Abre a cripta do Rei Corvo.' },
    amuleto: { n: 'Amuleto de Lodo', ic: 'gem', desc: 'Presente da bruxa. Metade do dano necrótico.' }
  };

  // ------------------------------------------------------------- monstros
  R.MONSTROS = {
    ossudo: { nome: 'Ossudo', vis: 'ossudo', pv: 9, ca: 12, desl: 4, xp: 50, mv: true, iniciativa: 1,
      ataques: [{ n: 'Lâmina enferrujada', b: 4, d: '1d6+2', alc: 1, anim: 'golpe' }],
      falas: ['Clac... clac...', 'O sino chama...', 'Juntem-se a nós.'] },
    arqueiro: { nome: 'Esqueleto Besteiro', vis: 'arqueiro', pv: 10, ca: 13, desl: 4, xp: 50, mv: true, iniciativa: 2,
      ataques: [{ n: 'Besta velha', b: 4, d: '1d8+2', alc: 6, anim: 'besta', fx: 'virote' }] },
    lobo: { nome: 'Lobo de Breu', vis: 'lobo', pv: 11, ca: 13, desl: 6, xp: 50, matilha: true, iniciativa: 2,
      ataques: [{ n: 'Mordida', b: 4, d: '2d4+2', alc: 1, anim: 'mordida' }],
      falas: ['Grrrr...', 'Auuuuu!'] },
    bandido: { nome: 'Bandido', vis: 'bandido', pv: 11, ca: 12, desl: 5, xp: 50, iniciativa: 1,
      ataques: [{ n: 'Facão', b: 3, d: '1d6+1', alc: 1, anim: 'golpe' }],
      falas: ['Passa a bolsa!', 'Pro chão, forasteiro!'] },
    besteiro: { nome: 'Bandido Besteiro', vis: 'besteiro', pv: 10, ca: 12, desl: 5, xp: 50, iniciativa: 2,
      ataques: [{ n: 'Besta leve', b: 4, d: '1d8+1', alc: 7, anim: 'besta', fx: 'virote' }] },
    garra: { nome: 'Garra, chefe dos bandidos', vis: 'garra', pv: 24, ca: 14, desl: 5, xp: 150, iniciativa: 2, rende: 7,
      ataques: [{ n: 'Dois machados', b: 5, d: '2d6+3', alc: 1, anim: 'golpe2' }],
      falas: ['Vocês não sabem com quem se meteram!', 'Ha! Isso foi tudo?'] },
    afogado: { nome: 'Afogado', vis: 'afogado', pv: 13, ca: 11, desl: 4, xp: 50, mv: true, iniciativa: 0,
      ataques: [{ n: 'Garras de lodo', b: 4, d: '1d8+2', alc: 1, anim: 'garra' }],
      falas: ['Glub... frio... tão frio...'] },
    cavaleiro: { nome: 'Cavaleiro da Cripta', vis: 'cavaleiro', pv: 30, ca: 16, desl: 4, xp: 200, mv: true, iniciativa: 1,
      ataques: [{ n: 'Machado tumular', b: 5, d: '1d10+3', alc: 1, anim: 'golpe2', tipo: 'necro' }],
      falas: ['Ninguém perturba o sono do Rei.', 'Ajoelhem-se diante da morte.'] },
    vorag: { nome: 'Vorag, o Sineiro', vis: 'vorag', pv: 45, ca: 13, desl: 4, xp: 400, mv: true, chefe: true, iniciativa: 3,
      ataques: [
        { n: 'Raio Necrótico', b: 5, d: '2d8', alc: 6, anim: 'magia', fx: 'necro', tipo: 'necro' },
        { n: 'Toque gélido', b: 5, d: '1d8+3', alc: 1, anim: 'golpe', tipo: 'necro' }
      ],
      falas: ['Cada badalada é uma alma. E eu quero todas.', 'Levantem-se, meus servos!', 'O Rei Corvo voltará!'] }
  };

  // ----------------------------------------------------------------- NPCs
  R.NPCS = {
    bjorn: { nome: 'Bjorn, o taverneiro', vis: 'bjorn', voz: { tom: 0.6, vel: 0.95 } },
    alda: { nome: 'Alda, a anciã', vis: 'alda', voz: { tom: 1.1, vel: 0.85 } },
    ravna: { nome: 'Ravna, caçadora de monstros', vis: 'ravna', voz: { tom: 0.9, vel: 0.9 } },
    edvin: { nome: 'Edvin, mercador ferido', vis: 'edvin', pose: 'caido', voz: { tom: 0.85, vel: 0.85 } },
    garra_npc: { nome: 'Garra, chefe dos bandidos', vis: 'garra', voz: { tom: 0.55, vel: 1.0 } },
    lodo: { nome: 'Mãe Lodo', vis: 'lodo', voz: { tom: 1.45, vel: 0.8 } },
    liv: { nome: 'Liv', vis: 'liv', pose: 'presa', voz: { tom: 1.6, vel: 1.05 } }
  };
  R.NARRADOR = { voz: { tom: 0.85, vel: 0.92 } };

  // ---------------------------------------------------------------- cenas
  // Mapa: 8 colunas (A–H) x 6 linhas (1–6). '.' chão, '#' parede, '~' água (custa 2),
  // '^' armadilha escondida, 'S' saída. Outras letras vêm da legenda da cena.
  // Legenda: b = bloqueia, o = bloqueia visão, m = modelo, s = tamanho em casas.
  R.CENAS = [
    // ===================================================== 1. A TAVERNA
    {
      id: 'taverna', titulo: 'O Javali Manco', sub: 'Pedrafria, noite de nevasca',
      tema: 'taverna',
      mapa: [
        'BK==.EEB',
        '........',
        '.M..M...',
        '........',
        '...M....',
        'S.......'
      ],
      legenda: {
        B: { b: 1, m: 'barrel_large', s: 0.7 },
        K: { b: 1, m: 'keg_decorated', s: 0.8 },
        '=': { b: 1, m: 'table_long_decorated_A', s: 1.1, r: 90 },
        E: { b: 1, o: 1, m: 'shelf_small_candles', s: 0.9 },
        M: { b: 1, m: 'table_medium_decorated_A', s: 0.95 }
      },
      entrada: [[1, 5], [2, 5], [1, 4], [0, 4], [2, 4]],
      saida: [0, 5],
      unidades: [
        { id: 'bjorn', npc: 'bjorn', x: 4, y: 0, dialogo: 'bjorn' },
        { id: 'alda', npc: 'alda', x: 2, y: 2, dialogo: 'alda', pose: 'sentada' },
        { id: 'ravna', npc: 'ravna', x: 7, y: 3, dialogo: 'ravna' },
        { id: 'alcapao', obj: 'alcapao', x: 6, y: 4 },
        { id: 'oss1', m: 'ossudo', x: 6, y: 5, oculto: true },
        { id: 'oss2', m: 'ossudo', x: 7, y: 4, oculto: true },
        { id: 'oss3', m: 'ossudo', x: 5, y: 5, oculto: true, min: 3 },
        { id: 'oss4', m: 'ossudo', x: 7, y: 5, oculto: true, min: 5 }
      ],
      objetivo: 'Converse com Alda, a anciã sentada à mesa.',
      inicio: [
        { narrar: 'A nevasca uiva sobre Pedrafria. Na taverna O Javali Manco, o fogo estala, a cerveja é amarga e ninguém fala alto. Há três noites, o sino da torre velha toca sozinho à meia-noite. E a cada badalada, alguém desaparece na névoa.' },
        { falar: ['bjorn', 'Fechem essa porta, o frio entra junto com a desgraça! Se vieram pelo trabalho, a velha Alda está ali na mesa do canto.'] }
      ],
      gatilhos: [
        { id: 'sino_toca', se: { flag: 'aceitou_trabalho' }, faz: [
          { som: 'sino' },
          { narrar: 'DONG. O sino da torre velha ecoa pela vila. As velas tremem. Debaixo do alçapão do porão, algo arranha a madeira... e a tampa explode em lascas.' },
          { surgir: ['oss1', 'oss2', 'oss3', 'oss4'] },
          { falar: ['oss1', 'O sino chama... juntem-se a nós...'] },
          { falar: ['ravna', 'Mortos-vivos! Mirem nos crânios, eles caem rápido!'] },
          { objetivo: 'Destrua os mortos-vivos que saíram do porão.' },
          { combate: true }
        ] },
        { id: 'fim_ossos', se: { flag: 'sino_toca_ok', semInimigos: true }, faz: [
          { xp: 150 },
          { narrar: 'O último crânio rola pelo chão de tábuas. Entre os ossos há terra escura, cheirando a túmulo antigo. Terra da colina do Rei Corvo.' },
          { falar: ['alda', 'Pelos deuses... Eles estão vindo da cripta. A estrada passa pela Floresta de Breu. Vão, antes da próxima badalada!'] },
          { objetivo: 'Saia pela porta da taverna (casa A6) rumo à Floresta de Breu.' },
          { saida: true }
        ] }
      ],
      dialogos: {
        alda: { inicio: 'a1', nos: {
          a1: { fala: 'Vocês têm cara de quem não teme o escuro. Ótimo. Minha neta, Liv, sumiu ontem, na terceira badalada. Ela é tudo que me resta.', opcoes: [
            { t: 'O que está acontecendo com o sino?', vai: 'a2' },
            { t: 'Vamos trazê-la de volta. Qual o pagamento?', vai: 'a3' },
            { t: 'Agora não.', fim: true }
          ] },
          a2: { fala: 'Aquele sino foi forjado há cem anos, quando enterramos o Rei Corvo na colina. Dizem que o badalo foi feito com os ossos dele. Ninguém sobe na torre desde então. E agora ele toca sozinho.', opcoes: [
            { t: 'Vamos trazer sua neta de volta.', vai: 'a3' },
            { t: '[História CD 12] O Rei Corvo... já ouvi esse nome.', teste: { p: 'historia', cd: 12, ok: 'a2ok', falha: 'a2no' } }
          ] },
          a2ok: { fala: 'Então sabe que ele era um necromante que se dizia rei. Seu servo mais fiel era um sineiro chamado Vorag, que jurou tocar o sino até o mestre voltar. Se Vorag voltou... que os deuses nos ajudem.', faz: [{ flag: 'sabe_vorag' }, { xp: 25 }], opcoes: [{ t: 'Vamos trazer sua neta de volta.', vai: 'a3' }] },
          a2no: { fala: 'É uma história velha, contada para assustar crianças. Pena que agora ela parece verdadeira.', opcoes: [{ t: 'Vamos trazer sua neta de volta.', vai: 'a3' }] },
          a3: { fala: 'Pago cinquenta moedas de prata. É tudo que a vila conseguiu juntar.', opcoes: [
            { t: 'Feito. Aceitamos.', vai: 'a5' },
            { t: '[Persuasão CD 13] Arriscaremos a vida. Vale mais que isso.', teste: { p: 'persuasao', cd: 13, ok: 'a4ok', falha: 'a4no' } }
          ] },
          a4ok: { fala: 'Tem razão... Leve também o anel do meu marido. Vale outras cinquenta. Só tragam Liv para casa.', faz: [{ ouro: 50 }], opcoes: [{ t: 'Pode confiar em nós.', vai: 'a5' }] },
          a4no: { fala: 'Não tenho mais nada. Se o preço é alto demais, a porta está ali.', opcoes: [{ t: 'Tudo bem. Aceitamos.', vai: 'a5' }] },
          a5: { fala: 'Obrigada. Que a luz guie seus passos. Ah... vocês ouviram isso?', faz: [{ ouro: 50 }, { flag: 'aceitou_trabalho' }, { flag: 'sino_toca_ok' }], fim: true }
        } },
        bjorn: { inicio: 'b1', nos: {
          b1: { fala: 'O que vai ser? Cerveja, sopa, ou fofoca?', opcoes: [
            { t: 'Fofoca. O que anda acontecendo?', vai: 'b2' },
            { t: '[Persuasão CD 10] Tem algo mais forte para a estrada?', teste: { p: 'persuasao', cd: 10, ok: 'b3', falha: 'b4' }, seNao: 'bjorn_pocao' },
            { t: 'Nada, obrigado.', fim: true }
          ] },
          b2: { fala: 'Os bandidos do Garra acamparam na Floresta de Breu. Um deles passou aqui branco feito leite, dizendo que viu luzes verdes na colina do Rei Corvo. Desde então, nem bandido quer ir pra lá.', faz: [{ flag: 'sabe_garra' }], opcoes: [{ t: 'Obrigado, Bjorn.', fim: true }] },
          b3: { fala: 'Gostei de você. Tome, é uma poção que um alquimista deixou de pagamento. Cura até ressaca de anão.', faz: [{ item: ['pocao', 1] }, { flag: 'bjorn_pocao' }], opcoes: [{ t: 'Fico te devendo.', fim: true }] },
          b4: { fala: 'O mais forte que tenho é o meu soco. Quer provar?', opcoes: [{ t: 'Deixa pra lá.', fim: true }] }
        } },
        ravna: { inicio: 'r1', nos: {
          r1: { fala: 'Não se aproximem demais. Meu medalhão está vibrando desde que cheguei. Há magia de morte nesta vila.', opcoes: [
            { t: 'Quem é você?', vai: 'r2' },
            { t: '[Intuição CD 12] Você sabe mais do que diz.', teste: { p: 'intuicao', cd: 12, ok: 'r3', falha: 'r4' }, seNao: 'oleo_ok' },
            { t: 'Deixa pra lá.', fim: true }
          ] },
          r2: { fala: 'Ravna. Caço monstros por dinheiro. Cheguei tarde demais para a primeira vítima e cedo demais para ser paga pela última.', opcoes: [
            { t: '[Intuição CD 12] Você sabe mais do que diz.', teste: { p: 'intuicao', cd: 12, ok: 'r3', falha: 'r4' }, seNao: 'oleo_ok' },
            { t: 'Boa caçada.', fim: true }
          ] },
          r3: { fala: 'Esperta. Mortos-vivos odeiam prata. Tome este frasco de óleo de prata e passem nas armas. E um conselho: quem toca um sino, toca pelo badalo. Quebrem o badalo.', faz: [{ item: ['oleo', 1] }, { flag: 'oleo_ok' }, { flag: 'dica_badalo' }, { xp: 25 }], opcoes: [{ t: 'Obrigado, Ravna.', fim: true }] },
          r4: { fala: 'Sei que vocês vão morrer se forem para aquela colina. Isso basta.', opcoes: [{ t: 'Veremos.', fim: true }] }
        } }
      }
    },

    // ===================================================== 2. A FLORESTA
    {
      id: 'floresta', titulo: 'Floresta de Breu', sub: 'A estrada velha, sob a neve',
      tema: 'floresta',
      mapa: [
        'TT.T.TTT',
        '.R...T..',
        '.......S',
        '........',
        'T..R..T.',
        'TT.TT.TT'
      ],
      legenda: {
        T: { b: 1, o: 1, m: 'trees_A_large', s: 0.95, var: ['trees_A_large', 'tree_single_A', 'trees_A_medium'] },
        R: { b: 1, m: 'rock_single_A', s: 0.8, var: ['rock_single_A', 'rock_single_C', 'rock_single_E'] }
      },
      entrada: [[0, 2], [0, 3], [1, 3], [0, 1], [1, 2]],
      saida: [7, 2],
      unidades: [
        { id: 'carroca', obj: 'carroca', x: 3, y: 2 },
        { id: 'edvin', npc: 'edvin', x: 3, y: 3, dialogo: 'edvin' },
        { id: 'lobo1', m: 'lobo', x: 7, y: 1, oculto: true },
        { id: 'lobo2', m: 'lobo', x: 7, y: 3, oculto: true },
        { id: 'lobo3', m: 'lobo', x: 6, y: 3, oculto: true, min: 3 },
        { id: 'lobo4', m: 'lobo', x: 7, y: 4, oculto: true, min: 5 }
      ],
      objetivo: 'Siga pela estrada. Há uma carroça tombada à frente.',
      inicio: [
        { narrar: 'A Floresta de Breu engole a luz. Os pinheiros rangem com o peso da neve e a estrada some entre as raízes. Adiante, uma carroça tombada. E um gemido baixo.' }
      ],
      gatilhos: [
        { id: 'lobos', se: { qualquer: [{ flag: 'falou_edvin' }, { area: [4, 0, 7, 5] }] }, faz: [
          { som: 'uivo' },
          { narrar: 'Uivos cortam o silêncio. Olhos amarelos acendem entre as árvores. Os lobos de Breu sentiram o cheiro de sangue.' },
          { surgir: ['lobo1', 'lobo2', 'lobo3', 'lobo4'] },
          { flag: 'lobos_ok' },
          { objetivo: 'Sobreviva à matilha.' },
          { combate: true }
        ] },
        { id: 'fim_lobos', se: { flag: 'lobos_ok', semInimigos: true }, faz: [
          { xp: 100 },
          { narrar: 'O último lobo foge ganindo para a escuridão. A estrada para leste está livre. Rastros de botas seguem na mesma direção.' },
          { objetivo: 'Siga a estrada para leste (casa H3).' },
          { saida: true }
        ] }
      ],
      dialogos: {
        edvin: { inicio: 'e1', nos: {
          e1: { fala: 'Socorro... os lobos... levaram meu cavalo. Minha perna... não sinto minha perna.', opcoes: [
            { t: '[Medicina CD 12] Deixe-me ver esse ferimento.', teste: { p: 'medicina', cd: 12, ok: 'e2', falha: 'e3' } },
            { t: 'Quem fez isso com você?', vai: 'e4' }
          ] },
          e2: { fala: 'Ah... o sangue parou. Obrigado, estranho. Tome, é tudo que salvei. E ouça: os bandidos do Garra acamparam a leste. Eles têm uma chave estranha, feita de osso. Disseram que abre a cripta.', faz: [{ flag: 'falou_edvin' }, { flag: 'edvin_vivo' }, { ouro: 20 }, { xp: 50 }, { flag: 'sabe_chave' }], fim: true },
          e3: { fala: 'Não... adianta... Ouça... os bandidos, a leste... têm uma chave de osso. A cripta... Diga à minha filha que eu...', faz: [{ flag: 'falou_edvin' }, { flag: 'sabe_chave' }, { narrar: 'Edvin solta o último suspiro. A neve começa a cobri-lo.' }], fim: true },
          e4: { fala: 'Lobos... mas não lobos comuns. Eles corriam da colina, fugindo de alguma coisa. Por favor... minha perna.', opcoes: [
            { t: '[Medicina CD 12] Deixe-me ver esse ferimento.', teste: { p: 'medicina', cd: 12, ok: 'e2', falha: 'e3' } }
          ] }
        } }
      }
    },

    // ===================================================== 3. ACAMPAMENTO
    {
      id: 'acampamento', titulo: 'O Acampamento de Garra', sub: 'Clareira dos foragidos',
      tema: 'floresta', pacifico: true,
      mapa: [
        'TTtTT.tT',
        'T.......',
        '...F..X.',
        '........',
        'T.X....R',
        'TT.TTTST'
      ],
      legenda: {
        T: { b: 1, o: 1, m: 'trees_A_large', s: 0.95, var: ['trees_A_large', 'tree_single_A', 'trees_A_medium'] },
        t: { b: 1, o: 1, m: 'tent', s: 1.0 },
        F: { b: 1, m: '@fogueira', s: 0.8 },
        X: { b: 1, m: 'crate_A_big', s: 0.7, var: ['crate_A_big', 'barrel', 'resource_lumber'] },
        R: { b: 1, m: 'rock_single_C', s: 0.8 }
      },
      entrada: [[0, 2], [0, 3], [1, 3], [1, 2], [2, 3]],
      saida: [6, 5],
      unidades: [
        { id: 'garra', m: 'garra', x: 4, y: 1, dialogo: 'garra', npcAte: 'combate' },
        { id: 'band1', m: 'bandido', x: 5, y: 2 },
        { id: 'band2', m: 'besteiro', x: 7, y: 1 },
        { id: 'band3', m: 'bandido', x: 5, y: 3, min: 3 },
        { id: 'band4', m: 'besteiro', x: 4, y: 4, min: 4 }
      ],
      objetivo: 'Consiga a Chave de Osso com Garra. Por bem ou por mal.',
      inicio: [
        { narrar: 'Fumaça de fogueira e cheiro de carne queimada. Tendas remendadas formam um círculo na clareira. Bandidos armados levantam os olhos. O maior deles, com dois machados no cinto, cospe no chão.' },
        { falar: ['garra', 'Mais um passo e vocês viram comida de lobo. O que querem no acampamento do Garra?'] },
        { objetivo: 'Fale com Garra (ou ataque, se preferir).' }
      ],
      gatilhos: [
        { id: 'briga', se: { flag: 'briga' }, faz: [
          { falar: ['garra', 'Peguem eles!'] },
          { objetivo: 'Derrote os bandidos. Garra se rende quando estiver perto de cair.' },
          { combate: true }
        ] },
        { id: 'rendeu', se: { flag: 'garra_rendeu' }, faz: [
          { falar: ['garra', 'Chega! Chega! Leva essa maldita chave. Ela só trouxe azar pra gente.'] },
          { fugir: ['band1', 'band2', 'band3', 'band4'] },
          { remover: ['garra'] },
          { flag: 'tem_chave' }
        ] },
        { id: 'garra_morre', se: { morto: 'garra' }, faz: [
          { narrar: 'No cinto de Garra, vocês encontram a Chave de Osso.' },
          { flag: 'tem_chave' }
        ] },
        { id: 'fim_acamp', se: { flag: 'tem_chave', semInimigos: true }, faz: [
          { item: ['chave', 1] },
          { xp: 150 },
          { narrar: 'A Chave de Osso pesa na mão como se estivesse viva. Ao sul, além do pântano, fica a colina do Rei Corvo. Mas há quem diga que a bruxa do pântano sabe os segredos da cripta.' },
          { objetivo: 'Siga a trilha para o sul, rumo ao pântano (casa G6).' },
          { saida: true }
        ] }
      ],
      dialogos: {
        garra: { inicio: 'g1', nos: {
          g1: { fala: 'Falem rápido. Meus rapazes estão com fome e vocês parecem macios.', opcoes: [
            { t: 'Viemos pela Chave de Osso. Não queremos briga.', vai: 'g2' },
            { t: '[Intimidação CD 15] Entregue a chave ou enterro você aqui.', teste: { p: 'intimidacao', cd: 15, ok: 'g4', falha: 'g5' } },
            { t: 'Atacar!', faz: [{ flag: 'briga' }], fim: true }
          ] },
          g2: { fala: 'A chave... então é isso. Achamos na colina, num esqueleto de armadura. Desde então, nossos homens somem à noite. E vocês querem a chave de graça?', opcoes: [
            { t: '[Persuasão CD 14] Essa chave é uma maldição. Nós levamos o problema embora.', teste: { p: 'persuasao', cd: 14, ok: 'g3', falha: 'g5' } },
            { t: 'Pagamos 50 moedas.', req: { ouro: 50 }, faz: [{ ouro: -50 }], vai: 'g3' },
            { t: 'Então vai ser do jeito difícil.', faz: [{ flag: 'briga' }], fim: true }
          ] },
          g3: { fala: 'Hm. Tem razão, sabe? Leve. E se forem à colina, passem antes pela bruxa do pântano. Ela sabe coisas que ninguém devia saber.', faz: [{ flag: 'tem_chave' }, { flag: 'paz_garra' }, { xp: 100 }, { remover: ['garra', 'band1', 'band2', 'band3', 'band4'] }, { narrar: 'Garra joga a chave aos seus pés. Os bandidos recolhem as tendas e somem entre as árvores.' }], fim: true },
          g4: { fala: 'Calma, calma! Ninguém precisa morrer hoje. Aqui, pega essa porcaria.', faz: [{ flag: 'tem_chave' }, { xp: 100 }, { remover: ['garra', 'band1', 'band2', 'band3', 'band4'] }, { narrar: 'Os bandidos fogem para a mata, deixando a fogueira acesa.' }], fim: true },
          g5: { fala: 'Ha! Achou que ia me enganar? Rapazes, ao trabalho!', faz: [{ flag: 'briga' }], fim: true }
        } }
      }
    },

    // ===================================================== 4. O PÂNTANO
    {
      id: 'pantano', titulo: 'A Cabana de Mãe Lodo', sub: 'Pântano das Sanguessugas',
      tema: 'pantano',
      mapa: [
        'T~~..~~T',
        '~~.HhA~~',
        '~......~',
        '..~..~..',
        '..~~..~.',
        '....~~.S'
      ],
      legenda: {
        T: { b: 1, o: 1, m: 'tree_dead_large', s: 1.0, var: ['tree_dead_large', 'tree_dead_medium'] },
        H: { b: 1, o: 1, m: 'building_home_B_green', s: 1.9, dx: 0.5 },
        h: { b: 1, o: 1 },
        A: { b: 1, m: 'shrine_candles', s: 0.8 }
      },
      entrada: [[0, 5], [1, 5], [0, 4], [1, 4], [0, 3]],
      saida: [7, 5],
      unidades: [
        { id: 'lodo', npc: 'lodo', x: 3, y: 2, dialogo: 'lodo' },
        { id: 'bau_bruxa', obj: 'bau_bruxa', x: 2, y: 1 },
        { id: 'afo1', m: 'afogado', x: 1, y: 1, oculto: true },
        { id: 'afo2', m: 'afogado', x: 6, y: 1, oculto: true },
        { id: 'afo3', m: 'afogado', x: 5, y: 3, oculto: true, min: 3 },
        { id: 'afo4', m: 'afogado', x: 6, y: 4, oculto: true, min: 5 }
      ],
      objetivo: 'Fale com Mãe Lodo, a bruxa do pântano.',
      inicio: [
        { narrar: 'A água negra borbulha. Sapos se calam quando vocês passam. Na cabana torta, sobre palafitas, uma velha encurvada mexe um caldeirão sem fogo. Ela sorri antes mesmo de vocês chegarem.' },
        { falar: ['lodo', 'Hihihi... Visitantes. Vieram perguntar sobre o sino, não foi? Todos perguntam. Ninguém paga.'] }
      ],
      gatilhos: [
        { id: 'afogados', se: { flag: 'afogados' }, faz: [
          { som: 'agua' },
          { narrar: 'A bruxa bate o cajado na lama. Da água escura, mãos inchadas e pálidas se erguem. Os afogados do pântano obedecem à sua senhora.' },
          { falar: ['lodo', 'Brinquem com eles, meus queridos. Mamãe vai assistir.'] },
          { remover: ['lodo'] },
          { surgir: ['afo1', 'afo2', 'afo3', 'afo4'] },
          { objetivo: 'Derrote os afogados.' },
          { combate: true }
        ] },
        { id: 'fim_afog', se: { flag: 'afogados', semInimigos: true }, faz: [
          { xp: 100 },
          { narrar: 'Os afogados afundam de volta no lodo. A bruxa sumiu, mas deixou o baú aberto na varanda.' },
          { flag: 'pode_sair' }
        ] },
        { id: 'saida_p', se: { flag: 'pode_sair' }, faz: [
          { objetivo: 'Siga para a colina do Rei Corvo (casa H6).' },
          { saida: true }
        ] }
      ],
      dialogos: {
        lodo: { inicio: 'l1', nos: {
          l1: { fala: 'Mãe Lodo sabe tudo do sino. Sabe por que ele toca, sabe quem o toca, sabe como calar ele. Mas saber custa caro, docinhos.', opcoes: [
            { t: 'Qual o preço?', vai: 'l2' },
            { t: '[Intuição CD 13] O que você está escondendo?', teste: { p: 'intuicao', cd: 13, ok: 'l6', falha: 'l7' }, seNao: 'sabe_liv' },
            { t: 'Não negociamos com bruxas.', vai: 'l8' }
          ] },
          l2: { fala: 'Três preços, escolham um. Uma lembrança feliz, arrancada da cabeça de um de vocês. O óleo de prata que a caçadora deu. Ou uma promessa: tragam-me o crânio do Rei Corvo quando tudo acabar.', opcoes: [
            { t: 'Dou uma lembrança. (o herói que fala perde 2 PV máximos)', faz: [{ custoMemoria: 2 }], vai: 'l3' },
            { t: 'Fique com o óleo de prata.', req: { item: 'oleo' }, faz: [{ tirarItem: 'oleo' }], vai: 'l3' },
            { t: 'Prometemos o crânio.', faz: [{ flag: 'promessa_cranio' }], vai: 'l3' },
            { t: 'Caro demais.', vai: 'l8' }
          ] },
          l3: { fala: 'Hihi, negócio fechado. Ouçam: o badalo do sino é o coração do Rei Corvo. Vorag, o sineiro, toca o sino para arrancar almas e acordar o mestre. Quebrem o badalo e os mortos não levantam mais. E tomem este amuleto: o frio da morte vai doer menos.', faz: [{ flag: 'segredo_sino' }, { item: ['amuleto', 1] }, { xp: 100 }, { flag: 'pode_sair' }], opcoes: [{ t: 'E a garota, Liv?', vai: 'l4' }] },
          l4: { fala: 'Viva, por enquanto. Vorag precisa de sangue jovem para a última badalada. Corram, docinhos. A meia-noite não espera.', faz: [{ flag: 'sabe_liv' }], fim: true },
          l6: { fala: 'Olhos espertos... Está bem. A menina Liv está viva, presa ao pé do sino. Vorag quer o sangue dela para a última badalada. Isso eu digo de graça. O resto, não.', faz: [{ flag: 'sabe_liv' }, { xp: 25 }], opcoes: [{ t: 'Qual o preço pelo resto?', vai: 'l2' }, { t: 'Não negociamos com bruxas.', vai: 'l8' }] },
          l7: { fala: 'Esconder? Mãe Lodo? Hihihi. Nada, docinho. Nada mesmo.', opcoes: [{ t: 'Qual o preço?', vai: 'l2' }, { t: 'Não negociamos com bruxas.', vai: 'l8' }] },
          l8: { fala: 'Que pena. Então descubram sozinhos... se sobreviverem aos meus filhinhos.', faz: [{ flag: 'afogados' }], fim: true }
        } }
      }
    },

    // ===================================================== 5. A CRIPTA
    {
      id: 'cripta', titulo: 'A Cripta do Rei Corvo', sub: 'Sob a colina, onde a luz não chega',
      tema: 'cripta',
      mapa: [
        '.P...#.S',
        '...^.#.#',
        '.P...P..',
        '..^.....',
        '###.####',
        '........'
      ],
      legenda: {
        P: { b: 1, o: 1, m: 'pillar_decorated', s: 0.75 }
      },
      entrada: [[3, 5], [4, 5], [2, 5], [5, 5], [1, 5]],
      saida: [7, 0],
      unidades: [
        { id: 'porta', obj: 'porta_cripta', x: 3, y: 4 },
        { id: 'portao', obj: 'portao', x: 6, y: 0 },
        { id: 'alav1', obj: 'alavanca', x: 0, y: 0 },
        { id: 'alav2', obj: 'alavanca2', x: 7, y: 3 },
        { id: 'bau', obj: 'bau_cripta', x: 0, y: 3 },
        { id: 'cav', m: 'cavaleiro', x: 6, y: 1, oculto: true },
        { id: 'c_oss1', m: 'ossudo', x: 4, y: 0, oculto: true },
        { id: 'c_oss2', m: 'ossudo', x: 1, y: 1, oculto: true },
        { id: 'c_arq', m: 'arqueiro', x: 4, y: 2, oculto: true, min: 3 },
        { id: 'c_oss3', m: 'ossudo', x: 5, y: 3, oculto: true, min: 4 }
      ],
      objetivo: 'Abra a porta da cripta (casa D5).',
      inicio: [
        { narrar: 'A colina do Rei Corvo é um monte de pedras negras coroado por corvos que não voam. A porta da cripta tem a forma de um crânio aberto, e uma fechadura no lugar dos dentes.' }
      ],
      gatilhos: [
        { id: 'desperta', se: { flag: 'porta_aberta' }, faz: [
          { som: 'pedra' },
          { narrar: 'A porta range. O ar de dentro é frio como a primeira noite de inverno. Nos nichos, ossos se juntam, armaduras se erguem. O guardião do Rei Corvo abre os olhos verdes.' },
          { surgir: ['cav', 'c_oss1', 'c_oss2', 'c_arq', 'c_oss3'] },
          { falar: ['cav', 'Ninguém perturba o sono do Rei.'] },
          { objetivo: 'Derrote os guardiões. Cuidado com o chão: a cripta tem armadilhas.' },
          { combate: true }
        ] },
        { id: 'guardioes', se: { flag: 'porta_aberta', semInimigos: true }, faz: [
          { xp: 150 },
          { narrar: 'Os guardiões caem em pedaços. No fundo da cripta, um portão de ferro bloqueia uma escada que sobe. Duas alavancas enferrujadas, uma em cada canto da sala.' },
          { objetivo: 'Puxe as duas alavancas para abrir o portão (casas A1 e H4).' }
        ] },
        { id: 'portao_abre', se: { flags: ['alav1', 'alav2'] }, faz: [
          { som: 'pedra' },
          { narrar: 'Com um estrondo, o portão de ferro sobe. Lá de cima, vem o som de correntes e uma risada seca. E então, o sino. DONG.' },
          { remover: ['portao'] },
          { objetivo: 'Suba ao Salão do Sino (casa H1).' },
          { saida: true }
        ] }
      ],
      dialogos: {}
    },

    // ===================================================== 6. O SALÃO DO SINO
    {
      id: 'salao', titulo: 'O Salão do Sino', sub: 'Meia-noite',
      tema: 'salao',
      mapa: [
        '#..Bx..#',
        '.P....P.',
        '........',
        '........',
        '.P....P.',
        '........'
      ],
      legenda: {
        P: { b: 1, o: 1, m: 'pillar_decorated', s: 0.72 },
        B: { b: 0 },
        x: { b: 1 }
      },
      entrada: [[3, 5], [4, 5], [2, 5], [5, 5], [3, 4]],
      saida: null,
      unidades: [
        { id: 'sino', obj: 'sino', x: 3, y: 0 },
        { id: 'liv', npc: 'liv', x: 1, y: 0, dialogo: 'liv' },
        { id: 'vorag', m: 'vorag', x: 4, y: 1 },
        { id: 's_oss1', m: 'ossudo', x: 2, y: 1 },
        { id: 's_oss2', m: 'ossudo', x: 5, y: 1, min: 3 }
      ],
      objetivo: 'Derrote Vorag, o Sineiro.',
      inicio: [
        { som: 'sino' },
        { narrar: 'O salão no topo da colina é aberto para o céu. Um sino de bronze escurecido balança sozinho, e seu badalo é um crânio coroado. Ao lado dele, uma figura esquelética de manto puído segura a corda. Amarrada a uma coluna, uma menina chora em silêncio.' },
        { falar: ['vorag', 'Ahhh... mais almas para o meu sino. Cada badalada é um passo do Rei Corvo de volta ao mundo. E vocês serão a última.'] },
        { falar: ['liv', 'Socorro! Por favor, me tirem daqui!'] },
        { combate: true }
      ],
      gatilhos: [
        { id: 'dica_sino', se: { flag: 'segredo_sino' }, faz: [
          { narrar: 'Vocês lembram das palavras da bruxa: o badalo é o coração do Rei Corvo. Ataquem o sino e Vorag não poderá mais erguer os mortos.' }
        ] },
        { id: 'dica_sino2', se: { flag: 'dica_badalo', semFlag: 'segredo_sino' }, faz: [
          { narrar: 'Ravna disse: quem toca um sino, toca pelo badalo. O sino pode ser atacado.' }
        ] },
        { id: 'sino_quebra', se: { morto: 'sino' }, faz: [
          { som: 'sino_quebra' },
          { narrar: 'O badalo-crânio se parte com um grito que não é humano. O sino racha de cima a baixo. Vorag cambaleia: sem o coração do mestre, sua magia vacila.' },
          { flag: 'sino_quebrado' },
          { falar: ['vorag', 'NÃO! O que vocês fizeram?!'] }
        ] },
        { id: 'vitoria', se: { morto: 'vorag' }, faz: [
          { matarTodos: true },
          { xp: 400 },
          { narrar: 'Vorag se desfaz em cinzas e o manto cai vazio no chão. Os ossos dos servos desabam ao mesmo tempo. O vento muda. Pela primeira vez em três noites, a meia-noite passa em silêncio.' },
          { final: true }
        ] }
      ],
      dialogos: {
        liv: { inicio: 'v1', nos: {
          v1: { fala: 'Vocês vieram! A vovó mandou vocês? Por favor, as cordas!', opcoes: [
            { t: 'Soltar Liv (gasta sua ação em combate).', acao: true, faz: [{ flag: 'liv_livre' }, { xp: 50 }], vai: 'v2' },
            { t: 'Aguente firme, já voltamos.', fim: true }
          ] },
          v2: { fala: 'Obrigada! Eu vou me esconder atrás da coluna. Cuidado com o sino, ele é que dá força ao velho!', faz: [{ remover: ['liv'] }, { flag: 'dica_badalo' }], fim: true }
        } }
      }
    }
  ];

  // --------------------------------------------------------------- objetos
  R.OBJETOS = {
    alcapao: { nome: 'Alçapão do porão', vis: 'alcapao', bloqueia: false,
      acao: 'Examinar', teste: { p: 'percepcao', cd: 10 },
      ok: [{ narrar: 'Pelas frestas do alçapão sobe um cheiro de terra molhada e algo que lembra ossos velhos. Há marcas de unhas na madeira, por baixo.' }],
      falha: [{ narrar: 'Só um alçapão velho. Talvez Bjorn guarde cerveja lá embaixo.' }] },
    carroca: { nome: 'Carroça tombada', vis: 'carroca', bloqueia: true,
      acao: 'Revirar a carga', teste: { p: 'investigacao', cd: 11 },
      ok: [{ narrar: 'Entre sacos rasgados, uma poção de cura intacta.' }, { item: ['pocao', 1] }],
      falha: [{ narrar: 'Só farinha molhada e louça quebrada.' }] },
    bau_bruxa: { nome: 'Baú da bruxa', vis: 'bau', bloqueia: true,
      acao: 'Abrir o baú', teste: { p: 'investigacao', cd: 12 },
      ok: [{ narrar: 'Sob ervas secas e dentes de sapo, um diário de capa de couro: "O badalo é o coração do Rei. Sem ele, Vorag não ergue os mortos". Há também uma poção.' }, { flag: 'segredo_sino' }, { item: ['pocao', 1] }, { xp: 50 }],
      falha: [{ narrar: 'O baú tem um fundo falso, mas vocês não conseguem abri-lo. Uma agulha envenenada espeta o dedo.' }, { danoHeroi: '1d4' }] },
    porta_cripta: { nome: 'Porta da cripta', vis: 'porta', bloqueia: true, alvoPv: false,
      acao: 'Abrir a porta', req: 'chave',
      okReq: [{ narrar: 'A Chave de Osso gira sozinha na fechadura, como se a porta a reconhecesse.' }, { remover: ['porta'] }, { flag: 'porta_aberta' }],
      teste: { p: 'atletismo', cd: 15 },
      ok: [{ narrar: 'Com um empurrão brutal, a porta cede.' }, { remover: ['porta'] }, { flag: 'porta_aberta' }],
      falha: [{ narrar: 'A porta não se move. O ombro dói.' }, { danoHeroi: '1d6' }] },
    portao: { nome: 'Portão de ferro', vis: 'portao', bloqueia: true, acao: 'Examinar', ok: [{ narrar: 'Grosso demais para forçar. Há correntes que descem para as duas alavancas.' }] },
    alavanca: { nome: 'Alavanca enferrujada', vis: 'alavanca', bloqueia: true, acao: 'Puxar a alavanca', uma: true,
      ok: [{ som: 'pedra' }, { narrar: 'CLANK. Uma corrente se move dentro da parede.' }, { flag: 'alav1' }, { virar: true }] },
    alavanca2: { nome: 'Alavanca enferrujada', vis: 'alavanca', bloqueia: true, acao: 'Puxar a alavanca', uma: true,
      ok: [{ som: 'pedra' }, { narrar: 'CLANK. A segunda corrente se move.' }, { flag: 'alav2' }, { virar: true }] },
    bau_cripta: { nome: 'Sarcófago do tesoureiro', vis: 'bau_ouro', bloqueia: true, acao: 'Abrir', uma: true,
      ok: [{ narrar: 'Moedas antigas com a efígie de um corvo, e dois frascos vermelhos selados com cera.' }, { ouro: 80 }, { item: ['pocao', 2] }] },
    sino: { nome: 'O Sino do Rei Corvo', vis: 'sino', bloqueia: true, alvoPv: true, pv: 20, ca: 10,
      acao: 'Examinar', ok: [{ narrar: 'O badalo é um crânio coroado. Ele pulsa com luz verde a cada respiração de Vorag.' }] }
  };

  // ------------------------------------------------------------- epílogo
  R.EPILOGO = function (f) {
    var t = [];
    t.push(f.liv_livre ? 'Liv corre para os braços da avó na porta do Javali Manco. Alda chora e ri ao mesmo tempo.'
      : 'Vocês encontram Liv desacordada ao pé do sino, mas viva. Ela não lembra de nada, só do frio.');
    if (f.edvin_vivo) t.push('Edvin, o mercador, chega mancando à vila uma semana depois e paga uma rodada para todos.');
    if (f.paz_garra) t.push('Os bandidos de Garra nunca mais foram vistos na estrada. Dizem que viraram lenhadores. Dizem.');
    if (f.promessa_cranio) t.push('Mas uma promessa é uma promessa. Na noite seguinte, um corvo pousa na janela da taverna com um bilhete escrito em lama: "Mamãe está esperando o crânio, docinhos."');
    else t.push('No pântano, Mãe Lodo ri sozinha. Ela sabe que o Rei Corvo não estava inteiro naquele sino.');
    t.push('Fim do Capítulo I: A Noite do Sino Morto.');
    return t;
  };
})(RUNA);
