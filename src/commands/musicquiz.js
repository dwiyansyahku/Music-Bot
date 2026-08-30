const {
  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder,
  ButtonBuilder, ButtonStyle, MessageFlags
} = require('discord.js');
const storage = require('../utils/storage');
const { checkVoiceChannel } = require('../utils/helpers');

/**
 * Bank Soal Musik — Setiap soal memiliki link YouTube & posisi seek ke bagian yang ikonik
 * seekStart = detik awal potongan (biasanya reff/chorus agar mudah dikenali)
 */
const SONG_DATABASE = [
  // ═══════════════ INDONESIA ═══════════════
  {
    youtubeUrl: 'https://www.youtube.com/watch?v=9II3OGZETo4',
    seekStart: 60,
    genre: 'Indo Hits',
    year: '2022',
    artist: 'Tulus',
    correct: 'Hati-Hati di Jalan',
    options: ['Hati-Hati di Jalan', 'Monokrom', 'Diri', 'Sepatu']
  },
  {
    youtubeUrl: 'https://www.youtube.com/watch?v=o67r_WjD4C4',
    seekStart: 55,
    genre: 'Indo Nostalgia',
    year: '2008',
    artist: 'ST12',
    correct: 'Jangan Pernah Berubah',
    options: ['Jangan Pernah Berubah', 'Saat Terakhir', 'Cari Pacar Lagi', 'P.U.S.P.A']
  },
  {
    youtubeUrl: 'https://www.youtube.com/watch?v=QSWYyoF79oE',
    seekStart: 50,
    genre: 'Indo Pop',
    year: '2023',
    artist: 'Mahalini',
    correct: 'Sial',
    options: ['Sial', 'Mati-Matian', 'Kisah Sempurna', 'Melawan Restu']
  },
  {
    youtubeUrl: 'https://www.youtube.com/watch?v=yLfJwZkFQgc',
    seekStart: 45,
    genre: 'Indo Hits',
    year: '2000',
    artist: 'Sheila On 7',
    correct: 'Dan...',
    options: ['Dan...', 'Sephia', 'Pria Kesepian', 'Sebuah Kisah Klasik']
  },
  {
    youtubeUrl: 'https://www.youtube.com/watch?v=viW0M5R2BLo',
    seekStart: 30,
    genre: 'Indo Pop',
    year: '2017',
    artist: 'Payung Teduh',
    correct: 'Akad',
    options: ['Akad', 'Menuju Senja', 'Resah', 'Angin Pujaan Hujan']
  },
  {
    youtubeUrl: 'https://www.youtube.com/watch?v=t9VWICGOD90',
    seekStart: 50,
    genre: 'Indo Hits',
    year: '2023',
    artist: 'Ghea Indrawari',
    correct: 'Jiwa Yang Bersedih',
    options: ['Jiwa Yang Bersedih', 'Rasa Cinta Ini', 'Bucketlist', 'Kembara']
  },
  {
    youtubeUrl: 'https://www.youtube.com/watch?v=r9M6_H18q14',
    seekStart: 55,
    genre: 'Indo Pop',
    year: '2023',
    artist: 'Anggi Marito',
    correct: 'Tak Segampang Itu',
    options: ['Tak Segampang Itu', 'Kisah Bahagia', 'Cara Mencintaimu', 'Kisah Yang Salah']
  },
  {
    youtubeUrl: 'https://www.youtube.com/watch?v=b5ZQob-mDGM',
    seekStart: 55,
    genre: 'Indo Hits',
    year: '2021',
    artist: 'Rizky Febian',
    correct: 'Hingga Tua Bersama',
    options: ['Hingga Tua Bersama', 'Kesempurnaan Cinta', 'Mantra Cinta', 'Cuek']
  },

  // ═══════════════ WESTERN / POP BARAT ═══════════════
  {
    youtubeUrl: 'https://www.youtube.com/watch?v=SR6iYWJxHqs',
    seekStart: 40,
    genre: 'Western Pop',
    year: '2010',
    artist: 'Bruno Mars',
    correct: 'Grenade',
    options: ['Grenade', 'Just The Way You Are', 'Locked Out of Heaven', 'When I Was Your Man']
  },
  {
    youtubeUrl: 'https://www.youtube.com/watch?v=tg00YEETFzg',
    seekStart: 45,
    genre: 'Western Pop / EDM',
    year: '2011',
    artist: 'Rihanna ft. Calvin Harris',
    correct: 'We Found Love',
    options: ['We Found Love', 'Diamonds', 'This Is What You Came For', 'Only Girl (In the World)']
  },
  {
    youtubeUrl: 'https://www.youtube.com/watch?v=4fndeDfaWCg',
    seekStart: 30,
    genre: 'Western 90s',
    year: '1999',
    artist: 'Backstreet Boys',
    correct: 'I Want It That Way',
    options: ['I Want It That Way', 'Everybody', 'As Long As You Love Me', 'Show Me the Meaning']
  },
  {
    youtubeUrl: 'https://www.youtube.com/watch?v=e-fA-gBCkj0',
    seekStart: 35,
    genre: 'Western Pop',
    year: '2012',
    artist: 'Bruno Mars',
    correct: 'Locked Out of Heaven',
    options: ['Locked Out of Heaven', 'Treasure', '24K Magic', 'Gorilla']
  },
  {
    youtubeUrl: 'https://www.youtube.com/watch?v=VPRjCeoBqrI',
    seekStart: 55,
    genre: 'Western Alternative',
    year: '2014',
    artist: 'Coldplay',
    correct: 'A Sky Full of Stars',
    options: ['A Sky Full of Stars', 'Yellow', 'Viva La Vida', 'Fix You']
  },
  {
    youtubeUrl: 'https://www.youtube.com/watch?v=foE1mO2yM04',
    seekStart: 30,
    genre: 'Western EDM',
    year: '2016',
    artist: 'Mike Posner (Seeb Remix)',
    correct: 'I Took a Pill in Ibiza',
    options: ['I Took a Pill in Ibiza', 'Cooler Than Me', 'Wake Me Up', 'Heroes']
  },

  // ═══════════════ ANIME & JAPANESE ═══════════════
  {
    youtubeUrl: 'https://www.youtube.com/watch?v=8uTEp-0Q_V0',
    seekStart: 25,
    genre: 'Anime OST (Tokyo Ghoul)',
    year: '2014',
    artist: 'TK from Ling Tosite Sigure',
    correct: 'Unravel',
    options: ['Unravel', 'Katharsis', 'Gurenge', 'Kaikai Kitan']
  },
  {
    youtubeUrl: 'https://www.youtube.com/watch?v=CwkzK-F0Y00',
    seekStart: 30,
    genre: 'Anime OST (Demon Slayer)',
    year: '2019',
    artist: 'LiSA',
    correct: 'Gurenge',
    options: ['Gurenge', 'Homura', 'Akeboshi', 'Crossing Field']
  },
  {
    youtubeUrl: 'https://www.youtube.com/watch?v=PbA63a7H0bo',
    seekStart: 15,
    genre: 'Anime OST (Attack on Titan)',
    year: '2017',
    artist: 'Linked Horizon',
    correct: 'Shinzou wo Sasageyo',
    options: ['Shinzou wo Sasageyo', 'Guren no Yumiya', 'The Rumbling', 'Red Swan']
  },
  {
    youtubeUrl: 'https://www.youtube.com/watch?v=PDSkFeMVNFs',
    seekStart: 30,
    genre: 'Anime OST (Kimi no Na wa)',
    year: '2016',
    artist: 'RADWIMPS',
    correct: 'Zenzenzense',
    options: ['Zenzenzense', 'Sparkle', 'Nandemonaiya', 'Grand Escape']
  },

  // ═══════════════ K-POP ═══════════════
  {
    youtubeUrl: 'https://www.youtube.com/watch?v=gdZLi9oWNZg',
    seekStart: 40,
    genre: 'K-Pop',
    year: '2020',
    artist: 'BTS',
    correct: 'Dynamite',
    options: ['Dynamite', 'Butter', 'Boy With Luv', 'Life Goes On']
  },
  {
    youtubeUrl: 'https://www.youtube.com/watch?v=ioNng23DkIM',
    seekStart: 35,
    genre: 'K-Pop',
    year: '2020',
    artist: 'BLACKPINK',
    correct: 'How You Like That',
    options: ['How You Like That', 'Kill This Love', 'DDU-DU DDU-DU', 'Pink Venom']
  },
  {
    youtubeUrl: 'https://www.youtube.com/watch?v=4TWR90KJl84',
    seekStart: 30,
    genre: 'K-Pop',
    year: '2021',
    artist: 'aespa',
    correct: 'Next Level',
    options: ['Next Level', 'Savage', 'Supernova', 'Drama']
  }
];

// ═══════════════ STATE MANAGEMENT ═══════════════
const activeGames = new Map(); // guildId -> gameState
const SNIPPET_DURATION = 10; // detik potongan musik per ronde
const ANSWER_TIME = 20;      // detik waktu menjawab (termasuk durasi snippet)

function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('musicquiz')
    .setDescription('Main game tebak lagu interaktif — dengarkan potongan musik & tebak judulnya!')
    .addSubcommand(sub =>
      sub
        .setName('start')
        .setDescription('Mulai sesi Music Quiz berbasis audio')
        .addIntegerOption(opt =>
          opt.setName('ronde')
            .setDescription('Jumlah ronde pertanyaan (1-10, default: 5)')
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(10)
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

      const rankSymbols = ['#1', '#2', '#3', '#4', '#5', '#6', '#7', '#8', '#9', '#10'];
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
        .setFooter({ text: 'Skor akumulasi dari seluruh sesi quiz' })
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

      // Stop musik quiz jika masih bermain
      try {
        const queue = client.distube.getQueue(guildId);
        if (queue) queue.stop().catch(() => {});
      } catch (_) {}

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x2B2D31)
            .setDescription('**Music Quiz telah dihentikan.** Terima kasih sudah bermain!')
        ]
      });
    }

    // ═══ 3. START QUIZ ═══
    if (sub === 'start') {
      // Cek apakah sudah ada quiz berjalan
      if (activeGames.has(guildId)) {
        return interaction.reply({
          content: '**Music Quiz sedang berlangsung di server ini.** Tunggu selesai atau gunakan `/musicquiz stop`.',
          flags: MessageFlags.Ephemeral
        });
      }

      // Cek admin harus di voice channel
      const voiceChannel = interaction.member?.voice?.channel;
      if (!voiceChannel) {
        return interaction.reply({
          content: '**Kamu harus berada di Voice Channel terlebih dahulu** sebelum memulai Music Quiz.',
          flags: MessageFlags.Ephemeral
        });
      }

      // Cek apakah bot sedang memutar musik
      const existingQueue = client.distube.getQueue(guildId);
      if (existingQueue && existingQueue.songs.length > 0) {
        return interaction.reply({
          content: '**Bot sedang memutar musik saat ini.**\nHentikan musik terlebih dahulu menggunakan perintah `!stop` atau `/leave`, lalu coba lagi.',
          flags: MessageFlags.Ephemeral
        });
      }

      const totalRounds = interaction.options.getInteger('ronde') || 5;
      const questions = shuffleArray(SONG_DATABASE).slice(0, totalRounds);

      const gameState = {
        active: true,
        guildId,
        channelId: interaction.channel.id,
        voiceChannelId: voiceChannel.id,
        currentRound: 0,
        totalRounds,
        questions,
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
          `Bersiaplah mendengarkan potongan musik dan tebak judul lagunya.\n\n` +
          `\`Total Ronde\` **${totalRounds}**\n` +
          `\`Durasi Audio\` **${SNIPPET_DURATION} detik** per ronde\n` +
          `\`Waktu Jawab\` **${ANSWER_TIME} detik**\n\n` +
          `*Ronde pertama dimulai dalam 5 detik...*`
        )
        .setFooter({ text: 'Dengarkan baik-baik, lalu klik tombol jawaban yang benar!' })
        .setTimestamp();

      await interaction.reply({ embeds: [startEmbed] });

      setTimeout(() => runNextRound(interaction.channel, voiceChannel, guildId, client), 5000);
    }
  }
};

// ═══════════════ GAME ENGINE ═══════════════

/**
 * Jalankan ronde berikutnya — putar potongan musik lalu tampilkan pilihan jawaban
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
  const shuffledOptions = shuffleArray(q.options);

  // ─── Embed pertanyaan (tanpa hint lirik — murni audio) ───
  const questionEmbed = new EmbedBuilder()
    .setColor(0x2B2D31)
    .setAuthor({
      name: `RONDE ${game.currentRound} / ${game.totalRounds}`,
      iconURL: client.user.displayAvatarURL()
    })
    .setTitle('Dengarkan potongan musik berikut...')
    .setDescription(
      `Musik sedang diputar di voice channel. Dengarkan baik-baik!\n\n` +
      `\`Kategori\` **${q.genre}**\n` +
      `\`Tahun\` **${q.year}**\n\n` +
      `Pilih jawaban yang benar dari tombol di bawah:`
    )
    .setFooter({ text: `Waktu menjawab: ${ANSWER_TIME} detik` })
    .setTimestamp();

  // ─── Tombol jawaban A/B/C/D ───
  const row = new ActionRowBuilder();
  const letters = ['A', 'B', 'C', 'D'];

  shuffledOptions.forEach((opt, idx) => {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`quiz_ans_${game.currentRound}_${idx}_${opt === q.correct ? 'correct' : 'wrong'}`)
        .setLabel(`${letters[idx]}. ${opt}`)
        .setStyle(ButtonStyle.Secondary)
    );
  });

  const msg = await textChannel.send({ embeds: [questionEmbed], components: [row] }).catch(() => null);
  if (!msg) return activeGames.delete(guildId);

  // ─── Putar potongan musik via DisTube ───
  try {
    await client.distube.play(voiceChannel, q.youtubeUrl, {
      member: voiceChannel.guild.members.me,
      textChannel: textChannel,
    });

    // Tunggu sebentar agar lagu mulai dimainkan, lalu seek ke posisi reff
    await new Promise(resolve => setTimeout(resolve, 2500));

    const queue = client.distube.getQueue(guildId);
    if (queue && q.seekStart > 0) {
      await queue.seek(q.seekStart).catch(() => {});
    }

    // Stop musik setelah SNIPPET_DURATION detik
    setTimeout(async () => {
      try {
        const currentQueue = client.distube.getQueue(guildId);
        if (currentQueue) {
          currentQueue.stop().catch(() => {});
        }
      } catch (_) {}
    }, SNIPPET_DURATION * 1000);
  } catch (err) {
    console.warn(`[MusicQuiz] Gagal memutar audio ronde ${game.currentRound}:`, err.message);
    // Lanjutkan quiz meskipun audio gagal diputar
  }

  // ─── Kumpulkan jawaban ───
  const startTime = Date.now();
  let firstCorrectWinner = null;

  const collector = msg.createMessageComponentCollector({
    time: ANSWER_TIME * 1000
  });

  collector.on('collect', async (i) => {
    // Pastikan custom ID milik ronde yang benar
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
      const points = Math.max(40, Math.round(100 - (elapsed * 3)));
      game.scores[i.user.id].score += points;
      game.scores[i.user.id].correctCount += 1;

      if (!firstCorrectWinner) {
        firstCorrectWinner = i.member.displayName;
      }

      return i.reply({
        content: `**Benar!** Kamu mendapatkan **+${points} Poin**.`,
        flags: MessageFlags.Ephemeral
      });
    } else {
      return i.reply({
        content: `**Salah.** Jawaban yang benar adalah **${q.correct}**.`,
        flags: MessageFlags.Ephemeral
      });
    }
  });

  collector.on('end', async () => {
    // Stop musik jika masih bermain
    try {
      const currentQueue = client.distube.getQueue(guildId);
      if (currentQueue) currentQueue.stop().catch(() => {});
    } catch (_) {}

    // Disable semua tombol & highlight jawaban benar
    const disabledRow = new ActionRowBuilder();
    shuffledOptions.forEach((opt, idx) => {
      disabledRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`quiz_done_${game.currentRound}_${idx}`)
          .setLabel(`${letters[idx]}. ${opt}`)
          .setStyle(opt === q.correct ? ButtonStyle.Success : ButtonStyle.Secondary)
          .setDisabled(true)
      );
    });

    await msg.edit({ components: [disabledRow] }).catch(() => {});

    // Embed hasil ronde
    const roundResultEmbed = new EmbedBuilder()
      .setColor(0x2B2D31)
      .setTitle(`Ronde ${game.currentRound} Selesai`)
      .setDescription(
        `**Jawaban:** ${q.correct} — *${q.artist}*\n` +
        (firstCorrectWinner
          ? `**Penjawab Tercepat:** ${firstCorrectWinner}`
          : `*Tidak ada yang menjawab dengan benar di ronde ini.*`)
      );

    await textChannel.send({ embeds: [roundResultEmbed] }).catch(() => {});

    // Cek apakah game masih aktif (bisa saja di-stop saat ronde berjalan)
    if (!game.active) return;

    // Jeda 5 detik sebelum ronde berikutnya
    setTimeout(() => runNextRound(textChannel, voiceChannel, guildId, client), 5000);
  });
}

/**
 * Selesaikan Music Quiz dan umumkan pemenang
 */
async function finishGame(textChannel, guildId, client) {
  const game = activeGames.get(guildId);
  if (!game) return;

  activeGames.delete(guildId);

  // Stop musik jika masih bermain
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
      .setDescription('**Music Quiz Selesai.** Tidak ada yang mencetak poin pada sesi kali ini.');
    return textChannel.send({ embeds: [emptyEmbed] });
  }

  const winner = sortedScores[0][1];
  const rankLabels = ['#1', '#2', '#3', '#4', '#5'];

  const scoreBoard = sortedScores.slice(0, 5).map(([uId, d], i) => {
    return `\`${rankLabels[i]}\` **${d.name}** — **${d.score} Poin** (${d.correctCount} benar)`;
  }).join('\n');

  const finalEmbed = new EmbedBuilder()
    .setColor(0x2B2D31)
    .setAuthor({
      name: `HASIL AKHIR MUSIC QUIZ`,
      iconURL: textChannel.guild.iconURL({ dynamic: true }) || undefined
    })
    .setTitle(`Pemenang: ${winner.name}`)
    .setDescription(
      `Skor tertinggi **${winner.score} Poin** dengan ${winner.correctCount} jawaban benar.\n\n` +
      `**Papan Skor:**\n${scoreBoard}`
    )
    .setFooter({ text: 'Gunakan /musicquiz leaderboard untuk melihat klasemen server' })
    .setTimestamp();

  await textChannel.send({ embeds: [finalEmbed] }).catch(() => {});
}
