const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType, MessageFlags } = require('discord.js');
const { isBotOwner } = require('../utils/helpers');
const { saveGuildSetting } = require('../utils/storage');

const WELCOME_MESSAGES = [
  (name, server) => `Yooo **${name}** finally joined **${server}**! 🔥\nGlad you're here, gaskeunnn~ 🚀`,
  (name, server) => `Heyy **${name}**! Welcome to **${server}** bestie ✨\nJangan malu-malu ya, langsung gabung aja! 😄`,
  (name, server) => `Waduh ada **${name}** nyasar ke **${server}**! 👀\nYa udah, welcome! Semoga betah di sini bro/sis 🎉`,
  (name, server) => `Ayooo **${name}** udah join **${server}**! 🥳\nSiap-siap have fun bareng kita semua ngabbb~ 💫`,
  (name, server) => `Hai **${name}**! You made it to **${server}** 🎊\nSelamat datang, jangan lupa say hi! 👋`,
  (name, server) => `Welcome home, **${name}**! 🏠✨\nEnjoy your stay di **${server}**, semoga betah ya! 🙌`,
  (name, server) => `Akhirnya yang ditunggu-tunggu dateng juga! Selamat datang **${name}** di **${server}**! 🌟`,
  (name, server) => `Hello **${name}**! Baru landing di **${server}** nih? ✈️\nYuk langsung kenalan sama yang lain di chatroom! ☕`,
  (name, server) => `Welcome **${name}** to the club! 🎧🔥\nLet's make some good memories here in **${server}**! ⚡`,
  (name, server) => `Eh, ada member baru! Welcome **${name}** di **${server}**! 💫\nSering-sering mampir dan ngobrol yaa~`,
  (name, server) => `Warmest welcome to **${name}**! 🤗\nSelamat bergabung di keluarga besar **${server}**! ❤️`,
  (name, server) => `Look who just joined! It's **${name}**! 🤩✨\nWelcome to **${server}**, let's hang out! 🎮`,
  (name, server) => `Selamat datang **${name}**! Semoga **${server}** bisa jadi tempat seru buat kamu ya! 🚀🌈`,
  (name, server) => `Yuhuu **${name}** is here! 🥳🎉\nWelcome to **${server}**, have a great time! ✨`,
  (name, server) => `Welcome aboard, **${name}**! 🚢✨\nSelamat menjelajahi **${server}**, enjoy the vibe! 🍃`,
];

const qwelcome = {
  data: new SlashCommandBuilder()
    .setName('qwelcome')
    .setDescription('Setting pesan sambutan untuk member baru')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub =>
      sub
        .setName('setchannel')
        .setDescription('Atur channel untuk pesan sambutan member baru')
        .addChannelOption(opt =>
          opt
            .setName('channel')
            .setDescription('Channel tempat pesan sambutan dikirim')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('enable')
        .setDescription('Aktifkan fitur sambutan member baru')
    )
    .addSubcommand(sub =>
      sub
        .setName('disable')
        .setDescription('Matikan fitur sambutan member baru')
    )
    .addSubcommand(sub =>
      sub
        .setName('test')
        .setDescription('Coba kirim pesan sambutan sekarang (preview)')
    )
    .addSubcommand(sub =>
      sub
        .setName('status')
        .setDescription('Lihat status & konfigurasi sambutan saat ini')
    ),

  async execute(interaction, client) {
    // Cek apakah user adalah owner bot
    const isOwner = await isBotOwner(interaction, client);
    if (!isOwner) {
      return interaction.reply({
        content: '❌ Perintah ini hanya bisa digunakan oleh Owner bot!',
        flags: MessageFlags.Ephemeral,
      });
    }

    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    // Pastikan Map welcomeSettings ada
    if (!client.welcomeSettings) client.welcomeSettings = new Map();

    const config = client.welcomeSettings.get(guildId) || { enabled: false, channelId: null };

    // === SET CHANNEL ===
    if (sub === 'setchannel') {
      const channel = interaction.options.getChannel('channel');

      // Cek permission bot di channel
      const botPerms = channel.permissionsFor(interaction.guild.members.me);
      if (!botPerms.has(PermissionFlagsBits.SendMessages) || !botPerms.has(PermissionFlagsBits.EmbedLinks)) {
        return interaction.reply({
          content: `❌ Bot tidak punya izin **Send Messages** atau **Embed Links** di <#${channel.id}>!`,
          flags: MessageFlags.Ephemeral,
        });
      }

      config.channelId = channel.id;
      config.enabled = true;
      client.welcomeSettings.set(guildId, config);
      saveGuildSetting(guildId, 'welcome', config);

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x57F287) // hijau
            .setTitle('✅ Channel Sambutan Diatur!')
            .setDescription(`Pesan sambutan akan dikirim ke <#${channel.id}> saat ada member baru bergabung.`)
            .setFooter({ text: 'Fitur sambutan otomatis aktif!' })
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    // === ENABLE ===
    if (sub === 'enable') {
      if (!config.channelId) {
        return interaction.reply({
          content: '❌ Belum ada channel yang diatur! Gunakan `/qwelcome setchannel` dulu.',
          flags: MessageFlags.Ephemeral,
        });
      }
      config.enabled = true;
      client.welcomeSettings.set(guildId, config);
      saveGuildSetting(guildId, 'welcome', config);
      return interaction.reply({
        content: `✅ Fitur sambutan **diaktifkan**! Pesan akan dikirim ke <#${config.channelId}>.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    // === DISABLE ===
    if (sub === 'disable') {
      config.enabled = false;
      client.welcomeSettings.set(guildId, config);
      saveGuildSetting(guildId, 'welcome', config);
      return interaction.reply({
        content: '🔕 Fitur sambutan **dimatikan**. Tidak ada pesan sambutan yang akan dikirim.',
        flags: MessageFlags.Ephemeral,
      });
    }

    // === STATUS ===
    if (sub === 'status') {
      const statusEmbed = new EmbedBuilder()
        .setColor(config.enabled ? 0x57F287 : 0xED4245)
        .setTitle('📋 Status Fitur Sambutan')
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
          }
        )
        .setFooter({ text: 'Gunakan /qwelcome setchannel untuk mengubah channel.' });

      return interaction.reply({ embeds: [statusEmbed], flags: MessageFlags.Ephemeral });
    }

    // === TEST (Preview) ===
    if (sub === 'test') {
      if (!config.channelId) {
        return interaction.reply({
          content: '❌ Belum ada channel yang diatur! Gunakan `/qwelcome setchannel` dulu.',
          flags: MessageFlags.Ephemeral,
        });
      }

      const channel = interaction.guild.channels.cache.get(config.channelId);
      if (!channel) {
        return interaction.reply({
          content: '❌ Channel sambutan tidak ditemukan! Mungkin sudah dihapus. Atur ulang dengan `/qwelcome setchannel`.',
          flags: MessageFlags.Ephemeral,
        });
      }

      const member = interaction.member;
      const guild = interaction.guild;
      const memberCount = guild.memberCount;
      const avatarURL = member.user.displayAvatarURL({ dynamic: true, size: 256 });

      const randomMsg = WELCOME_MESSAGES[Math.floor(Math.random() * WELCOME_MESSAGES.length)];
      const colors = [0x5865F2, 0xFF6B6B, 0xFFD93D, 0x6BCB77, 0x4D96FF];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];

      const embed = new EmbedBuilder()
        .setColor(randomColor)
        .setAuthor({
          name: `👤 NEW MEMBER`,
          iconURL: avatarURL,
        })
        .setTitle(`👋 Welcome, ${member.user.username}!`)
        .setDescription(`${randomMsg(member.user.username, guild.name)}\n\n📌 Silakan baca info & peraturan di <#1489575354778648586>!`)
        .setThumbnail(avatarURL)
        .addFields(
          {
            name: '🪪 Member Ke',
            value: `**#${memberCount}**`,
            inline: true,
          },
          {
            name: '📅 Akun Dibuat',
            value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`,
            inline: true,
          }
        )
        .setFooter({
          text: `${guild.name} • Glad you're here! 🙌`,
          iconURL: guild.iconURL({ dynamic: true }) || undefined,
        })
        .setTimestamp();

      await channel.send({
        content: `👋 Selamat datang <@${member.user.id}>! Selamat bergabung di server. *(ini preview test)*`,
        embeds: [embed],
      });

      return interaction.reply({
        content: `✅ Preview sambutan berhasil dikirim ke <#${channel.id}>!`,
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};

module.exports = qwelcome;
