const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags } = require('discord.js');

const clear = {
  data: new SlashCommandBuilder()
    .setName('qclear')
    .setDescription('Hapus pesan di channel (text atau voice chat)')
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
    ),

  async execute(interaction, client) {
    const subcommand = interaction.options.getSubcommand();

    // Cek permission user
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return interaction.reply({
        content: '❌ Kamu tidak punya izin **Manage Messages** untuk menggunakan perintah ini!',
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
        content: `❌ Channel <#${targetChannel.id}> tidak mendukung fitur hapus pesan!`,
        flags: MessageFlags.Ephemeral,
      });
    }

    // Cek permission bot di channel target
    const botMember = interaction.guild.members.me;
    const botPerms = targetChannel.permissionsFor(botMember);
    if (!botPerms.has(PermissionFlagsBits.ManageMessages) || !botPerms.has(PermissionFlagsBits.ReadMessageHistory)) {
      return interaction.reply({
        content: `❌ Bot tidak punya izin **Manage Messages** atau **Read Message History** di <#${targetChannel.id}>!`,
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      if (subcommand === 'amount') {
        const jumlah = interaction.options.getInteger('jumlah');
        const deleted = await bulkDeleteMessages(targetChannel, jumlah);
        return interaction.editReply({
          content: `🗑️ Berhasil menghapus **${deleted}** pesan di <#${targetChannel.id}>!`,
        });

      } else if (subcommand === 'all') {
        // Konfirmasi dulu sebelum hapus semua
        await interaction.editReply({
          content: `⚠️ Menghapus **SEMUA** pesan di <#${targetChannel.id}>... Harap tunggu, ini mungkin memakan waktu beberapa saat.`,
        });

        let totalDeleted = 0;
        let hasMore = true;

        while (hasMore) {
          const batch = await bulkDeleteMessages(targetChannel, 100);
          totalDeleted += batch;
          if (batch < 2) {
            // Kurang dari 2 pesan = channel hampir/sudah kosong, atau pesan terlalu lama (> 14 hari)
            hasMore = false;
          }
          // Delay kecil agar tidak kena rate limit Discord
          await new Promise(r => setTimeout(r, 1200));
        }

        return interaction.editReply({
          content: `🗑️ Selesai! Total **${totalDeleted}** pesan dihapus dari <#${targetChannel.id}>.\n> ⚠️ *Pesan yang lebih dari 14 hari tidak bisa dihapus oleh Discord (limitasi API).*`,
        });
      }

    } catch (error) {
      console.error('[Clear Command] Error:', error);
      let errMsg = `❌ Terjadi error saat menghapus pesan: \`${error.message?.slice(0, 200)}\``;

      if (error.code === 50034) {
        errMsg = '❌ Tidak bisa menghapus pesan yang lebih dari **14 hari**. Ini adalah limitasi dari Discord API.';
      } else if (error.code === 50013) {
        errMsg = `❌ Bot tidak punya izin yang cukup di <#${targetChannel.id}>.`;
      }

      return interaction.editReply({ content: errMsg });
    }
  },
};

/**
 * Helper: Bulk delete pesan di sebuah channel
 * @param {import('discord.js').TextChannel|import('discord.js').VoiceChannel} channel
 * @param {number} limit - jumlah pesan yang ingin dihapus (1-100)
 * @returns {Promise<number>} jumlah pesan yang berhasil dihapus
 */
async function bulkDeleteMessages(channel, limit) {
  const messages = await channel.messages.fetch({ limit });
  if (messages.size === 0) return 0;

  // Filter hanya pesan yang lebih muda dari 14 hari (limitasi Discord)
  const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
  const deletable = messages.filter(m => m.createdTimestamp > twoWeeksAgo);

  if (deletable.size === 0) return 0;
  if (deletable.size === 1) {
    // bulkDelete butuh min 2 pesan, hapus manual kalau cuma 1
    await deletable.first().delete();
    return 1;
  }

  const deleted = await channel.bulkDelete(deletable, true);
  return deleted.size;
}

module.exports = clear;
