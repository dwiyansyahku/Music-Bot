const {
  SlashCommandBuilder, EmbedBuilder, ActionRowBuilder,
  ButtonBuilder, ButtonStyle, MessageFlags
} = require('discord.js');
const storage = require('../utils/storage');

/**
 * Bank Soal Musik Populer (Indo Hits, Barat, Anime, K-Pop, Rock/Nostalgia)
 */
const SONG_DATABASE = [
  // INDONESIA
  {
    hint: '“Hanya ada satu cara tuk memeluk dirimu, meski ku tahu ku takkan pernah bisa...”',
    genre: 'Indo Hits',
    year: '2022',
    artist: 'Tulus',
    correct: 'Hati-Hati di Jalan',
    options: ['Hati-Hati di Jalan', 'Monokrom', 'Diri', 'Sepatu']
  },
  {
    hint: '“Semua rasa yang dulu pernah ada, kini lenyap bersama waktu... jangan datang lagi cinta...”',
    genre: 'Indo Nostalgia',
    year: '2008',
    artist: 'ST12',
    correct: 'Jangan Pernah Berubah',
    options: ['Jangan Pernah Berubah', 'Saat Terakhir', 'Cari Pacar Lagi', 'P.U.S.P.A']
  },
  {
    hint: '“Ku bisa merelakanmu, walau ku tak rela... ku bisa melupakanmu, walau ku tak sanggup...”',
    genre: 'Indo Pop',
    year: '2023',
    artist: 'Mahalini',
    correct: 'Sial',
    options: ['Sial', 'Mati-Matian', 'Kisah Sempurna', 'Melawan Restu']
  },
  {
    hint: '“Dan bila hatimu terbangun di suatu malam, dan kau merasa hampa...”',
    genre: 'Indo Hits',
    year: '2000',
    artist: 'Sheila On 7',
    correct: 'Dan...',
    options: ['Dan...', 'Sephia', 'Pria Kesepian', 'Sebuah Kisah Klasik']
  },
  {
    hint: '“Bila nanti saatnya tlah tiba, ku ingin kau menjadi istriku...”',
    genre: 'Indo Pop',
    year: '2017',
    artist: 'Payung Teduh',
    correct: 'Akad',
    options: ['Akad', 'Menuju Senja', 'Resah', 'Angin Pujaan Hujan']
  },
  {
    hint: '“Jiwa yang bersedih, jangan menyerah dulu... dunia tak sejahat yang kau kira...”',
    genre: 'Indo Hits',
    year: '2023',
    artist: 'Ghea Indrawari',
    correct: 'Jiwa Yang Bersedih',
    options: ['Jiwa Yang Bersedih', 'Rasa Cinta Ini', 'Bucketlist', 'Kembara']
  },
  {
    hint: '“Tak segampang itu ku mencari pengganti dirimu... yang pernah singgah di relung hatiku...”',
    genre: 'Indo Pop',
    year: '2023',
    artist: 'Anggi Marito',
    correct: 'Tak Segampang Itu',
    options: ['Tak Segampang Itu', 'Kisah Bahagia', 'Cara Mencintaimu', 'Kisah Yang Salah']
  },
  {
    hint: '“Kau takkan pernah tahu, betapa ku menyayangimu... sampai saat kau pergi jauh dariku...”',
    genre: 'Indo Hits',
    year: '2021',
    artist: 'Rizky Febian',
    correct: 'Hingga Tua Bersama',
    options: ['Hingga Tua Bersama', 'Kesempurnaan Cinta', 'Mantra Cinta', 'Cuek']
  },

  // WESTERN / POP BARAT
  {
    hint: '“I\'d catch a grenade for ya, throw my hand on a blade for ya...”',
    genre: 'Western Pop',
    year: '2010',
    artist: 'Bruno Mars',
    correct: 'Grenade',
    options: ['Grenade', 'Just The Way You Are', 'Locked Out of Heaven', 'When I Was Your Man']
  },
  {
    hint: '“We found love in a hopeless place... shine a light through an open door...”',
    genre: 'Western Pop / EDM',
    year: '2011',
    artist: 'Rihanna ft. Calvin Harris',
    correct: 'We Found Love',
    options: ['We Found Love', 'Diamonds', 'This Is What You Came For', 'Only Girl (In the World)']
  },
  {
    hint: '“I want it that way... Tell me why, ain\'t nothin\' but a heartache...”',
    genre: 'Western 90s',
    year: '1999',
    artist: 'Backstreet Boys',
    correct: 'I Want It That Way',
    options: ['I Want It That Way', 'Everybody', 'As Long As You Love Me', 'Show Me the Meaning']
  },
  {
    hint: '“You make me feel like I\'ve been locked out of heaven for too long...”',
    genre: 'Western Pop',
    year: '2012',
    artist: 'Bruno Mars',
    correct: 'Locked Out of Heaven',
    options: ['Locked Out of Heaven', 'Treasure', '24K Magic', 'Gorilla']
  },
  {
    hint: '“Cause you\'re a sky, \'cause you\'re a sky full of stars... I\'m gonna give you my heart...”',
    genre: 'Western Alternative',
    year: '2014',
    artist: 'Coldplay',
    correct: 'A Sky Full of Stars',
    options: ['A Sky Full of Stars', 'Yellow', 'Viva La Vida', 'Fix You']
  },
  {
    hint: '“I took a pill in Ibiza, to show Avicii I was cool...”',
    genre: 'Western EDM',
    year: '2016',
    artist: 'Mike Posner (Seeb Remix)',
    correct: 'I Took a Pill in Ibiza',
    options: ['I Took a Pill in Ibiza', 'Cooler Than Me', 'Wake Me Up', 'Heroes']
  },

  // ANIME & JAPANESE
  {
    hint: '“Oshiete oshiete yo sono shikumi wo... boku no naka ni dare ga iru no?”',
    genre: 'Anime OST (Tokyo Ghoul)',
    year: '2014',
    artist: 'TK from Ling Tosite Sigure',
    correct: 'Unravel',
    options: ['Unravel', 'Katharsis', 'Gurenge', 'Kaikai Kitan']
  },
  {
    hint: '“Tsuyoku nareru riyuu wo shitta, boku wo tsurete susume!”',
    genre: 'Anime OST (Demon Slayer)',
    year: '2019',
    artist: 'LiSA',
    correct: 'Gurenge',
    options: ['Gurenge', 'Homura', 'Akeboshi', 'Crossing Field']
  },
  {
    hint: '“Shinzou wo sasageyo! Shinzou wo sasageyo! Subete no gisei wa ima kono toki no tame ni...”',
    genre: 'Anime OST (Attack on Titan)',
    year: '2017',
    artist: 'Linked Horizon',
    correct: 'Shinzou wo Sasageyo',
    options: ['Shinzou wo Sasageyo', 'Guren no Yumiya', 'The Rumbling', 'Red Swan']
  },
  {
    hint: '“Mada kono sekai wa boku wo kainarashitetai mitai da... nozomi doori ii darou...”',
    genre: 'Anime OST (Kimi no Na wa)',
    year: '2016',
    artist: 'RADWIMPS',
    correct: 'Zenzenzense',
    options: ['Zenzenzense', 'Sparkle', 'Nandemonaiya', 'Grand Escape']
  },

  // K-POP
  {
    hint: '“\'Cause I-I-I\'m in the stars tonight, so watch me bring the fire and set the night alight...”',
    genre: 'K-Pop',
    year: '2020',
    artist: 'BTS',
    correct: 'Dynamite',
    options: ['Dynamite', 'Butter', 'Boy With Luv', 'Life Goes On']
  },
  {
    hint: '“Blackpink in your area! Look at you, now look at me... How you like that?”',
    genre: 'K-Pop',
    year: '2020',
    artist: 'BLACKPINK',
    correct: 'How You Like That',
    options: ['How You Like That', 'Kill This Love', 'DDU-DU DDU-DU', 'Pink Venom']
  },
  {
    hint: '“I\'m on the next level yeah... Jeo neomeoui muneul yeoreo...”',
    genre: 'K-Pop',
    year: '2021',
    artist: 'aespa',
    correct: 'Next Level',
    options: ['Next Level', 'Savage', 'Supernova', 'Drama']
  }
];

// In-Memory Games map: guildId -> { active, currentRound, totalRounds, scores, currentQuestion, channelId }
const activeGames = new Map();

/**
 * Shuffle array helper
 */
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
    .setDescription('Main game tebak lagu interaktif seru di server')
    .addSubcommand(sub =>
      sub
        .setName('start')
        .setDescription('Mulai sesi Music Quiz')
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

    // === 1. LEADERBOARD ===
    if (sub === 'leaderboard') {
      const quizData = storage.read('musicquiz_lb');
      const guildLB = quizData[guildId] || {};
      const sorted = Object.entries(guildLB).sort((a, b) => b[1].score - a[1].score);

      if (sorted.length === 0) {
        return interaction.reply({
          content: '🏆 **Belum ada yang mencetak skor di Music Quiz server ini!**\nMulai game pertama dengan `/musicquiz start`!',
          flags: MessageFlags.Ephemeral
        });
      }

      const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
      const list = sorted.slice(0, 10).map(([uId, data], idx) => {
        return `${medals[idx]} **${data.name}** — \`${data.score} Poin\` (${data.wins || 0}x Menang)`;
      }).join('\n');

      const embed = new EmbedBuilder()
        .setColor('#FEE75C')
        .setTitle(`🏆 Papan Peringkat Music Quiz — ${interaction.guild.name}`)
        .setDescription(list)
        .setFooter({ text: 'QUMPRUY Bot • Music Quiz Hall of Fame' })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    // === 2. STOP QUIZ ===
    if (sub === 'stop') {
      if (!activeGames.has(guildId)) {
        return interaction.reply({
          content: '❌ Tidak ada sesi Music Quiz yang sedang berjalan saat ini.',
          flags: MessageFlags.Ephemeral
        });
      }
      activeGames.delete(guildId);
      return interaction.reply('🛑 **Music Quiz telah dihentikan.** Terima kasih sudah bermain!');
    }

    // === 3. START QUIZ ===
    if (sub === 'start') {
      if (activeGames.has(guildId)) {
        return interaction.reply({
          content: '⚠️ Music Quiz sedang berlangsung di server ini! Tunggu selesai atau gunakan `/musicquiz stop`.',
          flags: MessageFlags.Ephemeral
        });
      }

      const totalRounds = interaction.options.getInteger('ronde') || 5;
      const questions = shuffleArray(SONG_DATABASE).slice(0, totalRounds);

      const gameState = {
        active: true,
        guildId,
        channelId: interaction.channel.id,
        currentRound: 0,
        totalRounds,
        questions,
        scores: {}, // userId -> { name, score, correctCount }
        answeredUsers: new Set(),
      };

      activeGames.set(guildId, gameState);

      await interaction.reply({
        content: `🎉 **Music Quiz dimulai! (${totalRounds} Ronde)** Bersiap-siaplah, ronde 1 dimulai dalam 3 detik...`
      });

      setTimeout(() => runNextRound(interaction.channel, guildId), 3000);
    }
  }
};

/**
 * Jalankan ronde berikutnya dari Music Quiz
 */
async function runNextRound(channel, guildId) {
  const game = activeGames.get(guildId);
  if (!game || !game.active) return;

  if (game.currentRound >= game.totalRounds) {
    return finishGame(channel, guildId);
  }

  game.currentRound++;
  game.answeredUsers = new Set();
  const q = game.questions[game.currentRound - 1];
  const shuffledOptions = shuffleArray(q.options);

  const row = new ActionRowBuilder();
  const letters = ['A', 'B', 'C', 'D'];

  shuffledOptions.forEach((opt, idx) => {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`quiz_ans_${idx}_${opt === q.correct ? 'correct' : 'wrong'}`)
        .setLabel(`${letters[idx]}. ${opt}`)
        .setStyle(ButtonStyle.Primary)
    );
  });

  const embed = new EmbedBuilder()
    .setColor('#5865F2')
    .setTitle(`🎵 Music Quiz — Ronde ${game.currentRound} / ${game.totalRounds}`)
    .setDescription(
      `Tebak judul lagu dari petunjuk berikut!\n\n` +
      `💬 **Lirik / Petunjuk:**\n> *${q.hint}*\n\n` +
      `📌 **Kategori:** \`${q.genre}\` • 📅 **Tahun:** \`${q.year}\` • 🎤 **Artis:** \`${q.artist}\``
    )
    .setFooter({ text: '⏳ Waktu menjawab: 20 detik! Klik salah satu tombol di bawah!' })
    .setTimestamp();

  const msg = await channel.send({ embeds: [embed], components: [row] }).catch(() => null);
  if (!msg) return activeGames.delete(guildId);

  const startTime = Date.now();
  let firstCorrectWinner = null;

  const collector = msg.createMessageComponentCollector({
    time: 20000
  });

  collector.on('collect', async (i) => {
    if (game.answeredUsers.has(i.user.id)) {
      return i.reply({ content: '⚠️ Kamu sudah menjawab untuk ronde ini!', flags: MessageFlags.Ephemeral });
    }
    game.answeredUsers.add(i.user.id);

    const isCorrect = i.customId.endsWith('correct');

    if (!game.scores[i.user.id]) {
      game.scores[i.user.id] = { name: i.member.displayName, score: 0, correctCount: 0 };
    }

    if (isCorrect) {
      const elapsed = (Date.now() - startTime) / 1000;
      // Poin 100 max, makin cepet makin gede
      const points = Math.max(40, Math.round(100 - (elapsed * 3)));
      game.scores[i.user.id].score += points;
      game.scores[i.user.id].correctCount += 1;

      if (!firstCorrectWinner) {
        firstCorrectWinner = i.member.displayName;
      }

      return i.reply({
        content: `🎯 **BENAR!** Kamu mendapatkan **+${points} Poin**! 👏`,
        flags: MessageFlags.Ephemeral
      });
    } else {
      return i.reply({
        content: `❌ **SALAH!** Jawaban yang benar adalah **${q.correct}**.`,
        flags: MessageFlags.Ephemeral
      });
    }
  });

  collector.on('end', async () => {
    // Disable all buttons
    const disabledRow = new ActionRowBuilder();
    shuffledOptions.forEach((opt, idx) => {
      disabledRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`quiz_ans_disabled_${idx}`)
          .setLabel(`${letters[idx]}. ${opt}`)
          .setStyle(opt === q.correct ? ButtonStyle.Success : ButtonStyle.Secondary)
          .setDisabled(true)
      );
    });

    await msg.edit({ components: [disabledRow] }).catch(() => {});

    const roundResultEmbed = new EmbedBuilder()
      .setColor('#57F287')
      .setTitle(`⏰ Ronde ${game.currentRound} Selesai!`)
      .setDescription(
        `✅ **Jawaban Benar:** **${q.correct}** (${q.artist})\n` +
        (firstCorrectWinner ? `⚡ **Penjawab Pertama:** **${firstCorrectWinner}** 🔥\n` : `😴 *Tidak ada yang menjawab dengan benar di ronde ini.*\n`)
      );

    await channel.send({ embeds: [roundResultEmbed] }).catch(() => {});

    // Tunggu 4 detik sebelum ronde berikutnya
    setTimeout(() => runNextRound(channel, guildId), 4000);
  });
}

/**
 * Selesaikan Music Quiz dan umumkan juara
 */
async function finishGame(channel, guildId) {
  const game = activeGames.get(guildId);
  if (!game) return;

  activeGames.delete(guildId);

  const sortedScores = Object.entries(game.scores).sort((a, b) => b[1].score - a[1].score);

  // Simpan ke database leaderboard permanen
  const quizData = storage.read('musicquiz_lb');
  if (!quizData[guildId]) quizData[guildId] = {};

  sortedScores.forEach(([uId, data], idx) => {
    if (!quizData[guildId][uId]) {
      quizData[guildId][uId] = { name: data.name, score: 0, wins: 0 };
    }
    quizData[guildId][uId].score += data.score;
    quizData[guildId][uId].name = data.name;
    if (idx === 0) quizData[guildId][uId].wins = (quizData[guildId][uId].wins || 0) + 1;
  });

  storage.write('musicquiz_lb', quizData);

  if (sortedScores.length === 0) {
    return channel.send('🏁 **Music Quiz Selesai!** Tidak ada yang mencetak poin pada game kali ini. Sampai jumpa di game berikutnya!');
  }

  const winner = sortedScores[0][1];
  const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];

  const scoreBoard = sortedScores.slice(0, 5).map(([uId, d], i) => {
    return `${medals[i]} **${d.name}** — **${d.score} Poin** (${d.correctCount} benar)`;
  }).join('\n');

  const finalEmbed = new EmbedBuilder()
    .setColor('#FEE75C')
    .setTitle('🏆 HASIL AKHIR MUSIC QUIZ!')
    .setDescription(
      `👑 **JUARA 1:** **${winner.name}** dengan skor fantastis **${winner.score} Poin**! 🎉\n\n` +
      `📊 **Papan Skor Akhir:**\n${scoreBoard}`
    )
    .setFooter({ text: 'Gunakan /musicquiz leaderboard untuk melihat klasemen server!' })
    .setTimestamp();

  await channel.send({ embeds: [finalEmbed] }).catch(() => {});
}
