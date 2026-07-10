const { SlashCommandBuilder, EmbedBuilder, ChannelType } = require('discord.js');

// Label untuk level verifikasi
const VERIFICATION_LABELS = {
  0: '🟢 None — Tidak ada verifikasi',
  1: '🟡 Low — Akun terverifikasi email',
  2: '🟠 Medium — Akun berumur > 5 menit',
  3: '🔴 High — Akun berumur > 10 menit',
  4: '🔴 Highest — Akun berumur > 10 menit + nomor HP',
};

// Label untuk boost level
const BOOST_LABELS = {
  0: 'Belum Boosted',
  1: '🚀 Level 1',
  2: '🚀🚀 Level 2',
  3: '🚀🚀🚀 Level 3',
};

// Format tanggal ke bahasa Indonesia
function formatDate(date) {
  const MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const d = date.getDate();
  const m = MONTHS[date.getMonth()];
  const y = date.getFullYear();

  // Hitung berapa lama yang lalu
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffYears = Math.floor(diffDays / 365);
  const diffMonths = Math.floor(diffDays / 30);

  let agoStr;
  if (diffYears >= 1) {
    agoStr = `${diffYears} tahun lalu`;
  } else if (diffMonths >= 1) {
    agoStr = `${diffMonths} bulan lalu`;
  } else {
    agoStr = `${diffDays} hari lalu`;
  }

  return `${d} ${m} ${y}\n*(${agoStr})*`;
}

const serverinfo = {
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Tampilkan informasi lengkap tentang server ini'),

  async execute(interaction, client) {
    await interaction.deferReply();

    const guild = interaction.guild;

    // Fetch owner dan data lengkap guild
    let owner = null;
    try {
      owner = await guild.fetchOwner();
    } catch { /* skip jika gagal */ }

    // Hitung channel berdasarkan tipe
    const channels = guild.channels.cache;
    const textChannels = channels.filter(c => c.type === ChannelType.GuildText).size;
    const voiceChannels = channels.filter(c => c.type === ChannelType.GuildVoice).size;
    const stageChannels = channels.filter(c => c.type === ChannelType.GuildStageVoice).size;
    const forumChannels = channels.filter(c => c.type === ChannelType.GuildForum).size;
    const categories = channels.filter(c => c.type === ChannelType.GuildCategory).size;
    const threadCount = channels.filter(c =>
      c.type === ChannelType.PublicThread || c.type === ChannelType.PrivateThread
    ).size;

    // Hitung member
    const totalMembers = guild.memberCount;
    const cachedMembers = guild.members.cache;
    const botCount = cachedMembers.filter(m => m.user.bot).size;
    const humanCount = totalMembers - botCount;

    // Hitung online (dari presence cache)
    const onlineCount = cachedMembers.filter(m =>
      m.presence?.status === 'online' || m.presence?.status === 'idle' || m.presence?.status === 'dnd'
    ).size;

    // Emoji & sticker
    const emojiCount = guild.emojis.cache.size;
    const animatedEmoji = guild.emojis.cache.filter(e => e.animated).size;
    const staticEmoji = emojiCount - animatedEmoji;
    const stickerCount = guild.stickers.cache.size;

    // Boost info
    const boostLevel = guild.premiumTier;
    const boostCount = guild.premiumSubscriptionCount ?? 0;
    const boostLabel = BOOST_LABELS[boostLevel] ?? `Level ${boostLevel}`;

    // Role (kecuali @everyone)
    const roleCount = guild.roles.cache.size - 1;

    // Fitur server (features)
    const featureLabels = {
      VERIFIED: '✅ Verified',
      PARTNERED: '🤝 Partnered',
      COMMUNITY: '🏘️ Community',
      DISCOVERABLE: '🔍 Discoverable',
      VANITY_URL: '🔗 Vanity URL',
      ANIMATED_ICON: '🎭 Animated Icon',
      BANNER: '🖼️ Server Banner',
    };
    const activeFeatures = guild.features
      .map(f => featureLabels[f])
      .filter(Boolean);

    // Warna embed dari icon server (kalau ga ada, pakai default biru)
    const embedColor = 0x5865F2;

    // Build embed
    const embed = new EmbedBuilder()
      .setColor(embedColor)
      .setTitle(`🏰 ${guild.name}`)
      .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }) ?? null)
      .setImage(guild.bannerURL({ size: 1024 }) ?? null)
      .addFields(
        // Row 1 — Identitas
        {
          name: '👑 Owner',
          value: owner ? `${owner.user.username}\n(<@${owner.id}>)` : 'Tidak diketahui',
          inline: true,
        },
        {
          name: '📅 Dibuat',
          value: formatDate(guild.createdAt),
          inline: true,
        },
        {
          name: '🌍 Region / Locale',
          value: guild.preferredLocale ?? 'en-US',
          inline: true,
        },

        // Row 2 — Member
        {
          name: '👥 Total Member',
          value: `**${totalMembers.toLocaleString()}** member`,
          inline: true,
        },
        {
          name: '👤 Manusia / 🤖 Bot',
          value: `**${humanCount.toLocaleString()}** / **${botCount}**`,
          inline: true,
        },
        {
          name: '🟢 Online (cached)',
          value: onlineCount > 0 ? `**~${onlineCount}** online` : '*Tidak tersedia*',
          inline: true,
        },

        // Row 3 — Channel
        {
          name: '💬 Text Channel',
          value: `**${textChannels}**`,
          inline: true,
        },
        {
          name: '🔊 Voice Channel',
          value: `**${voiceChannels}**${stageChannels > 0 ? ` + **${stageChannels}** stage` : ''}`,
          inline: true,
        },
        {
          name: '📁 Kategori',
          value: `**${categories}**${threadCount > 0 ? ` + **${threadCount}** thread` : ''}${forumChannels > 0 ? ` + **${forumChannels}** forum` : ''}`,
          inline: true,
        },

        // Row 4 — Server Stats
        {
          name: '🎭 Role',
          value: `**${roleCount}** role`,
          inline: true,
        },
        {
          name: '😄 Emoji',
          value: `**${emojiCount}** total\n(${staticEmoji} biasa, ${animatedEmoji} animated)${stickerCount > 0 ? `\n🖼️ **${stickerCount}** sticker` : ''}`,
          inline: true,
        },
        {
          name: '🔒 Verifikasi',
          value: VERIFICATION_LABELS[guild.verificationLevel] ?? 'Unknown',
          inline: true,
        },

        // Row 5 — Boost
        {
          name: '🚀 Nitro Boost',
          value: `${boostLabel}\n**${boostCount}** boost aktif`,
          inline: true,
        },
        ...(activeFeatures.length > 0
          ? [{
              name: '⭐ Fitur Server',
              value: activeFeatures.join(' • '),
              inline: false,
            }]
          : []),
      )
      .setFooter({
        text: `Server ID: ${guild.id} • Diminta oleh ${interaction.user.username}`,
        iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
      })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};

module.exports = serverinfo;
