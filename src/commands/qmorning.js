const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType, MessageFlags } = require('discord.js');
const { isOwnerOrMod, replyNoAccess } = require('../utils/helpers');
const { saveGuildSetting } = require('../utils/storage');

const qmorning = {
  data: new SlashCommandBuilder()
    .setName('qmorning')
    .setDescription('Setting fitur selamat pagi + reminder rules otomatis')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand(sub =>
      sub
        .setName('setchannel')
        .setDescription('Atur channel untuk pesan selamat pagi harian')
        .addChannelOption(opt =>
          opt
            .setName('channel')
            .setDescription('Channel tempat pesan dikirim')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('settime')
        .setDescription('Atur jam pengiriman pesan selamat pagi (WIB / UTC+7)')
        .addIntegerOption(opt =>
          opt
            .setName('hour')
            .setDescription('Jam pengiriman (0-23, format 24 jam, WIB)')
            .setRequired(true)
            .setMinValue(0)
            .setMaxValue(23)
        )
        .addIntegerOption(opt =>
          opt
            .setName('minute')
            .setDescription('Menit pengiriman (0-59)')
            .setRequired(false)
            .setMinValue(0)
            .setMaxValue(59)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('enable')
        .setDescription('Aktifkan fitur selamat pagi harian')
    )
    .addSubcommand(sub =>
      sub
        .setName('disable')
        .setDescription('Matikan fitur selamat pagi harian')
    )
    .addSubcommand(sub =>
      sub
        .setName('test')
        .setDescription('Preview pesan selamat pagi sekarang')
    )
    .addSubcommand(sub =>
      sub
        .setName('status')
        .setDescription('Lihat status & konfigurasi fitur selamat pagi')
    ),

  async execute(interaction, client) {
    if (!await isOwnerOrMod(interaction, client)) return replyNoAccess(interaction);

    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (!client.morningSettings) client.morningSettings = new Map();

    const config = client.morningSettings.get(guildId) || {
      enabled: false,
      channelId: null,
      hour: 7,    // Default 07:00 WIB
      minute: 0,
    };

    // === SET CHANNEL ===
    if (sub === 'setchannel') {
      const channel = interaction.options.getChannel('channel');

      const botPerms = channel.permissionsFor(interaction.guild.members.me);
      if (!botPerms.has(PermissionFlagsBits.SendMessages) || !botPerms.has(PermissionFlagsBits.EmbedLinks)) {
        return interaction.reply({
          content: `❌ Bot tidak punya izin **Send Messages** atau **Embed Links** di <#${channel.id}>!`,
          flags: MessageFlags.Ephemeral,
        });
      }

      config.channelId = channel.id;
      config.enabled = true;
      client.morningSettings.set(guildId, config);
      saveGuildSetting(guildId, 'morning', config);

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xFFD93D)
            .setTitle('☀️ Channel Selamat Pagi Diatur!')
            .setDescription(`Pesan selamat pagi + reminder rules akan dikirim ke <#${channel.id}> setiap hari pukul **${String(config.hour).padStart(2, '0')}:${String(config.minute).padStart(2, '0')} WIB**.`)
            .setFooter({ text: 'Gunakan /qmorning settime untuk mengubah jam.' }),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    // === SET TIME ===
    if (sub === 'settime') {
      const hour = interaction.options.getInteger('hour');
      const minute = interaction.options.getInteger('minute') ?? 0;

      config.hour = hour;
      config.minute = minute;
      client.morningSettings.set(guildId, config);
      saveGuildSetting(guildId, 'morning', config);

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xFFD93D)
            .setTitle('🕐 Jam Selamat Pagi Diatur!')
            .setDescription(`Pesan akan dikirim setiap hari pukul **${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} WIB**.`)
            .setFooter({ text: 'Pastikan channel sudah diatur dengan /qmorning setchannel.' }),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    // === ENABLE ===
    if (sub === 'enable') {
      if (!config.channelId) {
        return interaction.reply({
          content: '❌ Belum ada channel yang diatur! Gunakan `/qmorning setchannel` dulu.',
          flags: MessageFlags.Ephemeral,
        });
      }
      config.enabled = true;
      client.morningSettings.set(guildId, config);
      saveGuildSetting(guildId, 'morning', config);
      return interaction.reply({
        content: `✅ Fitur selamat pagi **diaktifkan**! Pesan akan dikirim setiap hari pukul **${String(config.hour).padStart(2, '0')}:${String(config.minute).padStart(2, '0')} WIB** ke <#${config.channelId}>.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    // === DISABLE ===
    if (sub === 'disable') {
      config.enabled = false;
      client.morningSettings.set(guildId, config);
      saveGuildSetting(guildId, 'morning', config);
      return interaction.reply({
        content: '🔕 Fitur selamat pagi **dimatikan**.',
        flags: MessageFlags.Ephemeral,
      });
    }

    // === STATUS ===
    if (sub === 'status') {
      const statusEmbed = new EmbedBuilder()
        .setColor(config.enabled ? 0xFFD93D : 0xED4245)
        .setTitle('📋 Status Fitur Selamat Pagi')
        .addFields(
          {
            name: '🔘 Status',
            value: config.enabled ? '✅ **Aktif**' : '❌ **Nonaktif**',
            inline: true,
          },
          {
            name: '📢 Channel',
            value: config.channelId ? `<#${config.channelId}>` : '`Belum diatur`',
            inline: true,
          },
          {
            name: '🕐 Jam Kirim (WIB)',
            value: `**${String(config.hour).padStart(2, '0')}:${String(config.minute).padStart(2, '0')}**`,
            inline: true,
          }
        )
        .setFooter({ text: 'Gunakan /qmorning setchannel & settime untuk konfigurasi.' });

      return interaction.reply({ embeds: [statusEmbed], flags: MessageFlags.Ephemeral });
    }

    // === TEST (Preview) ===
    if (sub === 'test') {
      if (!config.channelId) {
        return interaction.reply({
          content: '❌ Belum ada channel yang diatur! Gunakan `/qmorning setchannel` dulu.',
          flags: MessageFlags.Ephemeral,
        });
      }

      const channel = interaction.guild.channels.cache.get(config.channelId);
      if (!channel) {
        return interaction.reply({
          content: '❌ Channel tidak ditemukan! Atur ulang dengan `/qmorning setchannel`.',
          flags: MessageFlags.Ephemeral,
        });
      }

      const { buildMorningMessage } = require('../utils/morningMessage');
      const { content, embeds } = buildMorningMessage(interaction.guild);

      await channel.send({ content, embeds });

      return interaction.reply({
        content: `✅ Preview selamat pagi berhasil dikirim ke <#${channel.id}>!`,
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};

module.exports = qmorning;
