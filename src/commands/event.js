const {
  SlashCommandBuilder, EmbedBuilder, MessageFlags, ChannelType,
  ActionRowBuilder, ButtonBuilder, ButtonStyle
} = require('discord.js');
const { isOwnerOrMod, replyNoAccessMod } = require('../utils/helpers');
const storage = require('../utils/storage');

const MONTH_NAMES = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

function formatDateTimeWIB(dateObj) {
  const wib = new Date(dateObj.getTime() + 7 * 60 * 60 * 1000);
  const day = wib.getUTCDate();
  const month = wib.getUTCMonth() + 1;
  const year = wib.getUTCFullYear();
  const hour = String(wib.getUTCHours()).padStart(2, '0');
  const minute = String(wib.getUTCMinutes()).padStart(2, '0');
  return `${day} ${MONTH_NAMES[month]} ${year}, ${hour}:${minute} WIB`;
}

function getTimeUntilString(targetTimestamp) {
  const diffMs = targetTimestamp - Date.now();
  if (diffMs <= 0) return 'Sedang berlangsung';

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (days > 0) return `${days} hari ${hours} jam lagi`;
  if (hours > 0) return `${hours} jam ${mins} menit lagi`;
  return `${mins} menit lagi`;
}

function generateEventId() {
  return Date.now().toString(36).slice(-4) + Math.random().toString(36).substring(2, 6);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('event')
    .setDescription('Buat, kelola, dan lihat event/acara server')
    .addSubcommand(sub =>
      sub
        .setName('create')
        .setDescription('Buat event baru di server')
        .addStringOption(opt => opt.setName('nama').setDescription('Nama event / acara').setRequired(true).setMaxLength(100))
        .addStringOption(opt => opt.setName('tanggal').setDescription('Tanggal event (DD-MM-YYYY), contoh: 15-09-2026').setRequired(true))
        .addIntegerOption(opt => opt.setName('jam').setDescription('Jam mulai event (WIB, 0-23)').setRequired(true).setMinValue(0).setMaxValue(23))
        .addIntegerOption(opt => opt.setName('menit').setDescription('Menit mulai event (0-59)').setRequired(false).setMinValue(0).setMaxValue(59))
        .addChannelOption(opt => opt.setName('channel').setDescription('Channel untuk mengumumkan event').addChannelTypes(ChannelType.GuildText).setRequired(false))
        .addStringOption(opt => opt.setName('deskripsi').setDescription('Deskripsi event (opsional)').setRequired(false).setMaxLength(500))
    )
    .addSubcommand(sub =>
      sub.setName('list').setDescription('Lihat daftar event yang akan datang')
    )
    .addSubcommand(sub =>
      sub
        .setName('cancel')
        .setDescription('Batalkan/hapus event (Owner/Mod only)')
        .addStringOption(opt => opt.setName('id').setDescription('ID event yang ingin dihapus').setRequired(true))
    )
    .addSubcommand(sub =>
      sub
        .setName('info')
        .setDescription('Lihat detail event tertentu')
        .addStringOption(opt => opt.setName('id').setDescription('ID event').setRequired(true))
    ),

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    // === CREATE EVENT ===
    if (sub === 'create') {
      const name = interaction.options.getString('nama');
      const tanggalRaw = interaction.options.getString('tanggal');
      const jam = interaction.options.getInteger('jam');
      const menit = interaction.options.getInteger('menit') ?? 0;
      const channel = interaction.options.getChannel('channel') || interaction.channel;
      const deskripsi = interaction.options.getString('deskripsi') || '';

      const parts = tanggalRaw.split(/[-/.\s]+/);
      if (parts.length < 3) {
        return interaction.reply({
          content: 'Format tanggal tidak valid. Gunakan format **DD-MM-YYYY**, contoh: `15-09-2026`.',
          flags: MessageFlags.Ephemeral
        });
      }

      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);
      const year = parseInt(parts[2], 10);

      if (!day || !month || !year || day < 1 || day > 31 || month < 1 || month > 12 || year < 2024) {
        return interaction.reply({
          content: 'Tanggal tidak valid. Pastikan format **DD-MM-YYYY** benar.',
          flags: MessageFlags.Ephemeral
        });
      }

      const eventDateWIB = new Date(year, month - 1, day, jam, menit, 0);
      const eventTimestamp = eventDateWIB.getTime() - (7 * 60 * 60 * 1000);

      if (eventTimestamp < Date.now()) {
        return interaction.reply({
          content: 'Waktu event sudah terlewat. Jadwalkan event untuk waktu yang akan datang.',
          flags: MessageFlags.Ephemeral
        });
      }

      const eventId = generateEventId();
      const eventData = {
        id: eventId,
        name,
        description: deskripsi,
        timestamp: eventTimestamp,
        day, month, year, hour: jam, minute: menit,
        channelId: channel.id,
        creatorId: interaction.user.id,
        creatorName: interaction.member.displayName,
        attendees: [interaction.user.id],
        declines: [],
        reminded30m: false,
        remindedDay: false,
        announced: false,
        createdAt: Date.now()
      };

      const eventsData = storage.read('events');
      if (!eventsData[guildId]) eventsData[guildId] = [];
      eventsData[guildId].push(eventData);
      storage.write('events', eventsData);

      const dateFormatted = formatDateTimeWIB(new Date(eventTimestamp));
      const timeUntil = getTimeUntilString(eventTimestamp);

      const embed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setAuthor({
          name: `COMMUNITY EVENT — ${interaction.guild.name.toUpperCase()}`,
          iconURL: interaction.guild.iconURL({ dynamic: true }) || undefined
        })
        .setTitle(name)
        .setDescription(
          (deskripsi ? `*${deskripsi}*\n\n` : '') +
          `**Waktu:** ${dateFormatted} (${timeUntil})\n` +
          `**Lokasi:** <#${channel.id}>\n` +
          `**Inisiator:** ${interaction.member.displayName}\n\n` +
          `**Hadir (1):** <@${interaction.user.id}>\n` +
          `**Tidak Hadir (0):** _Belum ada_`
        )
        .setFooter({ text: `ID: ${eventId} • Konfirmasi kehadiran melalui tombol di bawah` })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`event_rsvp_yes_${eventId}`)
          .setLabel('Hadir')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`event_rsvp_no_${eventId}`)
          .setLabel('Tidak Hadir')
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`event_info_${eventId}`)
          .setLabel('Info ↗')
          .setStyle(ButtonStyle.Link)
          .setURL(`https://discord.com/channels/${guildId}/${channel.id}`)
      );

      const sentMsg = await channel.send({ embeds: [embed], components: [row] }).catch(() => null);

      if (sentMsg) {
        eventData.messageId = sentMsg.id;
        storage.write('events', eventsData);
      }

      return interaction.reply({
        content: `Event **"${name}"** berhasil dibuat dan diumumkan di <#${channel.id}>. (ID: \`${eventId}\`)`,
        flags: MessageFlags.Ephemeral
      });
    }

    // === LIST EVENTS ===
    if (sub === 'list') {
      const eventsData = storage.read('events');
      const guildEvents = (eventsData[guildId] || [])
        .filter(e => e.timestamp > Date.now())
        .sort((a, b) => a.timestamp - b.timestamp);

      if (guildEvents.length === 0) {
        return interaction.reply({
          content: 'Tidak ada jadwal event aktif saat ini. Gunakan `/event create` untuk membuat event baru.',
          flags: MessageFlags.Ephemeral
        });
      }

      const list = guildEvents.slice(0, 10).map((evt, i) => {
        const dateStr = formatDateTimeWIB(new Date(evt.timestamp));
        const timeUntil = getTimeUntilString(evt.timestamp);
        return `\`#${(i + 1).toString().padStart(2, '0')}\` **${evt.name}**\n   ${dateStr} (${timeUntil})\n   Konfirmasi: ${evt.attendees.length} Hadir • ID: \`${evt.id}\``;
      }).join('\n\n');

      const embed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setAuthor({
          name: `UPCOMING EVENTS — ${interaction.guild.name.toUpperCase()}`,
          iconURL: interaction.guild.iconURL({ dynamic: true }) || undefined
        })
        .setTitle(`Jadwal Acara Server (${guildEvents.length} Event)`)
        .setDescription(list)
        .setFooter({ text: `${interaction.guild.name} • Event Calendar` })
        .setTimestamp();

      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    // === CANCEL EVENT ===
    if (sub === 'cancel') {
      if (!(await isOwnerOrMod(interaction, client))) {
        return replyNoAccessMod(interaction);
      }

      const eventId = interaction.options.getString('id');
      const eventsData = storage.read('events');
      const guildEvents = eventsData[guildId] || [];
      const idx = guildEvents.findIndex(e => e.id === eventId);

      if (idx === -1) {
        return interaction.reply({
          content: `Event dengan ID \`${eventId}\` tidak ditemukan.`,
          flags: MessageFlags.Ephemeral
        });
      }

      const removed = guildEvents.splice(idx, 1)[0];
      storage.write('events', eventsData);

      return interaction.reply({
        content: `Event **"${removed.name}"** telah dibatalkan dan dihapus.`,
        flags: MessageFlags.Ephemeral
      });
    }

    // === INFO EVENT ===
    if (sub === 'info') {
      const eventId = interaction.options.getString('id');
      const eventsData = storage.read('events');
      const guildEvents = eventsData[guildId] || [];
      const evt = guildEvents.find(e => e.id === eventId);

      if (!evt) {
        return interaction.reply({
          content: `Event dengan ID \`${eventId}\` tidak ditemukan.`,
          flags: MessageFlags.Ephemeral
        });
      }

      const dateStr = formatDateTimeWIB(new Date(evt.timestamp));
      const timeUntil = evt.timestamp > Date.now() ? getTimeUntilString(evt.timestamp) : 'Sudah berlalu';
      const attendeeList = evt.attendees.length > 0
        ? evt.attendees.map(id => `<@${id}>`).join(', ')
        : '_Belum ada_';
      const declineList = evt.declines.length > 0
        ? evt.declines.map(id => `<@${id}>`).join(', ')
        : '_Belum ada_';

      const embed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setTitle(evt.name)
        .setDescription(evt.description ? `*${evt.description}*` : '_Tidak ada deskripsi._')
        .addFields(
          { name: 'Waktu Pelaksanaan', value: dateStr, inline: true },
          { name: 'Status', value: timeUntil, inline: true },
          { name: `Daftar Hadir (${evt.attendees.length})`, value: attendeeList, inline: false },
          { name: `Tidak Hadir (${evt.declines.length})`, value: declineList, inline: false }
        )
        .setFooter({ text: `Event ID: ${evt.id}` })
        .setTimestamp();

      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
  },
  formatDateTimeWIB,
  getTimeUntilString
};
