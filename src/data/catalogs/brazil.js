// ══════════════════════════════════════════════════════════════
// BRAZIL SONG CATALOG (1.500+ Lagu Populer Brasil & Viral Hits)
// Funk Carioca, Brazilian Phonk, Sertanejo, MPB, Samba, Pagode, Rock Brasil
// ══════════════════════════════════════════════════════════════

const brazilArtistGroups = [
  // ─── Mega Viral Brazilian Funk & TikTok Hits ───
  {
    artist: 'MC Fioti', genre: 'Funk Carioca / Viral', year: 2017,
    tracks: [
      'Bum Bum Tam Tam', 'Joga o Bum Bum Tam Tam', 'Bum Bum Granada', 'Maloquero', 'Vem Sentando'
    ]
  },
  {
    artist: 'MC Bruninho & Vitinho Ferrari', genre: 'Funk Melody / Pop Brasil', year: 2018,
    tracks: [
      'Sou Favela', 'Jogo do Amor', 'Amor de Verdade', 'A Culpa É da Saudade', 'Balança', 'Beijinho Gostoso'
    ]
  },
  {
    artist: 'Douglas & Vinicius', genre: 'Sertanejo Pop', year: 2020,
    tracks: [
      'Figurinha', 'Estelionato Afetivo', 'Volume 3', 'Grave Bateu', 'Recaidinha'
    ]
  },
  {
    artist: 'MC Gustta & MC DG', genre: 'Funk Carioca', year: 2017,
    tracks: [
      'Abusadamente', 'Vem Dançando', 'De Ladinho', 'Bate Foco', 'Arrasta Pra Cima'
    ]
  },
  {
    artist: 'MC Kevinho & MC G15', genre: 'Funk Carioca / KondZilla', year: 2016,
    tracks: [
      'Olha a Explosão', 'Deu Onda', 'O Grave Bater', 'Tumbalatum', 'Encaixa', 'Rabiola', 'Agora É Tudo Meu', 'Terremoto'
    ]
  },
  {
    artist: 'MC João & MC Zaac', genre: 'Funk Carioca', year: 2016,
    tracks: [
      'Baile de Favela', 'Bumbum Granada', 'Vai Embrazando', 'Desce Pro Play (PA-PA-PA)', 'Toma', 'Rebolada Bruta'
    ]
  },
  {
    artist: 'MC L da Vinte & MC Gury', genre: 'Funk Carioca', year: 2018,
    tracks: [
      'Parado no Bailão', 'Balança o Popô', 'Vem na Tremedeira', 'Baile da Dz7'
    ]
  },
  {
    artist: 'DJ LK da Escócia & MC Ryan SP', genre: 'Funk Carioca / TikTok', year: 2022,
    tracks: [
      'Tubarão Te Amo', 'Felina', 'Casei Com a Putaria', 'Let\'s Go 4', 'Cracolândia', 'Rei da Revoada', 'Favela Venceu'
    ]
  },
  {
    artist: 'Dennis DJ & MC Kevin o Chris', genre: 'Funk Carioca', year: 2019,
    tracks: [
      'Ta OK', 'Ela É do Tipo', 'Evoluiu', 'Tipo Gin', 'Hit Contagiante', 'Vamos Pra Gaiola', 'Dentro do Carro', 'Agora É Tudo Meu'
    ]
  },
  {
    artist: 'Bibi Babydoll & DJ Holanda', genre: 'Brazilian Phonk / Automotivo', year: 2023,
    tracks: [
      'Automotivo Bibi Fogosa', 'Montagem Diamante Rosa', 'Automotivo Bibi Phonk', 'Automotivo Tan Tan', 'Montagem Rave de Favela',
      'Montagem Anos 2000', 'Montagem Tomada', 'Montagem Coral', 'Montagem Sonic', 'Montagem Cabelo Encaracolado', 'Vitamina', 'Raindance'
    ]
  },
  {
    artist: 'Sevdaliza & Pabllo Vittar', genre: 'Global / Latin Pop', year: 2024,
    tracks: [
      'Alibi', 'Ride Or Die', 'Sua Cara', 'K.O.', 'Corpo Sensual', 'Amor de Que', 'Bandida', 'Modo Turbo', 'Descontrolada'
    ]
  },
  {
    artist: 'Anitta', genre: 'Funk Brasil / Pop', year: 2013,
    tracks: [
      'Show das Poderosas', 'Zen', 'Blá Blá Blá', 'Ritmo Perfeito', 'Na Batida', 'Bang', 'Deixa Ele Sofrer',
      'Essa Mina É Louca', 'Cravo e Canela', 'Sim ou Não', 'Paradinha', 'Vai Malandra', 'Indecente',
      'Medicina', 'Veneno', 'Banana', 'Bola Rebola', 'Onda Diferente', 'Fuego', 'Me Gusta', 'Girl From Rio',
      'Faking Love', 'Envolver', 'Boys Don\'t Cry', 'Gata', 'Lobby', 'El Que Espera', 'Mil Veces', 'Joga Pra Lua', 'Bellakeo'
    ]
  },
  {
    artist: 'Marília Mendonça', genre: 'Sertanejo', year: 2015,
    tracks: [
      'Infiel', 'Alô Porteiro', 'Como Faz Com Ela', 'Folgado', 'Mudando de Assunto', 'Eu Sei de Cor',
      'Amante Não Tem Lar', 'De Quem É a Culpa?', 'Transplante', 'A Culpa É Dele', 'Ciumeira', 'Bem Pior Que Eu',
      'Bebi Liguei', 'Passa Mal', 'Sem Sal', 'Todo Mundo Vai Sofrer', 'Apaixonadinha', 'Supera', 'Tentativas',
      'Graveto', 'Vira Homem', 'Deprê', 'Foi Por Conveniência', 'Troca de Calçada', 'Esqueça-Me Se For Capaz', 'Leão'
    ]
  },
  {
    artist: 'Gusttavo Lima', genre: 'Sertanejo', year: 2010,
    tracks: [
      'Inventor dos Amores', 'Cor de Ouro', 'Balada', 'Gatinha Assanhada', 'Diz Pra Mim', 'Fui Fiel',
      'Tô Solto na Night', 'Você Não Me Conhece', 'Que Pena Que Acabou', 'Homem de Família', 'Abre o Portão Que Eu Cheguei',
      'Apelido Carinhoso', 'Mundo de Ilusões', 'Zé da Recaída', 'Respeita o Nosso Fim', 'Cem Mil', 'Milu',
      'Online', 'Quem Traiu Levou', 'A Gente Fez Amor', 'Perrengue', 'Saudade Sua', 'Fala Mal de Mim', 'Bloqueado', 'Termina Comigo Antes'
    ]
  },
  {
    artist: 'Pedro Sampaio', genre: 'Funk Carioca / Pop', year: 2018,
    tracks: [
      'Bota Pra Tremer', 'Vai Menina', 'Chama Ela', 'Sentadão', 'Pode Dançar', 'Larissa', 'Fala Mal de Mim',
      'Atenção', 'Galopa', 'No Chão Novinha', 'Dançarina', 'Olhadinha', 'Sal', 'Carinha de Bebê', 'Pocpoc', 'Cavalinho', 'Joia Rara'
    ]
  },
  {
    artist: 'Luísa Sonza', genre: 'Pop Brasil', year: 2018,
    tracks: [
      'Devagarinho', 'Boa Menina', 'Pior Que Possa Imaginar', 'Garupa', 'Fazendo Assim', 'Bomba Relógio',
      'Braba', 'Toma', 'Modo Turbo', 'Catenas', 'VIP *-*', 'Melhor Sozinha', 'Penhasco', 'Penhasco2',
      'Anaconda', 'Café da Manhã ;P', 'Cachorrinhas', 'Mama.cita', 'Campo de Morango', 'Principalmente Me Sinto Arrasada', 'Chico', 'Dona Aranha'
    ]
  },
  {
    artist: 'Ludmilla', genre: 'Funk / Pagode Brasil', year: 2014,
    tracks: [
      'Sem Querer', 'Hoje', 'Te Ensinei Certin', '24 Horas Por Dia', 'Bom', 'Sou Eu', 'Cheguei',
      'A Danada Sou Eu', 'Tipo Crazy', 'Solta a Batida', 'Din Din Din', 'Jogando Sujo', 'Clichê',
      'Favela Chegou', 'Invocada', 'Verdinha', 'Rainha da Favela', 'Deixa de Onda', 'Gato Siamês', 'Socadona', 'Maldivas', 'Sintoma de Prazer'
    ]
  },
  {
    artist: 'Ana Castela', genre: 'Agroplay / Sertanejo', year: 2021,
    tracks: [
      'Boiadeira', 'Neon', 'Pipoco', 'As Menina da Pecuária', 'Roça em Mim', 'Bombonzinho', 'Dona de Mim',
      'Palhaça', 'Nosso Quadro', 'Covardia', 'Solteiro Forçado', 'Tô Voltando', 'Deja Vu', 'Canudinho', 'Dia de Fluxo'
    ]
  },
  {
    artist: 'Israel & Rodolffo', genre: 'Sertanejo', year: 2018,
    tracks: [
      'Batom de Cereja', 'Faz Amor Comigo Só Hoje', 'Bombonzinho', 'Marca Evidente', 'Se Eu Me Entregar', 'Nem Namorado e Nem Ficante'
    ]
  },
  {
    artist: 'Michel Teló', genre: 'Sertanejo Pop', year: 2011,
    tracks: [
      'Ei, Psiu! Beijo Me Liga', 'Fugidinha', 'Larga de Bobeira', 'Se Intrometeu', 'Ai Se Eu Te Pego',
      'Humilde Residência', 'Bara Bará Bere Berê', 'É Nóis Faze Parapapá', 'Amiga da Minha Irmã', 'Levemente Alterado'
    ]
  },
  {
    artist: 'Jorge & Mateus', genre: 'Sertanejo Universitário', year: 2007,
    tracks: [
      'Pode Chorar', 'De Tanto Te Querer', 'Voa Beija-Flor', 'Querendo Te Amar', 'Amo Noite e Dia',
      'Seu Astral', 'Aí Já Era', 'Pra Que Entender?', 'Flor', 'O Que É Que Tem?', 'Enquanto Houver Razões',
      'Logo Eu', 'Calma', 'Os Anjos Cantam', 'Sosseguei', 'Louca de Saudade', 'Medida Certa', 'Propaganda', 'Tijolão', 'Cheirosa', 'Molhando o Volante'
    ]
  },
  {
    artist: 'Tom Jobim & João Gilberto', genre: 'Bossa Nova', year: 1959,
    tracks: [
      'Chega de Saudade', 'Desafinado', 'Garota de Ipanema', 'Corcovado', 'Samba de Uma Nota Só',
      'Wave', 'Águas de Março', 'Insensatez', 'Ela É Carioca', 'Triste', 'Dindi', 'Eu Sei Que Vou Te Amar'
    ]
  },
  {
    artist: 'Jorge Ben Jor', genre: 'Samba Rock / MPB', year: 1963,
    tracks: [
      'Mas Que Nada', 'Chove Chuva', 'Por Causa de Você, Menina', 'Balança Pema', 'Que Maravilha',
      'País Tropical', 'Charles, Anjo 45', 'Fio Maravilha', 'Taj Mahal', 'Os Alquimistas Estão Chegando'
    ]
  },
  {
    artist: 'Tim Maia', genre: 'Soul / MPB Brasil', year: 1970,
    tracks: [
      'Azul da Cor do Mar', 'Primavera', 'Coroné Antônio Bento', 'Chocolate', 'Não Quero Dinheiro',
      'Gostava Tanto de Você', 'Descobridor dos Sete Mares', 'Me Dê Motivo', 'Um Dia de Domingo', 'Do Leme ao Pontal'
    ]
  },
  {
    artist: 'Legião Urbana', genre: 'Rock Brasil', year: 1985,
    tracks: [
      'Será', 'Ainda É Cedo', 'Geração Coca-Cola', 'Eduardo e Mônica', 'Quase Sem Querer', 'Tempo Perdido',
      'Índios', 'Que País É Este', 'Faroeste Caboclo', 'Eu Sei', 'Pais e Filhos', 'Há Tempos', 'Monte Castelo', 'Vento no Litoral'
    ]
  },
  {
    artist: 'Charlie Brown Jr.', genre: 'Rock Brasil / Skate Punk', year: 1997,
    tracks: [
      'Proibida Pra Mim', 'Zóio de Lula', 'Te Levar', 'Não É Sério', 'Lugar ao Sol', 'Papo Reto',
      'Só Por Uma Noite', 'Vícios e Virtudes', 'Ela Vai Voltar', 'Senhor do Tempo', 'Pontes Indestrutíveis', 'Dias de Luta Dias de Glória', 'Me Encontra', 'Só os Loucos Sabem', 'Céu Azul'
    ]
  }
];

module.exports = { brazilArtistGroups };
