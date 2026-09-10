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
const pendingDuels = new Map();
const SNIPPET_DURATION = 30; // Durasi audio berbunyi penuh 30 detik
const ANSWER_TIME = 40;      // Waktu menjawab peserta 40 detik

const QUIZ_DAILY_TICKET_CAP = 5;

function awardQuizGachaRewards(guildId, userId, userName, ticketAmount, stardustAmount) {
  const gachaData = storage.read('gacha_data') || {};
  if (!gachaData[guildId]) gachaData[guildId] = {};
  if (!gachaData[guildId][userId]) {
    gachaData[guildId][userId] = {
      tickets: 3,
      stardust: 50,
      pulls: 0,
      pityEpic: 0,
      pityLegendary: 0,
      lastDaily: 0,
      streak: 0,
      inventory: [],
      badges: [],
      titles: []
    };
  }

  const userGacha = gachaData[guildId][userId];
  const today = new Date().toISOString().slice(0, 10);
  if (!userGacha.quizDailyTickets || userGacha.quizDailyTickets.date !== today) {
    userGacha.quizDailyTickets = { date: today, count: 0 };
  }

  let ticketsAwarded = 0;
  let hitCap = false;

  if (ticketAmount > 0) {
    const remainingCap = Math.max(0, QUIZ_DAILY_TICKET_CAP - userGacha.quizDailyTickets.count);
    ticketsAwarded = Math.min(ticketAmount, remainingCap);
    userGacha.tickets = (userGacha.tickets || 0) + ticketsAwarded;
    userGacha.quizDailyTickets.count += ticketsAwarded;
    if (remainingCap <= 0 || ticketsAwarded < ticketAmount) {
      hitCap = true;
    }
  }

  userGacha.stardust = (userGacha.stardust || 0) + stardustAmount;
  storage.write('gacha_data', gachaData);

  return {
    ticketsAwarded,
    stardustAwarded: stardustAmount,
    hitCap,
    dailyCount: userGacha.quizDailyTickets.count,
    dailyCap: QUIZ_DAILY_TICKET_CAP
  };
}

function awardDuelWin(guildId, winnerId, winnerName, reason = 'default') {
  // Update Leaderboard Music Quiz
  const quizData = storage.read('musicquiz_lb');
  if (!quizData[guildId]) quizData[guildId] = {};
  if (!quizData[guildId][winnerId]) {
    quizData[guildId][winnerId] = { name: winnerName, score: 0, wins: 0, duelWins: 0 };
  }
  quizData[guildId][winnerId].duelWins = (quizData[guildId][winnerId].duelWins || 0) + 1;
  quizData[guildId][winnerId].score = (quizData[guildId][winnerId].score || 0) + 50;
  quizData[guildId][winnerId].name = winnerName;
  storage.write('musicquiz_lb', quizData);

  // Jika menang W.O. (lawan AFK/meninggalkan arena), tiket tidak diberikan untuk mencegah farming akun tumbal
  const isWalkover = reason.startsWith('wo_');
  const ticketReward = isWalkover ? 0 : 1;
  const stardustReward = 25;

  return awardQuizGachaRewards(guildId, winnerId, winnerName, ticketReward, stardustReward);
}

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

const CATEGORY_CHOICES = [
  { name: 'Semua Negara (Campuran Dunia)', value: 'all' },
  { name: 'Indonesia (Pop, Rock, Koplo, Indie)', value: 'indo' },
  { name: 'Tradisional Indonesia (Lagu Daerah 38 Provinsi)', value: 'traditional_indo' },
  { name: 'Nasional Indonesia (Lagu Wajib & Perjuangan)', value: 'nasional_indo' },
  { name: 'Brasil (Funk Carioca, Phonk, Sertanejo)', value: 'brazil' },
  { name: 'Western & Global (US, UK, Pop)', value: 'western' },
  { name: 'Jepang & Anime (J-Pop, Anime OST)', value: 'japan' },
  { name: 'Korea Selatan (K-Pop & OST)', value: 'korea' },
  { name: 'Arab & Timur Tengah (Arabic Pop)', value: 'arabic' },
  { name: 'Thailand (T-Pop & Thai Hits)', value: 'thailand' },
  { name: 'Amerika Latin (Reggaeton, Pop)', value: 'latin' }
];

const CATEGORY_LABELS = {
  all: 'Semua Negara (Campuran Dunia)',
  indo: 'Indonesia (Pop, Rock, Koplo, Indie)',
  traditional_indo: 'Tradisional Indonesia (Lagu Daerah 38 Provinsi)',
  nasional_indo: 'Nasional Indonesia (Lagu Wajib & Perjuangan)',
  brazil: 'Brasil (Funk Carioca, Phonk, Sertanejo)',
  western: 'Western & Global (US, UK, Pop)',
  japan: 'Jepang & Anime (J-Pop, Anime OST)',
  korea: 'Korea Selatan (K-Pop & OST)',
  arabic: 'Arab & Timur Tengah (Arabic Pop)',
  thailand: 'Thailand (T-Pop & Thai Hits)',
  latin: 'Amerika Latin (Reggaeton, Pop)'
};

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
            .addChoices(...CATEGORY_CHOICES)
        )
        .addIntegerOption(opt =>
          opt.setName('ronde')
            .setDescription('Jumlah ronde pertanyaan (5-50, default: 10). Min. 10 ronde untuk perebutan tiket gacha')
            .setRequired(false)
            .setMinValue(5)
            .setMaxValue(50)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('duel')
        .setDescription('Tantang member lain dalam duel tebak lagu 1v1 di voice channel')
        .addUserOption(opt =>
          opt.setName('lawan')
            .setDescription('Pilih member yang ingin kamu tantang duel')
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('kategori')
            .setDescription('Pilih kategori lagu (default: Campuran Dunia)')
            .setRequired(false)
            .addChoices(...CATEGORY_CHOICES)
        )
        .addIntegerOption(opt =>
          opt.setName('ronde')
            .setDescription('Jumlah ronde duel (5-50, default: 10). Head-to-Head')
            .setRequired(false)
            .setMinValue(5)
            .setMaxValue(50)
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
        const winsText = data.wins ? ` (${data.wins}x Menang)` : '';
        const duelWinsText = data.duelWins ? ` [${data.duelWins}x Menang Duel]` : '';
        return `\`${rankSymbols[idx]}\` **${data.name}** — \`${data.score} Poin\`${winsText}${duelWinsText}`;
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
            .setDescription('**Music Quiz dihentikan.** Terima kasih telah berpartisipasi.')
        ]
      });
    }

    // ═══ 3. DUEL 1V1 MODE ═══
    if (sub === 'duel') {
      const opponent = interaction.options.getUser('lawan');
      const challenger = interaction.user;

      if (opponent.id === challenger.id) {
        return interaction.reply({
          content: 'Kamu tidak bisa menantang dirimu sendiri dalam mode duel.',
          flags: MessageFlags.Ephemeral
        });
      }

      if (opponent.bot) {
        return interaction.reply({
          content: 'Kamu tidak bisa menantang bot dalam mode duel.',
          flags: MessageFlags.Ephemeral
        });
      }

      const challengerVoice = interaction.member?.voice?.channel;
      if (!challengerVoice) {
        return interaction.reply({
          content: 'Kamu harus berada di Voice Channel terlebih dahulu untuk memulai duel.',
          flags: MessageFlags.Ephemeral
        });
      }

      const opponentMember = await interaction.guild.members.fetch(opponent.id).catch(() => null);
      if (!opponentMember || !opponentMember.voice || !opponentMember.voice.channel) {
        return interaction.reply({
          content: `**${opponent.username}** harus berada di Voice Channel untuk menerima tantangan duel.`,
          flags: MessageFlags.Ephemeral
        });
      }

      if (challengerVoice.id !== opponentMember.voice.channel.id) {
        return interaction.reply({
          content: `Kamu dan **${opponent.username}** harus berada di Voice Channel yang sama (${challengerVoice.name}).`,
          flags: MessageFlags.Ephemeral
        });
      }

      if (activeGames.has(guildId)) {
        return interaction.reply({
          content: 'Sedang ada sesi Music Quiz yang berlangsung di server ini. Tunggu selesai atau gunakan `/musicquiz stop`.',
          flags: MessageFlags.Ephemeral
        });
      }

      const category = interaction.options.getString('kategori') || 'all';
      const totalRounds = interaction.options.getInteger('ronde') || 10;

      const duelId = `duel_${guildId}_${Date.now()}`;
      const acceptBtn = new ButtonBuilder()
        .setCustomId(`duel_acc_${duelId}`)
        .setLabel('Terima Tantangan')
        .setStyle(ButtonStyle.Success);

      const declineBtn = new ButtonBuilder()
        .setCustomId(`duel_dec_${duelId}`)
        .setLabel('Tolak')
        .setStyle(ButtonStyle.Secondary);

      const inviteRow = new ActionRowBuilder().addComponents(acceptBtn, declineBtn);

      const expiryTimestamp = Math.floor(Date.now() / 1000) + 30;

      const inviteEmbed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setAuthor({
          name: `TANTANGAN DUEL 1V1 — ${interaction.guild.name.toUpperCase()}`,
          iconURL: interaction.guild.iconURL({ dynamic: true }) || undefined
        })
        .setTitle(`${interaction.member.displayName} VS ${opponentMember.displayName}`)
        .setDescription(
          `**${interaction.member.displayName}** menantang **${opponentMember.displayName}** dalam duel tebak lagu 1v1!\n\n` +
          `• **Kategori:** \`${CATEGORY_LABELS[category]}\`\n` +
          `• **Total Ronde:** \`${totalRounds} Ronde Head-to-Head\`\n` +
          `• **Voice Channel:** <#${challengerVoice.id}>\n` +
          `• **Batas Waktu Konfirmasi:** <t:${expiryTimestamp}:R> (30 Detik)\n\n` +
          `Klik tombol di bawah untuk menerima atau menolak tantangan:`
        )
        .setFooter({ text: `Hanya ${opponentMember.displayName} yang dapat merespons tantangan ini` })
        .setTimestamp();

      const response = await interaction.reply({
        content: `<@${opponent.id}>`,
        embeds: [inviteEmbed],
        components: [inviteRow],
        withResponse: true
      });

      const inviteMsg = response.resource?.message || await interaction.fetchReply();

      const duelCollector = inviteMsg.createMessageComponentCollector({
        filter: i => i.customId === `duel_acc_${duelId}` || i.customId === `duel_dec_${duelId}`,
        time: 30000
      });

      duelCollector.on('collect', async (i) => {
        // Blokir jika yang menekan adalah penantang
        if (i.user.id === challenger.id) {
          return i.reply({
            content: 'Kamu adalah penantang. Kamu tidak bisa menerima atau menolak tantanganmu sendiri! Menunggu respon lawan...',
            flags: MessageFlags.Ephemeral
          });
        }

        // Blokir jika yang menekan adalah orang lain
        if (i.user.id !== opponent.id) {
          return i.reply({
            content: `Hanya **${opponentMember.displayName}** yang dapat menerima atau menolak tantangan ini.`,
            flags: MessageFlags.Ephemeral
          });
        }

        if (i.customId === `duel_dec_${duelId}`) {
          const cancelEmbed = new EmbedBuilder()
            .setColor(0x2B2D31)
            .setAuthor({
              name: `TANTANGAN DITOLAK — ${interaction.guild.name.toUpperCase()}`,
              iconURL: interaction.guild.iconURL({ dynamic: true }) || undefined
            })
            .setTitle('Duel 1v1 Dibatalkan')
            .setDescription(`**${opponentMember.displayName}** menolak tantangan duel dari **${interaction.member.displayName}**.`)
            .setTimestamp();

          await i.update({ embeds: [cancelEmbed], components: [] });
          return;
        }

        if (i.customId === `duel_acc_${duelId}`) {
          if (activeGames.has(guildId)) {
            return i.update({
              content: 'Sesi Music Quiz lain telah dimulai sebelumnya.',
              embeds: [],
              components: []
            });
          }

          const songPool = getSongPool(category);
          const shuffledQuestions = shuffleArray(songPool).slice(0, totalRounds);

          const gameState = {
            active: true,
            guildId,
            channelId: interaction.channel.id,
            voiceChannelId: challengerVoice.id,
            category,
            currentRound: 0,
            totalRounds,
            questions: shuffledQuestions,
            songPool,
            scores: {
              [challenger.id]: { name: interaction.member.displayName, score: 0, correctCount: 0 },
              [opponent.id]: { name: opponentMember.displayName, score: 0, correctCount: 0 }
            },
            answeredUsers: new Set(),
            activeParticipants: new Set(),
            isDuel: true,
            challengerId: challenger.id,
            opponentId: opponent.id,
            challengerName: interaction.member.displayName,
            opponentName: opponentMember.displayName
          };

          activeGames.set(guildId, gameState);

          const startDuelEmbed = new EmbedBuilder()
            .setColor(0x2B2D31)
            .setAuthor({
              name: `DUEL 1V1 DIMULAI — ${interaction.guild.name.toUpperCase()}`,
              iconURL: interaction.guild.iconURL({ dynamic: true }) || undefined
            })
            .setTitle(`${interaction.member.displayName} VS ${opponentMember.displayName}`)
            .setDescription(
              `Tantangan diterima! Pertandingan adu tebak lagu 1v1 segera dimulai.\n\n` +
              `• **Kategori:** \`${CATEGORY_LABELS[category]}\`\n` +
              `• **Format:** \`${totalRounds} Ronde Head-to-Head\`\n` +
              `• **Durasi Audio:** \`${SNIPPET_DURATION} Detik\`\n` +
              `• **Waktu Menjawab:** \`${ANSWER_TIME} Detik\`\n\n` +
              `*Ronde pertama dimulai dalam 4 detik...*`
            )
            .setFooter({ text: 'Hanya kedua peserta duel yang dapat menekan tombol jawaban' })
            .setTimestamp();

          await i.update({ embeds: [startDuelEmbed], components: [] });

          setTimeout(() => runNextRound(interaction.channel, challengerVoice, guildId, client), 4000);
        }
      });

      duelCollector.on('end', async (collected, reason) => {
        if (reason === 'time' && (!collected || collected.filter(c => c.user.id === opponent.id).size === 0)) {
          awardDuelWin(guildId, challenger.id, interaction.member.displayName, 'wo_invite_no_response');

          const winEmbed = new EmbedBuilder()
            .setColor(0x57F287)
            .setAuthor({
              name: `HASIL AKHIR DUEL 1V1 — ${interaction.guild.name.toUpperCase()}`,
              iconURL: interaction.guild.iconURL({ dynamic: true }) || undefined
            })
            .setTitle(`🏆 Pemenang Duel: ${interaction.member.displayName} (Menang W.O.)`)
            .setDescription(
              `**${opponentMember.displayName}** tidak memberikan respons dalam waktu 30 detik.\n\n` +
              `Sesuai regulasi pertandingan, kemenangan mutlak (**Walkover / W.O.**) otomatis diberikan kepada inisiator tantangan **${interaction.member.displayName}**!\n\n` +
              `• **Status:** Menang W.O. (Lawan Tidak Merespon)\n` +
              `• **Pemenang:** <@${challenger.id}> 👑\n` +
              `• **Lawan:** <@${opponent.id}>\n\n` +
              `🎁 **Hadiah Pemenang:** 🎟️ **+1 Tiket Gacha** & ✨ **+25 Stardust**! (+50 Poin Leaderboard)`
            )
            .setFooter({ text: 'Gunakan /musicquiz duel untuk menantang member lain' })
            .setTimestamp();

          await inviteMsg.edit({ embeds: [winEmbed], components: [] }).catch(() => {});
        }
      });

      return;
    }

    // ═══ 4. START STANDARD QUIZ ═══
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

      const memberList = voiceChannel.members ? Array.from(voiceChannel.members.values()) : [];
      const humanMembers = memberList.filter(m => !m.user?.bot);
      if (humanMembers.length < 2) {
        return interaction.reply({
          content: `⚠️ **Minimal 2 Member Dibutuhkan!**\nMusic Quiz dirancang untuk kompetisi antar member. Minimal harus ada **2 orang member** (non-bot) di dalam Voice Channel <#${voiceChannel.id}> untuk memulai kuis.\nAjak temanmu bergabung ke voice channel terlebih dahulu!`,
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
      const totalRounds = interaction.options.getInteger('ronde') || 10;

      const songPool = getSongPool(category);
      const shuffledQuestions = shuffleArray(songPool).slice(0, totalRounds);

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
        activeParticipants: new Set(),
        isDuel: false
      };

      activeGames.set(guildId, gameState);

      const isCompetitiveMode = totalRounds >= 10;
      const startEmbed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setAuthor({
          name: `MUSIC QUIZ — ${interaction.guild.name.toUpperCase()}`,
          iconURL: interaction.guild.iconURL({ dynamic: true }) || undefined
        })
        .setTitle('Sesi Music Quiz Dimulai!')
        .setDescription(
          `Dengarkan potongan musik 30 detik di voice channel dan tebak judulnya secepat mungkin!\n\n` +
          `• **Kategori:** \`${CATEGORY_LABELS[category]}\`\n` +
          `• **Total Ronde:** \`${totalRounds} Ronde\`\n` +
          `• **Durasi Audio:** \`${SNIPPET_DURATION} Detik\`\n` +
          `• **Waktu Menjawab:** \`${ANSWER_TIME} Detik\`\n` +
          `• **Mode Permainan:** ${isCompetitiveMode ? '⚔️ `Kompetitif (Perebutan Tiket Gacha & Stardust)`' : '⚡ `Quick Match (Pemanasan — Stardust & Leaderboard)`'}\n\n` +
          `*Ronde pertama dimulai dalam 4 detik...*`
        )
        .setFooter({ text: isCompetitiveMode ? 'Syarat Tiket: Min. 10 Ronde, Min. 2 Peserta Aktif, & Akurasi Benar ≥ 30%' : 'Mainkan minimal 10 ronde untuk memperebutkan Tiket Gacha' })
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

  // Cek apakah masih ada member selain bot di voice channel
  const currentVC = textChannel.guild.channels.cache.get(voiceChannel.id);
  const currentHumans = currentVC?.members ? Array.from(currentVC.members.values()).filter(m => !m.user?.bot) : [];
  if (!currentVC || currentHumans.length === 0) {
    activeGames.delete(guildId);
    try {
      const q = client.distube.getQueue(guildId);
      if (q) q.stop().catch(() => {});
    } catch (_) {}
    const emptyEmbed = new EmbedBuilder()
      .setColor(0x2B2D31)
      .setDescription('**Music Quiz dihentikan otomatis.** Voice channel kosong.');
    return textChannel.send({ embeds: [emptyEmbed] }).catch(() => {});
  }

  // Jika mode Duel: periksa apakah pihak yang ditantang keluar dari voice channel (No Respon / DC)
  if (game.isDuel) {
    const challengerInVC = currentVC.members.has(game.challengerId);
    const opponentInVC = currentVC.members.has(game.opponentId);

    if (challengerInVC && !opponentInVC) {
      activeGames.delete(guildId);
      try {
        const q = client.distube.getQueue(guildId);
        if (q) q.stop().catch(() => {});
      } catch (_) {}

      awardDuelWin(guildId, game.challengerId, game.challengerName, 'wo_opponent_left_vc');

      const forfeitEmbed = new EmbedBuilder()
        .setColor(0x57F287)
        .setAuthor({
          name: `DUEL 1V1 BERAKHIR — ${textChannel.guild.name.toUpperCase()}`,
          iconURL: textChannel.guild.iconURL({ dynamic: true }) || undefined
        })
        .setTitle(`🏆 Pemenang Duel: ${game.challengerName} (Menang W.O.)`)
        .setDescription(
          `**${game.opponentName}** telah keluar dari Voice Channel di tengah pertandingan duel.\n\n` +
          `Karena pihak yang ditantang tidak lagi berada di arena / tidak merespon, kemenangan mutlak (**Walkover / W.O.**) otomatis diberikan kepada penantang **${game.challengerName}**!\n\n` +
          `• **Status:** Menang W.O. (Lawan Meninggalkan Arena)\n` +
          `• **Pemenang:** <@${game.challengerId}> 👑\n` +
          `• **Lawan:** <@${game.opponentId}>\n\n` +
          `🎁 **Hadiah Pemenang:** ✨ **+25 Stardust** & \`+50 Poin Leaderboard\`\n` +
          `⚠️ *Catatan: Tiket Gacha tidak diberikan pada kemenangan W.O. untuk mencegah eksploitasi AFK.*`
        )
        .setFooter({ text: 'Gunakan /musicquiz duel untuk menantang member lain' })
        .setTimestamp();

      return textChannel.send({ embeds: [forfeitEmbed] }).catch(() => {});
    }
  }

  // Cek apakah semua ronde sudah selesai
  if (game.currentRound >= game.totalRounds) {
    return finishGame(textChannel, guildId, client);
  }

  game.currentRound += 1;
  game.answeredUsers.clear();

  const q = game.questions[game.currentRound - 1];
  const options = generateQuestionOptions(q, game.songPool);
  const letters = ['A', 'B', 'C', 'D'];

  // 1. Kirim Embed Pertanyaan Awal (Status: Memuat Audio)
  const duelSubTitle = game.isDuel ? `\n• **Duel:** \`${game.challengerName} VS ${game.opponentName}\`` : '';
  const loadingEmbed = new EmbedBuilder()
    .setColor(0x2B2D31)
    .setAuthor({
      name: `RONDE ${game.currentRound} / ${game.totalRounds}${game.isDuel ? ' (MODE DUEL 1V1)' : ''}`,
      iconURL: client.user.displayAvatarURL()
    })
    .setTitle('Mempersiapkan audio pertanyaan...')
    .setDescription(
      `Audio sedang dimuat ke <#${voiceChannel.id}>.\n` +
      `• **Kategori:** \`${q.genre}\`\n` +
      `• **Tahun Rilis:** \`${q.year}\`${duelSubTitle}\n\n` +
      `*Pilihan jawaban akan muncul saat audio mulai berbunyi...*`
    )
    .setFooter({ text: `Durasi Musik: ${SNIPPET_DURATION}s • Waktu Menjawab: ${ANSWER_TIME}s` })
    .setTimestamp();

  const msg = await textChannel.send({ embeds: [loadingEmbed] }).catch(() => null);
  if (!msg) return;

  // 2. Siapkan Tombol Jawaban Grid 2x2
  const row1 = new ActionRowBuilder();
  const row2 = new ActionRowBuilder();
  options.forEach((opt, idx) => {
    const isCorrect = opt === q.title;
    const btn = new ButtonBuilder()
      .setCustomId(`quiz_ans_${game.currentRound}_${idx}_${isCorrect ? 'correct' : 'wrong'}`)
      .setLabel(`${letters[idx]}. ${opt.length > 75 ? opt.substring(0, 72) + '...' : opt}`)
      .setStyle(ButtonStyle.Secondary);

    if (idx < 2) row1.addComponents(btn);
    else row2.addComponents(btn);
  });

  // 3. Putar Potongan Musik di Voice Channel
  const searchQuery = `${q.artist} - ${q.title}`;
  let playSuccess = false;

  try {
    const randomOffsets = [0, 30, 45, 60, 75];
    const seekOffset = randomOffsets[Math.floor(Math.random() * randomOffsets.length)];

    const existingQ = client.distube.getQueue(guildId);
    if (existingQ) {
      existingQ.isQuiz = true;
      if (existingQ._nowPlayingMsg) {
        existingQ._nowPlayingMsg.delete().catch(() => {});
        existingQ._nowPlayingMsg = null;
      }
    }

    await client.distube.play(voiceChannel, searchQuery, {
      skip: true,
      position: 0,
      metadata: { isQuiz: true }
    });

    const queue = client.distube.getQueue(guildId);
    if (queue) {
      queue.isQuiz = true;
      if (queue._nowPlayingMsg) {
        queue._nowPlayingMsg.delete().catch(() => {});
        queue._nowPlayingMsg = null;
      }
      queue.setVolume(75);
      if (seekOffset > 0 && typeof queue.seek === 'function') {
        setTimeout(() => {
          try {
            if (queue && queue.seek) queue.seek(seekOffset);
          } catch (_) {}
        }, 1000);
      }
    }
    playSuccess = true;

    // Set timeout untuk menghentikan audio tepat setelah SNIPPET_DURATION detik
    setTimeout(() => {
      try {
        const currentQueue = client.distube.getQueue(guildId);
        if (currentQueue) currentQueue.stop().catch(() => {});
      } catch (_) {}
    }, SNIPPET_DURATION * 1000);
  } catch (err) {
    console.warn(`[MusicQuiz] Gagal memutar lagu "${searchQuery}":`, err.message);
  }

  // Fallback jika audio gagal dimuat
  if (!playSuccess) {
    const errorEmbed = new EmbedBuilder()
      .setColor(0x2B2D31)
      .setDescription(`Audio untuk ronde ${game.currentRound} gagal dimuat. Melanjutkan ke ronde berikutnya...`);
    await msg.edit({ embeds: [errorEmbed], components: [] }).catch(() => {});
    if (!game.active) return;
    return setTimeout(() => runNextRound(textChannel, voiceChannel, guildId, client), 3000);
  }

  if (!game.active) return;

  // 4. Audio sudah berjalan — Perbarui Embed dan munculkan tombol pilihan jawaban
  const activeQuestionEmbed = new EmbedBuilder()
    .setColor(0x2B2D31)
    .setAuthor({
      name: `RONDE ${game.currentRound} / ${game.totalRounds}${game.isDuel ? ' (MODE DUEL 1V1)' : ''}`,
      iconURL: client.user.displayAvatarURL()
    })
    .setTitle('Dengarkan musik di Voice Channel & Tebak Judulnya!')
    .setDescription(
      `Audio sedang dimainkan di <#${voiceChannel.id}>.\n\n` +
      `• **Kategori:** \`${q.genre}\`\n` +
      `• **Tahun Rilis:** \`${q.year}\`${duelSubTitle}\n\n` +
      `Pilih jawaban yang benar dari tombol di bawah sebelum waktu habis:`
    )
    .setFooter({ text: `Durasi Musik: ${SNIPPET_DURATION}s • Waktu Menjawab: ${ANSWER_TIME}s` })
    .setTimestamp();

  await msg.edit({ embeds: [activeQuestionEmbed], components: [row1, row2] }).catch(() => {});

  // 5. Kumpulkan Jawaban Peserta
  const startTime = Date.now();
  let firstCorrectWinner = null;

  const collector = msg.createMessageComponentCollector({
    time: ANSWER_TIME * 1000
  });

  collector.on('collect', async (i) => {
    if (!i.customId.startsWith(`quiz_ans_${game.currentRound}_`)) {
      return i.reply({ content: 'Ronde ini sudah berakhir.', flags: MessageFlags.Ephemeral });
    }

    // Jika mode Duel, hanya kedua pemain yang bisa menjawab
    if (game.isDuel && (i.user.id !== game.challengerId && i.user.id !== game.opponentId)) {
      return i.reply({
        content: `Mode Duel ini dikhususkan untuk **${game.challengerName}** vs **${game.opponentName}**.`,
        flags: MessageFlags.Ephemeral
      });
    }

    if (game.answeredUsers.has(i.user.id)) {
      return i.reply({ content: 'Kamu sudah menjawab untuk ronde ini.', flags: MessageFlags.Ephemeral });
    }
    game.answeredUsers.add(i.user.id);
    if (game.activeParticipants) {
      game.activeParticipants.add(i.user.id);
    }

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

      await i.reply({
        content: `**Benar!** Kamu memperoleh **+${points} Poin**.`,
        flags: MessageFlags.Ephemeral
      });
    } else {
      await i.reply({
        content: `**Salah.** Jawaban yang benar adalah **${q.title}**.`,
        flags: MessageFlags.Ephemeral
      });
    }

    // Jika dalam mode Duel dan kedua pemain sudah menjawab, akhiri ronde lebih cepat
    if (game.isDuel && game.answeredUsers.size >= 2) {
      collector.stop('both_answered');
    }
  });

  collector.on('end', async () => {
    try {
      const currentQueue = client.distube.getQueue(guildId);
      if (currentQueue) currentQueue.stop().catch(() => {});
    } catch (_) {}

    // Kunci tombol & highlight jawaban yang benar
    const disabledRow1 = new ActionRowBuilder();
    const disabledRow2 = new ActionRowBuilder();
    options.forEach((opt, idx) => {
      const btn = new ButtonBuilder()
        .setCustomId(`quiz_done_${game.currentRound}_${idx}`)
        .setLabel(`${letters[idx]}. ${opt.length > 75 ? opt.substring(0, 72) + '...' : opt}`)
        .setStyle(opt === q.title ? ButtonStyle.Success : ButtonStyle.Secondary)
        .setDisabled(true);

      if (idx < 2) disabledRow1.addComponents(btn);
      else disabledRow2.addComponents(btn);
    });

    await msg.edit({ components: [disabledRow1, disabledRow2] }).catch(() => {});

    // Tampilkan hasil ronde
    let scoreDisplay = '';
    if (game.isDuel) {
      const p1 = game.scores[game.challengerId] || { name: game.challengerName, score: 0, correctCount: 0 };
      const p2 = game.scores[game.opponentId] || { name: game.opponentName, score: 0, correctCount: 0 };
      scoreDisplay = `\n\n**Skor Sementara Duel:**\n• **${p1.name}:** ${p1.score} Poin (${p1.correctCount} benar)\n• **${p2.name}:** ${p2.score} Poin (${p2.correctCount} benar)`;
    }

    const roundResultEmbed = new EmbedBuilder()
      .setColor(0x2B2D31)
      .setTitle(`Ronde ${game.currentRound} Selesai`)
      .setDescription(
        `• **Jawaban Benar:** **${q.title}** — *${q.artist}*\n\n` +
        (firstCorrectWinner
          ? `• **Penjawab Tercepat:** **${firstCorrectWinner}**`
          : `*Tidak ada yang menjawab dengan benar di ronde ini.*`) +
        scoreDisplay
      );

    await textChannel.send({ embeds: [roundResultEmbed] }).catch(() => {});

    // Periksa jika pihak yang ditantang tidak merespon sama sekali selama 3 ronde berturut-turut
    if (game.isDuel) {
      const opponentAnswered = game.answeredUsers.has(game.opponentId);
      if (!opponentAnswered) {
        game.opponentAfkStreak = (game.opponentAfkStreak || 0) + 1;
      } else {
        game.opponentAfkStreak = 0;
      }

      if (game.opponentAfkStreak >= 3) {
        activeGames.delete(guildId);
        try {
          const currentQueue = client.distube.getQueue(guildId);
          if (currentQueue) currentQueue.stop().catch(() => {});
        } catch (_) {}

        awardDuelWin(guildId, game.challengerId, game.challengerName, 'wo_opponent_afk_3_rounds');

        const afkWinEmbed = new EmbedBuilder()
          .setColor(0x57F287)
          .setAuthor({
            name: `DUEL 1V1 BERAKHIR (DISKUALIFIKASI) — ${textChannel.guild.name.toUpperCase()}`,
            iconURL: textChannel.guild.iconURL({ dynamic: true }) || undefined
          })
          .setTitle(`🏆 Pemenang Duel: ${game.challengerName} (Menang W.O.)`)
          .setDescription(
            `**${game.opponentName}** tidak memberikan respon selama 3 ronde berturut-turut.\n\n` +
            `Sesuai regulasi pertandingan, duel dihentikan lebih awal dan kemenangan mutlak (**Walkover / W.O.**) diberikan kepada penantang **${game.challengerName}**!\n\n` +
            `• **Status:** Menang W.O. (Lawan AFK / Tidak Merespon)\n` +
            `• **Pemenang:** <@${game.challengerId}> 👑\n` +
            `• **Lawan:** <@${game.opponentId}>\n\n` +
            `🎁 **Hadiah Pemenang:** ✨ **+25 Stardust** & \`+50 Poin Leaderboard\`\n` +
            `⚠️ *Catatan: Tiket Gacha tidak diberikan pada kemenangan W.O. untuk mencegah eksploitasi AFK.*`
          )
          .setFooter({ text: 'Gunakan /musicquiz duel untuk memulai pertarungan baru' })
          .setTimestamp();

        return textChannel.send({ embeds: [afkWinEmbed] }).catch(() => {});
      }
    }

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
      quizData[guildId][uId] = { name: data.name, score: 0, wins: 0, duelWins: 0 };
    }
    quizData[guildId][uId].score += data.score;
    quizData[guildId][uId].name = data.name;
    if (idx === 0 && data.score > 0) {
      if (game.isDuel) {
        quizData[guildId][uId].duelWins = (quizData[guildId][uId].duelWins || 0) + 1;
      } else {
        quizData[guildId][uId].wins = (quizData[guildId][uId].wins || 0) + 1;
      }
    }
  });

  storage.write('musicquiz_lb', quizData);

  // FORMAT DUEL FINISH EMBED
  if (game.isDuel) {
    const p1 = game.scores[game.challengerId] || { name: game.challengerName, score: 0, correctCount: 0 };
    const p2 = game.scores[game.opponentId] || { name: game.opponentName, score: 0, correctCount: 0 };

    let resultTitle = '';
    let resultDesc = '';
    let winnerId = null;

    if (p1.score > p2.score) {
      winnerId = game.challengerId;
      resultTitle = `Pemenang Duel: ${p1.name}`;
      resultDesc = `**${p1.name}** memenangkan duel atas **${p2.name}** dengan selisih **${p1.score - p2.score} Poin**!`;
    } else if (p2.score > p1.score) {
      winnerId = game.opponentId;
      resultTitle = `Pemenang Duel: ${p2.name}`;
      resultDesc = `**${p2.name}** memenangkan duel atas **${p1.name}** dengan selisih **${p2.score - p1.score} Poin**!`;
    } else {
      // Jika skor seri / lawan tidak merespon jawaban dengan benar
      if (p2.correctCount === 0 && p1.correctCount > 0) {
        winnerId = game.challengerId;
        resultTitle = `Pemenang Duel: ${p1.name}`;
        resultDesc = `**${p1.name}** memenangkan duel karena **${p2.name}** tidak memberikan jawaban yang valid!`;
      } else if (p1.score === 0 && p2.score === 0) {
        // Keduanya 0 poin, inisiator tantangan memenangkan duel karena lawan tidak merespon/mencetak skor
        winnerId = game.challengerId;
        resultTitle = `Pemenang Duel: ${p1.name} (Inisiator Duel)`;
        resultDesc = `Kedua peserta tidak mencetak skor. Sesuai regulasi, kemenangan diberikan kepada inisiator tantangan **${p1.name}**!`;
      } else {
        resultTitle = 'Hasil Duel: Seri (Draw)';
        resultDesc = `Pertandingan berakhir imbang dengan skor **${p1.score} Poin** sama rata.`;
      }
    }

    let duelRewardText = '';
    if (winnerId) {
      // Pastikan duelWins tercatat di leaderboard
      if (!quizData[guildId]) quizData[guildId] = {};
      if (!quizData[guildId][winnerId]) {
        quizData[guildId][winnerId] = { name: winnerId === game.challengerId ? p1.name : p2.name, score: 0, wins: 0, duelWins: 0 };
      }
      quizData[guildId][winnerId].duelWins = (quizData[guildId][winnerId].duelWins || 0) + 1;
      storage.write('musicquiz_lb', quizData);

      // Duel kompetitif: kedua pemain harus aktif bertanding (terdaftar di activeParticipants)
      const bothParticipated = game.activeParticipants && game.activeParticipants.has(game.challengerId) && game.activeParticipants.has(game.opponentId);
      const isCompetitive = bothParticipated && (p1.score > 0 || p2.score > 0);

      const ticketReward = isCompetitive ? 1 : 0;
      const stardustReward = 25;
      const winnerName = winnerId === game.challengerId ? p1.name : p2.name;

      const r = awardQuizGachaRewards(guildId, winnerId, winnerName, ticketReward, stardustReward);

      if (r.ticketsAwarded > 0) {
        duelRewardText = `\n🎁 **Hadiah Pemenang:** 🎟️ **+${r.ticketsAwarded} Tiket Gacha** (Harian: ${r.dailyCount}/${r.dailyCap}) & ✨ **+${r.stardustAwarded} Stardust**!`;
      } else if (ticketReward > 0 && r.hitCap) {
        duelRewardText = `\n🎁 **Hadiah Pemenang:** 🎟️ *(Batas harian 5/5 tiket tercapai)* & ✨ **+${r.stardustAwarded} Stardust**!`;
      } else if (!isCompetitive) {
        duelRewardText = `\n🎁 **Hadiah Pemenang:** ✨ **+${r.stardustAwarded} Stardust**!\n⚠️ *Catatan: Tiket Gacha hanya diberikan jika kedua peserta aktif bertanding.*`;
      } else {
        duelRewardText = `\n🎁 **Hadiah Pemenang:** ✨ **+${r.stardustAwarded} Stardust**!`;
      }
    }

    const duelFinalEmbed = new EmbedBuilder()
      .setColor(0x2B2D31)
      .setAuthor({
        name: `HASIL AKHIR DUEL 1V1 — ${textChannel.guild.name.toUpperCase()}`,
        iconURL: textChannel.guild.iconURL({ dynamic: true }) || undefined
      })
      .setTitle(resultTitle)
      .setDescription(
        `${resultDesc}\n\n` +
        `**Rincian Skor:**\n` +
        `• **${p1.name}:** ${p1.score} Poin (${p1.correctCount}/${game.totalRounds} benar)\n` +
        `• **${p2.name}:** ${p2.score} Poin (${p2.correctCount}/${game.totalRounds} benar)` +
        duelRewardText
      )
      .setFooter({ text: 'Gunakan /musicquiz duel untuk memulai pertarungan baru' })
      .setTimestamp();

    return textChannel.send({ embeds: [duelFinalEmbed] }).catch(() => {});
  }

  // FORMAT STANDARD QUIZ FINISH EMBED
  if (sortedScores.length === 0) {
    const emptyEmbed = new EmbedBuilder()
      .setColor(0x2B2D31)
      .setDescription('**Music Quiz Selesai.** Tidak ada skor yang dicetak pada sesi kali ini.');
    return textChannel.send({ embeds: [emptyEmbed] });
  }

  const winner = sortedScores[0][1];
  const winnerUserId = sortedScores[0][0];

  const activeParticipantsCount = game.activeParticipants?.size || 0;
  const rewardSummaryNotes = [];

  // Syarat Tiket Gacha:
  // 1. Minimal 10 Ronde
  // 2. Minimal 2 Peserta Aktif yang menjawab
  // 3. Pemenang punya akurasi minimal (>= 30% di 10-19 ronde, >= 35% di 20+ ronde)
  const isShortMatch = game.totalRounds < 10;
  const minRequiredAccuracy = game.totalRounds >= 20 ? 0.35 : 0.30;
  const minCorrectRequired = Math.ceil(game.totalRounds * minRequiredAccuracy);
  const meetsAccuracy = winner.correctCount >= minCorrectRequired;
  const meetsParticipants = activeParticipantsCount >= 2;

  let rank1Tickets = 0;
  let rank1Stardust = 25;
  let rank2Tickets = 0;
  let rank2Stardust = 0;
  let rank3Stardust = 0;

  if (isShortMatch) {
    rank1Tickets = 0;
    rank1Stardust = 25;
    rewardSummaryNotes.push('ℹ️ Kuis ini berdurasi di bawah 10 ronde (Quick Match). Hadiah berupa Stardust & Leaderboard.');
  } else if (!meetsParticipants) {
    rank1Tickets = 0;
    rank1Stardust = 25;
    rewardSummaryNotes.push('⚠️ Tiket Gacha tidak diberikan karena kuis hanya memiliki 1 peserta aktif (minimal 2 peserta aktif menjawab).');
  } else if (!meetsAccuracy) {
    rank1Tickets = 0;
    rank1Stardust = 25;
    rewardSummaryNotes.push(`⚠️ Tiket Gacha tidak diberikan karena akurasi pemenang di bawah ${Math.round(minRequiredAccuracy * 100)}% (hanya ${winner.correctCount}/${game.totalRounds} benar).`);
  } else {
    // Kuis Kompetitif Sah!
    if (game.totalRounds >= 20) {
      rank1Tickets = 2;
      rank1Stardust = 100;
      // Juara 2 (jika ada >= 3 peserta yang berpartisipasi dan akurasi juara 2 >= 25%)
      if (sortedScores.length >= 3 && sortedScores[1][1].correctCount >= Math.ceil(game.totalRounds * 0.25)) {
        rank2Tickets = 1;
        rank2Stardust = 50;
      }
      // Juara 3 (jika ada >= 4 peserta dan akurasi juara 3 >= 2 benar)
      if (sortedScores.length >= 4 && sortedScores[2][1].correctCount >= 2) {
        rank3Stardust = 25;
      }
    } else {
      // 10-19 Ronde
      rank1Tickets = 1;
      rank1Stardust = 50;
      // Juara 2 (jika ada >= 3 peserta dan akurasi juara 2 >= 20%)
      if (sortedScores.length >= 3 && sortedScores[1][1].correctCount >= Math.ceil(game.totalRounds * 0.20)) {
        rank2Stardust = 25;
      }
    }
  }

  // Bagikan hadiah Juara 1
  let rewardText = '';
  if (winner.score > 0) {
    const r1 = awardQuizGachaRewards(guildId, winnerUserId, winner.name, rank1Tickets, rank1Stardust);
    rewardText += `\n\n🎁 **Hadiah Juara 1 (${winner.name}):** `;
    if (r1.ticketsAwarded > 0) {
      rewardText += `🎟️ **+${r1.ticketsAwarded} Tiket Gacha** (Harian: ${r1.dailyCount}/${r1.dailyCap}) & `;
    } else if (rank1Tickets > 0 && r1.hitCap) {
      rewardText += `🎟️ *(Batas harian 5/5 tiket tercapai)* & `;
    }
    rewardText += `✨ **+${r1.stardustAwarded} Stardust**!`;
  }

  // Bagikan hadiah Juara 2 (jika memenuhi syarat)
  if (sortedScores.length >= 2 && (rank2Tickets > 0 || rank2Stardust > 0)) {
    const r2User = sortedScores[1][1];
    const r2UserId = sortedScores[1][0];
    const r2 = awardQuizGachaRewards(guildId, r2UserId, r2User.name, rank2Tickets, rank2Stardust);
    rewardText += `\n🎁 **Hadiah Juara 2 (${r2User.name}):** `;
    if (r2.ticketsAwarded > 0) {
      rewardText += `🎟️ **+${r2.ticketsAwarded} Tiket Gacha** (Harian: ${r2.dailyCount}/${r2.dailyCap}) & `;
    } else if (rank2Tickets > 0 && r2.hitCap) {
      rewardText += `🎟️ *(Batas harian 5/5 tiket tercapai)* & `;
    }
    rewardText += `✨ **+${r2.stardustAwarded} Stardust**!`;
  }

  // Bagikan hadiah Juara 3 (jika ada)
  if (sortedScores.length >= 3 && rank3Stardust > 0) {
    const r3User = sortedScores[2][1];
    const r3UserId = sortedScores[2][0];
    const r3 = awardQuizGachaRewards(guildId, r3UserId, r3User.name, 0, rank3Stardust);
    rewardText += `\n🎁 **Hadiah Juara 3 (${r3User.name}):** ✨ **+${r3.stardustAwarded} Stardust**!`;
  }

  if (rewardSummaryNotes.length > 0) {
    rewardText += `\n\n${rewardSummaryNotes.join('\n')}`;
  }

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
    .setTitle(`Pemenang: ${winner.name}`)
    .setDescription(
      `Skor tertinggi **${winner.score} Poin** dengan total **${winner.correctCount} jawaban benar**.\n\n` +
      `**Papan Peringkat Akhir:**\n${scoreBoard}` +
      rewardText
    )
    .setFooter({ text: 'Gunakan /musicquiz leaderboard untuk melihat klasemen server' })
    .setTimestamp();

  await textChannel.send({ embeds: [finalEmbed] }).catch(() => {});
}
