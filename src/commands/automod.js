const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const storage = require('../utils/storage');
const { getGuildAutomodSettings, DEFAULT_BAD_WORDS } = require('../utils/automod');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('automod')
    .setDescription('Kelola sistem keamanan Anti-Phishing dan filter kata tidak pantas')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub =>
      sub
        .setName('status')
        .setDescription('Lihat status dan konfigurasi Auto-Moderation server')
    )
    .addSubcommand(sub =>
      sub
        .setName('toggle')
        .setDescription('Aktifkan atau nonaktifkan modul keamanan Auto-Moderation')
        .addStringOption(opt =>
          opt
            .setName('fitur')
            .setDescription('Pilih fitur yang ingin diubah statusnya')
            .setRequired(true)
            .addChoices(
              { name: 'Semua Fitur Auto-Mod', value: 'all' },
              { name: 'Anti-Phishing & Scam Links', value: 'phishing' },
              { name: 'Filter Kata Kurang Pantas', value: 'badwords' },
              { name: 'Auto-Timeout Phishing Sender', value: 'timeout' }
            )
        )
        .addBooleanOption(opt =>
          opt
            .setName('status')
            .setDescription('Aktif (True) atau Nonaktif (False)')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('addword')
        .setDescription('Tambahkan kata terlarang khusus untuk server ini')
        .addStringOption(opt =>
          opt
            .setName('kata')
            .setDescription('Kata yang ingin dilarang')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('delword')
        .setDescription('Hapus kata dari daftar kata terlarang')
        .addStringOption(opt =>
          opt
            .setName('kata')
            .setDescription('Kata yang ingin dihapus')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('whitelist')
        .setDescription('Izinkan kata tertentu agar tidak pernah dideteksi/dihapus oleh bot')
        .addStringOption(opt =>
          opt
            .setName('kata')
            .setDescription('Kata yang ingin diizinkan')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('listwords')
        .setDescription('Lihat daftar kata terlarang dan whitelist khusus server')
    )
    .addSubcommand(sub =>
      sub
        .setName('setlog')
        .setDescription('Atur channel untuk notifikasi log tindakan Auto-Moderation')
        .addChannelOption(opt =>
          opt
            .setName('channel')
            .setDescription('Pilih channel log audit')
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({
        content: 'Kamu memerlukan izin **Manage Server** untuk mengelola pengaturan Auto-Moderation.',
        flags: MessageFlags.Ephemeral
      });
    }

    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;
    const allSettings = storage.read('settings') || {};
    if (!allSettings[guildId]) allSettings[guildId] = {};

    // ═══ 1. STATUS ═══
    if (sub === 'status') {
      const config = getGuildAutomodSettings(guildId);
      const logChannelText = config.logChannelId ? `<#${config.logChannelId}>` : 'Belum diatur';

      const statusEmbed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setAuthor({
          name: `STATUS AUTO-MODERATION — ${interaction.guild.name.toUpperCase()}`,
          iconURL: interaction.guild.iconURL({ dynamic: true }) || undefined
        })
        .setTitle('Konfigurasi Keamanan Server')
        .setDescription(
          `• **Sistem Auto-Mod:** \`${config.enabled ? 'AKTIF' : 'NONAKTIF'}\`\n` +
          `• **Proteksi Anti-Phishing:** \`${config.antiPhishing ? 'AKTIF' : 'NONAKTIF'}\`\n` +
          `• **Filter Kata Kurang Pantas:** \`${config.badWords ? 'AKTIF' : 'NONAKTIF'}\`\n` +
          `• **Auto-Timeout Phishing (1 Jam):** \`${config.timeoutOnPhishing ? 'AKTIF' : 'NONAKTIF'}\`\n` +
          `• **Channel Log Audit:** ${logChannelText}\n` +
          `• **Kata Terlarang Khusus:** \`${config.customBadWords.length} kata\`\n` +
          `• **Kata Diizinkan (Whitelist):** \`${config.whitelistedWords.length} kata\`\n` +
          `• **Daftar Kata Terlarang Default:** \`${DEFAULT_BAD_WORDS.length} kata bawaan\`\n\n` +
          `Gunakan \`/automod toggle\` untuk mengubah pengaturan fitur.`
        )
        .setFooter({ text: 'Sistem Keamanan Otomatis Server' })
        .setTimestamp();

      return interaction.reply({ embeds: [statusEmbed] });
    }

    // ═══ 2. TOGGLE ═══
    if (sub === 'toggle') {
      const feature = interaction.options.getString('fitur');
      const status = interaction.options.getBoolean('status');

      if (feature === 'all') allSettings[guildId].automodEnabled = status;
      if (feature === 'phishing') allSettings[guildId].antiPhishing = status;
      if (feature === 'badwords') allSettings[guildId].badWords = status;
      if (feature === 'timeout') allSettings[guildId].timeoutOnPhishing = status;

      storage.write('settings', allSettings);

      const toggleEmbed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setDescription(`**Pengaturan Diperbarui.** Fitur \`${feature}\` telah diatur ke \`${status ? 'AKTIF' : 'NONAKTIF'}\`.`);

      return interaction.reply({ embeds: [toggleEmbed] });
    }

    // ═══ 3. ADD WORD ═══
    if (sub === 'addword') {
      const word = interaction.options.getString('kata').toLowerCase().trim();
      const customWords = allSettings[guildId].customBadWords || [];

      if (customWords.includes(word)) {
        return interaction.reply({
          content: `Kata \`${word}\` sudah ada di dalam daftar kata terlarang server ini.`,
          flags: MessageFlags.Ephemeral
        });
      }

      // Hapus dari whitelist jika sebelumnya pernah diwhitelist
      if (allSettings[guildId].whitelistedWords) {
        allSettings[guildId].whitelistedWords = allSettings[guildId].whitelistedWords.filter(w => w !== word);
      }

      customWords.push(word);
      allSettings[guildId].customBadWords = customWords;
      storage.write('settings', allSettings);

      const addEmbed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setDescription(`**Kata Ditambahkan.** Kata \`${word}\` sekarang dilarang di server ini.`);

      return interaction.reply({ embeds: [addEmbed] });
    }

    // ═══ 4. DELETE WORD ═══
    if (sub === 'delword') {
      const word = interaction.options.getString('kata').toLowerCase().trim();
      let customWords = allSettings[guildId].customBadWords || [];

      if (!customWords.includes(word)) {
        let whitelisted = allSettings[guildId].whitelistedWords || [];
        if (!whitelisted.includes(word)) {
          whitelisted.push(word);
          allSettings[guildId].whitelistedWords = whitelisted;
          storage.write('settings', allSettings);
          return interaction.reply({
            embeds: [
              new EmbedBuilder()
                .setColor(0x2B2D31)
                .setDescription(`Kata \`${word}\` telah diizinkan (dimasukkan ke whitelist).`)
            ]
          });
        }
      }

      customWords = customWords.filter(w => w !== word);
      allSettings[guildId].customBadWords = customWords;
      storage.write('settings', allSettings);

      const delEmbed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setDescription(`Kata \`${word}\` telah dihapus dari daftar kata terlarang.`);

      return interaction.reply({ embeds: [delEmbed] });
    }

    // ═══ 5. WHITELIST WORD ═══
    if (sub === 'whitelist') {
      const word = interaction.options.getString('kata').toLowerCase().trim();
      let whitelisted = allSettings[guildId].whitelistedWords || [];

      if (allSettings[guildId].customBadWords) {
        allSettings[guildId].customBadWords = allSettings[guildId].customBadWords.filter(w => w !== word);
      }

      if (!whitelisted.includes(word)) {
        whitelisted.push(word);
        allSettings[guildId].whitelistedWords = whitelisted;
        storage.write('settings', allSettings);
      }

      const wlEmbed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setDescription(`**Kata Diizinkan (Whitelist).** Kata \`${word}\` tidak akan pernah dideteksi/dihapus oleh bot.`);

      return interaction.reply({ embeds: [wlEmbed] });
    }

    // ═══ 6. LIST WORDS ═══
    if (sub === 'listwords') {
      const customWords = allSettings[guildId].customBadWords || [];
      const whitelisted = allSettings[guildId].whitelistedWords || [];

      const customText = customWords.length > 0 ? customWords.map(w => `• \`${w}\``).join('\n') : '*Belum ada kata terlarang khusus*';
      const wlText = whitelisted.length > 0 ? whitelisted.map(w => `• \`${w}\``).join('\n') : '*Belum ada kata di whitelist*';

      const listEmbed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setTitle('Daftar Kata Terlarang & Whitelist Server')
        .addFields(
          { name: `Kata Terlarang Khusus (${customWords.length})`, value: customText, inline: true },
          { name: `Kata Diizinkan / Whitelist (${whitelisted.length})`, value: wlText, inline: true }
        )
        .setFooter({ text: 'Gunakan /automod whitelist [kata] untuk mengizinkan kata' });

      return interaction.reply({ embeds: [listEmbed], flags: MessageFlags.Ephemeral });
    }

    // ═══ 7. SET LOG CHANNEL ═══
    if (sub === 'setlog') {
      const channel = interaction.options.getChannel('channel');
      allSettings[guildId].modLogChannelId = channel.id;
      storage.write('settings', allSettings);

      const logEmbed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setDescription(`**Channel Log Diatur.** Seluruh log tindakan Auto-Moderation akan dikirim ke <#${channel.id}>.`);

      return interaction.reply({ embeds: [logEmbed] });
    }
  }
};
