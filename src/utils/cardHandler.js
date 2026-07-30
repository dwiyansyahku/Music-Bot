const {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags
} = require('discord.js');
const storage = require('./storage');

/**
 * Buat Embed & ActionRow untuk Panel Hub Card Member yang diposting di channel #member-card
 */
function createCardHubPayload(guild) {
  const embed = new EmbedBuilder()
    .setColor('#5865F2')
    .setTitle('🎴 Kartu Identitas Member Server')
    .setDescription(
      'Selamat datang di sistem **Member Card** server!\n\n' +
      'Kartu ini adalah identitas digital kamu di server ini. Kamu bisa mengatur **Bio**, **Kota/Domisili Asal**, dan **Warna Aksen Border** profilmu sendiri tanpa perlu mengetik perintah.\n\n' +
      '**Cara Kerja:**\n' +
      '1. Klik tombol **📝 Edit Profil Card** di bawah untuk mengisi form pop-up.\n' +
      '2. Klik **🎴 Lihat Card Saya** untuk melihat tampilan profilmu.\n' +
      '3. Klik **📢 Publikasikan Card** jika ingin membagikan kartu profilmu di channel ini.'
    )
    .addFields(
      {
        name: '📋 Contoh Tampilan Card',
        value: [
          '```',
          'Nama            : DJKingz',
          'Username        : DJKingz47#4521',
          'Posisi Member   : #47 dari 312',
          'Asal            : Jakarta, Indonesia',
          'Bergabung Server: 15 Jan 2024',
          'Akun Dibuat     : 03 Mar 2020',
          'Roles           : @DJ @VIP @Member',
          'Bio             : Suka musik lo-fi & koding 🎵',
          '```'
        ].join('\n'),
        inline: false
      }
    )
    .setFooter({ text: `${guild.name} • Kartu Identitas Member` })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('card_btn_edit')
      .setLabel('📝 Edit Profil Card')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('card_btn_view_self')
      .setLabel('🎴 Lihat Card Saya')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('card_btn_publish')
      .setLabel('📢 Publikasikan Card')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('card_btn_reset')
      .setLabel('🗑️ Reset')
      .setStyle(ButtonStyle.Danger)
  );

  return { embeds: [embed], components: [row] };
}

/**
 * Handle ketika user menekan tombol di Card Hub
 */
async function handleCardButton(interaction, client) {
  const customId = interaction.customId;
  const guildId = interaction.guild.id;
  const userId = interaction.user.id;

  // 1. EDIT PROFIL → Buka Modal Pop-up Form
  if (customId === 'card_btn_edit') {
    const cardsData = storage.read('cards');
    const userCard = cardsData[guildId]?.[userId] || {};

    const modal = new ModalBuilder()
      .setCustomId('card_modal_submit')
      .setTitle('📝 Form Profil Card Member');

    const bioInput = new TextInputBuilder()
      .setCustomId('card_input_bio')
      .setLabel('Bio Singkat')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Contoh: Suka musik lo-fi & aktif di server 🎵')
      .setValue(userCard.bio || '')
      .setRequired(false)
      .setMaxLength(100);

    const asalInput = new TextInputBuilder()
      .setCustomId('card_input_asal')
      .setLabel('Kota / Domisili Asal')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Contoh: Jakarta, Indonesia')
      .setValue(userCard.asal || '')
      .setRequired(false)
      .setMaxLength(30);

    const colorInput = new TextInputBuilder()
      .setCustomId('card_input_color')
      .setLabel('Warna Border (Kode Hex, Opsional)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Contoh: #5865F2 atau #FF5733')
      .setValue(userCard.color || '')
      .setRequired(false)
      .setMaxLength(7);

    modal.addComponents(
      new ActionRowBuilder().addComponents(bioInput),
      new ActionRowBuilder().addComponents(asalInput),
      new ActionRowBuilder().addComponents(colorInput)
    );

    return interaction.showModal(modal);
  }

  // 2. LIHAT CARD SAYA (Privat / Ephemeral)
  if (customId === 'card_btn_view_self') {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const embed = await buildMemberCardEmbed(interaction.guild, interaction.member);
    return interaction.editReply({
      content: '*Kartu Profil kamu (Hanya terlihat oleh kamu):*',
      embeds: [embed]
    });
  }

  // 3. PUBLIKASIKAN CARD (Tampil Publik di Channel)
  if (customId === 'card_btn_publish') {
    await interaction.deferReply();
    const embed = await buildMemberCardEmbed(interaction.guild, interaction.member);
    return interaction.editReply({
      content: `🎴 **Kartu Profil ${interaction.member.displayName}**`,
      embeds: [embed]
    });
  }

  // 4. RESET CARD
  if (customId === 'card_btn_reset') {
    const cardsData = storage.read('cards');
    if (cardsData[guildId] && cardsData[guildId][userId]) {
      delete cardsData[guildId][userId];
      storage.write('cards', cardsData);
    }
    return interaction.reply({
      content: '🔄 Kustomisasi profil card kamu berhasil direset ke default.',
      flags: MessageFlags.Ephemeral
    });
  }
}

/**
 * Handle ketika user menekan Submit di Pop-up Form Modal
 */
async function handleCardModalSubmit(interaction, client) {
  const guildId = interaction.guild.id;
  const userId = interaction.user.id;

  const bio = interaction.fields.getTextInputValue('card_input_bio').trim();
  const asal = interaction.fields.getTextInputValue('card_input_asal').trim();
  let color = interaction.fields.getTextInputValue('card_input_color').trim();

  // Validasi warna hex jika diisi
  if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
    return interaction.reply({
      content: '❌ Format warna hex tidak valid! Gunakan format seperti `#5865F2` atau kosongkan.',
      flags: MessageFlags.Ephemeral
    });
  }

  const cardsData = storage.read('cards');
  if (!cardsData[guildId]) cardsData[guildId] = {};
  if (!cardsData[guildId][userId]) cardsData[guildId][userId] = {};

  const userCard = cardsData[guildId][userId];

  if (bio) userCard.bio = bio; else delete userCard.bio;
  if (asal) userCard.asal = asal; else delete userCard.asal;
  if (color) userCard.color = color.toUpperCase(); else delete userCard.color;

  storage.write('cards', cardsData);

  return interaction.reply({
    content: '✅ **Profil Card berhasil diperbarui!** Klik tombol **🎴 Lihat Card Saya** untuk melihat hasilnya.',
    flags: MessageFlags.Ephemeral
  });
}

/**
 * Build Embed Card Member yang bersih dan elegan
 */
async function buildMemberCardEmbed(guild, member) {
  const targetUser = member.user;
  const guildId = guild.id;

  const cardsData = storage.read('cards');
  const userCard = cardsData[guildId]?.[targetUser.id] || {};

  function formatDate(date) {
    if (!date) return '-';
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  const allMembers = await guild.members.fetch();
  const sortedByJoin = [...allMembers.values()]
    .filter(m => m.joinedAt)
    .sort((a, b) => a.joinedAt - b.joinedAt);
  const joinPosition = sortedByJoin.findIndex(m => m.id === member.id) + 1;
  const totalMembers = guild.memberCount;

  const topRoles = member.roles.cache
    .filter(r => r.id !== guild.id)
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
    text: `Member ID: ${targetUser.id}`,
    iconURL: targetUser.displayAvatarURL({ dynamic: true, size: 32 })
  }).setTimestamp();

  return embed;
}

module.exports = {
  createCardHubPayload,
  handleCardButton,
  handleCardModalSubmit,
  buildMemberCardEmbed
};
