// RUNA — Capítulo II: "A Coroa do Rei Corvo".
// Script clássico (vira Campanha2.gs). Usa as classes, habilidades e itens de campanha.js.
var RUNA = (typeof RUNA !== 'undefined' && RUNA) || {};

(function (R) {
  // ---------------------------------------------------------------- itens novos
  R.ITENS.runa_fogo = { n: 'Runa de Fogo', ic: 'flame', desc: 'Pedra gravada pelos anões. Acende a Forja Antiga sem precisar de feitiço.' };
  R.ITENS.coroa_partida = { n: 'Coroa Partida', ic: 'crown', desc: 'O que sobrou da coroa do Rei Corvo. Fria ao toque, mesmo perto do fogo.' };

  // ------------------------------------------------------------- monstros novos
  var M = R.MONSTROS;
  M.cultista = { nome: 'Cultista das Penas Negras', vis: 'cultista', pv: 13, ca: 13, desl: 5, xp: 75, iniciativa: 2,
    ataques: [{ n: 'Adagas rituais', b: 5, d: '1d6+3', alc: 1, anim: 'facas' }],
    falas: ['A coroa voltará à cabeça certa!', 'Penas negras, olhos abertos!', 'O Rei vê vocês.'] };
  M.cultista_lider = { nome: 'Mestre de Penas', vis: 'cultista', pv: 18, ca: 14, desl: 5, xp: 100, iniciativa: 2, rende: 6,
    ataques: [{ n: 'Foice curta', b: 5, d: '1d8+3', alc: 1, anim: 'golpe' }],
    falas: ['Ajoelhem, e talvez o Rei os poupe.'] };
  M.cultista_arc = { nome: 'Vidente das Penas', vis: 'cultista_arc', pv: 12, ca: 12, desl: 5, xp: 75, iniciativa: 1,
    ataques: [
      { n: 'Chama sombria', b: 5, d: '2d6', alc: 6, anim: 'magia', fx: 'necro', tipo: 'necro' },
      { n: 'Varinha', b: 3, d: '1d4+1', alc: 1, anim: 'golpe' }
    ],
    falas: ['Eu vejo o fim de vocês. É escuro.'] };
  M.rato = { nome: 'Rato das Galerias', vis: 'rato', pv: 6, ca: 11, desl: 6, xp: 25, matilha: true, iniciativa: 3,
    ataques: [{ n: 'Dentes', b: 4, d: '1d4+2', alc: 1, anim: 'mordida' }] };
  M.aranha = { nome: 'Aranha das Profundezas', vis: 'aranha', pv: 14, ca: 13, desl: 6, xp: 75, iniciativa: 3,
    ataques: [{ n: 'Ferrão', b: 5, d: '1d8+3', alc: 1, anim: 'mordida' }] };
  M.aranha_mae = { nome: 'A Tecelã', vis: 'aranha_mae', pv: 30, ca: 14, desl: 6, xp: 200, iniciativa: 2,
    ataques: [{ n: 'Presas venenosas', b: 6, d: '2d8+3', alc: 1, anim: 'mordida' }],
    falas: ['Ssss... carne quente...'] };
  M.troll = { nome: 'Gorm, o Troll da Ponte', vis: 'troll', pv: 45, ca: 14, desl: 5, xp: 300, iniciativa: 0, regenera: 6,
    ataques: [{ n: 'Punho de pedra', b: 6, d: '2d8+4', alc: 1, anim: 'golpe2' }],
    falas: ['GORM AMASSA!', 'Gorm vai comer vocês com musgo!'] };
  M.golem = { nome: 'Guardião de Pedra', vis: 'golem', pv: 32, ca: 16, desl: 4, xp: 200, iniciativa: 0, duro: 3,
    ataques: [{ n: 'Punho rúnico', b: 6, d: '2d8+3', alc: 1, anim: 'golpe2' }],
    falas: ['IN-TRU-SOS.', 'A FORJA... É... DOS ANTIGOS.'] };
  M.espectro = { nome: 'Espectro do Corvo', vis: 'espectro', pv: 14, ca: 13, desl: 6, xp: 75, mv: true, iniciativa: 3,
    ataques: [{ n: 'Lâmina fantasma', b: 5, d: '1d10+2', alc: 1, anim: 'golpe', tipo: 'necro' }],
    falas: ['Frio... tanto frio...', 'Sirvam ao Rei...'] };
  M.corvina = { nome: 'Irmã Corvina', vis: 'corvina', pv: 34, ca: 14, desl: 5, xp: 300, iniciativa: 2,
    ataques: [
      { n: 'Raio do Corvo', b: 6, d: '2d8', alc: 6, anim: 'magia', fx: 'necro', tipo: 'necro' },
      { n: 'Cajado', b: 6, d: '1d8+3', alc: 1, anim: 'golpe' }
    ],
    falas: ['A coroa me escolheu!', 'Ele sussurra o nome de vocês...'] };
  M.rei_corvo = { nome: 'O Rei Corvo', vis: 'rei_corvo', pv: 62, ca: 15, desl: 4, xp: 600, mv: true, chefe: true, iniciativa: 3,
    protegido: 'braseiro',
    invoca: { tipo: 'espectro', cada: 2, max: 3, enquantoObj: 'braseiro', som: 'sino', texto: 'O Rei Corvo ergue o cetro. Almas presas nos braseiros tomam forma!' },
    ataques: [
      { n: 'Lança de Penas', b: 7, d: '2d10', alc: 6, anim: 'magia', fx: 'necro', tipo: 'necro' },
      { n: 'Garra Real', b: 7, d: '2d8+4', alc: 1, anim: 'golpe', tipo: 'necro' }
    ],
    falas: ['Cem anos esperei. Que são mais alguns minutos?', 'Ajoelhem-se diante do seu rei!', 'Minha coroa... MINHA!'] };

  // ----------------------------------------------------------------- NPCs novos
  R.NPCS.hedda = { nome: 'Hedda, a prefeita', vis: 'hedda', voz: { tom: 0.95, vel: 0.95 } };
  R.NPCS.brokk = { nome: 'Brokk, o ferreiro', vis: 'brokk', voz: { tom: 0.55, vel: 0.9 } };
  R.NPCS.cativo = { nome: 'Cultista rendido', vis: 'cativo', voz: { tom: 1.0, vel: 1.1 } };
  R.NPCS.mineiro = { nome: 'Sven, mineiro', vis: 'mineiro', pose: 'caido', voz: { tom: 0.8, vel: 1.0 } };
  R.NPCS.troll_npc = { nome: 'Gorm, o Troll da Ponte', vis: 'troll', voz: { tom: 0.4, vel: 0.8 } };
  R.NPCS.olaf = { nome: 'Olaf', vis: 'cultista', voz: { tom: 1.15, vel: 1.05 } };

  // ----------------------------------------------------------------- objetos novos
  var O = R.OBJETOS;
  O.vagonete = { nome: 'Vagonete carregado', vis: 'vagonete', bloqueia: true, acao: 'Empurrar o vagonete', teste: { p: 'atletismo', cd: 12 },
    ok: [{ som: 'pedra' }, { narrar: 'O vagonete dispara pelos trilhos, cheio de minério, e atropela tudo o que está no caminho!' }, { danoArea: [1, 2, 7, 2, '3d8'] }, { remover: ['vagonete'] }],
    falha: [{ narrar: 'As rodas estão travadas de ferrugem. O vagonete nem se mexe.' }] };
  O.forja = { nome: 'A Forja Antiga', vis: 'forja', bloqueia: true, acao: 'Acender a forja', req: 'runa_fogo',
    okReq: [{ som: 'magia' }, { narrar: 'A Runa de Fogo brilha e se desfaz em brasas. A forja ruge depois de trezentos anos de silêncio, e o salão inteiro se enche de luz dourada.' }, { tirarItem: 'runa_fogo' }, { flag: 'forja_acesa' }, { xp: 50 }],
    teste: { p: 'arcanismo', cd: 15 },
    ok: [{ som: 'magia' }, { narrar: 'Vocês traçam no ar a runa gravada na pedra. Uma faísca, depois outra... e a forja ruge, acesa de novo.' }, { flag: 'forja_acesa' }, { xp: 50 }],
    falha: [{ narrar: 'As runas não respondem. A pedra da forja continua fria como um túmulo.' }] };
  O.bigorna = { nome: 'Bigorna Rúnica', vis: 'bigorna', bloqueia: true, acao: 'Forjar', uma: true, reqFlag: 'forja_acesa',
    semFlag: [{ narrar: 'A bigorna está fria. Sem a forja acesa, o aço estelar não se deixa moldar.' }],
    ok: [{ som: 'pedra' }, { narrar: 'Sobre a bigorna há uma barra de aço estelar, azul como o céu de inverno. Vocês batem, dobram e temperam. As armas do grupo saem da forja com veios de luz.' }, { flag: 'lamina_estelar' }, { xp: 100 }] };
  O.jaula = { nome: 'Jaula de ferro', vis: 'jaula', bloqueia: true, acao: 'Abrir a jaula', teste: { p: 'atletismo', cd: 11 },
    ok: [{ narrar: 'O cadeado cede. O mineiro preso sai cambaleando e corre para a saída.' }, { conta: 'presos_soltos' }, { xp: 25 }, { remover: ['$objeto'] }],
    falha: [{ narrar: 'As barras rangem, mas aguentam. Tentem de novo.' }] };
  O.altar = { nome: 'Altar das Penas', vis: 'altar', bloqueia: true, acao: 'Examinar', teste: { p: 'arcanismo', cd: 12 },
    ok: [{ narrar: 'Sobre o altar, penas negras formam um mapa do salão de cima: três braseiros ao redor de um trono. Uma frase em língua antiga: "Enquanto as almas queimarem, o Rei não sangra."' }, { flag: 'dica_braseiros' }, { xp: 25 }],
    falha: [{ narrar: 'Penas, cera e sangue seco. Vocês não entendem o que significa.' }] };
  O.braseiro = { nome: 'Braseiro de Almas', vis: 'braseiro', bloqueia: true, acao: 'Apagar o braseiro', uma: true,
    ok: [{ som: 'agua' }, { narrar: 'Vocês derrubam o braseiro. As chamas verdes gritam e se apagam, e uma alma presa escapa para o alto, livre.' }, { virar: true }, { flagObjeto: true }] };
  O.trono = { nome: 'Trono de Ossos', vis: 'trono', bloqueia: true, acao: 'Examinar', ok: [{ narrar: 'Um trono feito de ossos de corvo e de homem. No encosto, um nome riscado e reescrito cem vezes: Ravenmund.' }] };

  // --------------------------------------------------------------------- cenas
  var CENAS = [
    // ===================================================== 1. FERROFUNDO
    {
      id: 'ferrofundo', titulo: 'Ferrofundo', sub: 'A vila mineira, sob a lua cheia de inverno',
      tema: 'vila',
      mapa: [
        'II.P..FF',
        'ii....ff',
        '.M......',
        '......X.',
        '.X..C...',
        '.......S'
      ],
      legenda: {
        I: { b: 1, o: 1, m: 'vila:Fantasy_Inn', s: 2.0, dx: 0.5, dz: 0.5 },
        i: { b: 1, o: 1 },
        F: { b: 1, o: 1, m: 'vila:Blacksmith', s: 2.0, dx: 0.5, dz: 0.5 },
        f: { b: 1, o: 1 },
        P: { b: 1, m: 'vila:Well', s: 0.8 },
        M: { b: 1, m: 'vila:Market_Stand', s: 0.95 },
        X: { b: 1, m: 'vila:Crate', s: 0.6, var: ['vila:Crate', 'vila:Barrel', 'vila:Crate_2'] },
        C: { b: 1, m: 'vila:Cart', s: 0.95 }
      },
      entrada: [[0, 5], [1, 5], [0, 4], [2, 5], [0, 3]],
      saida: [7, 5],
      unidades: [
        { id: 'hedda', npc: 'hedda', x: 3, y: 2, dialogo: 'hedda' },
        { id: 'brokk', npc: 'brokk', x: 5, y: 1, dialogo: 'brokk' },
        { id: 'ravna', npc: 'ravna', x: 2, y: 3, dialogo: 'ravna2' },
        { id: 'cult1', m: 'cultista', x: 7, y: 2, oculto: true },
        { id: 'cult2', m: 'cultista', x: 6, y: 4, oculto: true },
        { id: 'lider', m: 'cultista_lider', x: 7, y: 3, oculto: true },
        { id: 'cult3', m: 'cultista_arc', x: 4, y: 0, oculto: true, min: 3 },
        { id: 'cult4', m: 'cultista', x: 5, y: 5, oculto: true, min: 5 },
        { id: 'cativo', npc: 'cativo', x: 7, y: 3, dialogo: 'cativo', oculto: true }
      ],
      objetivo: 'Fale com Hedda, a prefeita, no meio da praça.',
      inicio: [
        { narrar: 'Três semanas depois da Noite do Sino Morto, a estrada leva vocês às Montanhas Cinzentas. Ferrofundo é uma vila de mineiros, fumaça de forja e neve suja de carvão. Há sete noites, os mineiros abriram uma galeria antiga e encontraram uma porta selada com um corvo de pedra. Desde então, vultos de capuz andam pelas ruas quando a lua sobe.' },
        { falar: ['hedda', 'Vocês são os que calaram o sino de Pedrafria? Graças aos deuses. Venham, rápido, antes que escureça de vez.'] }
      ],
      gatilhos: [
        { id: 'emboscada', se: { flag: 'aceitou_coroa' }, faz: [
          { som: 'uivo' },
          { narrar: 'Um assobio corta a praça. Das vielas saem figuras de capuz negro, com penas de corvo costuradas nos mantos. Um deles ergue uma foice curta e aponta para vocês.' },
          { surgir: ['cult1', 'cult2', 'lider', 'cult3', 'cult4'] },
          { falar: ['lider', 'A Irmã avisou que viriam. O Rei quer os matadores do sineiro. Vivos, se der.'] },
          { falar: ['hedda', 'As Penas Negras! Para trás da forja, todo mundo!'] },
          { remover: ['hedda'] },
          { objetivo: 'Derrote os cultistas. O Mestre de Penas se rende quando estiver perto de cair.' },
          { combate: true }
        ] },
        { id: 'rendido', se: { flag: 'cultista_lider_rendeu' }, faz: [
          { falar: ['lider', 'Chega! Eu me rendo! Não me matem, eu só segui ordens!'] },
          { remover: ['lider'] },
          { surgir: ['cativo'] },
          { flag: 'tem_cativo' }
        ] },
        { id: 'lider_morre', se: { morto: 'lider' }, faz: [
          { narrar: 'No manto do Mestre de Penas, vocês encontram um mapa da mina rabiscado com carvão. Uma das galerias está marcada: "trilha dos ratos".' },
          { flag: 'atalho' }
        ] },
        { id: 'fim_praca', se: { flag: 'aceitou_coroa', semInimigos: true }, faz: [
          { xp: 150 },
          { narrar: 'A praça fica em silêncio. Portas se abrem, devagar, e rostos assustados espiam pelas frestas. A entrada da mina fica a leste, depois da última casa.' },
          { objetivo: 'Interrogue o cultista, compre o que precisar com Brokk e siga para a mina (casa H6).' },
          { saida: true }
        ] }
      ],
      dialogos: {
        hedda: { inicio: 'h1', nos: {
          h1: { fala: 'Sou Hedda, prefeita de Ferrofundo. Os mineiros acharam um túmulo no fundo da Galeria Sete. Era do Rei Corvo, o mesmo necromante do sino. Dentro havia uma coroa de ferro negro. E na mesma noite, ela sumiu.', opcoes: [
            { t: 'Quem levou a coroa?', vai: 'h2' },
            { t: '[Intuição CD 13] Você não está contando tudo.', teste: { p: 'intuicao', cd: 13, ok: 'h5', falha: 'h6' }, seNao: 'sabe_olaf' },
            { t: 'Agora não.', fim: true }
          ] },
          h2: { fala: 'Um culto. As Penas Negras. São liderados por uma mulher chamada Irmã Corvina. Levaram três mineiros para o fundo da mina. Dizem que, na lua cheia, vão pôr a coroa na cabeça do Rei. E a lua cheia é hoje.', opcoes: [
            { t: 'O Rei Corvo morreu há cem anos.', vai: 'h3' },
            { t: 'Vamos descer. Qual o pagamento?', vai: 'h4' }
          ] },
          h3: { fala: 'O corpo morreu. Mas um rei que fez um sino com os próprios ossos não morre de um jeito só. O sino era metade dele. A coroa é a outra metade. Vocês quebraram uma. Falta a outra.', opcoes: [
            { t: 'Vamos descer. Qual o pagamento?', vai: 'h4' },
            { t: '[História CD 13] Ravenmund, o Rei Corvo... o que mais se sabe?', teste: { p: 'historia', cd: 13, ok: 'h3ok', falha: 'h3no' } }
          ] },
          h3ok: { fala: 'Então conhece as canções. Ravenmund prendia as almas dos inimigos em braseiros de fogo verde, ao redor do trono. Dizia que, enquanto elas queimassem, nenhuma lâmina o feriria.', faz: [{ flag: 'dica_braseiros' }, { xp: 25 }], opcoes: [{ t: 'Vamos descer. Qual o pagamento?', vai: 'h4' }] },
          h3no: { fala: 'Só canções velhas, contadas por avós. Pena que agora todas parecem verdade.', opcoes: [{ t: 'Vamos descer. Qual o pagamento?', vai: 'h4' }] },
          h4: { fala: 'A vila juntou cento e cinquenta moedas. E Brokk, o ferreiro, disse que ajuda no que puder. Por favor: tragam os mineiros de volta.', faz: [{ ouro: 150 }, { flag: 'aceitou_coroa' }], fim: true },
          h5: { fala: '...Está bem. Meu filho, Olaf, está com eles. Ele achou que o culto ia trazer riqueza para a vila. Se o encontrarem... tentem trazê-lo para casa. Ele não é mau. Só é jovem.', faz: [{ flag: 'sabe_olaf' }, { xp: 25 }], opcoes: [{ t: 'Faremos o possível.', vai: 'h2' }] },
          h6: { fala: 'Tudo o que eu sei já disse. Agora, por favor, escutem.', opcoes: [{ t: 'Quem levou a coroa?', vai: 'h2' }] }
        } },
        brokk: { inicio: 'b1', nos: {
          b1: { fala: 'Hm. Mais gente indo morrer na mina. Sou Brokk, último anão de Ferrofundo. Poções a vinte e cinco moedas. Conselho, de graça.', opcoes: [
            { t: 'Comprar uma Poção de Cura (25 moedas).', req: { ouro: 25 }, faz: [{ ouro: -25 }, { item: ['pocao', 1] }], vai: 'b1' },
            { t: 'Que conselho?', vai: 'b2' },
            { t: 'Até mais, Brokk.', fim: true }
          ] },
          b2: { fala: 'No fundo da mina fica a Forja Antiga, do meu povo. Os guardiões de pedra ainda andam por lá. Eles só respeitam quem acende o fogo dos antigos.', opcoes: [
            { t: 'E como se acende essa forja?', vai: 'b3', seNao: 'runa_ok' },
            { t: 'Obrigado, Brokk.', vai: 'b1' }
          ] },
          b3: { fala: 'Com isto. Uma Runa de Fogo do meu avô. Ponham na forja e ela acorda. Depois, usem a bigorna: aço estelar corta até fantasma. Só me prometam devolver o martelo inteiro. Ha!', faz: [{ item: ['runa_fogo', 1] }, { flag: 'runa_ok' }], opcoes: [{ t: 'Prometido.', vai: 'b1' }] }
        } },
        ravna2: { inicio: 'r1', nos: {
          r1: { fala: 'Vocês de novo. Eu sabia que o sino não era o fim. Meu medalhão não para de tremer desde que entrei nesta vila.', opcoes: [
            { t: 'O que você sabe sobre a coroa?', vai: 'r2' },
            { t: '[Persuasão CD 12] Venha conosco. Precisamos de alguém como você.', teste: { p: 'persuasao', cd: 12, ok: 'r3', falha: 'r4' }, seNao: 'ravna_ajudou' },
            { t: 'Boa caçada, Ravna.', fim: true }
          ] },
          r2: { fala: 'Uma coroa de rei-bruxo é uma âncora. Ela segura a alma dele neste mundo. Quebrem a âncora, ou ele vai voltar de novo, e de novo.', opcoes: [
            { t: '[Persuasão CD 12] Venha conosco. Precisamos de alguém como você.', teste: { p: 'persuasao', cd: 12, ok: 'r3', falha: 'r4' }, seNao: 'ravna_ajudou' },
            { t: 'Entendido.', fim: true }
          ] },
          r3: { fala: 'Não. Eu caço sozinha. Mas tomem: o último frasco de óleo de prata que eu tenho, e duas poções. E um conselho: espectros não sangram, mas a prata dói neles.', faz: [{ item: ['oleo', 1] }, { item: ['pocao', 2] }, { flag: 'ravna_ajudou' }, { xp: 25 }], fim: true },
          r4: { fala: 'Eu já disse. Caço sozinha. Tentem não morrer.', fim: true }
        } },
        cativo: { inicio: 'c1', nos: {
          c1: { fala: 'Por favor... eu só carregava as caixas. Não sei de nada.', opcoes: [
            { t: '[Intimidação CD 13] Fale, ou a mina vai ser o menor dos seus problemas.', teste: { p: 'intimidacao', cd: 13, ok: 'c2', falha: 'c3' } },
            { t: '[Persuasão CD 13] Ajude-nos e a vila vai saber que você mudou de lado.', teste: { p: 'persuasao', cd: 13, ok: 'c2', falha: 'c3' } },
            { t: 'Suma daqui.', faz: [{ remover: ['cativo'] }], fim: true }
          ] },
          c2: { fala: 'Tá bom, tá bom! Na mina, peguem a trilha dos ratos, à esquerda. Os buracos no chão estão marcados com giz. E a Irmã Corvina... ela não dorme. Fala sozinha com a coroa. Acho que a coroa responde.', faz: [{ flag: 'atalho' }, { xp: 50 }, { remover: ['cativo'] }, { narrar: 'O cultista arranca o manto de penas e foge para a vila.' }], fim: true },
          c3: { fala: 'Eu não sei de nada! Juro!', faz: [{ remover: ['cativo'] }, { narrar: 'Aproveitando a distração, o cultista escapa por uma viela.' }], fim: true }
        } }
      }
    },

    // ===================================================== 2. A MINA
    {
      id: 'mina', titulo: 'A Boca da Mina', sub: 'Galeria Sete, onde o ferro acaba',
      tema: 'mina',
      mapa: [
        'RR.X..RS',
        '.^...R..',
        'tttttttt',
        '..R...^.',
        '.X...RR.',
        '......RR'
      ],
      legenda: {
        R: { b: 1, o: 1, m: 'nat:Rock_Medium_1', s: 0.95, var: ['nat:Rock_Medium_1', 'nat:Rock_Medium_2', 'nat:Rock_Medium_3'] },
        X: { b: 1, m: 'vila:Crate', s: 0.6, var: ['vila:Crate', 'vila:Barrel_2'] },
        t: { trilho: 1 }
      },
      entrada: [[0, 5], [1, 5], [0, 4], [2, 5], [0, 3]],
      saida: [7, 0],
      unidades: [
        { id: 'vagonete', obj: 'vagonete', x: 0, y: 2 },
        { id: 'sven', npc: 'mineiro', x: 4, y: 0, dialogo: 'sven' },
        { id: 'rato1', m: 'rato', x: 3, y: 4, oculto: true },
        { id: 'rato2', m: 'rato', x: 4, y: 5, oculto: true },
        { id: 'rato3', m: 'rato', x: 4, y: 3, oculto: true, min: 3 },
        { id: 'aranha1', m: 'aranha', x: 5, y: 2, oculto: true },
        { id: 'aranha2', m: 'aranha', x: 3, y: 2, oculto: true, min: 2 },
        { id: 'tecela', m: 'aranha_mae', x: 6, y: 2, oculto: true, min: 3 },
        { id: 'aranha3', m: 'aranha', x: 7, y: 1, oculto: true, min: 5 }
      ],
      objetivo: 'Avance pela galeria. Há um mineiro preso em algum lugar.',
      inicio: [
        { narrar: 'A Galeria Sete desce em espiral pela montanha. Trilhos enferrujados, lanternas apagadas, picaretas largadas no chão. O ar cheira a ferro e a alguma coisa podre. Lá no fundo, alguém geme.' }
      ],
      gatilhos: [
        { id: 'trilha', se: { flag: 'atalho' }, faz: [
          { narrar: 'Vocês seguem as marcas de giz do mapa dos cultistas. Os buracos escondidos no chão aparecem um por um.' },
          { revelar: true }
        ] },
        { id: 'ratos', se: { area: [3, 3, 7, 5] }, faz: [
          { narrar: 'O chão parece se mexer. Ratos do tamanho de cães saem das frestas, com os olhos vermelhos de fome.' },
          { surgir: ['rato1', 'rato2', 'rato3'] },
          { flag: 'ratos_ok' },
          { combate: true }
        ] },
        { id: 'teia', se: { qualquer: [{ area: [2, 0, 7, 2] }, { flag: 'falou_sven' }] }, faz: [
          { som: 'uivo' },
          { narrar: 'Fios brancos caem do teto. Algo enorme desce devagar, pernas peludas tateando o ar. A Tecelã veio buscar o jantar.' },
          { surgir: ['aranha1', 'aranha2', 'tecela', 'aranha3'] },
          { flag: 'teia_ok' },
          { objetivo: 'Derrote as aranhas. Dica: o vagonete na casa A3 corre pelos trilhos.' },
          { combate: true }
        ] },
        { id: 'fim_mina', se: { flags: ['teia_ok', 'ratos_ok'], semInimigos: true }, faz: [
          { xp: 200 },
          { narrar: 'As teias pegam fogo com a lanterna de um mineiro esquecido. A galeria se abre para um poço com uma escada de madeira que desce até um brilho azul.' },
          { objetivo: 'Desça pelo poço (casa H1).' },
          { saida: true }
        ] },
        { id: 'fim_mina2', se: { flag: 'teia_ok', semFlag: 'ratos_ok', semInimigos: true }, faz: [
          { flag: 'ratos_ok' }
        ] }
      ],
      dialogos: {
        sven: { inicio: 's1', nos: {
          s1: { fala: 'Água... Me tirem dessa teia, pelo amor dos deuses. A coisa grande... ela volta toda hora para ver se eu ainda estou fresco.', opcoes: [
            { t: 'Cortar a teia e libertar Sven.', faz: [{ flag: 'sven_livre' }, { flag: 'falou_sven' }, { xp: 50 }], vai: 's2' },
            { t: 'Onde estão os outros mineiros?', faz: [{ flag: 'falou_sven' }], vai: 's3' }
          ] },
          s2: { fala: 'Obrigado! Os cultistas levaram os outros dois lá para baixo, depois do lago. Cuidado com a ponte. Tem um troll lá que só deixa passar quem responde charadas. E ele odeia perder.', faz: [{ remover: ['sven'] }, { flag: 'sabe_troll' }], fim: true },
          s3: { fala: 'Lá embaixo, depois do lago! Me soltem primeiro, por favor!', opcoes: [{ t: 'Cortar a teia e libertar Sven.', faz: [{ flag: 'sven_livre' }, { xp: 50 }], vai: 's2' }] }
        } }
      }
    },

    // ===================================================== 3. O LAGO
    {
      id: 'lago', titulo: 'O Lago Sem Fundo', sub: 'Uma caverna de cristais azuis',
      tema: 'lago',
      mapa: [
        '~~~CC~.S',
        '~~...~..',
        'C~......',
        '..~..~~C',
        '...~~...',
        '.....~~~'
      ],
      legenda: {
        C: { b: 1, o: 0, cristal: 1 }
      },
      entrada: [[0, 5], [1, 5], [0, 4], [2, 5], [1, 4]],
      saida: [7, 0],
      unidades: [
        { id: 'gorm', m: 'troll', x: 4, y: 1, dialogo: 'gorm' },
        { id: 'afo1', m: 'afogado', x: 0, y: 1, oculto: true },
        { id: 'afo2', m: 'afogado', x: 6, y: 4, oculto: true, min: 3 },
        { id: 'afo3', m: 'afogado', x: 2, y: 3, oculto: true, min: 5 }
      ],
      pacifico: true,
      objetivo: 'Atravesse o lago. Um troll guarda a passagem.',
      inicio: [
        { narrar: 'A escada termina numa caverna enorme. Cristais azuis brotam das paredes e se refletem num lago tão escuro que parece não ter fundo. Sobre as pedras que cruzam a água, uma montanha de musgo se mexe. A montanha abre um olho amarelo.' },
        { falar: ['gorm', 'Hmmmm. Comida que anda. Gorm não come comida esperta. Gorm faz três charadas. Comida burra, Gorm come.'] }
      ],
      gatilhos: [
        { id: 'briga_troll', se: { flag: 'briga' }, faz: [
          { surgir: ['afo1', 'afo2', 'afo3'] },
          { narrar: 'A água do lago borbulha. Mãos pálidas sobem do fundo: os afogados vieram assistir ao banquete do troll.' },
          { objetivo: 'Derrote Gorm. Trolls se regeneram, a menos que sejam queimados.' },
          { combate: true }
        ] },
        { id: 'fim_troll', se: { flag: 'briga', semInimigos: true }, faz: [
          { xp: 150 },
          { narrar: 'Gorm afunda no lago com um último gorgolejo. Na toca dele, entre ossos limpos, vocês encontram moedas antigas.' },
          { ouro: 60 },
          { flag: 'passagem' }
        ] },
        { id: 'saida_lago', se: { flag: 'passagem' }, faz: [
          { objetivo: 'Siga pelas pedras até a passagem (casa H1).' },
          { saida: true }
        ] }
      ],
      dialogos: {
        gorm: { inicio: 'g1', nos: {
          g1: { fala: 'Primeira charada! Quanto mais você tira de mim, maior eu fico. O que é?', opcoes: [
            { t: 'Um buraco.', vai: 'g2' },
            { t: 'Uma dívida.', faz: [{ conta: 'erros_troll' }], vai: 'g2' },
            { t: 'Uma sombra.', faz: [{ conta: 'erros_troll' }], vai: 'g2' },
            { t: '[Intimidação CD 16] Sai da frente, monte de musgo.', teste: { p: 'intimidacao', cd: 16, ok: 'medo', falha: 'raiva' } }
          ] },
          g2: { ramo: [{ se: { min: ['erros_troll', 1] }, vai: 'g2e' }, { vai: 'g2a' }] },
          g2a: { fala: 'Hmpf. Comida acertou. Segunda charada! Corro sem ter pernas, tenho leito e não durmo, tenho boca e não falo.', opcoes: [
            { t: 'O vento.', faz: [{ conta: 'erros_troll' }], vai: 'g3' },
            { t: 'Um rio.', vai: 'g3' },
            { t: 'Uma estrada.', faz: [{ conta: 'erros_troll' }], vai: 'g3' }
          ] },
          g2e: { fala: 'ERRADO! Hehehe. Gorm já sente o gosto. Segunda charada! Corro sem ter pernas, tenho leito e não durmo, tenho boca e não falo.', opcoes: [
            { t: 'O vento.', faz: [{ conta: 'erros_troll' }], vai: 'g3' },
            { t: 'Um rio.', vai: 'g3' },
            { t: 'Uma estrada.', faz: [{ conta: 'erros_troll' }], vai: 'g3' }
          ] },
          g3: { ramo: [{ se: { min: ['erros_troll', 2] }, vai: 'raiva' }, { vai: 'g3a' }] },
          g3a: { fala: 'Última charada! Sou leve como uma pena, mas nem o homem mais forte consegue me segurar por muito tempo.', opcoes: [
            { t: 'Uma promessa.', faz: [{ conta: 'erros_troll' }], vai: 'g4' },
            { t: 'Uma pena molhada.', faz: [{ conta: 'erros_troll' }], vai: 'g4' },
            { t: 'O fôlego.', vai: 'g4' }
          ] },
          g4: { ramo: [{ se: { min: ['erros_troll', 2] }, vai: 'raiva' }, { vai: 'ganhou' }] },
          ganhou: { fala: 'Grrr... Comida esperta demais. Gorm cumpre a palavra. Passem. E levem isto, Gorm não gosta de coisa brilhante.', faz: [{ ouro: 60 }, { item: ['pocao', 1] }, { xp: 250 }, { flag: 'troll_amigo' }, { flag: 'passagem' }, { remover: ['gorm'] }, { narrar: 'Gorm mergulha no lago e some, deixando só bolhas e um saco de moedas.' }], fim: true },
          medo: { fala: 'Gorm... Gorm não gosta de olhar assim. Passa, passa! Gorm vai dormir.', faz: [{ xp: 200 }, { flag: 'passagem' }, { remover: ['gorm'] }], fim: true },
          raiva: { fala: 'COMIDA BURRA! GORM COME AGORA!', faz: [{ flag: 'briga' }], fim: true }
        } }
      }
    },

    // ===================================================== 4. A FORJA ANÃ
    {
      id: 'forja', titulo: 'A Forja dos Antigos', sub: 'Um salão anão esquecido há trezentos anos',
      tema: 'forja', pacifico: true,
      mapa: [
        '#P.ff.PS',
        '........',
        '........',
        '.P....P.',
        '........',
        '........'
      ],
      legenda: {
        P: { b: 1, o: 1, m: 'pillar_decorated', s: 0.72 },
        f: { b: 1, o: 0 }
      },
      entrada: [[3, 5], [4, 5], [2, 5], [5, 5], [3, 4]],
      saida: [7, 0],
      unidades: [
        { id: 'forja', obj: 'forja', x: 3, y: 0 },
        { id: 'bigorna', obj: 'bigorna', x: 4, y: 2 },
        { id: 'golem1', m: 'golem', x: 1, y: 1 },
        { id: 'golem2', m: 'golem', x: 6, y: 2, min: 2 }
      ],
      objetivo: 'Atravesse o salão. Os guardiões de pedra observam.',
      inicio: [
        { narrar: 'Depois do lago, um corredor esculpido leva a um salão de pedra trabalhada. Colunas com rostos de anões barbados sustentam o teto. No fundo, uma forja do tamanho de uma casa. E, dos dois lados, estátuas enormes que viram a cabeça quando vocês entram.' },
        { falar: ['golem1', 'QUEM... TRAZ... O... FOGO?'] }
      ],
      gatilhos: [
        { id: 'acordam', se: { qualquer: [{ area: [0, 0, 7, 0] }, { flag: 'briga' }], semFlag: 'forja_acesa' }, faz: [
          { falar: ['golem1', 'SEM... FOGO. SEM... PASSAGEM.'] },
          { narrar: 'Os guardiões se arrancam do chão, levantando poeira de três séculos. Seus punhos são do tamanho de bigornas.' },
          { flag: 'golens_acordaram' },
          { objetivo: 'Sobreviva aos guardiões. Pedra resiste a lâminas; trovão e magia pura passam direto.' },
          { combate: true }
        ] },
        { id: 'curvam', se: { flag: 'forja_acesa', vivo: 'golem1', semFlag: 'golens_acordaram' }, faz: [
          { falar: ['golem1', 'O... FOGO... VOLTOU. BEM-VINDOS... HERDEIROS.'] },
          { narrar: 'Os guardiões se ajoelham diante da forja acesa e voltam, devagar, para os nichos de pedra.' },
          { remover: ['golem1', 'golem2'] },
          { xp: 150 },
          { flag: 'passagem' }
        ] },
        { id: 'fim_golens', se: { flag: 'golens_acordaram', semInimigos: true }, faz: [
          { xp: 100 },
          { narrar: 'O último guardião desmorona em pedaços de pedra e runas apagadas.' },
          { flag: 'passagem' }
        ] },
        { id: 'saida_forja', se: { flag: 'passagem' }, faz: [
          { objetivo: 'Use a bigorna se a forja estiver acesa, e siga pela escada (casa H1).' },
          { saida: true }
        ] }
      ],
      dialogos: {}
    },

    // ===================================================== 5. O NINHO
    {
      id: 'ninho', titulo: 'O Ninho das Penas Negras', sub: 'A caverna do culto',
      tema: 'ninho', pacifico: true,
      mapa: [
        '##..A.S#',
        '.J....J.',
        '........',
        '..P..P..',
        '........',
        '........'
      ],
      legenda: {
        P: { b: 1, o: 1, m: 'pillar_decorated', s: 0.62 },
        A: { b: 1 }
      },
      entrada: [[3, 5], [4, 5], [2, 5], [5, 5], [3, 4]],
      saida: [6, 0],
      unidades: [
        { id: 'altar', obj: 'altar', x: 4, y: 0 },
        { id: 'jaula1', obj: 'jaula', x: 1, y: 1 },
        { id: 'jaula2', obj: 'jaula', x: 6, y: 1 },
        { id: 'corvina', m: 'corvina', x: 3, y: 1, dialogo: 'corvina' },
        { id: 'olaf', m: 'cultista', x: 5, y: 2 },
        { id: 'n_cult1', m: 'cultista', x: 2, y: 2 },
        { id: 'n_vid', m: 'cultista_arc', x: 4, y: 1, min: 3 },
        { id: 'n_cult2', m: 'cultista', x: 6, y: 3, min: 4 }
      ],
      objetivo: 'Fale com Irmã Corvina. Ou ataque.',
      inicio: [
        { narrar: 'Penas negras forram o chão da caverna como neve suja. Dois mineiros presos em jaulas olham para vocês com olhos vazios. Diante de um altar de cera e ossos, uma mulher de manto escuro canta baixinho. A voz dela sai dobrada, como se outra pessoa falasse junto.' },
        { falar: ['corvina', 'Os matadores do sineiro. Ele me contou que vocês viriam. Ele me conta tudo.'] }
      ],
      gatilhos: [
        { id: 'briga_ninho', se: { flag: 'briga' }, faz: [
          { falar: ['corvina', 'Então morram de pé. O Rei gosta de servos altos.'] },
          { objetivo: 'Derrote Irmã Corvina e os cultistas.' },
          { combate: true }
        ] },
        { id: 'corvina_cai', se: { morto: 'corvina' }, faz: [
          { narrar: 'Corvina cai de joelhos. Por um instante, os olhos dela ficam limpos, assustados, humanos. Depois se fecham.' }
        ] },
        { id: 'fim_ninho', se: { qualquer: [{ flag: 'corvina_salva' }, { flag: 'briga' }], semInimigos: true }, faz: [
          { xp: 150 },
          { narrar: 'O ninho está quieto. Uma escada de pedra sobe para o salão do trono. Lá de cima vem uma luz verde e o som de asas.' },
          { objetivo: 'Solte os mineiros das jaulas e suba ao trono (casa G1).' },
          { saida: true }
        ] }
      ],
      dialogos: {
        corvina: { inicio: 'v1', nos: {
          v1: { fala: 'A coroa já está no trono. Esta noite, Ravenmund volta a respirar. E eu vou estar ao lado dele, como rainha.', opcoes: [
            { t: '[Arcanismo CD 14] Essa voz dobrada não é sua. A coroa está falando por você.', teste: { p: 'arcanismo', cd: 14, ok: 'v2', falha: 'v3' } },
            { t: '[Intuição CD 14] Você está com medo. Dá para ver nas suas mãos.', teste: { p: 'intuicao', cd: 14, ok: 'v2', falha: 'v3' } },
            { t: 'Olaf! Sua mãe, Hedda, está esperando você em casa.', se: 'sabe_olaf', seNao: 'olaf_ok', vai: 'v5' },
            { t: 'Atacar!', faz: [{ flag: 'briga' }], fim: true }
          ] },
          v2: { fala: 'Eu... eu não... A voz. Ela está na minha cabeça desde que toquei na coroa. Ela não deixa eu dormir. Por favor... façam ela parar.', opcoes: [
            { t: '[Persuasão CD 13] Solte o cajado, Corvina. Você ainda pode voltar.', teste: { p: 'persuasao', cd: 13, ok: 'v4', falha: 'v3' } },
            { t: 'Atacar enquanto ela está fraca!', faz: [{ flag: 'briga' }], fim: true }
          ] },
          v3: { fala: 'NÃO! Ele disse que vocês iam mentir! Penas Negras, à luta!', faz: [{ flag: 'briga' }], fim: true },
          v4: { fala: 'O cajado cai das mãos dela. A voz dobrada se cala. Corvina chora como uma criança. "Os braseiros", ela sussurra. "Apaguem os braseiros, ou ele nunca vai cair."', faz: [{ flag: 'corvina_salva' }, { flag: 'dica_braseiros' }, { xp: 250 }, { remover: ['corvina', 'olaf', 'n_cult1', 'n_vid', 'n_cult2'] }, { narrar: 'Sem a voz da líder, os cultistas largam as armas e fogem pela escuridão, levando Corvina com eles.' }], fim: true },
          v5: { fala: 'Um dos cultistas abaixa o capuz. É um rapaz magro, com o rosto da mãe. "Minha mãe... Ela está bem?" Ele olha para Corvina, depois para vocês, e larga a adaga no chão.', faz: [{ flag: 'olaf_ok' }, { xp: 50 }, { remover: ['olaf'] }, { narrar: 'Olaf corre para as jaulas e começa a forçar os cadeados.' }], opcoes: [
            { t: '[Arcanismo CD 14] Corvina, essa voz dobrada não é sua.', teste: { p: 'arcanismo', cd: 14, ok: 'v2', falha: 'v3' } },
            { t: 'Atacar!', faz: [{ flag: 'briga' }], fim: true }
          ] }
        } }
      }
    },

    // ===================================================== 6. O TRONO
    {
      id: 'trono', titulo: 'O Trono de Ossos', sub: 'Lua cheia, meia-noite',
      tema: 'trono',
      mapa: [
        '#..TT..#',
        '........',
        '........',
        '.P....P.',
        '........',
        '........'
      ],
      legenda: {
        T: { b: 1 },
        P: { b: 1, o: 1, m: 'pillar_decorated', s: 0.72 }
      },
      entrada: [[3, 5], [4, 5], [2, 5], [5, 5], [3, 4]],
      saida: null,
      unidades: [
        { id: 'trono', obj: 'trono', x: 3, y: 0 },
        { id: 'br1', obj: 'braseiro', x: 1, y: 1 },
        { id: 'br2', obj: 'braseiro', x: 6, y: 1 },
        { id: 'br3', obj: 'braseiro', x: 4, y: 4, min: 3 },
        { id: 'rei', m: 'rei_corvo', x: 4, y: 1 },
        { id: 't_esp1', m: 'espectro', x: 2, y: 2 },
        { id: 't_esp2', m: 'espectro', x: 5, y: 2, min: 3 }
      ],
      objetivo: 'Derrote o Rei Corvo.',
      inicio: [
        { som: 'sino' },
        { narrar: 'O salão do trono é uma cúpula aberta para a lua cheia. Três braseiros de fogo verde queimam em volta de um trono de ossos. E no trono, uma figura alta, magra, feita de penas, sombra e ossos velhos, ajeita sobre a cabeça uma coroa de ferro negro.' },
        { falar: ['rei', 'Os que quebraram meu sino. Que gentileza virem até mim. Cem anos esperei para ter súditos à altura.'] },
        { combate: true }
      ],
      gatilhos: [
        { id: 'dica_br', se: { flag: 'dica_braseiros' }, faz: [
          { narrar: 'Vocês lembram: enquanto as almas queimarem nos braseiros, o Rei não sangra de verdade. Apaguem os braseiros (casas B2, G2 e E5).' }
        ] },
        { id: 'sem_dica', se: { semFlag: 'dica_braseiros' }, faz: [
          { narrar: 'As lâminas parecem atravessar fumaça. O fogo verde dos braseiros pulsa a cada golpe que o Rei recebe.' }
        ] },
        { id: 'br_todos', se: { todosUsados: 'braseiro' }, faz: [
          { som: 'sino_quebra' },
          { narrar: 'O último braseiro se apaga. As almas presas sobem em espiral pela cúpula, e o Rei Corvo grita. Pela primeira vez em cem anos, ele sente dor.' },
          { falar: ['rei', 'NÃO! Minhas almas! Minhas!'] }
        ] },
        { id: 'vitoria', se: { morto: 'rei' }, faz: [
          { matarTodos: true },
          { xp: 600 },
          { narrar: 'O Rei Corvo se desfaz numa nuvem de penas negras. A coroa cai no chão de pedra, racha ao meio com um estalo seco e para de brilhar. Do lado de fora, a lua cheia continua no céu. Só a lua.' },
          { item: ['coroa_partida', 1] },
          { final: true }
        ] }
      ],
      dialogos: {}
    }
  ];

  // ----------------------------------------------------------------- epílogo
  function epilogo(f) {
    var t = [];
    var presos = f.presos_soltos | 0;
    t.push(presos >= 2 ? 'Os mineiros saem da montanha ao amanhecer, sujos de carvão e vivos. Ferrofundo faz uma festa que dura três dias.'
      : presos === 1 ? 'Um dos mineiros volta para casa. O outro, ninguém mais vê. Ferrofundo acende uma vela por ele toda lua cheia.'
      : 'Os mineiros nunca voltam das jaulas. Ferrofundo agradece aos heróis, mas não festeja.');
    if (f.sven_livre) t.push('Sven, o mineiro da teia, conta a história em todas as tavernas. A aranha fica maior a cada vez.');
    if (f.olaf_ok) t.push('Olaf volta para os braços de Hedda. Ele nunca mais veste preto.');
    else if (f.sabe_olaf) t.push('Hedda espera por Olaf na porta todas as noites. Ele não volta.');
    t.push(f.corvina_salva ? 'Irmã Corvina é encontrada semanas depois num mosteiro do vale, dormindo pela primeira vez sem ouvir vozes.'
      : 'Do culto das Penas Negras sobram apenas penas, levadas pelo vento da montanha.');
    if (f.troll_amigo) t.push('Gorm, o troll, passa a cobrar charadas de quem atravessa o lago. Dizem que ele ficou mais esperto. Dizem.');
    if (f.lamina_estelar) t.push('Brokk chora ao ver o aço estelar nas armas do grupo. "Meu avô ficaria orgulhoso", ele diz, e paga a cerveja de todos.');
    if (f.c1_promessa_cranio) t.push('Mas na saída da mina, um corvo de lama espera sobre uma pedra. "Mamãe Lodo sabe que vocês têm a coroa, docinhos. E vocês ainda devem um crânio."');
    else t.push('Longe dali, no Pântano das Sanguessugas, Mãe Lodo sorri para o caldeirão. Uma coroa partida ainda é uma coroa.');
    t.push('Fim do Capítulo II: A Coroa do Rei Corvo.');
    return t;
  }

  R.CAPITULOS = R.CAPITULOS || {};
  R.CAPITULOS.coroa = {
    id: 'coroa', num: 'II', titulo: 'A Coroa do Rei Corvo', nivelInicial: 3, ouroInicial: 60,
    resumo: 'Ferrofundo, vila mineira. Um culto roubou a coroa do Rei Corvo e quer coroá-lo de novo na lua cheia.',
    cenas: CENAS, epilogo: epilogo,
    lembrar: ['olaf_ok', 'corvina_salva', 'troll_amigo', 'lamina_estelar']
  };
})(RUNA);
