const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const storage = require('../utils/storage');

const MONTH_NAMES = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

function generateCapsuleId() {
  return Date.now().toString(36).slice(-4) + Math.random().toString(36).substring(2, 6);
}

function formatDateWIB(dateObj) {
  const wib = new Date(dateObj.getTime() + 7 * 60 * 60 * 1000);
  const day = wib.getUTCDate();
  const month = wib.getUTCMonth() + 1;
  const year = wib.getUTCFullYear();
  const hour = String(wib.getUTCHours()).padStart(2, '0');
  const minute = String(wib.getUTCMinutes()).padStart(2, '0');
  return `${day} ${MONTH_NAMES[month]} ${year}, ${hour}:${minute} WIB`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('timecapsule')
    .setDescription('Simpan pesan kapsul waktu untuk dirimu di masa depan')
    .addSubcommand(sub =>
      sub
        .setName('send')
        .setDescription('Kirim pesan kapsul waktu ke masa depan')
        .addStringOption(opt =>
          opt.setName('pesan')
            .setDescription('Pesan yang ingin kamu kirim ke dirimu di masa depan')
            .setRequired(true)
            .setMaxLength(1000)
        )
        .addStringOption(opt =>
          opt.setName('tanggal')
            .setDescription('Tanggal buka kapsul (DD-MM-YYYY), contoh: 31-12-2026')
            .setRequired(true)
        )
        .addIntegerOption(opt =>
          opt.setName('jam')
            .setDescription('Jam buka kapsul (WIB 0-23, default: 09:00)')
            .setRequired(false)
            .setMinValue(0)
            .setMaxValue(23)
        )
        .addStringOption(opt =>
          opt.setName('tujuan')
            .setDescription('Metode pengiriman saat kapsul terbuka')
            .setRequired(false)
            .addChoices(
              { name: '📩 Direct Message (DM Pribadi)', value: 'dm' },
              { name: '📍 Channel Ini (Mention Publik)', value: 'channel' }
            )
        )
    )
    .addSubcommand(sub =>
      sub.setName('list').setDescription('Lihat daftar kapsul waktu aktif milikmu')
    )
    .addSubcommand(sub =>
      sub
        .setName('cancel')
        .setDescription('Batalkan kapsul waktu sebelum dibuka')
        .addStringOption(opt =>
          opt.setName('id').setDescription('ID Kapsul Waktu').setRequired(true)
        )
    ),

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;

    const capsulesData = storage.read('timecapsules');
    if (!capsulesData[guildId]) capsulesData[guildId] = [];

    // === 1. SEND TIME CAPSULE ===
    if (sub === 'send') {
      const message = interaction.options.getString('pesan');
      const tanggalRaw = interaction.options.getString('tanggal');
      const jam = interaction.options.getInteger('jam') ?? 9;
      const targetMode = interaction.options.getString('tujuan') || 'dm';

      // Parse tanggal DD-MM-YYYY
      const parts = tanggalRaw.split(/[-/.\s]+/);
      if (parts.length < 3) {
        return interaction.reply({
          content: '❌ Format tanggal salah! Gunakan format **DD-MM-YYYY**, contoh: `31-12-2026`',
          flags: MessageFlags.Ephemeral
        });
      }

      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const year = parseInt(parts[2], 10);

      if (!day || !month || !year || day < 1 || day > 31 || month < 1 || month > 12 || year < 2024) {
        return interaction.reply({
          content: '❌ Tanggal tidak valid! Pastikan format **DD-MM-YYYY** benar.',
          flags: MessageFlags.Ephemeral
        });
      }

      // Konversi ke UTC timestamp (input WIB = UTC+7)
      const targetDateWIB = new Date(year, month - 1, day, jam, 0, 0);
      const targetTimestamp = targetDateWIB.getTime() - (7 * 60 * 60 * 1000);

      if (targetTimestamp <= Date.now()) {
        return interaction.reply({
          content: '❌ Waktu pembukaan kapsul harus berada di masa depan!',
          flags: MessageFlags.Ephemeral
        });
      }

      const capsuleId = generateCapsuleId();
      const newCapsule = {
        id: capsuleId,
        userId,
        userName: interaction.member.displayName,
        channelId: interaction.channel.id,
        message,
        targetTimestamp,
        targetMode,
        createdAt: Date.now(),
        opened: false
      };

      capsulesData[guildId].push(newCapsule);
      storage.write('timecapsules', capsulesData);

      const openDateFormatted = formatDateWIB(new Date(targetTimestamp));

      const embed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setAuthor({
          name: `TIME CAPSULE — ${interaction.guild.name.toUpperCase()}`,
          iconURL: interaction.guild.iconURL({ dynamic: true }) || undefined
        })
        .setTitle('Kapsul Waktu Berhasil Disimpan & Dikunci')
        .setDescription(
          `Surat masa depanmu telah disegel dan dijadwalkan untuk dibuka pada:\n` +
          `• **Tanggal Buka:** \`${openDateFormatted}\`\n` +
          `• **Metode Pengiriman:** ${targetMode === 'dm' ? 'Direct Message (DM Pribadi)' : `Channel <#${interaction.channel.id}>`}\n` +
          `• **ID Kapsul:** \`${capsuleId}\` *(Gunakan untuk membatalkan)*`
        )
        .addFields({
          name: 'Cuplikan Pesan',
          value: `*“${message.length > 80 ? message.substring(0, 77) + '...' : message}”*`
        })
        .setFooter({ text: 'Pesan terkunci rapat hingga tanggal buka tiba' })
        .setTimestamp();

      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    // === 2. LIST TIME CAPSULES ===
    if (sub === 'list') {
      const userCapsules = capsulesData[guildId].filter(c => c.userId === userId && !c.opened);

      if (userCapsules.length === 0) {
        return interaction.reply({
          content: 'Kamu belum memiliki kapsul waktu aktif yang terkunci di server ini. Buat dengan `/timecapsule send`.',
          flags: MessageFlags.Ephemeral
        });
      }

      const list = userCapsules.map((c, i) => {
        const dateStr = formatDateWIB(new Date(c.targetTimestamp));
        const preview = c.message.length > 50 ? c.message.substring(0, 47) + '...' : c.message;
        return `\`${i + 1}.\` **ID: \`${c.id}\`** — Dibuka: \`${dateStr}\` (${c.targetMode.toUpperCase()})\n   └ *"${preview}"*`;
      }).join('\n\n');

      const embed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setAuthor({
          name: `TIME CAPSULE — ${interaction.guild.name.toUpperCase()}`,
          iconURL: interaction.guild.iconURL({ dynamic: true }) || undefined
        })
        .setTitle(`Daftar Kapsul Waktumu (${userCapsules.length} Aktif)`)
        .setDescription(list)
        .setFooter({ text: 'Gunakan /timecapsule cancel [id] untuk membatalkan kapsul' })
        .setTimestamp();

      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    // === 3. CANCEL TIME CAPSULE ===
    if (sub === 'cancel') {
      const targetId = interaction.options.getString('id');
      const idx = capsulesData[guildId].findIndex(c => c.id === targetId && c.userId === userId && !c.opened);

      if (idx === -1) {
        return interaction.reply({
          content: `❌ Kapsul waktu dengan ID \`${targetId}\` tidak ditemukan di daftar kapsul aktif milikmu.`,
          flags: MessageFlags.Ephemeral
        });
      }

      capsulesData[guildId].splice(idx, 1);
      storage.write('timecapsules', capsulesData);

      return interaction.reply({
        content: `🗑️ **Kapsul waktu \`${targetId}\` berhasil dibatalkan dan dihapus.**`,
        flags: MessageFlags.Ephemeral
      });
    }
  }
};
