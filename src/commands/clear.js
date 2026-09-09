const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags } = require('discord.js');
const { isOwnerOrMod } = require('../utils/helpers');
const { sendModLog } = require('../utils/modlog');

async function executeClear(interaction, client) {
  const subcommand = interaction.options.getSubcommand();

  // Cek permission user — owner bot / moderator selalu diizinkan
  const isAllowed = await isOwnerOrMod(interaction, client);
  if (!isAllowed && !interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
    return interaction.reply({
      content: 'Kamu tidak memiliki izin **Manage Messages** atau status Moderator untuk menggunakan perintah ini.',
      flags: MessageFlags.Ephemeral,
    });
  }

  // Tentukan channel target
  const targetChannel = interaction.options.getChannel('channel') || interaction.channel;

  // Cek apakah channel bisa dihapus pesannya (text/voice/thread)
  const validTypes = [
    ChannelType.GuildText,
    ChannelType.GuildVoice,
    ChannelType.PublicThread,
    ChannelType.PrivateThread,
  ];
  if (!validTypes.includes(targetChannel.type)) {
    return interaction.reply({
      content: `Channel <#${targetChannel.id}> tidak mendukung fitur penghapusan pesan.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  // Cek permission bot di channel target
  const botMember = interaction.guild.members.me;
  const botPerms = targetChannel.permissionsFor(botMember);
  if (!botPerms.has(PermissionFlagsBits.ManageMessages) || !botPerms.has(PermissionFlagsBits.ReadMessageHistory)) {
    return interaction.reply({
      content: `Bot tidak memiliki izin **Manage Messages** atau **Read Message History** di <#${targetChannel.id}>.`,
      flags: MessageFlags.Ephemeral,
    });
  }

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    if (subcommand === 'amount') {
      const jumlah = interaction.options.getInteger('jumlah');
      const deleted = await bulkDeleteMessages(targetChannel, jumlah);

      await sendModLog(interaction.guild, client, {
        action: 'CLEAR_MESSAGES',
        moderator: interaction.user,
        details: `Menghapus **${deleted}** pesan di <#${targetChannel.id}>`
      });

      return interaction.editReply({
        content: `Berhasil menghapus **${deleted}** pesan di <#${targetChannel.id}>.`,
      });

    } else if (subcommand === 'all') {
      await interaction.editReply({
        content: `Menghapus seluruh pesan di <#${targetChannel.id}>... Harap tunggu beberapa saat.`,
      });

      let totalDeleted = 0;
      let hasMore = true;

      while (hasMore) {
        const batch = await bulkDeleteMessages(targetChannel, 100);
        totalDeleted += batch;
        if (batch < 2) {
          hasMore = false;
        }
        await new Promise(r => setTimeout(r, 1200));
      }

      await sendModLog(interaction.guild, client, {
        action: 'CLEAR_MESSAGES',
        moderator: interaction.user,
        details: `Membersihkan seluruh chat: total **${totalDeleted}** pesan di <#${targetChannel.id}>`
      });

      return interaction.editReply({
        content: `Selesai! Total **${totalDeleted}** pesan berhasil dibersihkan dari <#${targetChannel.id}>.\n> *Pesan yang lebih dari 14 hari tidak dapat dihapus oleh Discord API.*`,
      });
    }

  } catch (error) {
    console.error('[Clear Command] Error:', error);
    let errMsg = `Terjadi kendala saat menghapus pesan: \`${error.message?.slice(0, 200)}\``;

    if (error.code === 50034) {
      errMsg = 'Tidak dapat menghapus pesan yang berusia lebih dari **14 hari** (limitasi resmi Discord API).';
    } else if (error.code === 50013) {
      errMsg = `Bot tidak memiliki izin yang cukup di <#${targetChannel.id}>.`;
    }

    return interaction.editReply({ content: errMsg });
  }
}

/**
 * Helper: Bulk delete pesan di sebuah channel
 */
async function bulkDeleteMessages(channel, limit) {
  const messages = await channel.messages.fetch({ limit });
  if (messages.size === 0) return 0;

  const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
  const deletable = messages.filter(m => m.createdTimestamp > twoWeeksAgo);

  if (deletable.size === 0) return 0;
  if (deletable.size === 1) {
    await deletable.first().delete();
    return 1;
  }

  const deleted = await channel.bulkDelete(deletable, true);
  return deleted.size;
}

function createClearSlashBuilder(name, description) {
  return new SlashCommandBuilder()
    .setName(name)
    .setDescription(description)
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addSubcommand(sub =>
      sub
        .setName('amount')
        .setDescription('Hapus sejumlah pesan tertentu')
        .addIntegerOption(opt =>
          opt
            .setName('jumlah')
            .setDescription('Jumlah pesan yang akan dihapus (1 - 100)')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(100)
        )
        .addChannelOption(opt =>
          opt
            .setName('channel')
            .setDescription('Channel target (opsional, default: channel saat ini)')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice, ChannelType.PublicThread, ChannelType.PrivateThread)
        )
    )
    .addSubcommand(sub =>
      sub
        .setName('all')
        .setDescription('Hapus SEMUA pesan di channel (maks 500 pesan sekaligus)')
        .addChannelOption(opt =>
          opt
            .setName('channel')
            .setDescription('Channel target (opsional, default: channel saat ini)')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildVoice, ChannelType.PublicThread, ChannelType.PrivateThread)
        )
    );
}

module.exports = [
  {
    data: createClearSlashBuilder('clear', 'Hapus pesan di channel (text atau voice chat)'),
    execute: executeClear
  },
  {
    data: createClearSlashBuilder('qclear', 'Hapus pesan di channel (alias untuk /clear)'),
    execute: executeClear
  }
];

