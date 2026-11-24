const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  AttachmentBuilder,
  ChannelType
} = require('discord.js');
const {
  createInvite,
  getStreak,
  getUserStreaks,
  getAllStreaks,
  endStreak,
  reviveStreak,
  getMonthlyRevives,
  getPairKey,
  getTimezoneInfo,
  buildStreakLeaderboardEmbed,
  updateLiveStreakLeaderboard,
  STREAK_LEADERBOARD_CHANNEL_ID
} = require('../utils/streakHelper');
const { generateStreakBanner, getStreakTier } = require('../utils/streakCanvas');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('streak')
    .setDescription('Sistem Streak Api Pasangan (TikTok Flame Streak)')
    .addSubcommand(sub =>
      sub
        .setName('ajak')
        .setDescription('Ajak teman atau pasangan untuk memulai streak harian bersama')
        .addUserOption(opt =>
          opt
            .setName('partner')
            .setDescription('Pilih partner streak kamu')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('status')
        .setDescription('Lihat status kartu streak kamu saat ini')
        .addUserOption(opt =>
          opt
            .setName('partner')
            .setDescription('Pilih partner streak tertentu (opsional)')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('pulihkan')
        .setDescription('Pulihkan streak yang padam ke angka semula menggunakan kuota 5x bulanan')
        .addUserOption(opt =>
          opt
            .setName('partner')
            .setDescription('Partner streak yang ingin dipulihkan (opsional jika hanya 1)')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('leaderboard')
        .setDescription('Peringkat streak terpanjang di server ini')
    )
    .addSubcommand(sub =>
      sub
        .setName('putus')
        .setDescription('Akhiri koneksi streak dengan partner')
        .addUserOption(opt =>
          opt
            .setName('partner')
            .setDescription('Partner streak yang ingin diakhiri')
            .setRequired(true)
        )
    ),

  async execute(interaction, client) {
    const subcommand = interaction.options.getSubcommand();
    const inviter = interaction.user;
    const guildId = interaction.guild.id;

    // ==========================================
    // 1. SUBCOMMAND: AJAK (OTOMATIS WIB)
    // ==========================================
    if (subcommand === 'ajak') {
      const isVoiceChannel = interaction.channel?.isVoiceBased?.() ||
        interaction.channel?.type === ChannelType?.GuildVoice ||
        interaction.channel?.type === ChannelType?.GuildStageVoice ||
        interaction.channel?.type === 2 ||
        interaction.channel?.type === 13;

      if (isVoiceChannel) {
        return interaction.reply({
          content: '❌ Ajakan streak tidak diperbolehkan di chat voice channel. Silakan gunakan channel teks biasa agar server tetap ramai!',
          flags: MessageFlags.Ephemeral
        });
      }

      const targetUser = interaction.options.getUser('partner');

      if (targetUser.id === inviter.id) {
        return interaction.reply({
          content: 'Kamu tidak bisa memulai streak dengan dirimu sendiri.',
          flags: MessageFlags.Ephemeral
        });
      }

      if (targetUser.bot) {
        return interaction.reply({
          content: 'Kamu tidak bisa memulai streak dengan bot.',
          flags: MessageFlags.Ephemeral
        });
      }

      const res = createInvite({
        guildId,
        inviterId: inviter.id,
        targetId: targetUser.id,
        channelId: interaction.channelId
      });

      if (!res.success && res.reason === 'ALREADY_ACTIVE') {
        return interaction.reply({
          content: `Kamu dan <@${targetUser.id}> sudah memiliki koneksi streak aktif (${res.streak.streakCount} hari).`,
          flags: MessageFlags.Ephemeral
        });
      }

      const pairKey = getPairKey(inviter.id, targetUser.id);
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`streak_accept_${pairKey}`)
          .setLabel('Terima Undangan')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`streak_decline_${pairKey}`)
          .setLabel('Tolak')
          .setStyle(ButtonStyle.Secondary)
      );

      const embed = new EmbedBuilder()
        .setColor('#F59E0B')
        .setTitle('✦ Undangan Koneksi Streak')
        .setDescription(
          `<@${inviter.id}> mengundang <@${targetUser.id}> untuk membangun **Flame Streak** harian bersama.\n\n` +
          `> Waktu Reset: **Pukul 00:00 WIB** (Pengingat otomatis pukul **21:00 WIB** / 22:00 WITA / 23:00 WIT)\n` +
          `> Kuota Pemulihan: **5x per bulan** jika streak terlewat/padam\n` +
          `> Reward: Bonus **Stardust & Tiket Gacha** setiap hari!\n\n` +
          `Silakan <@${targetUser.id}> klik tombol di bawah untuk menerima atau menolak.`
        );

      return interaction.reply({
        content: `<@${targetUser.id}>`,
        embeds: [embed],
        components: [row]
      });
    }

    // ==========================================
    // 2. SUBCOMMAND: STATUS
    // ==========================================
    if (subcommand === 'status') {
      await interaction.deferReply();

      const targetPartner = interaction.options.getUser('partner');
      let streak = null;

      if (targetPartner) {
        streak = getStreak(inviter.id, targetPartner.id);
      } else {
        const list = getUserStreaks(inviter.id);
        if (list.length > 0) streak = list[0];
      }

      if (!streak) {
        return interaction.editReply({
          content: targetPartner
            ? `Kamu dan <@${targetPartner.id}> belum memiliki riwayat streak. Gunakan \`/streak ajak\` untuk memulai.`
            : `Kamu belum memiliki streak aktif. Gunakan \`/streak ajak @partner\` untuk memulai.`
        });
      }

      const member1 = await interaction.guild.members.fetch(streak.user1Id).catch(() => null);
      const member2 = await interaction.guild.members.fetch(streak.user2Id).catch(() => null);

      const u1Name = member1?.displayName || member1?.user?.username || 'User 1';
      const u1Tag = member1?.user?.username || 'user1';
      const u1Avatar = member1?.user?.displayAvatarURL({ extension: 'png', size: 128 });

      const u2Name = member2?.displayName || member2?.user?.username || 'User 2';
      const u2Tag = member2?.user?.username || 'user2';
      const u2Avatar = member2?.user?.displayAvatarURL({ extension: 'png', size: 128 });

      const tzInfo = getTimezoneInfo();
      const isLitToday = streak.lastLitDate === tzInfo.todayStr;
      const revivesLeft = getMonthlyRevives(streak, tzInfo.yearMonth);

      const currentDisplayDays = streak.status === 'broken'
        ? (streak.previousStreakCount || 1)
        : (streak.streakCount || 1);

      const bannerBuffer = await generateStreakBanner({
        days: currentDisplayDays,
        user1: { name: u1Name, tag: u1Tag, avatarUrl: u1Avatar, chatCount: streak.user1Chats || 0 },
        user2: { name: u2Name, tag: u2Tag, avatarUrl: u2Avatar, chatCount: streak.user2Chats || 0 },
        totalPairChats: streak.totalPairMessages || 0,
        timezone: 'WIB',
        statusText: streak.status === 'broken'
          ? `PADAM (HARI KE-${streak.previousStreakCount}) • BISA DIPULIHKAN`
          : isLitToday
            ? `HARI INI MENYALA • RESET 00:00 WIB`
            : streak.todayInitiatorId
              ? `MENUNGGU BALASAN PARTNER`
              : `BELUM MENYALA HARI INI`
      });

      const tier = getStreakTier(currentDisplayDays);
      const attachment = new AttachmentBuilder(bannerBuffer, { name: `streak_card.png` });

      const totalChats = (streak.totalPairMessages || 0).toLocaleString('id-ID');

      const statusContent =
        `✦ **Kartu Status Streak**\n` +
        `Pasangan: <@${streak.user1Id}> & <@${streak.user2Id}>\n` +
        `Status Api: **${streak.status === 'broken' ? 'Padam (Dapat Dipulihkan)' : isLitToday ? 'Menyala Hari Ini' : streak.todayInitiatorId ? 'Menunggu Balasan Partner' : 'Belum Menyala Hari Ini'}**\n` +
        `Tingkatan: **${tier.tierLabel} • ${tier.name}** (${currentDisplayDays} Hari)\n` +
        `Rekor Tertinggi: **${streak.highestStreak || currentDisplayDays} Hari**\n` +
        `Total Obrolan: **${totalChats} Pesan di Discord**\n` +
        `Kuota Pemulihan Bulan Ini: **${revivesLeft}/5 Kali**\n` +
        `Waktu Reset: Pukul **00:00 WIB**`;

      return interaction.editReply({
        content: statusContent,
        files: [attachment],
        embeds: []
      });
    }

    // ==========================================
    // 3. SUBCOMMAND: PULIHKAN
    // ==========================================
    if (subcommand === 'pulihkan') {
      await interaction.deferReply();

      const targetPartner = interaction.options.getUser('partner');
      let streak = null;

      if (targetPartner) {
        streak = getStreak(inviter.id, targetPartner.id);
      } else {
        const list = getUserStreaks(inviter.id);
        const brokenStreak = list.find(s => s.status === 'broken');
        streak = brokenStreak || list[0];
      }

      if (!streak) {
        return interaction.editReply({ content: 'Tidak ditemukan streak yang dapat dipulihkan.' });
      }

      if (streak.status === 'active') {
        return interaction.editReply({
          content: `Streak antara <@${streak.user1Id}> dan <@${streak.user2Id}> masih aktif (${streak.streakCount} hari), tidak perlu dipulihkan.`
        });
      }

      const res = await reviveStreak(streak.pairKey, inviter.id, interaction.guild, client);
      if (!res.success) {
        if (res.reason === 'NO_REVIVES_LEFT') {
          return interaction.editReply({
            content: '❌ Kuota pemulihan bulan ini sudah habis (0/5). Kuota akan direset kembali menjadi 5x pada awal bulan depan.'
          });
        }
        return interaction.editReply({ content: 'Gagal memulihkan streak.' });
      }

      const tier = getStreakTier(res.restoredDays);
      const attachment = new AttachmentBuilder(res.bannerBuffer, { name: `streak_restored.png` });

      const restoreContent =
        `✦ **Api Streak Berhasil Dihidupkan Kembali!**\n` +
        `<@${inviter.id}> telah memulihkan streak bersama <@${streak.user1Id === inviter.id ? streak.user2Id : streak.user1Id}>!\n\n` +
        `> Streak Dikembalikan: **Hari ke-${res.restoredDays}**\n` +
        `> Tingkatan: **${tier.tierLabel} • ${tier.name}**\n` +
        `> Sisa Kuota Pemulihan Bulan Ini: **${res.revivesLeft}/5 Kali**\n` +
        `> 🎁 Reward Pemulihan: **+${res.reward.dust} Stardust** & **+${res.reward.tickets} Tiket Gacha** untuk kamu!`;

      return interaction.editReply({
        content: restoreContent,
        files: [attachment],
        embeds: []
      });
    }

    // ==========================================
    // 4. SUBCOMMAND: LEADERBOARD
    // ==========================================
    if (subcommand === 'leaderboard') {
      const embed = buildStreakLeaderboardEmbed(guildId);
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel('Buka Channel Leaderboard Live')
          .setStyle(ButtonStyle.Link)
          .setURL(`https://discord.com/channels/${guildId}/${STREAK_LEADERBOARD_CHANNEL_ID}`)
      );

      // Trigger update di channel khusus di background
      updateLiveStreakLeaderboard(client, guildId).catch(() => {});

      return interaction.reply({
        embeds: [embed],
        components: [row]
      });
    }

    // ==========================================
    // 5. SUBCOMMAND: PUTUS
    // ==========================================
    if (subcommand === 'putus') {
      const targetUser = interaction.options.getUser('partner');
      const pairKey = getPairKey(inviter.id, targetUser.id);
      const streak = getStreak(inviter.id, targetUser.id);

      if (!streak) {
        return interaction.reply({
          content: 'Tidak ditemukan koneksi streak dengan user tersebut.',
          flags: MessageFlags.Ephemeral
        });
      }

      endStreak(pairKey);
      updateLiveStreakLeaderboard(client, guildId).catch(() => {});

      return interaction.reply({
        content: `Koneksi streak antara <@${inviter.id}> dan <@${targetUser.id}> telah diakhiri.`
      });
    }
  }
};
