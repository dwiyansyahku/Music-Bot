const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');

// Sama persis dengan yang di guildMemberAdd.js supaya preview konsisten
const WELCOME_GIFS = [
  'https://media.tenor.com/ypA_veH6aogAAAAC/welcome-hi.gif',
  'https://media.tenor.com/jHEQTpIjJo0AAAAC/hi-wave.gif',
  'https://media.tenor.com/cFdCCXRNEd8AAAAC/hello-there-wave.gif',
  'https://media.tenor.com/0K7WbXxZnJoAAAAC/hello-wave.gif',
  'https://media.tenor.com/y8UVqflMWMcAAAAC/hello-hi.gif',
];
const WELCOME_MESSAGES = [
  (name, server) => `Yooo **${name}** finally joined **${server}**! 🔥\nGlad you're here, gaskeunnn~ 🚀`,
  (name, server) => `Heyy **${name}**! Welcome to **${server}** bestie ✨\nJangan malu-malu ya, langsung gabung aja! 😄`,
  (name, server) => `Waduh ada **${name}** nyasar ke **${server}**! 👀\nYa udah, welcome! Semoga betah di sini bro/sis 🎉`,
  (name, server) => `Ayooo **${name}** udah join **${server}**! 🥳\nSiap-siap have fun bareng kita semua ngabbb~ 💫`,
  (name, server) => `Hai **${name}**! You made it to **${server}** 🎊\nSelamat datang, jangan lupa say hi! 👋`,
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
          ephemeral: true,
        });
      }

      config.channelId = channel.id;
      config.enabled = true;
      client.welcomeSettings.set(guildId, config);

      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x57F287) // hijau
            .setTitle('✅ Channel Sambutan Diatur!')
            .setDescription(`Pesan sambutan akan dikirim ke <#${channel.id}> saat ada member baru bergabung.`)
            .setFooter({ text: 'Fitur sambutan otomatis aktif!' })
        ],
        ephemeral: true,
      });
    }

    // === ENABLE ===
    if (sub === 'enable') {
      if (!config.channelId) {
        return interaction.reply({
          content: '❌ Belum ada channel yang diatur! Gunakan `/qwelcome setchannel` dulu.',
          ephemeral: true,
        });
      }
      config.enabled = true;
      client.welcomeSettings.set(guildId, config);
      return interaction.reply({
        content: `✅ Fitur sambutan **diaktifkan**! Pesan akan dikirim ke <#${config.channelId}>.`,
        ephemeral: true,
      });
    }

    // === DISABLE ===
    if (sub === 'disable') {
      config.enabled = false;
      client.welcomeSettings.set(guildId, config);
      return interaction.reply({
        content: '🔕 Fitur sambutan **dimatikan**. Tidak ada pesan sambutan yang akan dikirim.',
        ephemeral: true,
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

      return interaction.reply({ embeds: [statusEmbed], ephemeral: true });
    }

    // === TEST (Preview) ===
    if (sub === 'test') {
      if (!config.channelId) {
        return interaction.reply({
          content: '❌ Belum ada channel yang diatur! Gunakan `/qwelcome setchannel` dulu.',
          ephemeral: true,
        });
      }

      const channel = interaction.guild.channels.cache.get(config.channelId);
      if (!channel) {
        return interaction.reply({
          content: '❌ Channel sambutan tidak ditemukan! Mungkin sudah dihapus. Atur ulang dengan `/qwelcome setchannel`.',
          ephemeral: true,
        });
      }

      const member = interaction.member;
      const guild = interaction.guild;
      const memberCount = guild.memberCount;
      const avatarURL = member.user.displayAvatarURL({ dynamic: true, size: 256 });

      const randomGif = WELCOME_GIFS[Math.floor(Math.random() * WELCOME_GIFS.length)];
      const randomMsg = WELCOME_MESSAGES[Math.floor(Math.random() * WELCOME_MESSAGES.length)];
      const colors = [0x5865F2, 0xFF6B6B, 0xFFD93D, 0x6BCB77, 0x4D96FF];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];

      const embed = new EmbedBuilder()
        .setColor(randomColor)
        .setAuthor({
          name: `✨ New member alert!`,
          iconURL: avatarURL,
        })
        .setTitle(`👋 Heyy, ${member.user.username}!`)
        .setDescription(randomMsg(member.user.username, guild.name))
        .setThumbnail(avatarURL)
        .setImage(randomGif)
        .addFields(
          {
            name: '🪪 Member ke-',
            value: `**#${memberCount}**`,
            inline: true,
          },
          {
            name: '📅 Join Discord',
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
        content: `🎊 yo yo yo, sambut <@${member.user.id}> yang baru join! **gass~** 🔥 *(ini preview test)*`,
        embeds: [embed],
      });

      return interaction.reply({
        content: `✅ Preview sambutan berhasil dikirim ke <#${channel.id}>!`,
        ephemeral: true,
      });
    }
  },
};

module.exports = qwelcome;
