const {
  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder,
  ButtonBuilder, ButtonStyle, MessageFlags
} = require('discord.js');
const storage = require('../utils/storage');

// Bank Lagu Dinamis Multi-Negara (Dimuat dari database JSON terpisah)
let SONG_CATALOG = {};
try {
  SONG_CATALOG = require('../data/quizSongs.json');
} catch (err) {
  console.warn('[MusicQuiz] Gagal memuat quizSongs.json, menggunakan fallback internal:', err.message);
}

// State sesi permainan per server
const activeGames = new Map();
const SNIPPET_DURATION = 30; // Durasi audio berbunyi penuh 30 detik
const ANSWER_TIME = 40;      // Waktu menjawab peserta 40 detik

function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Ambil daftar lagu berdasarkan kategori/negara yang dipilih
 */
function getSongPool(category) {
  if (category && SONG_CATALOG[category] && SONG_CATALOG[category].length > 0) {
    return SONG_CATALOG[category];
  }
  // Default: 'all' (Campuran seluruh negara di dunia)
  const allSongs = Object.values(SONG_CATALOG).flat();
  return allSongs.length > 0 ? allSongs : [
    { title: 'Hati-Hati di Jalan', artist: 'Tulus', year: '2022', genre: 'Indo Pop' },
    { title: 'Grenade', artist: 'Bruno Mars', year: '2010', genre: 'Western Pop' }
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
    .setDescription('Main game tebak lagu interaktif — dengarkan potongan musik 30 detik & tebak judulnya!')
    .addSubcommand(sub =>
      sub
        .setName('start')
        .setDescription('Mulai sesi Music Quiz interaktif di voice channel')
        .addStringOption(opt =>
          opt.setName('kategori')
            .setDescription('Pilih negara / genre lagu yang ingin dimainkan (default: Campuran Dunia)')
            .setRequired(false)
            .addChoices(
              { name: '🎲 Semua Negara (Campuran Dunia)', value: 'all' },
              { name: '🇮🇩 Indonesia (Pop, Rock, Koplo, Indie)', value: 'indo' },
              { name: '🌍 Western & Global (US, UK, Pop)', value: 'western' },
              { name: '🎌 Jepang & Anime (J-Pop, Anime OST)', value: 'japan' },
              { name: '🇰🇷 Korea Selatan (K-Pop & OST)', value: 'korea' },
              { name: '🇸🇦 Arab & Timur Tengah (Arabic Pop)', value: 'arabic' },
              { name: '🇹🇭 Thailand (T-Pop & Thai Hits)', value: 'thailand' },
              { name: '💃 Amerika Latin (Reggaeton, Pop)', value: 'latin' }
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
          content: 'Belum ada yang mencetak skor di Music Quiz server ini. Mulai game pertama dengan `/musicquiz start`.',
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
        .setTitle('Papan Peringkat Juara Tebak Lagu')
        .setDescription(list)
        .setFooter({ text: 'Skor akumulasi juara Music Quiz' })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    // ═══ 2. STOP QUIZ ═══
    if (sub === 'stop') {
      if (!activeGames.has(guildId)) {
        return interaction.reply({
          content: 'Tidak ada sesi Music Quiz yang sedang berjalan saat ini.',
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
          content: 'Music Quiz sedang berlangsung di server ini. Tunggu selesai atau gunakan `/musicquiz stop`.',
          flags: MessageFlags.Ephemeral
        });
      }

      const voiceChannel = interaction.member?.voice?.channel;
      if (!voiceChannel) {
        return interaction.reply({
          content: 'Kamu harus berada di Voice Channel terlebih dahulu sebelum memulai Music Quiz.',
          flags: MessageFlags.Ephemeral
        });
      }

      const existingQueue = client.distube.getQueue(guildId);
      if (existingQueue && existingQueue.songs.length > 0) {
        return interaction.reply({
          content: 'Bot sedang memutar musik saat ini.\nHentikan musik terlebih dahulu menggunakan perintah `!stop` atau `/leave`, lalu coba lagi.',
          flags: MessageFlags.Ephemeral
        });
      }

      const category = interaction.options.getString('kategori') || 'all';
      const totalRounds = interaction.options.getInteger('ronde') || 5;

      const songPool = getSongPool(category);
      const shuffledQuestions = shuffleArray(songPool).slice(0, totalRounds);

      const categoryLabels = {
        all: 'Semua Negara (Campuran Dunia)',
        indo: 'Indonesia (Pop, Rock, Koplo, Indie)',
        western: 'Western & Global (US, UK, Pop)',
        japan: 'Jepang & Anime (J-Pop, Anime OST)',
        korea: 'Korea Selatan (K-Pop & OST)',
        arabic: 'Arab & Timur Tengah (Arabic Pop)',
        thailand: 'Thailand (T-Pop & Thai Hits)',
        latin: 'Amerika Latin (Reggaeton, Pop)'
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
          `Dengarkan potongan musik 30 detik di voice channel dan tebak judulnya secepat mungkin!\n\n` +
          `• **Kategori:** \`${categoryLabels[category]}\`\n` +
          `• **Total Ronde:** \`${totalRounds} Ronde\`\n` +
          `• **Durasi Audio:** \`${SNIPPET_DURATION} Detik\`\n` +
          `• **Waktu Menjawab:** \`${ANSWER_TIME} Detik\`\n\n` +
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

  // 1. Tampilkan status memuat audio terlebih dahulu
  const loadingEmbed = new EmbedBuilder()
    .setColor(0x2B2D31)
    .setAuthor({
      name: `RONDE ${game.currentRound} / ${game.totalRounds}`,
      iconURL: client.user.displayAvatarURL()
    })
    .setTitle('Memuat potongan musik...')
    .setDescription(
      `Sedang memproses audio untuk <#${voiceChannel.id}>...\n\n` +
      `• **Kategori:** \`${q.genre}\`\n` +
      `• **Tahun Rilis:** \`${q.year}\`\n\n` +
      `*Tombol jawaban akan aktif begitu musik mulai terdengar di Voice Channel!*`
    )
    .setFooter({ text: 'Harap tunggu audio buffering...' })
    .setTimestamp();

  const msg = await textChannel.send({ embeds: [loadingEmbed] }).catch(() => null);
  if (!msg) return activeGames.delete(guildId);

  // 2. Pencarian Cerdas YouTube: Gunakan nama artis dan judul resmi
  const searchQuery = `${q.artist} - ${q.title} Official Audio`;

  // Tentukan potongan acak: 0s (awal), 30s (verse), 50s (reff/chorus), 75s (bridge)
  const randomOffsets = [0, 30, 45, 60, 75];
  const chosenOffset = randomOffsets[Math.floor(Math.random() * randomOffsets.length)];

  try {
    await client.distube.play(voiceChannel, searchQuery, {
      member: voiceChannel.guild.members.me,
      textChannel: textChannel,
      metadata: { isQuiz: true }
    });

    let queue = client.distube.getQueue(guildId);
    if (queue) queue.isQuiz = true;

    // Tunggu buffer 3 detik agar audio siap streaming
    await new Promise(res => setTimeout(res, 3000));

    // Lompat ke potongan acak jika bukan di detik ke-0
    if (chosenOffset > 0) {
      queue = client.distube.getQueue(guildId);
      if (queue && queue.songs[0]) {
        await queue.seek(chosenOffset).catch(() => {});
        await new Promise(res => setTimeout(res, 1000));
      }
    }

    // Hentikan snippet setelah SNIPPET_DURATION detik (30 detik penuh)
    setTimeout(() => {
      try {
        const currentQueue = client.distube.getQueue(guildId);
        if (currentQueue) currentQueue.stop().catch(() => {});
      } catch (_) {}
    }, SNIPPET_DURATION * 1000);
  } catch (err) {
    console.warn(`[MusicQuiz] Pencarian audio gagal untuk "${searchQuery}":`, err.message);
  }

  if (!game.active) return;

  // 3. Audio sudah berjalan — Sekarang perbarui Embed dan munculkan tombol pilihan jawaban!
  const activeQuestionEmbed = new EmbedBuilder()
    .setColor(0x2B2D31)
    .setAuthor({
      name: `RONDE ${game.currentRound} / ${game.totalRounds}`,
      iconURL: client.user.displayAvatarURL()
    })
    .setTitle('Dengarkan musik di Voice Channel & Tebak Judulnya!')
    .setDescription(
      `Audio sedang dimainkan di <#${voiceChannel.id}>.\n\n` +
      `• **Kategori:** \`${q.genre}\`\n` +
      `• **Tahun Rilis:** \`${q.year}\`\n\n` +
      `Pilih jawaban yang benar dari tombol di bawah sebelum waktu habis:`
    )
    .setFooter({ text: `Durasi Musik: ${SNIPPET_DURATION}s • Waktu Menjawab: ${ANSWER_TIME}s` })
    .setTimestamp();

  await msg.edit({ embeds: [activeQuestionEmbed], components: [row] }).catch(() => {});

  // 4. Kumpulkan Jawaban Peserta
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
      return i.reply({ content: 'Kamu sudah menjawab untuk ronde ini.', flags: MessageFlags.Ephemeral });
    }
    game.answeredUsers.add(i.user.id);

    const isCorrect = i.customId.endsWith('correct');

    if (!game.scores[i.user.id]) {
      game.scores[i.user.id] = { name: i.member.displayName, score: 0, correctCount: 0 };
    }

    if (isCorrect) {
      const elapsed = (Date.now() - startTime) / 1000;
      const points = Math.max(40, Math.round(100 - (elapsed * 2)));
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
          : `*Tidak ada yang menjawab dengan benar di ronde ini.*`)
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
