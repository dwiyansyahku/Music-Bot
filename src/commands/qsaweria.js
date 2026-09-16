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
    .setDescription('Pengaturan integrasi notifikasi donasi Saweria ke Discord (Admin Only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand(sub =>
      sub
        .setName('setchannel')
        .setDescription('Atur text channel tempat notifikasi donasi Saweria dikirim')
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
            .setDescription('Minimal nominal rupiah agar notifikasi dikirim (misal: 10000)')
            .setMinValue(0)
            .setRequired(false)
        )
        .addRoleOption(opt =>
          opt
            .setName('mention_role')
            .setDescription('Role yang di-mention saat ada donasi baru masuk')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('setwebhook')
        .setDescription('Atur Discord Webhook URL langsung untuk notifikasi donasi')
        .addStringOption(opt =>
          opt
            .setName('url')
            .setDescription('URL Discord Webhook (https://discord.com/api/webhooks/...)')
            .setRequired(true)
        )
        .addIntegerOption(opt =>
          opt
            .setName('min_nominal')
            .setDescription('Minimal nominal rupiah agar notifikasi dikirim')
            .setMinValue(0)
            .setRequired(false)
        )
        .addRoleOption(opt =>
          opt
            .setName('mention_role')
            .setDescription('Role yang di-mention saat ada donasi baru')
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('enable')
        .setDescription('Aktifkan pengiriman notifikasi donasi Saweria')
    )
    .addSubcommand(sub =>
      sub
        .setName('disable')
        .setDescription('Nonaktifkan pengiriman notifikasi donasi Saweria')
    )
    .addSubcommand(sub =>
      sub
        .setName('status')
        .setDescription('Lihat status konfigurasi Saweria dan URL Webhook untuk Dashboard Saweria')
    )
    .addSubcommand(sub =>
      sub
        .setName('test')
        .setDescription('Kirim simulasi tes notifikasi donasi untuk mengecek channel/webhook')
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
            .setDescription('Nama donatur tes (default: Sultan Dermawan)')
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
        .setName('guide')
        .setDescription('Panduan lengkap cara menghubungkan akun Saweria ke bot Discord ini')
    ),

  async execute(interaction, client) {
    // 1. Keamanan Ketat: Hanya Administrator / Server Owner / Bot Owner
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
      webhookUrl: null,
      minAmount: 0,
      roleId: null
    };

    const publicUrl = (process.env.SAWERIA_PUBLIC_URL || `http://localhost:${process.env.SAWERIA_PORT || 3000}`).replace(/\/+$/, '');
    const secret = (process.env.SAWERIA_SECRET || '').trim();
    const webhookEndpoint = `${publicUrl}/webhook/saweria${secret ? `?token=${encodeURIComponent(secret)}` : ''}`;

    // =============================================
    // SUBCOMMAND: SETCHANNEL
    // =============================================
    if (sub === 'setchannel') {
      const channel = interaction.options.getChannel('channel');
      const minNominal = interaction.options.getInteger('min_nominal') ?? config.minAmount ?? 0;
      const mentionRole = interaction.options.getRole('mention_role');

      // Cek izin bot di channel tujuan
      const botPerms = channel.permissionsFor(interaction.guild.members.me);
      if (!botPerms.has(PermissionFlagsBits.SendMessages) || !botPerms.has(PermissionFlagsBits.EmbedLinks)) {
        return interaction.reply({
          content: `❌ Bot tidak memiliki izin **Send Messages** atau **Embed Links** di channel <#${channel.id}>! Harap periksa permissions bot.`,
          flags: MessageFlags.Ephemeral
        });
      }

      config.channelId = channel.id;
      config.enabled = true;
      config.minAmount = minNominal;
      if (mentionRole) config.roleId = mentionRole.id;

      saveGuildSetting(guildId, 'saweria', config);

      const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('✅ Channel Notifikasi Saweria Berhasil Diatur!')
        .setDescription(
          `Notifikasi donasi Saweria akan otomatis dikirim ke channel <#${channel.id}>.`
        )
        .addFields(
          { name: '📢 Channel Target', value: `<#${channel.id}>`, inline: true },
          { name: '💰 Minimal Donasi', value: formatRupiah(minNominal), inline: true },
          { name: '🔔 Mention Role', value: config.roleId ? `<@&${config.roleId}>` : '*(Tidak ada)*', inline: true },
          {
            name: '🔗 URL Webhook untuk Dashboard Saweria',
            value: `\`\`\`${webhookEndpoint}\`\`\``,
            inline: false
          }
        )
        .setFooter({ text: 'Gunakan /qsaweria test untuk mencoba mengirim notifikasi tes.' })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    // =============================================
    // SUBCOMMAND: SETWEBHOOK
    // =============================================
    if (sub === 'setwebhook') {
      const webhookUrl = interaction.options.getString('url').trim();
      const minNominal = interaction.options.getInteger('min_nominal') ?? config.minAmount ?? 0;
      const mentionRole = interaction.options.getRole('mention_role');

      if (!webhookUrl.startsWith('https://discord.com/api/webhooks/')) {
        return interaction.reply({
          content: '❌ URL tidak valid! Format Discord Webhook harus diawali dengan `https://discord.com/api/webhooks/...`',
          flags: MessageFlags.Ephemeral
        });
      }

      config.webhookUrl = webhookUrl;
      config.enabled = true;
      config.minAmount = minNominal;
      if (mentionRole) config.roleId = mentionRole.id;

      saveGuildSetting(guildId, 'saweria', config);

      const embed = new EmbedBuilder()
        .setColor(0x57F287)
        .setTitle('✅ Discord Webhook URL Berhasil Disimpan!')
        .setDescription('Notifikasi donasi akan dikirim melalui Discord Webhook tersebut.')
        .addFields(
          { name: '💰 Minimal Donasi', value: formatRupiah(minNominal), inline: true },
          { name: '🔔 Mention Role', value: config.roleId ? `<@&${config.roleId}>` : '*(Tidak ada)*', inline: true },
          {
            name: '🔗 URL Webhook untuk Dashboard Saweria',
            value: `\`\`\`${webhookEndpoint}\`\`\``,
            inline: false
          }
        )
        .setFooter({ text: 'Gunakan /qsaweria test untuk menguji pengiriman.' })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    // =============================================
    // SUBCOMMAND: ENABLE
    // =============================================
    if (sub === 'enable') {
      if (!config.channelId && !config.webhookUrl) {
        return interaction.reply({
          content: '❌ Silakan atur channel terlebih dahulu dengan `/qsaweria setchannel` atau webhook dengan `/qsaweria setwebhook` sebelum mengaktifkan!',
          flags: MessageFlags.Ephemeral
        });
      }

      config.enabled = true;
      saveGuildSetting(guildId, 'saweria', config);

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x57F287)
            .setTitle('🟢 Notifikasi Saweria Diaktifkan')
            .setDescription(`Notifikasi donasi akan dikirim ke ${config.channelId ? `<#${config.channelId}>` : 'Discord Webhook'}.`)
        ]
      });
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
            .setTitle('🔴 Notifikasi Saweria Dinonaktifkan')
            .setDescription('Notifikasi donasi dari Saweria untuk server ini telah dijeda.')
        ]
      });
    }

    // =============================================
    // SUBCOMMAND: STATUS
    // =============================================
    if (sub === 'status') {
      const port = process.env.SAWERIA_PORT || 3000;
      const statusText = config.enabled ? '🟢 **Aktif**' : '🔴 **Nonaktif**';
      const targetText = config.channelId
        ? `<#${config.channelId}>`
        : config.webhookUrl
        ? '`Terkonfigurasi (Discord Webhook URL)`'
        : '*(Belum diatur)*';

      const embed = new EmbedBuilder()
        .setColor(0xFAAE2B)
        .setTitle('📊 Konfigurasi Integrasi Saweria')
        .setDescription('Detail konfigurasi penerimaan notifikasi donasi Saweria untuk server ini.')
        .addFields(
          { name: 'Status Fitur', value: statusText, inline: true },
          { name: 'Target Channel / Webhook', value: targetText, inline: true },
          { name: 'Minimal Nominal', value: formatRupiah(config.minAmount || 0), inline: true },
          { name: 'Mention Role', value: config.roleId ? `<@&${config.roleId}>` : '*(Tidak ada)*', inline: true },
          { name: 'Port Listener Lokal', value: `\`Port ${port}\``, inline: true },
          { name: 'Proteksi Token Secret', value: secret ? '🔒 `Aktif (Protected)`' : '🔓 `Nonaktif (Public)`', inline: true },
          {
            name: '📋 Salin URL Webhook Ini ke Dashboard Saweria:',
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
      if (!config.channelId && !config.webhookUrl) {
        return interaction.reply({
          content: '❌ Kamu belum mengatur channel atau webhook! Jalankan `/qsaweria setchannel` terlebih dahulu.',
          flags: MessageFlags.Ephemeral
        });
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const nominal = interaction.options.getInteger('nominal') || 25000;
      const donatur = interaction.options.getString('donatur') || 'Sultan Dermawan';
      const pesan = interaction.options.getString('pesan') || 'Semangat terus min, semoga bot dan servernya semakin ramai! ❤️';

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
          content: `✅ **Simulasi Tes Berhasil!** Notifikasi tes telah dikirimkan ke ${config.channelId ? `<#${config.channelId}>` : 'Discord Webhook'}. Silakan periksa channel tersebut.`
        });
      } else {
        return interaction.editReply({
          content: `⚠️ **Simulasi Gagal Dikirim.** Alasan:\n- ${result.errors.join('\n- ') || 'Pastikan channel masih ada dan bot memiliki permission Send Messages & Embed Links.'}`
        });
      }
    }

    // =============================================
    // SUBCOMMAND: GUIDE
    // =============================================
    if (sub === 'guide') {
      const embed = new EmbedBuilder()
        .setColor(0xFAAE2B)
        .setAuthor({ name: 'PANDUAN INTEGRASI SAWERIA KE DISCORD', iconURL: 'https://saweria.co/favicon.ico' })
        .setTitle('Cara Menghubungkan Donasi Saweria ke Server Ini')
        .setDescription(
          `Ikuti langkah-langkah mudah berikut untuk mengaktifkan notifikasi donasi otomatis setiap kali ada yang menyumbang di Saweria Anda:`
        )
        .addFields(
          {
            name: '1️⃣ Atur Channel di Server',
            value: 'Tentukan channel tempat bot memposting notifikasi dengan perintah:\n`/qsaweria setchannel channel:#donasi`'
          },
          {
            name: '2️⃣ Salin URL Webhook Bot',
            value: `Salin URL webhook server bot berikut:\n\`\`\`${webhookEndpoint}\`\`\``
          },
          {
            name: '3️⃣ Buka Dashboard Saweria',
            value: [
              '• Login ke akun Saweria kamu di [saweria.co](https://saweria.co)',
              '• Masuk ke menu **Integrasi** (atau **Webhook** di pengaturan)',
              '• Tempelkan (Paste) URL webhook di atas ke kolom Webhook URL Saweria',
              '• Klik **Simpan** / **Update**'
            ].join('\n')
          },
          {
            name: '4️⃣ Uji Coba Pengiriman',
            value: 'Jalankan `/qsaweria test` di server ini, atau gunakan tombol **Kirim Tes** di dashboard Saweria untuk memastikan integrasi berjalan sempurna! 🎉'
          }
        )
        .setFooter({ text: 'Memerlukan bantuan teknis? Hubungi Bot Developer / Server Owner.' });

      return interaction.reply({ embeds: [embed] });
    }
  }
};
