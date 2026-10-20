const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ChannelType,
  MessageFlags
} = require('discord.js');
const { isOwnerOrMod, replyNoAccessMod } = require('../utils/helpers');
const { saveGuildSetting } = require('../utils/storage');
const storage = require('../utils/storage');
const { buildDeskPanelEmbed, buildDeskPanelButtons, getDeskReportChannelId } = require('../utils/communityDesk');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('desk')
    .setDescription('Pengaturan pusat layanan & pengaduan warga (Community Desk)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub =>
      sub
        .setName('panel')
        .setDescription('Kirim embed panel Community Desk ke channel publik')
        .addChannelOption(opt =>
          opt
            .setName('channel')
            .setDescription('Channel tujuan penempatan panel (default: channel saat ini)')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('setchannel')
        .setDescription('Tentukan channel khusus untuk menerima tiket laporan & masukan')
        .addChannelOption(opt =>
          opt
            .setName('channel')
            .setDescription('Channel penerima tiket staf/moderator')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('status')
        .setDescription('Tinjau konfigurasi Community Desk dan statistik tiket')
    ),

  async execute(interaction, client) {
    if (!await isOwnerOrMod(interaction, client)) {
      return replyNoAccessMod(interaction);
    }

    const sub = interaction.options.getSubcommand();
    const guild = interaction.guild;
    const guildId = guild.id;

    // === 1. PANEL (Kirim panel ke channel) ===
    if (sub === 'panel') {
      const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
      const botPerms = targetChannel.permissionsFor(guild.members.me);

      if (!botPerms.has(PermissionFlagsBits.SendMessages) || !botPerms.has(PermissionFlagsBits.EmbedLinks)) {
        return interaction.reply({
          content: `Bot membutuhkan izin **Send Messages** dan **Embed Links** di <#${targetChannel.id}>.`,
          flags: MessageFlags.Ephemeral
        });
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const embed = buildDeskPanelEmbed(guild);
      const components = buildDeskPanelButtons();

      await targetChannel.send({ embeds: [embed], components });

      return interaction.editReply({
        content: `Panel Community Desk berhasil disematkan di <#${targetChannel.id}>.`
      });
    }

    // === 2. SETCHANNEL ===
    if (sub === 'setchannel') {
      const targetChannel = interaction.options.getChannel('channel');
      const botPerms = targetChannel.permissionsFor(guild.members.me);

      if (!botPerms.has(PermissionFlagsBits.SendMessages) || !botPerms.has(PermissionFlagsBits.EmbedLinks)) {
        return interaction.reply({
          content: `Bot membutuhkan izin **Send Messages** dan **Embed Links** di <#${targetChannel.id}>.`,
          flags: MessageFlags.Ephemeral
        });
      }

      saveGuildSetting(guildId, 'deskReportChannelId', targetChannel.id);

      const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setAuthor({
          name: 'COMMUNITY DESK | Konfigurasi Saluran',
          iconURL: guild.iconURL({ dynamic: true }) || undefined
        })
        .setTitle('Saluran Tiket Pengaduan Berhasil Disetel')
        .setDescription(
          `Seluruh tiket laporan pelanggaran, usulan ide konten, serta kritik dan saran member akan dikirimkan ke <#${targetChannel.id}>.`
        )
        .setFooter({ text: `${guild.name} • Akses staf moderator aktif` })
        .setTimestamp();

      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    // === 3. STATUS ===
    if (sub === 'status') {
      const reportChannelId = getDeskReportChannelId(guildId);
      const ticketsData = storage.read('tickets');
      const guildTickets = Object.values(ticketsData[guildId] || {});

      const totalTickets = guildTickets.length;
      const openTickets = guildTickets.filter(t => t.status === 'OPEN').length;
      const resolvedTickets = guildTickets.filter(t => t.status === 'RESOLVED').length;
      const dismissedTickets = guildTickets.filter(t => t.status === 'DISMISSED').length;

      const embed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setAuthor({
          name: 'COMMUNITY DESK | Status Konfigurasi',
          iconURL: guild.iconURL({ dynamic: true }) || undefined
        })
        .setTitle('Status Layanan & Statistik Pengaduan')
        .addFields(
          {
            name: 'Saluran Tiket Staf',
            value: reportChannelId ? `• <#${reportChannelId}>` : '• *Belum diatur (Gunakan `/desk setchannel`)*',
            inline: false
          },
          {
            name: 'Total Tiket Masuk',
            value: `• **${totalTickets}** tiket`,
            inline: true
          },
          {
            name: 'Menunggu Tinjauan',
            value: `• **${openTickets}** tiket`,
            inline: true
          },
          {
            name: 'Telah Ditindak',
            value: `• **${resolvedTickets}** tiket`,
            inline: true
          },
          {
            name: 'Ditutup / Ditolak',
            value: `• **${dismissedTickets}** tiket`,
            inline: true
          }
        )
        .setFooter({ text: `${guild.name} • Community Desk Service` })
        .setTimestamp();

      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
  }
};
