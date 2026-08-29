const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const storage = require('../utils/storage');

/**
 * Loot Table & Drop Rates
 */
const GACHA_ITEMS = [
  // 🟡 LEGENDARY (5%)
  {
    tier: 'LEGENDARY',
    rate: 5,
    emoji: '🟡',
    color: '#FEE75C',
    name: '👑 Mahkota Sultan Mpruy',
    badge: '👑 Sultan Mpruy',
    title: 'Dewa Keberuntungan',
    desc: 'Kamu mendapatkan status legenda dan gelar tertinggi di jagat Discord!'
  },
  {
    tier: 'LEGENDARY',
    rate: 5,
    emoji: '🟡',
    color: '#FEE75C',
    name: '🌟 Golden Star of Destiny',
    badge: '🌟 Bintang Takdir',
    title: 'Anak Emas Semesta',
    desc: 'Semesta tersenyum padamu! Hoki 1000 tahun telah terpakai!'
  },

  // 🟣 EPIC (15%)
  {
    tier: 'EPIC',
    rate: 15,
    emoji: '🟣',
    color: '#9B59B6',
    name: '🔮 Kristal Aura Ungu',
    badge: '🔮 Gacha Lord',
    title: 'Si Paling Gacor',
    desc: 'Aura mistis menyelimutimu. Tingkat kehokianmu di atas rata-rata!'
  },
  {
    tier: 'EPIC',
    rate: 15,
    emoji: '🟣',
    color: '#9B59B6',
    name: '🛡️ Tameng Pejuang Malam',
    badge: '🛡️ Guardian Angel',
    title: 'Penjaga Tongkrongan',
    desc: 'Simbol ketangguhan begadang di voice channel sampai subuh.'
  },

  // 🔵 RARE (30%)
  {
    tier: 'RARE',
    rate: 30,
    emoji: '🔵',
    color: '#3498DB',
    name: '🍀 Semanggi Daun Empat',
    badge: '🍀 Lucky Explorer',
    title: 'Pencari Berkah',
    desc: 'Jimat keberuntungan untuk menghadapi hari-hari penuh tugas.'
  },
  {
    tier: 'RARE',
    rate: 30,
    emoji: '🔵',
    color: '#3498DB',
    name: '☕ Kopi Gula Aren Abadi',
    badge: '☕ Kafein Booster',
    title: 'Pecinta Begadang',
    desc: 'Secangkir kopi yang tak pernah dingin untuk menemanimu ngobrol.'
  },
  {
    tier: 'RARE',
    rate: 30,
    emoji: '🔵',
    color: '#3498DB',
    name: '🎮 Stik Konsol Emas',
    badge: '🎮 Pro Gamer',
    title: 'Carry Tongkrongan',
    desc: 'Simbol pemain paling jago di server (atau paling sering beban).'
  },

  // ⚪ COMMON (50%)
  {
    tier: 'COMMON',
    rate: 50,
    emoji: '⚪',
    color: '#95A5A6',
    name: '🦴 Tulang Kucing Zonk',
    badge: null,
    title: null,
    desc: 'Hanya tulang sisa makan siang kemarin. Jangan menyerah, coba lagi besok! 😂'
  },
  {
    tier: 'COMMON',
    rate: 50,
    emoji: '⚪',
    color: '#95A5A6',
    name: '🧦 Kaos Kaki Bolong',
    badge: null,
    title: null,
    desc: 'Wangi-wangi nostalgia. Lumayan buat lap meja server.'
  },
  {
    tier: 'COMMON',
    rate: 50,
    emoji: '⚪',
    color: '#95A5A6',
    name: '🧻 Tisu Basah Bekas',
    badge: null,
    title: null,
    desc: 'Keringat perjuangan gacha hari ini telah terhapus.'
  },
  {
    tier: 'COMMON',
    rate: 50,
    emoji: '⚪',
    color: '#95A5A6',
    name: '🍌 Kulit Pisang Licin',
    badge: null,
    title: null,
    desc: 'Hati-hati terpeleset ke pelukan mantan.'
  }
];

const COOLDOWN_HOURS = 12; // Cooldown 12 jam per gacha pull

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
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;

    const gachaData = storage.read('gacha_data');
    if (!gachaData[guildId]) gachaData[guildId] = {};
    if (!gachaData[guildId][userId]) {
      gachaData[guildId][userId] = {
        pulls: 0,
        lastPull: 0,
        inventory: [], // array of item names
        badges: [],
        titles: []
      };
    }

    const userData = gachaData[guildId][userId];

    // === 1. GACHA INVENTORY ===
    if (sub === 'inventory') {
      const targetUser = interaction.options.getUser('user') || interaction.user;
      const targetData = gachaData[guildId][targetUser.id] || { pulls: 0, inventory: [], badges: [], titles: [] };

      const badgesText = targetData.badges.length > 0
        ? targetData.badges.map(b => `🎖️ **${b}**`).join('\n')
        : '_Belum memiliki badge gacha_';

      const titlesText = targetData.titles.length > 0
        ? targetData.titles.map(t => `🏷️ **"${t}"**`).join('\n')
        : '_Belum memiliki title_';

      const embed = new EmbedBuilder()
        .setColor('#9B59B6')
        .setTitle(`🎒 Inventaris Gacha — ${targetUser.username}`)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: '🎰 Total Pulls', value: `**${targetData.pulls} Kali**`, inline: true },
          { name: '📦 Total Item Unik', value: `**${targetData.inventory.length} Item**`, inline: true },
          { name: '🎖️ Badges Terbuka', value: badgesText, inline: false },
          { name: '🏷️ Titles Koleksi', value: titlesText, inline: false }
        )
        .setFooter({ text: 'Gunakan /gacha pull untuk membuka kotak keberuntungan!' })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    // === 2. GACHA PULL ===
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

      await interaction.reply('🎁 **Membuka Peti Misteri...** 🌟✨');

      // Animasi simulasi delay singkat
      await new Promise(r => setTimeout(r, 1500));

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

      const embed = new EmbedBuilder()
        .setColor(item.color)
        .setTitle(`${item.emoji} GACHA REWARD: [${item.tier}]`)
        .setDescription(
          `Selamat **${interaction.member.displayName}**!\nKamu mendapatkan:\n\n` +
          `✨ **${item.name}**\n` +
          `> *${item.desc}*\n\n` +
          (item.badge ? `🎖️ **Badge Didapat:** \`${item.badge}\`\n` : '') +
          (item.title ? `🏷️ **Title Terbuka:** \`"${item.title}"\`\n` : '')
        )
        .addFields({
          name: '📊 Info Pull',
          value: `Tingkat Kelangkaan: **${item.tier}** • Pull ke: **#${userData.pulls}**`,
          inline: false
        })
        .setFooter({ text: `Cooldown ${COOLDOWN_HOURS} jam • Cek koleksi dengan /gacha inventory` })
        .setTimestamp();

      return interaction.editReply({ content: null, embeds: [embed] });
    }
  }
};
