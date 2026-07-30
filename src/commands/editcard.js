const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const storage = require('../utils/storage');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('editcard')
    .setDescription('Atur profil card diri sendiri')
    .addSubcommand(sub =>
      sub.setName('bio')
        .setDescription('Set bio profil')
        .addStringOption(opt =>
          opt.setName('teks')
            .setDescription('Bio singkat (max 100 karakter)')
            .setRequired(false)
            .setMaxLength(100)
        )
    )
    .addSubcommand(sub =>
      sub.setName('asal')
        .setDescription('Set asal/domisili')
        .addStringOption(opt =>
          opt.setName('kota')
            .setDescription('Kota/Negara asal (max 30 karakter)')
            .setRequired(false)
            .setMaxLength(30)
        )
    )
    .addSubcommand(sub =>
      sub.setName('color')
        .setDescription('Set warna aksen border (hex code)')
        .addStringOption(opt =>
          opt.setName('hex')
            .setDescription('Kode hex warna (contoh: #2B2D31 atau #5865F2)')
            .setRequired(false)
            .setMaxLength(7)
        )
    )
    .addSubcommand(sub =>
      sub.setName('preview')
        .setDescription('Preview card profil')
    )
    .addSubcommand(sub =>
      sub.setName('reset')
        .setDescription('Reset pengaturan card ke default')
    ),

  async execute(interaction, client) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;

    const cardsData = storage.read('cards');
    if (!cardsData[guildId]) cardsData[guildId] = {};
    if (!cardsData[guildId][userId]) cardsData[guildId][userId] = {};

    const userCard = cardsData[guildId][userId];

    if (sub === 'bio') {
      const teks = interaction.options.getString('teks');
      if (teks) {
        userCard.bio = teks;
        storage.write('cards', cardsData);
        return interaction.reply({ content: `Bio diperbarui: "${teks}"`, ephemeral: true });
      } else {
        delete userCard.bio;
        storage.write('cards', cardsData);
        return interaction.reply({ content: 'Bio dihapus.', ephemeral: true });
      }
    }

    if (sub === 'asal') {
      const kota = interaction.options.getString('kota');
      if (kota) {
        userCard.asal = kota;
        storage.write('cards', cardsData);
        return interaction.reply({ content: `Asal/Domisili diperbarui: **${kota}**`, ephemeral: true });
      } else {
        delete userCard.asal;
        storage.write('cards', cardsData);
        return interaction.reply({ content: 'Asal/Domisili dihapus.', ephemeral: true });
      }
    }

    if (sub === 'color') {
      const hex = interaction.options.getString('hex');
      if (hex) {
        if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) {
          return interaction.reply({
            content: 'Format warna tidak valid. Gunakan format hex seperti `#5865F2`.',
            ephemeral: true
          });
        }
        userCard.color = hex.toUpperCase();
        storage.write('cards', cardsData);
        return interaction.reply({ content: `Warna aksen diperbarui ke \`${hex.toUpperCase()}\`.`, ephemeral: true });
      } else {
        delete userCard.color;
        storage.write('cards', cardsData);
        return interaction.reply({ content: 'Warna direset ke default.', ephemeral: true });
      }
    }

    if (sub === 'reset') {
      cardsData[guildId][userId] = {};
      storage.write('cards', cardsData);
      return interaction.reply({ content: 'Pengaturan card direset.', ephemeral: true });
    }

    if (sub === 'preview') {
      const member = interaction.member;
      const targetUser = interaction.user;
      const now = new Date();

      function formatDate(date) {
        return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
      }

      const allMembers = await interaction.guild.members.fetch();
      const sortedByJoin = [...allMembers.values()]
        .filter(m => m.joinedAt)
        .sort((a, b) => a.joinedAt - b.joinedAt);
      const joinPosition = sortedByJoin.findIndex(m => m.id === member.id) + 1;
      const totalMembers = interaction.guild.memberCount;

      const topRoles = member.roles.cache
        .filter(r => r.id !== interaction.guild.id)
        .sort((a, b) => b.position - a.position)
        .first(5);

      const rolesText = topRoles.length > 0
        ? topRoles.map(r => `<@&${r.id}>`).join(' ')
        : '-';

      const embedColor = userCard.color || member.roles.color?.hexColor || '#2B2D31';

      const embed = new EmbedBuilder()
        .setColor(embedColor)
        .setAuthor({
          name: member.displayName,
          iconURL: targetUser.displayAvatarURL({ dynamic: true, size: 64 })
        })
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
        .addFields(
          { name: 'Username', value: targetUser.tag, inline: true },
          { name: 'Posisi Member', value: `#${joinPosition} dari ${totalMembers}`, inline: true },
          { name: 'Asal', value: userCard.asal || '-', inline: true },
          { name: 'Bergabung Server', value: formatDate(member.joinedAt), inline: true },
          { name: 'Akun Dibuat', value: formatDate(targetUser.createdAt), inline: true },
          { name: '\u200B', value: '\u200B', inline: true },
          { name: 'Roles', value: rolesText, inline: false }
        );

      if (userCard.bio) {
        embed.addFields({ name: 'Bio', value: userCard.bio, inline: false });
      }

      return interaction.reply({
        content: '*Preview Card (Hanya terlihat oleh Anda)*',
        embeds: [embed],
        ephemeral: true
      });
    }
  }
};
