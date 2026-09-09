const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ChannelType,
  MessageFlags
} = require('discord.js');
const storage = require('../utils/storage');
const { isOwnerOrMod, replyNoAccessMod } = require('../utils/helpers');
const {
  getCleanMemberName,
  getRandomVoiceGreeting,
  playVoiceAudio,
  userCooldowns,
  channelDebounce,
  USER_COOLDOWN_MS
} = require('../utils/voiceWelcome');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('voicewelcome')
    .setDescription('Pengaturan dan pengujian sapaan suara AI perempuan di Voice Channel')
    .addSubcommand(sub =>
      sub
        .setName('status')
        .setDescription('Lihat status dan konfigurasi Voice Welcome AI di server ini')
    )
    .addSubcommand(sub =>
      sub
        .setName('toggle')
        .setDescription('Aktifkan atau nonaktifkan fitur Voice Welcome AI (Mod/Admin)')
        .addBooleanOption(opt =>
          opt
            .setName('status')
            .setDescription('Aktif (True) atau Nonaktif (False)')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('setchannel')
        .setDescription('Kunci sapaan di VC tertentu atau kosongkan untuk semua VC (Mod/Admin)')
        .addChannelOption(opt =>
          opt
            .setName('channel')
            .setDescription('Pilih voice channel (kosongkan untuk aktif di semua VC)')
            .addChannelTypes(ChannelType.GuildVoice, ChannelType.GuildStageVoice)
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('test')
        .setDescription('Uji coba sapaan suara AI perempuan langsung di Voice Channel kamu!')
    ),

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    const allSettings = storage.read('settings') || {};
    const guildSettings = allSettings[guildId] || {};
    const vwConfig = guildSettings.voiceWelcome || { enabled: true, specificChannelId: null };

    // ─── 1. SUBCOMMAND: STATUS ───
    if (sub === 'status') {
      const isEnabled = vwConfig.enabled !== false;
      const targetChannelText = vwConfig.specificChannelId
        ? `<#${vwConfig.specificChannelId}>`
        : '🌐 **Semua Saluran Voice (Otomatis)**';

      const embed = new EmbedBuilder()
        .setColor(isEnabled ? 0x57F287 : 0xED4245)
        .setAuthor({
          name: `Konfigurasi Voice Welcome AI — ${interaction.guild.name}`,
          iconURL: interaction.guild.iconURL({ dynamic: true }) || client.user.displayAvatarURL()
        })
        .setTitle('🎙️ Voice Welcome AI System')
        .setDescription(
          `Sistem sapaan audio AI perempuan otomatis berbahasa Indonesia saat member bergabung ke Voice Channel.\n\n` +
          `• **Status Fitur:** ${isEnabled ? '🟢 **AKTIF (Enabled)**' : '🔴 **NONAKTIF (Disabled)**'}\n` +
          `• **Cakupan Saluran:** ${targetChannelText}\n` +
          `• **Tipe Suara:** 👩 AI Perempuan (Bahasa Indonesia Natural)\n` +
          `• **Cooldown Member:** \`15 Menit\` *(Mencegah spam saat reconnect)*\n` +
          `• **Jeda Saluran:** \`15 Detik\` *(Mencegah benturan suara banyak orang)*\n` +
          `• **Anti-Troll Flood:** 🚨 **Aktif** *(>3x join dalam 10s = Timeout 3m & Mod Log)*\n` +
          `• **DisTube Music Guard:** 🛡️ **Aktif** *(Tidak pernah menimpa lagu yang sedang diputar)*\n` +
          `• **Auto-Leave:** 🚪 **Aktif** *(Bot langsung pamit 1.2 detik setelah menyapa)*`
        )
        .addFields(
          {
            name: '✦ Perintah Pengaturan',
            value: [
              '• `/voicewelcome test` — Coba dengar sapaan langsung di voice kamu.',
              '• `/voicewelcome toggle [true/false]` — Aktifkan / matikan fitur (Mod/Admin).',
              '• `/voicewelcome setchannel [channel]` — Batasi ke channel tertentu atau reset ke semua VC.'
            ].join('\n'),
            inline: false
          }
        )
        .setFooter({ text: 'Bekerja secara otomatis di seluruh Voice Channel tanpa perlu setup manual' })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    // ─── 2. SUBCOMMAND: TOGGLE (Mod/Admin Only) ───
    if (sub === 'toggle') {
      const isAuthorized = await isOwnerOrMod(interaction, client);
      if (!isAuthorized) return replyNoAccessMod(interaction);

      const enableState = interaction.options.getBoolean('status');
      vwConfig.enabled = enableState;

      storage.saveGuildSetting(guildId, 'voiceWelcome', vwConfig);

      const embed = new EmbedBuilder()
        .setColor(enableState ? 0x57F287 : 0xED4245)
        .setTitle(enableState ? '✅ Voice Welcome AI Diaktifkan' : '🛑 Voice Welcome AI Dinonaktifkan')
        .setDescription(
          enableState
            ? 'Bot akan menyapa member baru dengan suara AI perempuan ramah saat masuk ke Voice Channel.'
            : 'Sapaan suara AI dinonaktifkan untuk server ini.'
        )
        .setFooter({ text: `Diubah oleh ${interaction.user.tag}` })
        .setTimestamp();

      return interaction.reply({ embeds: [embed] });
    }

    // ─── 3. SUBCOMMAND: SETCHANNEL (Mod/Admin Only) ───
    if (sub === 'setchannel') {
      const isAuthorized = await isOwnerOrMod(interaction, client);
      if (!isAuthorized) return replyNoAccessMod(interaction);

      const chosenChannel = interaction.options.getChannel('channel');

      if (chosenChannel) {
        vwConfig.specificChannelId = chosenChannel.id;
        storage.saveGuildSetting(guildId, 'voiceWelcome', vwConfig);

        const embed = new EmbedBuilder()
          .setColor(0x5865F2)
          .setTitle('🎯 Saluran Khusus Voice Welcome Diatur')
          .setDescription(`Sapaan suara AI sekarang **hanya akan berbunyi** di saluran <#${chosenChannel.id}>.`)
          .setFooter({ text: 'Gunakan /voicewelcome setchannel tanpa memilih channel untuk reset ke semua VC' })
          .setTimestamp();

        return interaction.reply({ embeds: [embed] });
      } else {
        vwConfig.specificChannelId = null;
        storage.saveGuildSetting(guildId, 'voiceWelcome', vwConfig);

        const embed = new EmbedBuilder()
          .setColor(0x57F287)
          .setTitle('🌐 Saluran Voice Welcome Direset (Global)')
          .setDescription('Sapaan suara AI sekarang akan aktif secara otomatis di **seluruh Voice Channel** server!')
          .setTimestamp();

        return interaction.reply({ embeds: [embed] });
      }
    }

    // ─── 4. SUBCOMMAND: TEST ───
    if (sub === 'test') {
      const voiceChannel = interaction.member?.voice?.channel;
      if (!voiceChannel) {
        return interaction.reply({
          content: '❌ Kamu harus masuk ke salah satu **Voice Channel** terlebih dahulu untuk menguji sapaan suara!',
          flags: MessageFlags.Ephemeral
        });
      }

      // Cek izin bot di channel tersebut
      const perms = voiceChannel.permissionsFor(interaction.guild.members.me);
      if (!perms.has(PermissionFlagsBits.Connect) || !perms.has(PermissionFlagsBits.Speak)) {
        return interaction.reply({
          content: `❌ Bot tidak memiliki izin **Connect** atau **Speak** di saluran <#${voiceChannel.id}>!`,
          flags: MessageFlags.Ephemeral
        });
      }

      // Cek apakah sedang ada musik yang berputar
      const queue = client.distube?.getQueue(guildId);
      const isMusicPlaying = queue && queue.playing;
      const botCurrentVoiceChannelId = interaction.guild.members.me?.voice?.channelId;

      if (isMusicPlaying && botCurrentVoiceChannelId === voiceChannel.id) {
        return interaction.reply({
          content: '⚠️ Musik sedang diputar di voice channel ini! Untuk menjaga kualitas dengar, sapaan suara tidak dapat dimainkan saat musik aktif.',
          flags: MessageFlags.Ephemeral
        });
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      try {
        const cleanName = getCleanMemberName(interaction.member);
        const greetingText = getRandomVoiceGreeting(cleanName);

        // Langsung putar audio ke voice channel
        await playVoiceAudio(voiceChannel, greetingText, client);

        const embed = new EmbedBuilder()
          .setColor(0x57F287)
          .setTitle('🎙️ Sapaan Suara AI Berhasil Diputar!')
          .setDescription(
            `Bot telah bergabung ke <#${voiceChannel.id}> dan menyapa dengan suara perempuan:\n\n` +
            `> *" ${greetingText} "*\n\n` +
            `• **Panggilan Member:** \`${cleanName}\`\n` +
            `• **Bahasa:** Indonesia (Natural Female AI)\n` +
            `• Bot otomatis pamit dan keluar setelah sapaan selesai.`
          )
          .setFooter({ text: 'Voice Welcome AI — Uji Coba Suara' })
          .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
      } catch (err) {
        console.error('[Voice Welcome Test Error]:', err);
        return interaction.editReply({
          content: `❌ Terjadi kendala saat memutar sapaan suara: \`${err.message}\``
        });
      }
    }
  }
};
