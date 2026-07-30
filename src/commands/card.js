const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const storage = require('../utils/storage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('card')
    .setDescription('Tampilkan card profil member')
    .addUserOption(opt =>
      opt.setName('member')
        .setDescription('Member yang ingin dilihat (kosongkan untuk melihat profil sendiri)')
        .setRequired(false)
    ),

  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true });

    const targetUser = interaction.options.getUser('member') || interaction.user;
    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

    if (!member) {
      return interaction.editReply({ content: 'Member tidak ditemukan di server ini.' });
    }

    const guildId = interaction.guild.id;

    // Baca channel result dari storage
    const settings = storage.read('settings');
    const resultChannelId = settings[guildId]?.cardResultChannel;
    const resultChannel = resultChannelId
      ? interaction.guild.channels.cache.get(resultChannelId)
      : null;

    // Baca custom data member
    const cardsData = storage.read('cards');
    const userCard = cardsData[guildId]?.[targetUser.id] || {};

    function formatDate(date) {
      if (!date) return '-';
      return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    // Hitung urutan join
    const allMembers = await interaction.guild.members.fetch();
    const sortedByJoin = [...allMembers.values()]
      .filter(m => m.joinedAt)
      .sort((a, b) => a.joinedAt - b.joinedAt);
    const joinPosition = sortedByJoin.findIndex(m => m.id === member.id) + 1;
    const totalMembers = interaction.guild.memberCount;

    // Roles (max 5)
    const topRoles = member.roles.cache
      .filter(r => r.id !== interaction.guild.id)
      .sort((a, b) => b.position - a.position)
      .first(5);

    const rolesText = topRoles.length > 0
      ? topRoles.map(r => `<@&${r.id}>`).join(' ')
      : '-';

    const embedColor = userCard.color || member.roles.color?.hexColor || '#2B2D31';

    // Desain minimalis & elegan
    const embed = new EmbedBuilder()
      .setColor(embedColor)
      .setAuthor({
        name: member.displayName,
        iconURL: targetUser.displayAvatarURL({ dynamic: true, size: 64 })
      })
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
      .addFields(
        { name: 'Username', value: targetUser.tag, inline: true },
        { name: 'Posisi Member', value: `#${joinPosition} dari ${totalMembers.toLocaleString('id-ID')}`, inline: true },
        { name: 'Asal', value: userCard.asal || '-', inline: true },
        { name: 'Bergabung Server', value: formatDate(member.joinedAt), inline: true },
        { name: 'Akun Dibuat', value: formatDate(targetUser.createdAt), inline: true },
        { name: '\u200B', value: '\u200B', inline: true },
        { name: 'Roles', value: rolesText, inline: false }
      );

    if (userCard.bio) {
      embed.addFields({ name: 'Bio', value: userCard.bio, inline: false });
    }

    embed.setFooter({
      text: `Diminta oleh ${interaction.user.tag}`,
      iconURL: interaction.user.displayAvatarURL({ dynamic: true, size: 32 })
    }).setTimestamp();

    if (resultChannel) {
      try {
        await resultChannel.send({ embeds: [embed] });
        await interaction.editReply({
          content: `Card **${member.displayName}** telah dikirim ke <#${resultChannel.id}>.`
        });
      } catch (err) {
        console.error('[/card] Gagal mengirim embed:', err.message);
        await interaction.editReply({
          content: `Gagal mengirim card ke <#${resultChannel.id}>. Pastikan bot memiliki izin di channel tersebut.`
        });
      }
    } else {
      await interaction.editReply({
        content: '*Channel hasil belum diatur oleh admin (gunakan `/setcard`). Menampilkan langsung:*',
        embeds: [embed]
      });
    }
  }
};
