const {
  SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder,
  ChannelType, MessageFlags,
} = require('discord.js');
const { isOwnerOrMod, replyNoAccessMod } = require('../utils/helpers');
const storage = require('../utils/storage');

// ID counter sederhana untuk jadwal pengumuman
function generateId() {
  return Date.now().toString(36);
}

const announce = {
  data: new SlashCommandBuilder()
    .setName('announce')
    .setDescription('Kirim atau jadwalkan pengumuman ke channel tertentu')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand(sub =>
      sub
        .setName('send')
        .setDescription('Kirim pengumuman sekarang ke channel yang ditentukan')
        .addChannelOption(opt =>
          opt.setName('channel').setDescription('Channel tujuan').addChannelTypes(ChannelType.GuildText).setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('pesan').setDescription('Isi pengumuman. Gunakan \\n untuk baris baru.').setRequired(true).setMaxLength(2000)
        )
        .addBooleanOption(opt =>
          opt.setName('ping').setDescription('Ping role Pengumuman? (default: tidak)').setRequired(false)
        )
        .addStringOption(opt =>
          opt.setName('gambar').setDescription('URL gambar yang ditampilkan di pengumuman (opsional)').setRequired(false)
        )
        .addAttachmentOption(opt =>
          opt.setName('upload').setDescription('Upload gambar langsung dari perangkatmu (opsional)').setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('schedule')
        .setDescription('Jadwalkan pengumuman harian otomatis')
        .addChannelOption(opt =>
          opt.setName('channel').setDescription('Channel tujuan').addChannelTypes(ChannelType.GuildText).setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('pesan').setDescription('Isi pengumuman. Gunakan \\n untuk baris baru.').setRequired(true).setMaxLength(2000)
        )
        .addIntegerOption(opt =>
          opt.setName('jam').setDescription('Jam pengiriman (0-23, WIB)').setRequired(true).setMinValue(0).setMaxValue(23)
        )
        .addIntegerOption(opt =>
          opt.setName('menit').setDescription('Menit pengiriman (0-59)').setRequired(false).setMinValue(0).setMaxValue(59)
        )
        .addStringOption(opt =>
          opt.setName('gambar').setDescription('URL gambar yang ditampilkan di pengumuman (opsional)').setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub.setName('list').setDescription('Lihat semua jadwal pengumuman aktif di server ini')
    )
    .addSubcommand(sub =>
      sub
        .setName('remove')
        .setDescription('Hapus jadwal pengumuman')
        .addStringOption(opt =>
          opt.setName('id').setDescription('ID jadwal (lihat dengan /announce list)').setRequired(true)
        )
    ),

  async execute(interaction, client) {
    if (!await isOwnerOrMod(interaction, client)) return replyNoAccessMod(interaction);

    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    // === SEND ===
    if (sub === 'send') {
      const channel = interaction.options.getChannel('channel');
      const pesan = interaction.options.getString('pesan');
      const ping = interaction.options.getBoolean('ping') ?? false;
      const gambarUrl = interaction.options.getString('gambar') ?? null;
      const uploadAttachment = interaction.options.getAttachment('upload') ?? null;

      const botPerms = channel.permissionsFor(interaction.guild.members.me);
      if (!botPerms.has(PermissionFlagsBits.SendMessages)) {
        return interaction.reply({ content: `❌ Bot tidak punya izin kirim pesan di <#${channel.id}>!`, flags: MessageFlags.Ephemeral });
      }

      // Tentukan URL gambar yang akan dipakai: upload attachment lebih prioritas dari URL
      let finalImageUrl = null;
      if (uploadAttachment) {
        if (uploadAttachment.contentType?.startsWith('image/')) {
          finalImageUrl = uploadAttachment.url;
        } else {
          return interaction.reply({ content: '❌ File yang diupload harus berupa gambar (jpg, png, gif, webp)!', flags: MessageFlags.Ephemeral });
        }
      } else if (gambarUrl) {
        try {
          new URL(gambarUrl);
          finalImageUrl = gambarUrl;
        } catch {
          return interaction.reply({ content: '❌ URL gambar tidak valid! Pastikan URL diawali dengan https://', flags: MessageFlags.Ephemeral });
        }
      }

      // Konversi \n literal menjadi newline nyata agar user bisa buat baris baru di slash command
      const pesanFormatted = pesan.replace(/\\n/g, '\n');

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('📢 Pengumuman')
        .setDescription(pesanFormatted)
        .setFooter({
          text: `Diumumkan oleh ${interaction.user.tag}`,
          iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
        })
        .setTimestamp();

      if (finalImageUrl) embed.setImage(finalImageUrl);

      await channel.send({
        content: ping ? '<@&1396396538686607410>' : undefined,
        embeds: [embed],
      });

      return interaction.reply({
        content: `✅ Pengumuman berhasil dikirim ke <#${channel.id}>!`,
        flags: MessageFlags.Ephemeral,
      });
    }

    // === SCHEDULE ===
    if (sub === 'schedule') {
      const channel = interaction.options.getChannel('channel');
      const pesan = interaction.options.getString('pesan');
      const jam = interaction.options.getInteger('jam');
      const menit = interaction.options.getInteger('menit') ?? 0;
      const gambarUrl = interaction.options.getString('gambar') ?? null;

      // Validasi URL gambar jika ada
      if (gambarUrl) {
        try { new URL(gambarUrl); } catch {
          return interaction.reply({ content: '❌ URL gambar tidak valid! Pastikan URL diawali dengan https://', flags: MessageFlags.Ephemeral });
        }
      }

      const allAnnouncements = storage.read('announcements');
      if (!allAnnouncements[guildId]) allAnnouncements[guildId] = [];

      // Maksimal 5 jadwal per guild
      if (allAnnouncements[guildId].length >= 5) {
        return interaction.reply({
          content: '❌ Maksimal 5 jadwal pengumuman per server. Hapus yang lama dulu dengan `/announce remove`.',
          flags: MessageFlags.Ephemeral,
        });
      }

      const id = generateId();
      // Simpan pesan asli (dengan \n literal) agar bisa dikonversi saat dikirim
      allAnnouncements[guildId].push({ id, channelId: channel.id, pesan, hour: jam, minute: menit, imageUrl: gambarUrl || null });
      storage.write('announcements', allAnnouncements);

      // Tampilkan preview pesan dengan newline yang sudah dikonversi
      const pesanPreview = pesan.replace(/\\n/g, '\n');

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x57F287)
            .setTitle('✅ Pengumuman Dijadwalkan!')
            .addFields(
              { name: '📢 Channel', value: `<#${channel.id}>`, inline: true },
              { name: '🕐 Jam (WIB)', value: `**${String(jam).padStart(2, '0')}:${String(menit).padStart(2, '0')}**`, inline: true },
              { name: '🆔 ID Jadwal', value: `\`${id}\``, inline: true },
              { name: '💬 Pesan', value: pesanPreview.length > 100 ? pesanPreview.slice(0, 100) + '...' : pesanPreview },
              ...(gambarUrl ? [{ name: '🖼️ Gambar', value: gambarUrl.length > 60 ? gambarUrl.slice(0, 60) + '...' : gambarUrl }] : []),
            )
            .setFooter({ text: 'Gunakan /announce remove <id> untuk menghapus jadwal.' }),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    // === LIST ===
    if (sub === 'list') {
      const allAnnouncements = storage.read('announcements');
      const list = allAnnouncements[guildId] || [];

      if (list.length === 0) {
        return interaction.reply({ content: '📋 Belum ada jadwal pengumuman di server ini.', flags: MessageFlags.Ephemeral });
      }

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle('📋 Daftar Jadwal Pengumuman')
        .setDescription(
          list.map((a, i) =>
            `**${i + 1}.** ID: \`${a.id}\` • <#${a.channelId}> • **${String(a.hour).padStart(2, '0')}:${String(a.minute).padStart(2, '0')} WIB**\n> ${a.pesan.slice(0, 80)}${a.pesan.length > 80 ? '...' : ''}`
          ).join('\n\n')
        )
        .setFooter({ text: 'Gunakan /announce remove <id> untuk menghapus jadwal.' });

      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    // === REMOVE ===
    if (sub === 'remove') {
      const id = interaction.options.getString('id');
      const allAnnouncements = storage.read('announcements');
      const list = allAnnouncements[guildId] || [];
      const index = list.findIndex(a => a.id === id);

      if (index === -1) {
        return interaction.reply({ content: `❌ Jadwal dengan ID \`${id}\` tidak ditemukan!`, flags: MessageFlags.Ephemeral });
      }

      list.splice(index, 1);
      allAnnouncements[guildId] = list;
      storage.write('announcements', allAnnouncements);

      return interaction.reply({ content: `✅ Jadwal pengumuman \`${id}\` berhasil dihapus!`, flags: MessageFlags.Ephemeral });
    }
  },
};

module.exports = announce;
