const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

// Format tanggal ke bahasa Indonesia dengan relative time
function formatDate(date) {
  const MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const d = date.getDate();
  const m = MONTHS[date.getMonth()];
  const y = date.getFullYear();

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

  return `**${d} ${m} ${y}**\n*(${agoStr})*`;
}

// Format Discord anniversary berikutnya
function formatNextAnniversary(createdAt) {
  const MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const now = new Date();
  const wibNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);

  const day = createdAt.getDate();
  const month = createdAt.getMonth() + 1;
  const createYear = createdAt.getFullYear();

  let nextAnniversary = new Date(wibNow.getUTCFullYear(), month - 1, day);
  let currentAge = wibNow.getUTCFullYear() - createYear;

  if (nextAnniversary < wibNow) {
    nextAnniversary.setFullYear(nextAnniversary.getFullYear() + 1);
  } else {
    currentAge = Math.max(0, currentAge - 1);
  }

  const nextAge = currentAge + 1;
  const daysLeft = Math.ceil((nextAnniversary - wibNow) / (1000 * 60 * 60 * 24));

  if (daysLeft === 0) {
    return `🎉 **HARI INI!** (Ke-${nextAge} Tahun!)`;
  }
  return `**${day} ${MONTHS[month - 1]}** — dalam **${daysLeft} hari** (Ke-${nextAge} Tahun)`;
}

// Emoji untuk status presence
function getStatusEmoji(status) {
  const statusMap = {
    online: '🟢 Online',
    idle: '🌙 Idle',
    dnd: '🔴 Do Not Disturb',
    offline: '⚫ Offline',
    invisible: '⚫ Offline',
  };
  return statusMap[status] ?? '⚫ Offline';
}

// Format activity dengan emoji yang sesuai
function formatActivities(activities) {
  if (!activities || activities.length === 0) return null;

  return activities.map(act => {
    switch (act.type) {
      case 0: return `🎮 **Bermain:** ${act.name}`;                                    // Playing
      case 1: return `📺 **Streaming:** ${act.name}`;                                   // Streaming
      case 2: return `🎵 **Mendengarkan:** ${act.name}${act.details ? ` — ${act.details}` : ''}`; // Listening
      case 3: return `📺 **Menonton:** ${act.name}`;                                    // Watching
      case 4: return act.state ? `💬 *${act.state}*` : null;                           // Custom Status
      case 5: return `🏆 **Berkompetisi:** ${act.name}`;                               // Competing
      default: return `🔵 ${act.name}`;
    }
  }).filter(Boolean).join('\n');
}

const userinfo = {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Tampilkan informasi detail seorang member')
    .addUserOption(opt =>
      opt
        .setName('user')
        .setDescription('Member yang ingin dilihat (kosongkan untuk diri sendiri)')
        .setRequired(false)
    ),

  async execute(interaction, client) {
    await interaction.deferReply();

    // Target user (bisa mention atau diri sendiri)
    const targetUser = interaction.options.getUser('user') ?? interaction.user;
    const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (!targetMember) {
      return interaction.editReply({ content: '❌ Member tersebut tidak ditemukan di server ini.' });
    }

    // Avatar (pakai server avatar kalau ada, fallback ke global)
    const avatarURL = targetMember.displayAvatarURL({ dynamic: true, size: 256 })
      ?? targetUser.displayAvatarURL({ dynamic: true, size: 256 });

    // Warna embed dari role tertinggi (kalau ada warnanya)
    const highestRole = targetMember.roles.highest;
    const embedColor = highestRole?.color && highestRole.color !== 0
      ? highestRole.color
      : 0x57F287; // Hijau default

    // Status & aktivitas
    const presence = targetMember.presence;
    const statusText = getStatusEmoji(presence?.status ?? 'offline');
    const activityText = formatActivities(presence?.activities);

    // Roles (kecuali @everyone, urutkan dari tertinggi)
    const roles = targetMember.roles.cache
      .filter(r => r.id !== interaction.guild.id) // Hapus @everyone
      .sort((a, b) => b.position - a.position)
      .map(r => `<@&${r.id}>`)
      .slice(0, 20); // Maks 20 role ditampilkan

    const rolesText = roles.length > 0
      ? roles.join(' ')
      : '*Tidak punya role*';

    // Cek apakah owner server
    const isOwner = interaction.guild.ownerId === targetUser.id;
    // Cek apakah boosting
    const isBoosting = !!targetMember.premiumSince;
    // Cek apakah punya permission admin
    const isAdmin = targetMember.permissions.has('Administrator');
    const isMod = targetMember.permissions.has('ModerateMembers');

    // Badge / label khusus
    const badges = [];
    if (isOwner) badges.push('👑 Owner');
    if (isAdmin) badges.push('🛡️ Admin');
    else if (isMod) badges.push('⚒️ Moderator');
    if (targetUser.bot) badges.push('🤖 Bot');
    if (isBoosting) badges.push(`🚀 Booster sejak <t:${Math.floor(targetMember.premiumSinceTimestamp / 1000)}:R>`);

    // Discord anniversary berikutnya
    const nextAnniversary = formatNextAnniversary(targetUser.createdAt);

    // Build embed
    const embed = new EmbedBuilder()
      .setColor(embedColor)
      .setAuthor({
        name: `${targetUser.bot ? '🤖 Bot' : '👤 Member'} — ${targetMember.displayName}`,
        iconURL: avatarURL,
      })
      .setTitle(`${targetUser.username}`)
      .setThumbnail(avatarURL)
      .addFields(
        // Row 1 — Identitas
        {
          name: '🏷️ Display Name',
          value: `**${targetMember.displayName}**`,
          inline: true,
        },
        {
          name: '🆔 Username',
          value: `**${targetUser.username}**`,
          inline: true,
        },
        {
          name: '🎮 Status',
          value: statusText,
          inline: true,
        },

        // Row 2 — Tanggal penting
        {
          name: '📅 Akun Dibuat',
          value: formatDate(targetUser.createdAt),
          inline: true,
        },
        {
          name: '📥 Bergabung Server',
          value: targetMember.joinedAt ? formatDate(targetMember.joinedAt) : '*Tidak diketahui*',
          inline: true,
        },
        {
          name: '🎂 Discord Anniversary',
          value: nextAnniversary,
          inline: true,
        },

        // Row 3 — Aktivitas
        ...(activityText
          ? [{ name: '💼 Aktivitas', value: activityText, inline: false }]
          : []),

        // Row 4 — Badge & Label khusus
        ...(badges.length > 0
          ? [{ name: '✨ Badge', value: badges.join(' • '), inline: false }]
          : []),

        // Row 5 — Roles
        {
          name: `🎭 Roles [${roles.length}]`,
          value: rolesText.length > 1024 ? rolesText.slice(0, 1020) + '...' : rolesText,
          inline: false,
        },
      )
      .setFooter({
        text: `User ID: ${targetUser.id} • Diminta oleh ${interaction.user.username}`,
        iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
      })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};

module.exports = userinfo;
