const {
  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder,
  ButtonBuilder, ButtonStyle, MessageFlags
} = require('discord.js');
const storage = require('../utils/storage');

/**
 * Bank Lagu Dinamis (100+ Lagu Populer Multi-Genre)
 * Bot mencari audio secara otomatis via query pencarian di YouTube tanpa perlu hardcode URL.
 */
const SONG_CATALOG = {
  indo: [
    { title: 'Hati-Hati di Jalan', artist: 'Tulus', year: '2022' },
    { title: 'Monokrom', artist: 'Tulus', year: '2016' },
    { title: 'Sial', artist: 'Mahalini', year: '2023' },
    { title: 'Mati-Matian', artist: 'Mahalini', year: '2024' },
    { title: 'Dan...', artist: 'Sheila On 7', year: '2000' },
    { title: 'Sephia', artist: 'Sheila On 7', year: '2000' },
    { title: 'Sebuah Kisah Klasik', artist: 'Sheila On 7', year: '2000' },
    { title: 'Akad', artist: 'Payung Teduh', year: '2017' },
    { title: 'Jiwa Yang Bersedih', artist: 'Ghea Indrawari', year: '2023' },
    { title: 'Tak Segampang Itu', artist: 'Anggi Marito', year: '2023' },
    { title: 'Hingga Tua Bersama', artist: 'Rizky Febian', year: '2021' },
    { title: 'Kesempurnaan Cinta', artist: 'Rizky Febian', year: '2015' },
    { title: 'Satu Bulan', artist: 'Bernadya', year: '2024' },
    { title: 'Kata Mereka Ini Berlebihan', artist: 'Bernadya', year: '2024' },
    { title: 'Gala Bunga Matahari', artist: 'Sal Priadi', year: '2024' },
    { title: 'Lantas', artist: 'Juicy Luicy', year: '2020' },
    { title: 'Tanpa Tergesa', artist: 'Juicy Luicy', year: '2018' },
    { title: 'Bertaut', artist: 'Nadin Amizah', year: '2020' },
    { title: 'Rayuan Perempuan Gila', artist: 'Nadin Amizah', year: '2023' },
    { title: 'Separuh Aku', artist: 'NOAH', year: '2012' },
    { title: 'Kangen', artist: 'Dewa 19', year: '1992' },
    { title: 'Pupus', artist: 'Dewa 19', year: '2002' },
    { title: 'Risalah Hati', artist: 'Dewa 19', year: '2000' },
    { title: 'To the Bone', artist: 'Pamungkas', year: '2019' },
    { title: 'Rumah ke Rumah', artist: 'Hindia', year: '2019' },
    { title: 'Evaluasi', artist: 'Hindia', year: '2019' },
    { title: 'Usai', artist: 'Tiara Andini', year: '2022' },
    { title: 'Komang', artist: 'Raim Laode', year: '2022' },
    { title: 'Nanti Kita Seperti Ini', artist: 'Batas Senja', year: '2023' },
    { title: 'Tak Kan Hilang', artist: 'Budi Doremi', year: '2022' }
  ],
  western: [
    { title: 'Grenade', artist: 'Bruno Mars', year: '2010' },
    { title: 'Locked Out of Heaven', artist: 'Bruno Mars', year: '2012' },
    { title: 'Just The Way You Are', artist: 'Bruno Mars', year: '2010' },
    { title: 'We Found Love', artist: 'Rihanna ft. Calvin Harris', year: '2011' },
    { title: 'Diamonds', artist: 'Rihanna', year: '2012' },
    { title: 'I Want It That Way', artist: 'Backstreet Boys', year: '1999' },
    { title: 'A Sky Full of Stars', artist: 'Coldplay', year: '2014' },
    { title: 'Viva La Vida', artist: 'Coldplay', year: '2008' },
    { title: 'Yellow', artist: 'Coldplay', year: '2000' },
    { title: 'Blinding Lights', artist: 'The Weeknd', year: '2019' },
    { title: 'Starboy', artist: 'The Weeknd ft. Daft Punk', year: '2016' },
    { title: 'Cruel Summer', artist: 'Taylor Swift', year: '2019' },
    { title: 'Blank Space', artist: 'Taylor Swift', year: '2014' },
    { title: 'Shape of You', artist: 'Ed Sheeran', year: '2017' },
    { title: 'Perfect', artist: 'Ed Sheeran', year: '2017' },
    { title: 'Bad Guy', artist: 'Billie Eilish', year: '2019' },
    { title: 'Levitating', artist: 'Dua Lipa', year: '2020' },
    { title: 'Sugar', artist: 'Maroon 5', year: '2014' },
    { title: 'Payphone', artist: 'Maroon 5', year: '2012' },
    { title: 'Counting Stars', artist: 'OneRepublic', year: '2013' },
    { title: 'Someone Like You', artist: 'Adele', year: '2011' },
    { title: 'Rolling in the Deep', artist: 'Adele', year: '2010' },
    { title: 'Stay', artist: 'The Kid LAROI & Justin Bieber', year: '2021' },
    { title: 'Sunflower', artist: 'Post Malone & Swae Lee', year: '2018' },
    { title: 'Circles', artist: 'Post Malone', year: '2019' },
    { title: 'I Took a Pill in Ibiza', artist: 'Mike Posner', year: '2016' },
    { title: 'Wake Me Up', artist: 'Avicii', year: '2013' },
    { title: 'Something Just Like This', artist: 'The Chainsmokers & Coldplay', year: '2017' },
    { title: 'Closer', artist: 'The Chainsmokers ft. Halsey', year: '2016' },
    { title: 'See You Again', artist: 'Wiz Khalifa ft. Charlie Puth', year: '2015' }
  ],
  anime: [
    { title: 'Unravel', artist: 'TK from Ling Tosite Sigure', year: '2014' },
    { title: 'Gurenge', artist: 'LiSA', year: '2019' },
    { title: 'Homura', artist: 'LiSA', year: '2020' },
    { title: 'Crossing Field', artist: 'LiSA', year: '2012' },
    { title: 'Shinzou wo Sasageyo', artist: 'Linked Horizon', year: '2017' },
    { title: 'Guren no Yumiya', artist: 'Linked Horizon', year: '2013' },
    { title: 'The Rumbling', artist: 'SiM', year: '2022' },
    { title: 'Zenzenzense', artist: 'RADWIMPS', year: '2016' },
    { title: 'Sparkle', artist: 'RADWIMPS', year: '2016' },
    { title: 'Nandemonaiya', artist: 'RADWIMPS', year: '2016' },
    { title: 'Idol', artist: 'YOASOBI', year: '2023' },
    { title: 'Yoru ni Kakeru (Racing into the Night)', artist: 'YOASOBI', year: '2019' },
    { title: 'Monster', artist: 'YOASOBI', year: '2021' },
    { title: 'Kaibutsu', artist: 'YOASOBI', year: '2021' },
    { title: 'Blue Bird', artist: 'Ikimonogakari', year: '2008' },
    { title: 'Silhouette', artist: 'KANA-BOON', year: '2014' },
    { title: 'Sign', artist: 'FLOW', year: '2010' },
    { title: 'GO!!!', artist: 'FLOW', year: '2004' },
    { title: 'Kaikai Kitan', artist: 'Eve', year: '2020' },
    { title: 'Kick Back', artist: 'Kenshi Yonezu', year: '2022' },
    { title: 'Peace Sign', artist: 'Kenshi Yonezu', year: '2017' },
    { title: 'Lemon', artist: 'Kenshi Yonezu', year: '2018' },
    { title: 'Specialz', artist: 'King Gnu', year: '2023' },
    { title: 'Bling-Bang-Bang-Born', artist: 'Creepy Nuts', year: '2024' },
    { title: 'Suzume', artist: 'RADWIMPS ft. Toaka', year: '2022' }
  ],
  kpop: [
    { title: 'Dynamite', artist: 'BTS', year: '2020' },
    { title: 'Butter', artist: 'BTS', year: '2021' },
    { title: 'Boy With Luv', artist: 'BTS ft. Halsey', year: '2019' },
    { title: 'Spring Day', artist: 'BTS', year: '2017' },
    { title: 'How You Like That', artist: 'BLACKPINK', year: '2020' },
    { title: 'DDU-DU DDU-DU', artist: 'BLACKPINK', year: '2018' },
    { title: 'Kill This Love', artist: 'BLACKPINK', year: '2019' },
    { title: 'Pink Venom', artist: 'BLACKPINK', year: '2022' },
    { title: 'Next Level', artist: 'aespa', year: '2021' },
    { title: 'Supernova', artist: 'aespa', year: '2024' },
    { title: 'Drama', artist: 'aespa', year: '2023' },
    { title: 'Hype Boy', artist: 'NewJeans', year: '2022' },
    { title: 'Ditto', artist: 'NewJeans', year: '2022' },
    { title: 'Super Shy', artist: 'NewJeans', year: '2023' },
    { title: 'OMG', artist: 'NewJeans', year: '2023' },
    { title: 'Love Dive', artist: 'IVE', year: '2022' },
    { title: 'After LIKE', artist: 'IVE', year: '2022' },
    { title: 'I AM', artist: 'IVE', year: '2023' },
    { title: 'Fancy', artist: 'TWICE', year: '2019' },
    { title: 'Feel Special', artist: 'TWICE', year: '2019' },
    { title: 'What is Love?', artist: 'TWICE', year: '2018' },
    { title: 'Antifragile', artist: 'LE SSERAFIM', year: '2022' },
    { title: 'Eve, Psyche & The Bluebeard\'s wife', artist: 'LE SSERAFIM', year: '2023' },
    { title: 'Smart', artist: 'LE SSERAFIM', year: '2024' },
    { title: 'God\'s Menu', artist: 'Stray Kids', year: '2020' },
    { title: 'Maniac', artist: 'Stray Kids', year: '2022' },
    { title: 'Super', artist: 'SEVENTEEN', year: '2023' }
  ]
};

// State sesi permainan per server
const activeGames = new Map();
const SNIPPET_DURATION = 10; // Durasi audio berbunyi (10 detik)
const ANSWER_TIME = 20;      // Waktu menjawab peserta (20 detik)

function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Ambil daftar lagu berdasarkan kategori yang dipilih
 */
function getSongPool(category) {
  if (category === 'indo') return SONG_CATALOG.indo.map(s => ({ ...s, genre: 'Indo Hits' }));
  if (category === 'western') return SONG_CATALOG.western.map(s => ({ ...s, genre: 'Western Pop' }));
  if (category === 'anime') return SONG_CATALOG.anime.map(s => ({ ...s, genre: 'Anime OST & J-Pop' }));
  if (category === 'kpop') return SONG_CATALOG.kpop.map(s => ({ ...s, genre: 'K-Pop' }));

  // Default: 'all' (Campuran semua kategori)
  return [
    ...SONG_CATALOG.indo.map(s => ({ ...s, genre: 'Indo Hits' })),
    ...SONG_CATALOG.western.map(s => ({ ...s, genre: 'Western Pop' })),
    ...SONG_CATALOG.anime.map(s => ({ ...s, genre: 'Anime OST & J-Pop' })),
    ...SONG_CATALOG.kpop.map(s => ({ ...s, genre: 'K-Pop' }))
  ];
}

/**
 * Generate 4 pilihan ganda acak dari pool lagu (1 benar + 3 pengecoh)
 */
function generateQuestionOptions(correctSong, songPool) {
  const otherSongs = songPool.filter(s => s.title !== correctSong.title);
  const shuffledOthers = shuffleArray(otherSongs);
  const distractors = shuffledOthers.slice(0, 3).map(s => s.title);
  const options = shuffleArray([correctSong.title, ...distractors]);
  return options;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('musicquiz')
    .setDescription('Main game tebak lagu interaktif — dengarkan potongan musik 10 detik & tebak judulnya!')
    .addSubcommand(sub =>
      sub
        .setName('start')
        .setDescription('Mulai sesi Music Quiz interaktif di voice channel')
        .addStringOption(opt =>
          opt.setName('kategori')
            .setDescription('Pilih genre lagu yang ingin dimainkan (default: Campuran)')
            .setRequired(false)
            .addChoices(
              { name: '🎲 Semua Kategori (Campuran)', value: 'all' },
              { name: '🇮🇩 Indo Hits & Populer', value: 'indo' },
              { name: '🌍 Western & Global Hits', value: 'western' },
              { name: '🎌 Anime OST & J-Pop', value: 'anime' },
              { name: '🇰🇷 K-Pop Hits', value: 'kpop' }
            )
        )
        .addIntegerOption(opt =>
          opt.setName('ronde')
            .setDescription('Jumlah ronde pertanyaan (1-15, default: 5)')
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(15)
        )
    )
    .addSubcommand(sub =>
      sub.setName('stop').setDescription('Hentikan Music Quiz yang sedang berjalan')
    )
    .addSubcommand(sub =>
      sub.setName('leaderboard').setDescription('Lihat papan peringkat juara Music Quiz server')
    ),

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    // ═══ 1. LEADERBOARD ═══
    if (sub === 'leaderboard') {
      const quizData = storage.read('musicquiz_lb');
      const guildLB = quizData[guildId] || {};
      const sorted = Object.entries(guildLB).sort((a, b) => b[1].score - a[1].score);

      if (sorted.length === 0) {
        return interaction.reply({
          content: '**Belum ada yang mencetak skor di Music Quiz server ini.**\nMulai game pertama dengan `/musicquiz start`.',
          flags: MessageFlags.Ephemeral
        });
      }

      const rankSymbols = ['#01', '#02', '#03', '#04', '#05', '#06', '#07', '#08', '#09', '#10'];
      const list = sorted.slice(0, 10).map(([uId, data], idx) => {
        return `\`${rankSymbols[idx]}\` **${data.name}** — \`${data.score} Poin\` (${data.wins || 0}x Menang)`;
      }).join('\n');

      const embed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setAuthor({
          name: `MUSIC QUIZ LEADERBOARD — ${interaction.guild.name.toUpperCase()}`,
          iconURL: interaction.guild.iconURL({ dynamic: true }) || undefined
        })
        .setDescription(list)
        .setFooter({ text: 'Skor akumulasi juara Music Quiz' })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    // ═══ 2. STOP QUIZ ═══
    if (sub === 'stop') {
      if (!activeGames.has(guildId)) {
        return interaction.reply({
          content: '**Tidak ada sesi Music Quiz yang sedang berjalan saat ini.**',
          flags: MessageFlags.Ephemeral
        });
      }

      const game = activeGames.get(guildId);
      game.active = false;
      activeGames.delete(guildId);

      try {
        const queue = client.distube.getQueue(guildId);
        if (queue) queue.stop().catch(() => {});
      } catch (_) {}

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x2B2D31)
            .setDescription('🛑 **Music Quiz telah dihentikan.** Terima kasih sudah bermain!')
        ]
      });
    }

    // ═══ 3. START QUIZ ═══
    if (sub === 'start') {
      if (activeGames.has(guildId)) {
        return interaction.reply({
          content: '**Music Quiz sedang berlangsung di server ini.** Tunggu selesai atau gunakan `/musicquiz stop`.',
          flags: MessageFlags.Ephemeral
        });
      }

      const voiceChannel = interaction.member?.voice?.channel;
      if (!voiceChannel) {
        return interaction.reply({
          content: '**Kamu harus berada di Voice Channel terlebih dahulu** sebelum memulai Music Quiz.',
          flags: MessageFlags.Ephemeral
        });
      }

      const existingQueue = client.distube.getQueue(guildId);
      if (existingQueue && existingQueue.songs.length > 0) {
        return interaction.reply({
          content: '**Bot sedang memutar musik saat ini.**\nHentikan musik terlebih dahulu menggunakan perintah `!stop` atau `/leave`, lalu coba lagi.',
          flags: MessageFlags.Ephemeral
        });
      }

      const category = interaction.options.getString('kategori') || 'all';
      const totalRounds = interaction.options.getInteger('ronde') || 5;

      const songPool = getSongPool(category);
      const shuffledQuestions = shuffleArray(songPool).slice(0, totalRounds);

      const categoryLabels = {
        all: '🎲 Semua Kategori (Campuran)',
        indo: '🇮🇩 Indo Hits & Populer',
        western: '🌍 Western & Global Hits',
        anime: '🎌 Anime OST & J-Pop',
        kpop: '🇰🇷 K-Pop Hits'
      };

      const gameState = {
        active: true,
        guildId,
        channelId: interaction.channel.id,
        voiceChannelId: voiceChannel.id,
        category,
        currentRound: 0,
        totalRounds,
        questions: shuffledQuestions,
        songPool,
        scores: {},
        answeredUsers: new Set(),
      };

      activeGames.set(guildId, gameState);

      const startEmbed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setAuthor({
          name: `MUSIC QUIZ — ${interaction.guild.name.toUpperCase()}`,
          iconURL: interaction.guild.iconURL({ dynamic: true }) || undefined
        })
        .setTitle('Sesi Music Quiz Dimulai!')
        .setDescription(
          `Dengarkan potongan musik 10 detik di voice channel dan tebak judulnya secepat mungkin!\n\n` +
          `\`Kategori\` **${categoryLabels[category]}**\n` +
          `\`Total Ronde\` **${totalRounds} Ronde**\n` +
          `\`Durasi Audio\` **${SNIPPET_DURATION} Detik**\n` +
          `\`Waktu Jawab\` **${ANSWER_TIME} Detik**\n\n` +
          `*Ronde pertama dimulai dalam 4 detik...*`
        )
        .setFooter({ text: 'Dengarkan baik-baik dan klik tombol jawaban pilihanmu!' })
        .setTimestamp();

      await interaction.reply({ embeds: [startEmbed] });

      setTimeout(() => runNextRound(interaction.channel, voiceChannel, guildId, client), 4000);
    }
  }
};

// ═══════════════ GAME ENGINE ═══════════════

/**
 * Jalankan ronde berikutnya dari Music Quiz
 */
async function runNextRound(textChannel, voiceChannel, guildId, client) {
  const game = activeGames.get(guildId);
  if (!game || !game.active) return;

  if (game.currentRound >= game.totalRounds) {
    return finishGame(textChannel, guildId, client);
  }

  game.currentRound++;
  game.answeredUsers = new Set();
  const q = game.questions[game.currentRound - 1];
  const options = generateQuestionOptions(q, game.songPool);

  const letters = ['A', 'B', 'C', 'D'];
  const row = new ActionRowBuilder();

  options.forEach((opt, idx) => {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`quiz_ans_${game.currentRound}_${idx}_${opt === q.title ? 'correct' : 'wrong'}`)
        .setLabel(`${letters[idx]}. ${opt}`)
        .setStyle(ButtonStyle.Secondary)
    );
  });

  const questionEmbed = new EmbedBuilder()
    .setColor(0x2B2D31)
    .setAuthor({
      name: `RONDE ${game.currentRound} / ${game.totalRounds}`,
      iconURL: client.user.displayAvatarURL()
    })
    .setTitle('Dengarkan potongan musik di Voice Channel...')
    .setDescription(
      `Audio sedang dimainkan di <#${voiceChannel.id}>. Tebak judul lagunya!\n\n` +
      `\`Kategori\` **${q.genre}**\n` +
      `\`Tahun Rilis\` **${q.year}**\n\n` +
      `Pilih jawaban yang benar dari tombol di bawah:`
    )
    .setFooter({ text: `Waktu menjawab: ${ANSWER_TIME} detik` })
    .setTimestamp();

  const msg = await textChannel.send({ embeds: [questionEmbed], components: [row] }).catch(() => null);
  if (!msg) return activeGames.delete(guildId);

  // ─── Putar Audio Dinamis via Search Query di YouTube ───
  const searchQuery = `${q.artist} - ${q.title} Official Audio`;

  try {
    await client.distube.play(voiceChannel, searchQuery, {
      member: voiceChannel.guild.members.me,
      textChannel: textChannel,
      metadata: { isQuiz: true }
    });

    let queue = client.distube.getQueue(guildId);
    if (queue) queue.isQuiz = true;

    // Hentikan snippet setelah SNIPPET_DURATION detik
    setTimeout(() => {
      try {
        const currentQueue = client.distube.getQueue(guildId);
        if (currentQueue) currentQueue.stop().catch(() => {});
      } catch (_) {}
    }, SNIPPET_DURATION * 1000);
  } catch (err) {
    console.warn(`[MusicQuiz] Pencarian audio gagal untuk "${searchQuery}":`, err.message);
  }

  // ─── Kumpulkan Jawaban Peserta ───
  const startTime = Date.now();
  let firstCorrectWinner = null;

  const collector = msg.createMessageComponentCollector({
    time: ANSWER_TIME * 1000
  });

  collector.on('collect', async (i) => {
    if (!i.customId.startsWith(`quiz_ans_${game.currentRound}_`)) {
      return i.reply({ content: 'Ronde ini sudah berakhir.', flags: MessageFlags.Ephemeral });
    }

    if (game.answeredUsers.has(i.user.id)) {
      return i.reply({ content: '⚠️ Kamu sudah menjawab untuk ronde ini.', flags: MessageFlags.Ephemeral });
    }
    game.answeredUsers.add(i.user.id);

    const isCorrect = i.customId.endsWith('correct');

    if (!game.scores[i.user.id]) {
      game.scores[i.user.id] = { name: i.member.displayName, score: 0, correctCount: 0 };
    }

    if (isCorrect) {
      const elapsed = (Date.now() - startTime) / 1000;
      const points = Math.max(40, Math.round(100 - (elapsed * 3)));
      game.scores[i.user.id].score += points;
      game.scores[i.user.id].correctCount += 1;

      if (!firstCorrectWinner) {
        firstCorrectWinner = i.member.displayName;
      }

      return i.reply({
        content: `🎯 **BENAR!** Kamu mendapatkan **+${points} Poin**!`,
        flags: MessageFlags.Ephemeral
      });
    } else {
      return i.reply({
        content: `❌ **SALAH!** Jawaban yang benar adalah **${q.title}**.`,
        flags: MessageFlags.Ephemeral
      });
    }
  });

  collector.on('end', async () => {
    // Pastikan audio distop
    try {
      const currentQueue = client.distube.getQueue(guildId);
      if (currentQueue) currentQueue.stop().catch(() => {});
    } catch (_) {}

    // Kunci tombol & highlight jawaban yang benar
    const disabledRow = new ActionRowBuilder();
    options.forEach((opt, idx) => {
      disabledRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`quiz_done_${game.currentRound}_${idx}`)
          .setLabel(`${letters[idx]}. ${opt}`)
          .setStyle(opt === q.title ? ButtonStyle.Success : ButtonStyle.Secondary)
          .setDisabled(true)
      );
    });

    await msg.edit({ components: [disabledRow] }).catch(() => {});

    // Tampilkan hasil ronde
    const roundResultEmbed = new EmbedBuilder()
      .setColor(0x2B2D31)
      .setTitle(`Ronde ${game.currentRound} Selesai`)
      .setDescription(
        `✅ **Jawaban Benar:** **${q.title}** — *${q.artist}*\n\n` +
        (firstCorrectWinner
          ? `⚡ **Penjawab Tercepat:** **${firstCorrectWinner}** 🔥`
          : `😴 *Tidak ada yang menjawab dengan benar di ronde ini.*`)
      );

    await textChannel.send({ embeds: [roundResultEmbed] }).catch(() => {});

    if (!game.active) return;

    // Jeda 4 detik sebelum ronde berikutnya
    setTimeout(() => runNextRound(textChannel, voiceChannel, guildId, client), 4000);
  });
}

/**
 * Selesaikan Music Quiz dan umumkan juara
 */
async function finishGame(textChannel, guildId, client) {
  const game = activeGames.get(guildId);
  if (!game) return;

  activeGames.delete(guildId);

  try {
    const queue = client.distube.getQueue(guildId);
    if (queue) queue.stop().catch(() => {});
  } catch (_) {}

  const sortedScores = Object.entries(game.scores).sort((a, b) => b[1].score - a[1].score);

  // Simpan ke leaderboard permanen
  const quizData = storage.read('musicquiz_lb');
  if (!quizData[guildId]) quizData[guildId] = {};

  sortedScores.forEach(([uId, data], idx) => {
    if (!quizData[guildId][uId]) {
      quizData[guildId][uId] = { name: data.name, score: 0, wins: 0 };
    }
    quizData[guildId][uId].score += data.score;
    quizData[guildId][uId].name = data.name;
    if (idx === 0 && data.score > 0) quizData[guildId][uId].wins = (quizData[guildId][uId].wins || 0) + 1;
  });

  storage.write('musicquiz_lb', quizData);

  if (sortedScores.length === 0) {
    const emptyEmbed = new EmbedBuilder()
      .setColor(0x2B2D31)
      .setDescription('🏁 **Music Quiz Selesai.** Tidak ada yang mencetak poin pada sesi kali ini.');
    return textChannel.send({ embeds: [emptyEmbed] });
  }

  const winner = sortedScores[0][1];
  const rankLabels = ['#01', '#02', '#03', '#04', '#05'];

  const scoreBoard = sortedScores.slice(0, 5).map(([uId, d], i) => {
    return `\`${rankLabels[i]}\` **${d.name}** — **${d.score} Poin** (${d.correctCount} benar)`;
  }).join('\n');

  const finalEmbed = new EmbedBuilder()
    .setColor(0x2B2D31)
    .setAuthor({
      name: `HASIL AKHIR MUSIC QUIZ`,
      iconURL: textChannel.guild.iconURL({ dynamic: true }) || undefined
    })
    .setTitle(`🏆 Juara: ${winner.name}`)
    .setDescription(
      `Skor tertinggi **${winner.score} Poin** dengan total **${winner.correctCount} jawaban benar**.\n\n` +
      `**Papan Peringkat Akhir:**\n${scoreBoard}`
    )
    .setFooter({ text: 'Gunakan /musicquiz leaderboard untuk melihat klasemen server' })
    .setTimestamp();

  await textChannel.send({ embeds: [finalEmbed] }).catch(() => {});
}
