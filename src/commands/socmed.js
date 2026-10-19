const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  MessageFlags,
  EmbedBuilder
} = require('discord.js');
const { isOwnerOrMod, replyNoAccessMod } = require('../utils/helpers');
const {
  getSocmedConfig,
  saveSocmedConfig,
  sendSocmedNotification,
  checkAllGuilds,
  DEFAULT_ROLE_ID
} = require('../utils/socmedTracker');

const socmedCommand = {
  data: new SlashCommandBuilder()
    .setName('socmed')
    .setDescription('Kelola dan pantau notifikasi otomatis TikTok & Instagram')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    // 1. SUBCOMMAND: SETUP
    .addSubcommand(sub =>
      sub
        .setName('setup')
        .setDescription('Atur channel tujuan notifikasi TikTok, Instagram, dan role mention')
        .addChannelOption(opt =>
          opt
            .setName('tiktok')
            .setDescription('Channel khusus notifikasi TikTok (Live & Video)')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false)
        )
        .addChannelOption(opt =>
          opt
            .setName('instagram')
            .setDescription('Channel khusus notifikasi Instagram (Feed & Live)')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false)
        )
        .addChannelOption(opt =>
          opt
            .setName('channel_utama')
            .setDescription('Channel bersama untuk TikTok & Instagram (opsional jika tidak dipisah)')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false)
        )
        .addRoleOption(opt =>
          opt
            .setName('role')
            .setDescription(`Role yang di-mention (Default: <@&${DEFAULT_ROLE_ID}>)`)
            .setRequired(false)
        )
        .addBooleanOption(opt =>
          opt
            .setName('aktif')
            .setDescription('Aktifkan pemantau otomatis? (Default: Ya)')
            .setRequired(false)
        )
    )
    // 2. SUBCOMMAND: STATUS
    .addSubcommand(sub =>
      sub
        .setName('status')
        .setDescription('Lihat status konfigurasi dan akun yang sedang dipantau')
    )
    // 3. SUBCOMMAND GROUP: TIKTOK
    .addSubcommandGroup(group =>
      group
        .setName('tiktok')
        .setDescription('Kelola akun TikTok yang dipantau status Live-nya')
        .addSubcommand(sub =>
          sub
            .setName('add')
            .setDescription('Tambah akun TikTok untuk dipantau otomatis saat Live')
            .addStringOption(opt =>
              opt
                .setName('username')
                .setDescription('Username TikTok (misal: dwiyansyahku tanpa @)')
                .setRequired(true)
            )
        )
        .addSubcommand(sub =>
          sub
            .setName('remove')
            .setDescription('Hapus akun TikTok dari daftar pantauan')
            .addStringOption(opt =>
              opt
                .setName('username')
                .setDescription('Username TikTok yang ingin dihapus')
                .setRequired(true)
            )
        )
    )
    // 4. SUBCOMMAND GROUP: FEED
    .addSubcommandGroup(group =>
      group
        .setName('feed')
        .setDescription('Kelola RSS Feed / Bridge untuk postingan otomatis')
        .addSubcommand(sub =>
          sub
            .setName('add')
            .setDescription('Tambah RSS Feed akun Instagram atau TikTok')
            .addStringOption(opt =>
              opt
                .setName('platform')
                .setDescription('Platform konten')
                .setRequired(true)
                .addChoices(
                  { name: 'Instagram', value: 'instagram' },
                  { name: 'TikTok', value: 'tiktok' }
                )
            )
            .addStringOption(opt =>
              opt
                .setName('url')
                .setDescription('URL RSS Feed (misal dari RSS.app atau RSSHub)')
                .setRequired(true)
            )
            .addStringOption(opt =>
              opt
                .setName('nama')
                .setDescription('Label atau nama akun untuk feed ini')
                .setRequired(false)
            )
        )
        .addSubcommand(sub =>
          sub
            .setName('remove')
            .setDescription('Hapus RSS Feed dari pantauan')
            .addStringOption(opt =>
              opt
                .setName('url')
                .setDescription('URL feed yang ingin dihapus')
                .setRequired(true)
            )
        )
    )
    // 5. SUBCOMMAND: TEST
    .addSubcommand(sub =>
      sub
        .setName('test')
        .setDescription('Uji coba kirim kartu visual dan notifikasi ke channel yang telah diset')
        .addStringOption(opt =>
          opt
            .setName('platform')
            .setDescription('Pilih platform yang ingin diuji')
            .setRequired(true)
            .addChoices(
              { name: 'TikTok', value: 'tiktok' },
              { name: 'Instagram', value: 'instagram' }
            )
        )
        .addStringOption(opt =>
          opt
            .setName('tipe')
            .setDescription('Pilih jenis notifikasi')
            .setRequired(true)
            .addChoices(
              { name: 'Siaran Langsung (Live)', value: 'live' },
              { name: 'Konten Baru (Post / Reels)', value: 'post' }
            )
        )
    )
    // 6. SUBCOMMAND: POST (Manual Broadcast)
    .addSubcommand(sub =>
      sub
        .setName('post')
        .setDescription('Kirim pengumuman postingan baru secara langsung dengan Canvas estetik')
        .addStringOption(opt =>
          opt
            .setName('platform')
            .setDescription('Platform tujuan')
            .setRequired(true)
            .addChoices(
              { name: 'TikTok', value: 'tiktok' },
              { name: 'Instagram', value: 'instagram' }
            )
        )
        .addStringOption(opt =>
          opt
            .setName('link')
            .setDescription('Tautan postingan / video')
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt
            .setName('judul')
            .setDescription('Judul postingan')
            .setRequired(false)
        )
        .addStringOption(opt =>
          opt
            .setName('cuplikan')
            .setDescription('Review atau cuplikan caption konten')
            .setRequired(false)
        )
        .addAttachmentOption(opt =>
          opt
            .setName('gambar')
            .setDescription('Upload gambar thumbnail/cuplikan dari perangkatmu')
            .setRequired(false)
        )
    )
    // 7. SUBCOMMAND: LIVE (Manual Broadcast)
    .addSubcommand(sub =>
      sub
        .setName('live')
        .setDescription('Kirim pengumuman siaran langsung secara instan')
        .addStringOption(opt =>
          opt
            .setName('platform')
            .setDescription('Platform live')
            .setRequired(true)
            .addChoices(
              { name: 'TikTok', value: 'tiktok' },
              { name: 'Instagram', value: 'instagram' }
            )
        )
        .addStringOption(opt =>
          opt
            .setName('link')
            .setDescription('Tautan siaran langsung')
            .setRequired(true)
        )
        .addStringOption(opt =>
          opt
            .setName('judul')
            .setDescription('Judul sesi live')
            .setRequired(false)
        )
        .addAttachmentOption(opt =>
          opt
            .setName('gambar')
            .setDescription('Upload gambar cover live dari perangkatmu')
            .setRequired(false)
        )
    )
    // 8. SUBCOMMAND: CHECK
    .addSubcommand(sub =>
      sub
        .setName('check')
        .setDescription('Jalankan pemindaian akun dan feed sekarang secara manual')
    ),

  async execute(interaction, client) {
    if (!await isOwnerOrMod(interaction, client)) return replyNoAccessMod(interaction);

    const guildId = interaction.guild.id;
    const group = interaction.options.getSubcommandGroup(false);
    const sub = interaction.options.getSubcommand();
    const config = getSocmedConfig(guildId);

    // ==========================================
    // 1. SETUP
    // ==========================================
    if (sub === 'setup') {
      const chTiktok = interaction.options.getChannel('tiktok');
      const chInstagram = interaction.options.getChannel('instagram');
      const chUtama = interaction.options.getChannel('channel_utama');
      const role = interaction.options.getRole('role');
      const aktif = interaction.options.getBoolean('aktif') ?? true;

      if (!chTiktok && !chInstagram && !chUtama && !config.tiktokChannelId && !config.instagramChannelId && !config.channelId) {
        return interaction.reply({
          content: '❌ Harap tentukan minimal salah satu channel (`tiktok`, `instagram`, atau `channel_utama`).',
          flags: MessageFlags.Ephemeral
        });
      }

      if (chTiktok) config.tiktokChannelId = chTiktok.id;
      if (chInstagram) config.instagramChannelId = chInstagram.id;
      if (chUtama) config.channelId = chUtama.id;
      if (role) config.roleId = role.id;
      config.enabled = aktif;
      if (!Array.isArray(config.tiktok)) config.tiktok = [];
      if (!Array.isArray(config.feeds)) config.feeds = [];

      saveSocmedConfig(guildId, config);

      const ttText = config.tiktokChannelId ? `<#${config.tiktokChannelId}>` : (config.channelId ? `<#${config.channelId}> *(Utama)*` : '*Belum diset*');
      const igText = config.instagramChannelId ? `<#${config.instagramChannelId}>` : (config.channelId ? `<#${config.channelId}> *(Utama)*` : '*Belum diset*');
      const roleText = config.roleId ? `<@&${config.roleId}>` : `<@&${DEFAULT_ROLE_ID}>`;

      return interaction.reply({
        content:
          `✅ **Pengaturan Notifikasi Berhasil Disimpan**\n\n` +
          `• **Channel TikTok:** ${ttText}\n` +
          `• **Channel Instagram:** ${igText}\n` +
          `• **Role Mention:** ${roleText}\n` +
          `• **Status Pemantau:** \`${config.enabled ? 'Aktif' : 'Nonaktif'}\`\n\n` +
          `*Gunakan \`/socmed test\` untuk menguji tampilan pengiriman sekarang.*`,
        flags: MessageFlags.Ephemeral
      });
    }

    // ==========================================
    // 2. STATUS
    // ==========================================
    if (sub === 'status') {
      const ttText = config.tiktokChannelId ? `<#${config.tiktokChannelId}>` : (config.channelId ? `<#${config.channelId}> *(Channel Bersama)*` : '*Belum diatur*');
      const igText = config.instagramChannelId ? `<#${config.instagramChannelId}>` : (config.channelId ? `<#${config.channelId}> *(Channel Bersama)*` : '*Belum diatur*');
      const roleText = config.roleId ? `<@&${config.roleId}>` : `<@&${DEFAULT_ROLE_ID}>`;
      const statusText = config.enabled ? '🟢 Aktif' : '⚪ Nonaktif';

      const tiktokList = (config.tiktok && config.tiktok.length > 0)
        ? config.tiktok.map((t, i) => `${i + 1}. \`@${t.username}\` ${t.lastLive ? '*(Sedang Live)*' : ''}`).join('\n')
        : '*Belum ada akun TikTok terdaftar*';

      const feedList = (config.feeds && config.feeds.length > 0)
        ? config.feeds.map((f, i) => `${i + 1}. **${f.name || f.platform.toUpperCase()}** (${f.platform})\n   \`${f.url.slice(0, 50)}...\``).join('\n')
        : '*Belum ada RSS feed terdaftar*';

      const embed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setTitle('Konfigurasi Notifikasi Sosial Media')
        .setDescription(
          `**Pengaturan Channel & Peran:**\n` +
          `• Channel TikTok: ${ttText}\n` +
          `• Channel Instagram: ${igText}\n` +
          `• Role Mention: ${roleText}\n` +
          `• Pemantau Otomatis: ${statusText}\n\n` +
          `**Akun TikTok Dipantau (Live):**\n${tiktokList}\n\n` +
          `**Feed Postingan Dipantau (RSS / Bridge):**\n${feedList}`
        )
        .setFooter({ text: 'Qumpruy Broadcast Management' })
        .setTimestamp();

      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    // ==========================================
    // 3. TIKTOK GROUP
    // ==========================================
    if (group === 'tiktok') {
      if (sub === 'add') {
        const username = interaction.options.getString('username', true).replace(/^@/, '').trim();
        if (!Array.isArray(config.tiktok)) config.tiktok = [];

        if (config.tiktok.some(t => t.username.toLowerCase() === username.toLowerCase())) {
          return interaction.reply({
            content: `⚠️ Akun \`@${username}\` sudah ada di dalam daftar pantauan.`,
            flags: MessageFlags.Ephemeral
          });
        }

        config.tiktok.push({
          username: username,
          lastLive: false,
          lastRoomId: null
        });
        saveSocmedConfig(guildId, config);

        return interaction.reply({
          content: `✅ Akun TikTok **@${username}** berhasil ditambahkan ke pemantau Live otomatis.`,
          flags: MessageFlags.Ephemeral
        });
      }

      if (sub === 'remove') {
        const username = interaction.options.getString('username', true).replace(/^@/, '').trim();
        if (!Array.isArray(config.tiktok) || config.tiktok.length === 0) {
          return interaction.reply({ content: '⚠️ Belum ada akun TikTok yang terdaftar.', flags: MessageFlags.Ephemeral });
        }

        const initialLen = config.tiktok.length;
        config.tiktok = config.tiktok.filter(t => t.username.toLowerCase() !== username.toLowerCase());

        if (config.tiktok.length === initialLen) {
          return interaction.reply({ content: `⚠️ Akun \`@${username}\` tidak ditemukan di daftar pantauan.`, flags: MessageFlags.Ephemeral });
        }

        saveSocmedConfig(guildId, config);
        return interaction.reply({
          content: `✅ Akun TikTok **@${username}** telah dihapus dari daftar pantauan.`,
          flags: MessageFlags.Ephemeral
        });
      }
    }

    // ==========================================
    // 4. FEED GROUP
    // ==========================================
    if (group === 'feed') {
      if (sub === 'add') {
        const platform = interaction.options.getString('platform', true);
        const url = interaction.options.getString('url', true).trim();
        const nama = interaction.options.getString('nama') || `${platform.toUpperCase()} Feed`;

        if (!Array.isArray(config.feeds)) config.feeds = [];

        if (config.feeds.some(f => f.url === url)) {
          return interaction.reply({ content: '⚠️ URL feed tersebut sudah terdaftar.', flags: MessageFlags.Ephemeral });
        }

        config.feeds.push({
          platform: platform,
          url: url,
          name: nama,
          lastPostId: null
        });
        saveSocmedConfig(guildId, config);

        return interaction.reply({
          content: `✅ Feed **${nama}** (${platform}) berhasil ditambahkan ke pemantau postingan baru.`,
          flags: MessageFlags.Ephemeral
        });
      }

      if (sub === 'remove') {
        const url = interaction.options.getString('url', true).trim();
        if (!Array.isArray(config.feeds) || config.feeds.length === 0) {
          return interaction.reply({ content: '⚠️ Belum ada feed yang terdaftar.', flags: MessageFlags.Ephemeral });
        }

        const initialLen = config.feeds.length;
        config.feeds = config.feeds.filter(f => f.url !== url);

        if (config.feeds.length === initialLen) {
          return interaction.reply({ content: '⚠️ URL feed tersebut tidak ditemukan.', flags: MessageFlags.Ephemeral });
        }

        saveSocmedConfig(guildId, config);
        return interaction.reply({
          content: '✅ Feed berhasil dihapus dari pemantauan.',
          flags: MessageFlags.Ephemeral
        });
      }
    }

    // ==========================================
    // 5. TEST (SIMULATION)
    // ==========================================
    if (sub === 'test') {
      const platform = interaction.options.getString('platform', true);
      const tipe = interaction.options.getString('tipe', true);
      const isTikTok = platform === 'tiktok';
      const isLive = tipe === 'live';
      const targetChId = isTikTok ? (config.tiktokChannelId || config.channelId) : (config.instagramChannelId || config.channelId);

      if (!targetChId) {
        return interaction.reply({
          content: `❌ Harap tentukan channel untuk platform **${platform.toUpperCase()}** terlebih dahulu dengan perintah \`/socmed setup\`.`,
          flags: MessageFlags.Ephemeral
        });
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const sampleData = {
        platform: platform,
        type: tipe,
        author: isTikTok ? 'Qumpruy Official' : 'Qumpruy Community',
        handle: isTikTok ? '@qumpruy.official' : '@qumpruy.id',
        title: isLive ? 'Sesi Obrolan Santai & Musik Komunitas' : 'Cuplikan Highlights & Rilis Konten Terbaru',
        caption: isLive
          ? 'Ruang siaran telah resmi dibuka malam ini. Bergabunglah untuk mendengarkan lagu dan berbincang bersama teman-teman.'
          : 'Rekap momen terbaik dan kreasi visual terkini. Simak cuplikan lengkapnya melalui tautan resmi yang telah disediakan.',
        url: isTikTok ? 'https://www.tiktok.com' : 'https://www.instagram.com',
        extraInfo: isLive ? 'Siaran Langsung • Resolusi Tinggi' : 'Karya Visual Terbaru • 1080p'
      };

      const success = await sendSocmedNotification(client, guildId, sampleData);

      if (success) {
        return interaction.editReply({
          content: `✅ Uji coba pengiriman notifikasi **${platform.toUpperCase()} (${tipe.toUpperCase()})** berhasil dikirimkan ke <#${targetChId}>.`
        });
      } else {
        return interaction.editReply({
          content: `❌ Gagal mengirim notifikasi. Pastikan bot memiliki izin kirim pesan dan sematkan file di <#${targetChId}>.`
        });
      }
    }

    // ==========================================
    // 6. POST (MANUAL BROADCAST)
    // ==========================================
    if (sub === 'post') {
      const platform = interaction.options.getString('platform', true);
      const isTikTok = platform === 'tiktok';
      const targetChId = isTikTok ? (config.tiktokChannelId || config.channelId) : (config.instagramChannelId || config.channelId);

      if (!targetChId) {
        return interaction.reply({
          content: `❌ Harap tentukan channel untuk platform **${platform.toUpperCase()}** terlebih dahulu dengan perintah \`/socmed setup\`.`,
          flags: MessageFlags.Ephemeral
        });
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const link = interaction.options.getString('link', true);
      const judul = interaction.options.getString('judul') || 'Publikasi Konten Baru';
      const cuplikan = interaction.options.getString('cuplikan') || 'Simak karya visual terbaru hari ini melalui tautan resmi.';
      const attachment = interaction.options.getAttachment('gambar');

      const postData = {
        platform: platform,
        type: 'post',
        author: interaction.guild.name,
        handle: `@${platform}`,
        title: judul,
        caption: cuplikan,
        url: link,
        previewUrl: attachment?.url || null,
        extraInfo: 'Publikasi Resmi • Konten Baru'
      };

      const success = await sendSocmedNotification(client, guildId, postData);

      if (success) {
        return interaction.editReply({
          content: `✅ Pengumuman konten berhasil disiarkan ke <#${targetChId}>.`
        });
      } else {
        return interaction.editReply({
          content: `❌ Gagal mengirim pengumuman. Periksa izin bot di channel tujuan.`
        });
      }
    }

    // ==========================================
    // 7. LIVE (MANUAL BROADCAST)
    // ==========================================
    if (sub === 'live') {
      const platform = interaction.options.getString('platform', true);
      const isTikTok = platform === 'tiktok';
      const targetChId = isTikTok ? (config.tiktokChannelId || config.channelId) : (config.instagramChannelId || config.channelId);

      if (!targetChId) {
        return interaction.reply({
          content: `❌ Harap tentukan channel untuk platform **${platform.toUpperCase()}** terlebih dahulu dengan perintah \`/socmed setup\`.`,
          flags: MessageFlags.Ephemeral
        });
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const link = interaction.options.getString('link', true);
      const judul = interaction.options.getString('judul') || 'Siaran Langsung Sedang Mengudara';
      const attachment = interaction.options.getAttachment('gambar');

      const liveData = {
        platform: platform,
        type: 'live',
        author: interaction.guild.name,
        handle: `@${platform}`,
        title: judul,
        caption: 'Siaran langsung kini sedang berlangsung. Luangkan waktu dan mari bergabung bersama di ruang siaran.',
        url: link,
        previewUrl: attachment?.url || null,
        extraInfo: 'Siaran Langsung • Live Broadcast'
      };

      const success = await sendSocmedNotification(client, guildId, liveData);

      if (success) {
        return interaction.editReply({
          content: `✅ Pengumuman siaran langsung berhasil disiarkan ke <#${config.channelId}>.`
        });
      } else {
        return interaction.editReply({
          content: `❌ Gagal mengirim siaran. Periksa izin bot di channel tujuan.`
        });
      }
    }

    // ==========================================
    // 8. CHECK (MANUAL SCAN)
    // ==========================================
    if (sub === 'check') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      try {
        await checkAllGuilds(client);
        return interaction.editReply({
          content: '✅ Pemindaian otomatis akun dan feed selesai dijalankan.'
        });
      } catch (err) {
        return interaction.editReply({
          content: `⚠️ Terjadi kendala saat pemindaian: ${err.message}`
        });
      }
    }
  }
};

module.exports = socmedCommand;
