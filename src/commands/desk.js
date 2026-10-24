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
const {
  buildDeskPanelEmbed,
  buildDeskPanelButtons,
  getDeskReportChannelId,
  createDedicatedDeskChannels,
  DESK_CHANNEL_CONFIGS
} = require('../utils/communityDesk');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('desk')
    .setDescription('Pengaturan pusat layanan & pengaduan warga (Community Desk)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub =>
      sub
        .setName('setup')
        .setDescription('Otomatis buat kategori privat MODERATOR DESK dan 4 saluran khusus per menu')
    )
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
        .setDescription('Tentukan channel khusus untuk salah satu menu pengaduan')
        .addStringOption(opt =>
          opt
            .setName('kategori')
            .setDescription('Menu pengaduan yang ingin diatur jalurnya')
            .setRequired(true)
            .addChoices(
              { name: 'Laporkan Member (#laporan-member)', value: 'report' },
              { name: 'Ide & Kolaborasi (#ide-kolaborasi)', value: 'content' },
              { name: 'Kritik & Saran (#kritik-saran)', value: 'feedback' },
              { name: 'Pesan Lainnya (#pesan-lainnya)', value: 'other' }
            )
        )
        .addChannelOption(opt =>
          opt
            .setName('channel')
            .setDescription('Channel tujuan khusus tiket untuk menu ini')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('status')
        .setDescription('Tinjau konfigurasi Community Desk dan status 4 saluran khusus')
    ),

  async execute(interaction, client) {
    if (!await isOwnerOrMod(interaction, client)) {
      return replyNoAccessMod(interaction);
    }

    const sub = interaction.options.getSubcommand();
    const guild = interaction.guild;
    const guildId = guild.id;

    // === 0. SETUP (Otomatis Buat Kategori Privat & 4 Saluran Khusus) ===
    if (sub === 'setup') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      try {
        const { parentCategory, results } = await createDedicatedDeskChannels(guild);

        const lines = [
          `**Kategori:** \`${parentCategory.name}\` *(Privat untuk Moderator & Bot)*`,
          '',
          `• **Laporkan Member:** <#${results.report.channel.id}> ${results.report.created ? '*(Baru dibuat)*' : '*(Terhubung)*'}`,
          `• **Ide & Kolaborasi:** <#${results.content.channel.id}> ${results.content.created ? '*(Baru dibuat)*' : '*(Terhubung)*'}`,
          `• **Kritik & Saran:** <#${results.feedback.channel.id}> ${results.feedback.created ? '*(Baru dibuat)*' : '*(Terhubung)*'}`,
          `• **Pesan Lainnya:** <#${results.other.channel.id}> ${results.other.created ? '*(Baru dibuat)*' : '*(Terhubung)*'}`,
          '',
          'Setiap menu pengaduan warga kini terhubung langsung ke saluran khusus moderatornya masing-masing secara terpisah (tidak digabung).'
        ];

        const embed = new EmbedBuilder()
          .setColor(0x57F287)
          .setAuthor({
            name: `COMMUNITY DESK — ${guild.name.toUpperCase()}`,
            iconURL: guild.iconURL({ dynamic: true }) || undefined
          })
          .setTitle('Saluran Khusus Moderator Berhasil Disiapkan')
          .setDescription(lines.join('\n'))
          .setFooter({ text: `${guild.name} • Moderator Dedicated Channels` })
          .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
      } catch (err) {
        return interaction.editReply({
          content: `Gagal menyiapkan saluran khusus: ${err.message}`
        });
      }
    }

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
      const category = interaction.options.getString('kategori');
      const botPerms = targetChannel.permissionsFor(guild.members.me);

      if (!botPerms.has(PermissionFlagsBits.SendMessages) || !botPerms.has(PermissionFlagsBits.EmbedLinks)) {
        return interaction.reply({
          content: `Bot membutuhkan izin **Send Messages** dan **Embed Links** di <#${targetChannel.id}>.`,
          flags: MessageFlags.Ephemeral
        });
      }

      const settings = storage.read('settings');
      if (!settings[guildId]) settings[guildId] = {};
      if (!settings[guildId].deskChannels) settings[guildId].deskChannels = {};

      settings[guildId].deskChannels[category] = targetChannel.id;
      storage.write('settings', settings);

      const categoryNames = {
        report: 'Laporkan Member (#laporan-member)',
        content: 'Ide & Kolaborasi (#ide-kolaborasi)',
        feedback: 'Kritik & Saran (#kritik-saran)',
        other: 'Pesan Lainnya (#pesan-lainnya)'
      };

      const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setAuthor({
          name: 'COMMUNITY DESK | Saluran Khusus Moderator',
          iconURL: guild.iconURL({ dynamic: true }) || undefined
        })
        .setTitle('Saluran Tiket Berhasil Ditautkan')
        .setDescription(
          `Tiket menu **${categoryNames[category] || category}** akan khusus dikirimkan ke <#${targetChannel.id}>.`
        )
        .setFooter({ text: `${guild.name} • Akses staf aktif` })
        .setTimestamp();

      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    // === 3. STATUS ===
    if (sub === 'status') {
      const settings = storage.read('settings');
      const guildSettings = settings[guildId] || {};
      const deskChannels = guildSettings.deskChannels || {};

      const ticketsData = storage.read('tickets');
      const guildTickets = Object.values(ticketsData[guildId] || {});

      const totalTickets = guildTickets.length;
      const openTickets = guildTickets.filter(t => t.status === 'OPEN').length;
      const resolvedTickets = guildTickets.filter(t => t.status === 'RESOLVED').length;
      const dismissedTickets = guildTickets.filter(t => t.status === 'DISMISSED').length;

      const formatCh = (chId) => chId ? `<#${chId}>` : '*Belum disetel (Ketik `/desk setup`)*';

      const embed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setAuthor({
          name: 'COMMUNITY DESK | Status Saluran Khusus Moderator',
          iconURL: guild.iconURL({ dynamic: true }) || undefined
        })
        .setTitle('Distribusi Saluran Tiket per Menu (Terpisah)')
        .setDescription(
          'Setiap menu terhubung ke channel moderator khusus tanpa digabung.\n' +
          'Gunakan `/desk setup` untuk membuat kategori privat dan 4 channel otomatis.'
        )
        .addFields(
          {
            name: 'Saluran Khusus per Menu',
            value:
              `• **Laporkan Member:** ${formatCh(deskChannels.report)}\n` +
              `• **Ide & Kolaborasi:** ${formatCh(deskChannels.content)}\n` +
              `• **Kritik & Saran:** ${formatCh(deskChannels.feedback)}\n` +
              `• **Pesan Lainnya:** ${formatCh(deskChannels.other)}`,
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
