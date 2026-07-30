const {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags
} = require('discord.js');
const storage = require('./storage');

// Channel tempat card di-publish
const PUBLISH_CHANNEL_ID = '1532290934396555354';

/**
 * Creates Embed & ActionRow for Member Profile Card Hub Panel posted in #member-card
 */
function createCardHubPayload(guild) {
  const embed = new EmbedBuilder()
    .setColor('#5865F2')
    .setTitle('Member Profile Card')
    .setDescription(
      'Welcome to the **Member Profile Card** system.\n\n' +
      'Create your digital identity card in this server. Customize your **Bio**, **Location**, and **Accent Color** directly using the interactive buttons below.\n\n' +
      '**How It Works:**\n' +
      '1. Click **Edit Profile** to fill out your profile details in a pop-up form.\n' +
      '2. Click **View My Card** to preview your profile card privately.\n' +
      `3. Click **Publish Card** to share your profile card in <#${PUBLISH_CHANNEL_ID}>.`
    )
    .addFields(
      {
        name: 'Preview Template',
        value: [
          '```',
          'Name            : Domba Kuring',
          'Username        : qumpruy',
          'Member Position : #47 of 312',
          'Location        : Aceh, Indonesia',
          'Joined Server   : Jan 15, 2024',
          'Account Created : Mar 03, 2020',
          'Roles           : @Senior Ketjeh @Price @Bestie Mpruy',
          'Bio             : Suka musik lo-fi & koding',
          '```'
        ].join('\n'),
        inline: false
      }
    )
    .setFooter({ text: `${guild.name} • Member Identity System` })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('card_btn_edit')
      .setLabel('Edit Profile')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('card_btn_view_self')
      .setLabel('View My Card')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('card_btn_publish')
      .setLabel('Publish Card')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('card_btn_reset')
      .setLabel('Reset')
      .setStyle(ButtonStyle.Danger)
  );

  return { embeds: [embed], components: [row] };
}

/**
 * Publish atau update card member ke PUBLISH_CHANNEL_ID.
 * Jika user sudah pernah publish → edit pesan lama (anti-spam).
 * Jika belum → kirim pesan baru & simpan message ID.
 *
 * @returns {Promise<'sent'|'edited'|null>}
 */
async function publishCardToChannel(guild, member, client) {
  const guildId = guild.id;
  const userId = member.id;

  // Ambil channel publish
  const publishChannel = guild.channels.cache.get(PUBLISH_CHANNEL_ID)
    || await client.channels.fetch(PUBLISH_CHANNEL_ID).catch(() => null);

  if (!publishChannel) {
    console.warn(`[CardHandler] Publish channel ${PUBLISH_CHANNEL_ID} tidak ditemukan.`);
    return null;
  }

  const embed = await buildMemberCardEmbed(guild, member);

  // Cek apakah sudah ada pesan lama dari user ini
  const cardsData = storage.read('cards');
  const userCard = cardsData[guildId]?.[userId] || {};
  const existingMsgId = userCard.publishedMessageId;

  // Tentukan apakah ini publish pertama atau update
  const isFirstPublish = !existingMsgId;

  // Pesan hangat — mix indo-inggris, tidak berlebihan
  const warmMessage = isFirstPublish
    ? `📌 **${member.displayName}** baru saja publish Member Card pertamanya. Say hi! 👋`
    : `✏️ **${member.displayName}** just updated their card — ada yang baru nih.`;

  const payload = {
    content: warmMessage,
    embeds: [embed]
  };

  // Hapus pesan lama jika ada
  if (existingMsgId) {
    try {
      const existingMsg = await publishChannel.messages.fetch(existingMsgId);
      await existingMsg.delete();
    } catch (err) {
      // Pesan lama sudah dihapus atau tidak bisa diakses — lanjut kirim baru
      console.warn(`[CardHandler] Pesan lama (${existingMsgId}) tidak bisa dihapus, lanjut kirim baru. Reason: ${err.message}`);
    }
  }

  // Kirim pesan baru (selalu di posisi paling bawah / terbaru)
  const newMsg = await publishChannel.send(payload);

  // Simpan message ID untuk keperluan hapus berikutnya
  if (!cardsData[guildId]) cardsData[guildId] = {};
  if (!cardsData[guildId][userId]) cardsData[guildId][userId] = {};
  cardsData[guildId][userId].publishedMessageId = newMsg.id;
  storage.write('cards', cardsData);

  return isFirstPublish ? 'first' : 'updated';
}

/**
 * Handle when user clicks a button in Card Hub
 */
async function handleCardButton(interaction, client) {
  const customId = interaction.customId;
  const guildId = interaction.guild.id;
  const userId = interaction.user.id;

  // 1. EDIT PROFILE → Open Modal Form
  if (customId === 'card_btn_edit') {
    const cardsData = storage.read('cards');
    const userCard = cardsData[guildId]?.[userId] || {};

    const modal = new ModalBuilder()
      .setCustomId('card_modal_submit')
      .setTitle('Edit Member Profile');

    const bioInput = new TextInputBuilder()
      .setCustomId('card_input_bio')
      .setLabel('Short Bio / Status')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Example: Lo-fi music enthusiast & developer')
      .setValue(userCard.bio || '')
      .setRequired(false)
      .setMaxLength(100);

    const asalInput = new TextInputBuilder()
      .setCustomId('card_input_asal')
      .setLabel('Location / Origin')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Example: Aceh, Indonesia')
      .setValue(userCard.asal || '')
      .setRequired(false)
      .setMaxLength(30);

    const colorInput = new TextInputBuilder()
      .setCustomId('card_input_color')
      .setLabel('Accent Color (Hex Code, Optional)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Example: #5865F2 or #FF5733')
      .setValue(userCard.color || '')
      .setRequired(false)
      .setMaxLength(7);

    const linkTitleInput = new TextInputBuilder()
      .setCustomId('card_input_link_title')
      .setLabel('Link Title (e.g. GitHub, Portfolio, LinkedIn)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Example: My GitHub')
      .setValue(userCard.linkTitle || '')
      .setRequired(false)
      .setMaxLength(40);

    const linkUrlInput = new TextInputBuilder()
      .setCustomId('card_input_link_url')
      .setLabel('Link URL')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Example: https://github.com/username')
      .setValue(userCard.linkUrl || '')
      .setRequired(false)
      .setMaxLength(200);

    modal.addComponents(
      new ActionRowBuilder().addComponents(bioInput),
      new ActionRowBuilder().addComponents(asalInput),
      new ActionRowBuilder().addComponents(colorInput),
      new ActionRowBuilder().addComponents(linkTitleInput),
      new ActionRowBuilder().addComponents(linkUrlInput)
    );

    return interaction.showModal(modal);
  }

  // 2. VIEW MY CARD (Private / Ephemeral)
  if (customId === 'card_btn_view_self') {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const embed = await buildMemberCardEmbed(interaction.guild, interaction.member);
    return interaction.editReply({
      content: '*Your Member Profile Card (Only visible to you):*',
      embeds: [embed]
    });
  }

  // 3. PUBLISH CARD → Kirim / update pesan di channel publish
  if (customId === 'card_btn_publish') {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const result = await publishCardToChannel(interaction.guild, interaction.member, client);

    if (result === 'first') {
      return interaction.editReply({
        content: `✅ Member Card kamu berhasil dipublish di <#${PUBLISH_CHANNEL_ID}>! Selamat bergabung di wall~ 🎉`
      });
    } else if (result === 'updated') {
      return interaction.editReply({
        content: `✅ Member Card kamu sudah diperbarui di <#${PUBLISH_CHANNEL_ID}>! Yang lama sudah dihapus~ ✨`
      });
    } else {
      return interaction.editReply({
        content: `❌ Could not find the publish channel. Please contact an admin.`
      });
    }
  }

  // 4. RESET CARD
  if (customId === 'card_btn_reset') {
    const cardsData = storage.read('cards');
    if (cardsData[guildId] && cardsData[guildId][userId]) {
      delete cardsData[guildId][userId];
      storage.write('cards', cardsData);
    }
    return interaction.reply({
      content: 'Your profile customization has been reset to default.',
      flags: MessageFlags.Ephemeral
    });
  }
}

/**
 * Handle when user submits Modal Form — save data & auto-publish ke channel
 */
async function handleCardModalSubmit(interaction, client) {
  const guildId = interaction.guild.id;
  const userId = interaction.user.id;

  const bio = interaction.fields.getTextInputValue('card_input_bio').trim();
  const asal = interaction.fields.getTextInputValue('card_input_asal').trim();
  let color = interaction.fields.getTextInputValue('card_input_color').trim();
  const linkTitle = interaction.fields.getTextInputValue('card_input_link_title').trim();
  const linkUrl = interaction.fields.getTextInputValue('card_input_link_url').trim();

  // Validate hex color if provided
  if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
    return interaction.reply({
      content: 'Invalid hex color format! Please use a format like `#5865F2` or leave it empty.',
      flags: MessageFlags.Ephemeral
    });
  }

  // Validate URL format if provided
  if (linkUrl && !/^https?:\/\/.+/.test(linkUrl)) {
    return interaction.reply({
      content: 'Invalid URL format! Link harus dimulai dengan `https://` atau `http://`.',
      flags: MessageFlags.Ephemeral
    });
  }

  // Simpan data profil
  const cardsData = storage.read('cards');
  if (!cardsData[guildId]) cardsData[guildId] = {};
  if (!cardsData[guildId][userId]) cardsData[guildId][userId] = {};

  const userCard = cardsData[guildId][userId];

  if (bio) userCard.bio = bio; else delete userCard.bio;
  if (asal) userCard.asal = asal; else delete userCard.asal;
  if (color) userCard.color = color.toUpperCase(); else delete userCard.color;
  if (linkTitle) userCard.linkTitle = linkTitle; else delete userCard.linkTitle;
  if (linkUrl) userCard.linkUrl = linkUrl; else delete userCard.linkUrl;

  storage.write('cards', cardsData);

  // Defer reply sementara proses publish berjalan
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  // Auto-publish / update card ke channel setelah save
  const result = await publishCardToChannel(interaction.guild, interaction.member, client);

  if (result === 'first') {
    return interaction.editReply({
      content: `✅ Member Card kamu berhasil dipublish di <#${PUBLISH_CHANNEL_ID}>! Selamat bergabung di wall~ 🎉`
    });
  } else if (result === 'updated') {
    return interaction.editReply({
      content: `✅ Profil tersimpan! Card terbaru kamu sudah tayang di <#${PUBLISH_CHANNEL_ID}>. Yang lama sudah dihapus~ ✨`
    });
  } else {
    // Channel tidak ditemukan, tapi data tetap tersimpan
    return interaction.editReply({
      content: `✅ Profile updated successfully! Click **View My Card** to preview your card.`
    });
  }
}

/**
 * Build clean and elegant Member Profile Card Embed
 */
async function buildMemberCardEmbed(guild, member) {
  const targetUser = member.user;
  const guildId = guild.id;

  const cardsData = storage.read('cards');
  const userCard = cardsData[guildId]?.[targetUser.id] || {};

  function formatDate(date) {
    if (!date) return '-';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
      { name: 'Member Position', value: `#${joinPosition} of ${totalMembers.toLocaleString('en-US')}`, inline: true },
      { name: 'Location', value: userCard.asal || '-', inline: true },
      { name: 'Joined Server', value: formatDate(member.joinedAt), inline: true },
      { name: 'Account Created', value: formatDate(targetUser.createdAt), inline: true },
      { name: '\u200B', value: '\u200B', inline: true },
      { name: 'Roles', value: rolesText, inline: false }
    );

  if (userCard.bio) {
    embed.addFields({ name: 'Bio', value: userCard.bio, inline: false });
  }

  if (userCard.linkUrl) {
    const label = userCard.linkTitle || 'Link';
    embed.addFields({
      name: '🔗 ' + label,
      value: userCard.linkUrl,
      inline: false
    });
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
