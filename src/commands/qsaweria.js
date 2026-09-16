const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ChannelType,
  MessageFlags
} = require('discord.js');
const { isOwnerOrAdmin, replyNoAccessAdmin } = require('../utils/helpers');
const { saveGuildSetting, read } = require('../utils/storage');
const { sendSaweriaNotification, formatRupiah } = require('../utils/saweriaWebhook');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('qsaweria')
    .setDescription('Pengaturan notifikasi donasi Saweria ke channel Discord (Admin Only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub
        .setName('setchannel')
        .setDescription('Atur channel tempat notifikasi donasi Saweria dikirim')
        .addChannelOption(opt =>
          opt
            .setName('channel')
            .setDescription('Text channel tujuan notifikasi')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
        .addIntegerOption(opt =>
          opt
            .setName('min_nominal')
            .setDescription('Minimal nominal rupiah agar notifikasi dikirim')
            .setMinValue(0)
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('status')
        .setDescription('Lihat status konfigurasi dan URL Webhook untuk Dashboard Saweria')
    )
    .addSubcommand(sub =>
      sub
        .setName('test')
        .setDescription('Kirim simulasi tes notifikasi donasi ke channel')
        .addIntegerOption(opt =>
          opt
            .setName('nominal')
            .setDescription('Nominal donasi tes (default: 25000)')
            .setMinValue(1000)
            .setRequired(false)
        )
        .addStringOption(opt =>
          opt
            .setName('donatur')
            .setDescription('Nama donatur tes (default: Donatur Uji Coba)')
            .setRequired(false)
        )
        .addStringOption(opt =>
          opt
            .setName('pesan')
            .setDescription('Pesan tes donasi')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('disable')
        .setDescription('Nonaktifkan notifikasi donasi Saweria')
    ),

  async execute(interaction, client) {
    const isAuthorized = await isOwnerOrAdmin(interaction, client);
    if (!isAuthorized) {
      return replyNoAccessAdmin(interaction);
    }

    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;
    const settings = read('settings');
    const config = settings[guildId]?.saweria || {
      enabled: false,
      channelId: null,
      minAmount: 0
    };

    const publicUrl = (process.env.SAWERIA_PUBLIC_URL || `http://localhost:${process.env.SAWERIA_PORT || 3000}`).replace(/\/+$/, '');
    const secret = (process.env.SAWERIA_SECRET || '').trim();
    const webhookEndpoint = `${publicUrl}/webhook/saweria${secret ? `?token=${encodeURIComponent(secret)}` : ''}`;
    const saweriaLink = process.env.SAWERIA_URL || 'https://saweria.co/qumpruy';

    // =============================================
    // SUBCOMMAND: SETCHANNEL
    // =============================================
    if (sub === 'setchannel') {
      const channel = interaction.options.getChannel('channel');
      const minNominal = interaction.options.getInteger('min_nominal') ?? config.minAmount ?? 0;

      const botPerms = channel.permissionsFor(interaction.guild.members.me);
      if (!botPerms.has(PermissionFlagsBits.SendMessages) || !botPerms.has(PermissionFlagsBits.EmbedLinks)) {
        return interaction.reply({
          content: `Bot tidak memiliki izin Send Messages atau Embed Links di channel <#${channel.id}>. Harap periksa izin bot.`,
          flags: MessageFlags.Ephemeral
        });
      }

      config.channelId = channel.id;
      config.enabled = true;
      config.minAmount = minNominal;

      saveGuildSetting(guildId, 'saweria', config);

      const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('Channel Notifikasi Saweria Diatur')
        .setDescription(`Notifikasi donasi Saweria akan dikirimkan ke <#${channel.id}>.`)
        .addFields(
          { name: 'Channel Target', value: `<#${channel.id}>`, inline: true },
          { name: 'Minimal Donasi', value: formatRupiah(minNominal), inline: true },
          { name: 'Link Saweria', value: saweriaLink, inline: false },
          {
            name: 'URL Webhook Saweria',
            value: `\`\`\`${webhookEndpoint}\`\`\``,
            inline: false
          }
        )
        .setFooter({ text: 'Salin URL Webhook di atas ke saweria.co > Integrasi > Webhook' })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    // =============================================
    // SUBCOMMAND: STATUS
    // =============================================
    if (sub === 'status') {
      const port = process.env.SAWERIA_PORT || 3000;
      const statusText = config.enabled ? '**Aktif**' : '**Nonaktif**';
      const targetText = config.channelId ? `<#${config.channelId}>` : '*(Belum diatur)*';

      const embed = new EmbedBuilder()
        .setColor(0xFAAE2B)
        .setTitle('Konfigurasi Integrasi Saweria')
        .setDescription('Pengaturan penerimaan notifikasi donasi Saweria untuk server ini.')
        .addFields(
          { name: 'Status Fitur', value: statusText, inline: true },
          { name: 'Target Channel', value: targetText, inline: true },
          { name: 'Minimal Nominal', value: formatRupiah(config.minAmount || 0), inline: true },
          { name: 'Port Listener', value: `\`Port ${port}\``, inline: true },
          { name: 'Link Saweria', value: saweriaLink, inline: false },
          {
            name: 'URL Webhook untuk Dashboard Saweria:',
            value: `\`\`\`${webhookEndpoint}\`\`\``,
            inline: false
          }
        )
        .setFooter({ text: 'Buka saweria.co > Integrasi > Webhook untuk menempelkan URL di atas.' })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    // =============================================
    // SUBCOMMAND: TEST
    // =============================================
    if (sub === 'test') {
      if (!config.channelId) {
        return interaction.reply({
          content: 'Kamu belum mengatur channel tujuan. Jalankan `/qsaweria setchannel` terlebih dahulu.',
          flags: MessageFlags.Ephemeral
        });
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const nominal = interaction.options.getInteger('nominal') || 25000;
      const donatur = interaction.options.getString('donatur') || 'Donatur Uji Coba';
      const pesan = interaction.options.getString('pesan') || 'Tes pengiriman notifikasi donasi Saweria.';

      const testPayload = {
        id: `test_${Date.now().toString(36)}`,
        type: 'test',
        donator_name: donatur,
        amount_raw: nominal,
        message: pesan,
        created_at: new Date().toISOString(),
        is_test: true
      };

      const result = await sendSaweriaNotification(client, testPayload, guildId);

      if (result.sentCount > 0) {
        return interaction.editReply({
          content: `Simulasi tes berhasil dikirimkan ke <#${config.channelId}>.`
        });
      } else {
        return interaction.editReply({
          content: `Simulasi gagal dikirim. Alasan:\n- ${result.errors.join('\n- ') || 'Pastikan channel tersedia dan bot memiliki izin Send Messages & Embed Links.'}`
        });
      }
    }

    // =============================================
    // SUBCOMMAND: DISABLE
    // =============================================
    if (sub === 'disable') {
      config.enabled = false;
      saveGuildSetting(guildId, 'saweria', config);

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setTitle('Notifikasi Saweria Dinonaktifkan')
            .setDescription('Notifikasi donasi Saweria untuk server ini telah dinonaktifkan sementara.')
        ]
      });
    }
  }
};
