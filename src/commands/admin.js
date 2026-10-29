const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  EmbedBuilder
} = require('discord.js');
const { isOwnerOrMod } = require('../utils/helpers');
const {
  ADMIN_GUIDE_DATA,
  buildAdminPanelPayload,
  buildAdminCategoryEmbed,
  handleAdminButton
} = require('../utils/adminHelper');
const { sendModLog } = require('../utils/modlog');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('admin')
    .setDescription('Pusat Operasional, Direktori Panduan Seluruh Fitur, & Kontrol Administrator')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    // Subcommand: panel
    .addSubcommand(sub =>
      sub
        .setName('panel')
        .setDescription('Pasang atau tampilkan Panel Kontrol Administrator Interaktif')
        .addChannelOption(opt =>
          opt
            .setName('channel')
            .setDescription('Saluran khusus staf untuk memasang panel permanen (opsional)')
            .setRequired(false)
        )
        .addBooleanOption(opt =>
          opt
            .setName('private')
            .setDescription('Tampilkan hanya untuk diri sendiri (ephemeral)? Default: True')
            .setRequired(false)
        )
    )
    // Subcommand: guide
    .addSubcommand(sub =>
      sub
        .setName('guide')
        .setDescription('Buka direktori panduan cara memakai seluruh fitur bot di server')
        .addStringOption(opt =>
          opt
            .setName('category')
            .setDescription('Kategori fitur yang ingin dipelajari')
            .setRequired(false)
            .addChoices(
              { name: '👑 Gacha & Perebutan Kursi Tahta (Clash of Thrones 2.0)', value: 'gacha' },
              { name: '👹 World Boss Raid Multi-Party & Arena Duel', value: 'boss' },
              { name: '🪪 Member Identity Card & Galeri Server', value: 'card' },
              { name: '🎫 Community Desk & Tiket Pengaduan Staf', value: 'desk' },
              { name: '🛡️ Moderasi, Automod & Anti-Nuke', value: 'automod' },
              { name: '🔊 Dynamic Voice Channels & Musik 24/7', value: 'voice' },
              { name: '📊 Audit Undangan, Statistik & Cadangan Database', value: 'audit' },
              { name: '⏰ Pengumuman & Ucapan Otomatis (Schedulers)', value: 'schedulers' }
            )
        )
    )
    // Subcommand: sync
    .addSubcommand(sub =>
      sub
        .setName('sync')
        .setDescription('Sinkronkan paksa semua panel server (Hub Lounge, Leaderboard, Arena Duel)')
    )
    // Subcommand: reconcile
    .addSubcommand(sub =>
      sub
        .setName('reconcile')
        .setDescription('Audit diagnostik & tertibkan kursi tahta server serta Role Juara Top 1')
    )
    // Subcommand: backup
    .addSubcommand(sub =>
      sub
        .setName('backup')
        .setDescription('Buat file snapshot cadangan seluruh database JSON server seketika')
    )
    // Subcommand: broadcast
    .addSubcommand(sub =>
      sub
        .setName('broadcast')
        .setDescription('Kirim pengumuman resmi ber-embed dari server ke saluran pilihan')
        .addStringOption(opt =>
          opt.setName('title').setDescription('Judul pengumuman').setRequired(true)
        )
        .addStringOption(opt =>
          opt.setName('message').setDescription('Isi pesan pengumuman').setRequired(true)
        )
        .addChannelOption(opt =>
          opt.setName('channel').setDescription('Saluran target pengumuman (Default: Channel ini)').setRequired(false)
        )
        .addStringOption(opt =>
          opt
            .setName('ping')
            .setDescription('Mention yang disertakan')
            .setRequired(false)
            .addChoices(
              { name: 'Tanpa Ping (@none)', value: 'none' },
              { name: 'Ping @everyone', value: 'everyone' },
              { name: 'Ping @here', value: 'here' }
            )
        )
    ),

  async execute(interaction, client) {
    const isAuthorized = await isOwnerOrMod(interaction, client);
    if (!isAuthorized) {
      return interaction.reply({
        content: '❌ Perintah ini hanya bisa digunakan oleh **Owner Bot** atau **Administrator/Moderator** yang berwenang.',
        flags: MessageFlags.Ephemeral
      });
    }

    const sub = interaction.options.getSubcommand();

    // 1. SUBCOMMAND: PANEL
    if (sub === 'panel') {
      const targetChannel = interaction.options.getChannel('channel');
      const isPrivate = interaction.options.getBoolean('private') ?? (targetChannel ? false : true);

      const payload = buildAdminPanelPayload(interaction.guild, client);

      if (targetChannel) {
        if (!targetChannel.isTextBased() || targetChannel.isThread()) {
          return interaction.reply({
            content: '❌ Channel target harus berupa saluran teks biasa (bukan thread atau voice)!',
            flags: MessageFlags.Ephemeral
          });
        }
        const sent = await targetChannel.send(payload);
        return interaction.reply({
          content: `✅ Panel Kontrol Administrator berhasil dipasang di <#${targetChannel.id}>!\n🔗 [Buka Panel ↗](${sent.url})`,
          flags: MessageFlags.Ephemeral
        });
      }

      return interaction.reply({
        ...payload,
        flags: isPrivate ? MessageFlags.Ephemeral : undefined
      });
    }

    // 2. SUBCOMMAND: GUIDE
    if (sub === 'guide') {
      const category = interaction.options.getString('category');
      if (category) {
        const embed = buildAdminCategoryEmbed(category, interaction.guild);
        return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      }

      // Tampilkan Panel Utama dengan dropdown direktori
      const payload = buildAdminPanelPayload(interaction.guild, client);
      return interaction.reply({ ...payload, flags: MessageFlags.Ephemeral });
    }

    // 3. SUBCOMMAND: SYNC
    if (sub === 'sync') {
      interaction.customId = 'admin_btn_sync_panels';
      return handleAdminButton(interaction, client);
    }

    // 4. SUBCOMMAND: RECONCILE
    if (sub === 'reconcile') {
      interaction.customId = 'admin_btn_reconcile_roles';
      return handleAdminButton(interaction, client);
    }

    // 5. SUBCOMMAND: BACKUP
    if (sub === 'backup') {
      interaction.customId = 'admin_btn_backup';
      return handleAdminButton(interaction, client);
    }

    // 6. SUBCOMMAND: BROADCAST
    if (sub === 'broadcast') {
      const title = interaction.options.getString('title');
      const message = interaction.options.getString('message');
      const targetCh = interaction.options.getChannel('channel') || interaction.channel;
      const ping = interaction.options.getString('ping') || 'none';

      if (!targetCh.isTextBased() || targetCh.isThread()) {
        return interaction.reply({
          content: '❌ Saluran target harus berupa text channel yang valid!',
          flags: MessageFlags.Ephemeral
        });
      }

      let mentionContent = '';
      if (ping === 'everyone') mentionContent = '@everyone';
      else if (ping === 'here') mentionContent = '@here';

      const embed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setAuthor({
          name: `${interaction.guild.name.toUpperCase()} • PENGUMUMAN RESMI`,
          iconURL: interaction.guild.iconURL({ dynamic: true }) || undefined
        })
        .setTitle(title)
        .setDescription(message)
        .setFooter({ text: `Diumumkan oleh Staf: ${interaction.user.tag || interaction.user.username}` })
        .setTimestamp();

      const sent = await targetCh.send({
        content: mentionContent || undefined,
        embeds: [embed]
      });

      await sendModLog(interaction.guild, client, {
        action: 'ADMIN_BROADCAST',
        moderator: interaction.user,
        details: `Judul: "${title}" di <#${targetCh.id}>. Mention: ${ping}`
      });

      return interaction.reply({
        content: `✅ Pengumuman resmi berhasil dikirim ke <#${targetCh.id}>!\n🔗 [Buka Pesan ↗](${sent.url})`,
        flags: MessageFlags.Ephemeral
      });
    }
  }
};

