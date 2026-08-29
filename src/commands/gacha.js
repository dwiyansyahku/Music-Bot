const { SlashCommandBuilder, EmbedBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const storage = require('../utils/storage');
const { isOwnerOrMod } = require('../utils/helpers');

/**
 * Loot Table & Drop Rates (Clean & Aesthetic)
 */
const GACHA_ITEMS = [
  // 🟡 LEGENDARY (5%)
  {
    tier: 'LEGENDARY',
    rate: 5,
    tag: '✧',
    color: 0xFEE75C,
    name: 'Crown of Destiny',
    badge: '✦ Sultan Mpruy',
    title: 'Sovereign of Luck',
    desc: 'Kamu mendapatkan status legenda dan gelar kehormatan tertinggi!'
  },
  {
    tier: 'LEGENDARY',
    rate: 5,
    tag: '✧',
    color: 0xFEE75C,
    name: 'Celestial Star relic',
    badge: '✦ Bintang Takdir',
    title: 'Chosen by Cosmos',
    desc: 'Semesta tersenyum padamu! Hoki 1000 tahun telah terpakai!'
  },

  // 🟣 EPIC (15%)
  {
    tier: 'EPIC',
    rate: 15,
    tag: '◈',
    color: 0x9B59B6,
    name: 'Amethyst Crystal Orb',
    badge: '◈ Gacha Lord',
    title: 'Aura of Fortune',
    desc: 'Aura mistis menyelimutimu. Tingkat keberuntunganmu di atas rata-rata!'
  },
  {
    tier: 'EPIC',
    rate: 15,
    tag: '◈',
    color: 0x9B59B6,
    name: 'Midnight Guardian Shield',
    badge: '◈ Guardian Angel',
    title: 'Night Watcher',
    desc: 'Simbol ketangguhan begadang di voice channel sampai subuh.'
  },

  // 🔵 RARE (30%)
  {
    tier: 'RARE',
    rate: 30,
    tag: '◇',
    color: 0x3498DB,
    name: 'Four-Leaf Clover Token',
    badge: '◇ Lucky Explorer',
    title: 'Blessed Soul',
    desc: 'Jimat keberuntungan untuk menghadapi hari-hari penuh tugas.'
  },
  {
    tier: 'RARE',
    rate: 30,
    tag: '◇',
    color: 0x3498DB,
    name: 'Eternal Espresso Cup',
    badge: '◇ Kafein Booster',
    title: 'Coffee Aficionado',
    desc: 'Secangkir kopi yang tak pernah dingin untuk menemanimu ngobrol.'
  },
  {
    tier: 'RARE',
    rate: 30,
    tag: '◇',
    color: 0x3498DB,
    name: 'Golden Gamepad Artifact',
    badge: '◇ Pro Gamer',
    title: 'Squad MVP',
    desc: 'Simbol pemain paling andal di server.'
  },

  // ⚪ COMMON (50%)
  {
    tier: 'COMMON',
    rate: 50,
    tag: '•',
    color: 0x95A5A6,
    name: 'Mysterious Fish Bone',
    badge: null,
    title: null,
    desc: 'Hanya tulang sisa makan siang. Jangan menyerah, coba lagi besok!'
  },
  {
    tier: 'COMMON',
    rate: 50,
    tag: '•',
    color: 0x95A5A6,
    name: 'Vintage Cozy Sock',
    badge: null,
    title: null,
    desc: 'Wangi-wangi nostalgia. Lumayan untuk menghangatkan malam.'
  },
  {
    tier: 'COMMON',
    rate: 50,
    tag: '•',
    color: 0x95A5A6,
    name: 'Lucky Fortune Paper',
    badge: null,
    title: null,
    desc: 'Sebuah catatan kecil bertuliskan: "Hari esok akan lebih cerah!"'
  }
];

const COOLDOWN_HOURS = 12;

function rollGacha() {
  const rand = Math.random() * 100;
  let targetTier = 'COMMON';

  if (rand < 5) targetTier = 'LEGENDARY';       // 5%
  else if (rand < 20) targetTier = 'EPIC';      // 15%
  else if (rand < 50) targetTier = 'RARE';      // 30%
  else targetTier = 'COMMON';                   // 50%

  const candidates = GACHA_ITEMS.filter(item => item.tier === targetTier);
  return candidates[Math.floor(Math.random() * candidates.length)];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('gacha')
    .setDescription('Buka Kotak Misteri Gacha Harian & cek koleksi itemmu')
    .addSubcommand(sub =>
      sub.setName('pull').setDescription('Buka 1 Kotak Misteri Gacha!')
    )
    .addSubcommand(sub =>
      sub
        .setName('inventory')
        .setDescription('Lihat inventaris item, title, dan badge hasil gacha')
        .addUserOption(opt =>
          opt.setName('user').setDescription('User yang ingin dilihat inventarisnya').setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('setrole')
        .setDescription('Atur Role Discord hadiah untuk tingkat kelangkaan tertentu (Admin Only)')
        .addStringOption(opt =>
          opt
            .setName('tier')
            .setDescription('Tingkat kelangkaan Gacha')
            .setRequired(true)
            .addChoices(
              { name: '🟡 LEGENDARY', value: 'LEGENDARY' },
              { name: '🟣 EPIC', value: 'EPIC' },
              { name: '🔵 RARE', value: 'RARE' }
            )
        )
        .addRoleOption(opt =>
          opt.setName('role').setDescription('Role yang akan otomatis diberikan').setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('listroles')
        .setDescription('Lihat daftar Role hadiah yang terpasang di Gacha')
    ),

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;

    const settingsData = storage.read('settings');
    if (!settingsData[guildId]) settingsData[guildId] = {};
    if (!settingsData[guildId].gachaRoles) settingsData[guildId].gachaRoles = {};

    // === SUBCOMMAND: SETROLE (Admin Only) ===
    if (sub === 'setrole') {
      const isAuthorized = await isOwnerOrMod(interaction, client);
      if (!isAuthorized) {
        return interaction.reply({
          content: '❌ Perintah ini hanya bisa digunakan oleh **Owner Bot** atau **Moderator/Admin**.',
          flags: MessageFlags.Ephemeral
        });
      }

      const tier = interaction.options.getString('tier');
      const role = interaction.options.getRole('role');

      settingsData[guildId].gachaRoles[tier] = role.id;
      storage.write('settings', settingsData);

      return interaction.reply({
        content: `✅ **Berhasil Mengatur Hadiah Role!**\nMember yang mendapatkan hadiah tier **${tier}** akan otomatis menerima role **${role.name}** (<@&${role.id}>).`,
        flags: MessageFlags.Ephemeral
      });
    }

    // === SUBCOMMAND: LISTROLES ===
    if (sub === 'listroles') {
      const gachaRoles = settingsData[guildId].gachaRoles || {};
      const legRole = gachaRoles.LEGENDARY ? `<@&${gachaRoles.LEGENDARY}>` : '_Belum diatur_';
      const epicRole = gachaRoles.EPIC ? `<@&${gachaRoles.EPIC}>` : '_Belum diatur_';
      const rareRole = gachaRoles.RARE ? `<@&${gachaRoles.RARE}>` : '_Belum diatur_';

      const embed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setTitle('🎁 Daftar Role Hadiah Gacha')
        .setDescription('Daftar role yang otomatis diperoleh jika memenangkan tier gacha:')
        .addFields(
          { name: '🟡 Tier LEGENDARY', value: legRole, inline: false },
          { name: '🟣 Tier EPIC', value: epicRole, inline: false },
          { name: '🔵 Tier RARE', value: rareRole, inline: false }
        )
        .setFooter({ text: 'Gunakan /gacha setrole untuk mengatur role baru' });

      return interaction.reply({ embeds: [embed] });
    }

    // === DATA GACHA USER ===
    const gachaData = storage.read('gacha_data');
    if (!gachaData[guildId]) gachaData[guildId] = {};
    if (!gachaData[guildId][userId]) {
      gachaData[guildId][userId] = {
        pulls: 0,
        lastPull: 0,
        inventory: [],
        badges: [],
        titles: []
      };
    }

    const userData = gachaData[guildId][userId];

    // === SUBCOMMAND: INVENTORY ===
    if (sub === 'inventory') {
      const targetUser = interaction.options.getUser('user') || interaction.user;
      const targetData = gachaData[guildId][targetUser.id] || { pulls: 0, inventory: [], badges: [], titles: [] };

      const badgesText = targetData.badges.length > 0
        ? targetData.badges.map(b => `\`${b}\``).join('  ')
        : '_Belum memiliki badge gacha_';

      const titlesText = targetData.titles.length > 0
        ? targetData.titles.map(t => `\`"${t}"\``).join('  ')
        : '_Belum memiliki title_';

      const itemsText = targetData.inventory.length > 0
        ? targetData.inventory.map(item => `• ${item}`).join('\n')
        : '_Belum ada item yang dikoleksi_';

      const embed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setAuthor({
          name: `INVENTORY — ${targetUser.username.toUpperCase()}`,
          iconURL: targetUser.displayAvatarURL({ dynamic: true })
        })
        .addFields(
          { name: 'Total Pulls', value: `**${targetData.pulls}x**`, inline: true },
          { name: 'Koleksi Item', value: `**${targetData.inventory.length} Item**`, inline: true },
          { name: 'Titles & Badges', value: `${badgesText}\n${titlesText}`, inline: false },
          { name: 'Daftar Relik', value: itemsText, inline: false }
        )
        .setFooter({ text: 'Gunakan /gacha pull setiap 12 jam untuk membuka peti misteri' })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    // === SUBCOMMAND: PULL ===
    if (sub === 'pull') {
      const now = Date.now();
      const timeSinceLast = now - userData.lastPull;
      const cooldownMs = COOLDOWN_HOURS * 60 * 60 * 1000;

      if (timeSinceLast < cooldownMs) {
        const remainingMs = cooldownMs - timeSinceLast;
        const remHours = Math.floor(remainingMs / (1000 * 60 * 60));
        const remMins = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));

        return interaction.reply({
          content: `⏳ **Kamu sedang dalam masa istirahat gacha!**\nSilakan coba lagi dalam **${remHours} jam ${remMins} menit**.`,
          flags: MessageFlags.Ephemeral
        });
      }

      await interaction.reply('✦ **Membuka Peti Misteri...** ✧');

      // Animasi delay singkat
      await new Promise(r => setTimeout(r, 1200));

      const item = rollGacha();
      userData.pulls++;
      userData.lastPull = now;

      if (!userData.inventory.includes(item.name)) {
        userData.inventory.push(item.name);
      }
      if (item.badge && !userData.badges.includes(item.badge)) {
        userData.badges.push(item.badge);
      }
      if (item.title && !userData.titles.includes(item.title)) {
        userData.titles.push(item.title);
      }

      storage.write('gacha_data', gachaData);

      // Auto-assign Discord Role jika tier ini dipasangkan role
      let roleGivenText = '';
      const configuredRoleId = settingsData[guildId]?.gachaRoles?.[item.tier];
      if (configuredRoleId && interaction.member?.guild) {
        try {
          const roleObj = interaction.guild.roles.cache.get(configuredRoleId);
          if (roleObj && !interaction.member.roles.cache.has(configuredRoleId)) {
            await interaction.member.roles.add(configuredRoleId);
            roleGivenText = `\n🎭 **Role Server Didapat:** <@&${configuredRoleId}>!`;
          }
        } catch (roleErr) {
          console.error('[Gacha Role Add Error]:', roleErr.message);
        }
      }

      const embed = new EmbedBuilder()
        .setColor(item.color)
        .setAuthor({
          name: `REWARD UNLOCKED — [${item.tier}]`,
          iconURL: interaction.user.displayAvatarURL({ dynamic: true })
        })
        .setTitle(`${item.tag} ${item.name}`)
        .setDescription(
          `Selamat **${interaction.member.displayName}**!\n` +
          `*${item.desc}*\n\n` +
          (item.badge ? `✦ **Badge:** \`${item.badge}\`\n` : '') +
          (item.title ? `◈ **Title:** \`"${item.title}"\`\n` : '') +
          roleGivenText
        )
        .addFields({
          name: 'Tingkat Kelangkaan',
          value: `Tier **${item.tier}** • Pull ke: **#${userData.pulls}**`,
          inline: false
        })
        .setFooter({ text: `Cooldown ${COOLDOWN_HOURS} jam • Cek koleksi dengan /gacha inventory` })
        .setTimestamp();

      return interaction.editReply({ content: null, embeds: [embed] });
    }
  }
};
