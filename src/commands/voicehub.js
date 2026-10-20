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
const { buildVoiceLoungePanelEmbed, buildVoiceLoungeButtons } = require('../utils/dynamicVoice');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('voicehub')
    .setDescription('Pengaturan pusat ruang suara mandiri (Dynamic Voice Lounge)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand(sub =>
      sub
        .setName('panel')
        .setDescription('Kirim embed panel pembuatan ruang suara ke channel')
        .addChannelOption(opt =>
          opt
            .setName('channel')
            .setDescription('Channel tujuan penempatan panel (default: channel saat ini)')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false)
        )
        .addChannelOption(opt =>
          opt
            .setName('kategori')
            .setDescription('Kategori tempat room suara baru akan dibuat')
            .addChannelTypes(ChannelType.GuildCategory)
            .setRequired(false)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('status')
        .setDescription('Tinjau daftar ruang suara mandiri yang sedang aktif')
    ),

  async execute(interaction, client) {
    if (!await isOwnerOrMod(interaction, client)) {
      return replyNoAccessMod(interaction);
    }

    const sub = interaction.options.getSubcommand();
    const guild = interaction.guild;
    const guildId = guild.id;

    // === 1. PANEL ===
    if (sub === 'panel') {
      const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
      const targetCategory = interaction.options.getChannel('kategori');

      const botPerms = targetChannel.permissionsFor(guild.members.me);
      if (!botPerms.has(PermissionFlagsBits.SendMessages) || !botPerms.has(PermissionFlagsBits.EmbedLinks)) {
        return interaction.reply({
          content: `Bot membutuhkan izin **Send Messages** dan **Embed Links** di <#${targetChannel.id}>.`,
          flags: MessageFlags.Ephemeral
        });
      }

      if (targetCategory) {
        saveGuildSetting(guildId, 'dynamicVoiceCategoryId', targetCategory.id);
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      const embed = buildVoiceLoungePanelEmbed(guild);
      const components = buildVoiceLoungeButtons();

      await targetChannel.send({ embeds: [embed], components });

      return interaction.editReply({
        content: `Panel Voice Lounge berhasil disematkan di <#${targetChannel.id}>.${targetCategory ? ` Room baru akan dibuat di kategori **${targetCategory.name}**.` : ''}`
      });
    }

    // === 2. STATUS ===
    if (sub === 'status') {
      const dynamicVoiceData = storage.read('dynamic_voice');
      const guildRooms = dynamicVoiceData[guildId] || {};
      const activeRoomIds = Object.keys(guildRooms);

      if (activeRoomIds.length === 0) {
        return interaction.reply({
          content: 'Saat ini tidak ada ruang suara mandiri yang sedang aktif.',
          flags: MessageFlags.Ephemeral
        });
      }

      const roomLines = activeRoomIds.map((chId, idx) => {
        const room = guildRooms[chId];
        const ch = guild.channels.cache.get(chId);
        const memberCount = ch ? ch.members.size : 0;
        return `**${idx + 1}.** <#${chId}> — Pemilik: <@${room.ownerId}> (\`${room.type.toUpperCase()}\`, **${memberCount}** peserta)`;
      });

      const embed = new EmbedBuilder()
        .setColor(0x2B2D31)
        .setAuthor({
          name: 'VOICE LOUNGE | STATUS RUANGAN AKTIF',
          iconURL: guild.iconURL({ dynamic: true }) || undefined
        })
        .setTitle(`Daftar Ruang Suara Aktif — ${guild.name}`)
        .setDescription(roomLines.join('\n'))
        .setFooter({ text: `Total ${activeRoomIds.length} ruangan aktif` })
        .setTimestamp();

      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }
  }
};
