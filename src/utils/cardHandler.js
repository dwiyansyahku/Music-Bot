const {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags,
  AttachmentBuilder
} = require('discord.js');
const storage = require('./storage');
const { generateMemberCardCanvas } = require('./cardGenerator');

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
      'Create your custom digital identity card in this server. Customize your **Bio**, **Location**, **Accent Color**, **Link**, and **Custom Background** directly using the interactive buttons below.\n\n' +
      '**How It Works:**\n' +
      '1. Click **Edit Profile** to fill out your profile details & custom background in a pop-up form.\n' +
      '2. Click **View My Card** to preview your HD profile card privately.\n' +
      `3. Click **Publish Card** to share your profile card in <#${PUBLISH_CHANNEL_ID}>.`
    )
    .addFields(
      {
        name: 'Preview Features',
        value: [
          '• **HD Resolution Card** (1000x560 Canvas Graphic)',
          '• **Custom Background Wallpaper** (URL Image / Default Glow)',
          '• **Dynamic Text Scaling** (Auto-fits long names & bios)',
          '• **Server Position & Top Roles Showcase**'
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
 * Pembersihan pesan lama dilakukan secara non-blocking di background (0ms delay).
 *
 * @returns {Promise<'first'|'updated'|null>}
 */
async function publishCardToChannel(guild, member, client) {
  const guildId = guild.id;
  const userId = member.id;

  // Ambil channel publish dari cache atau fetch cepat
  const publishChannel = guild.channels.cache.get(PUBLISH_CHANNEL_ID)
    || await client.channels.fetch(PUBLISH_CHANNEL_ID).catch(() => null);

  if (!publishChannel) {
    console.warn(`[CardHandler] Publish channel ${PUBLISH_CHANNEL_ID} tidak ditemukan.`);
    return null;
  }

  const cardsData = storage.read('cards');
  const userCard = cardsData[guildId]?.[userId] || {};
  const existingMsgId = userCard.publishedMessageId;
  const isFirstPublish = !existingMsgId;

  // NON-BLOCKING BACKGROUND CLEANUP: Hapus pesan lama secara asinkron tanpa menahan eksekusi
  if (existingMsgId) {
    publishChannel.messages.fetch(existingMsgId)
      .then(msg => msg.delete())
      .catch(() => {});
  }

  const warmMessage = isFirstPublish
    ? `📌 **${member.displayName}** baru saja publish Member Card pertamanya. Say hi! 👋`
    : `✏️ **${member.displayName}** just updated their card — ada yang baru nih.`;

  // Generate HD Canvas Card Image Buffer (Fast)
  const imageBuffer = await generateMemberCardCanvas(guild, member, userCard);
  const attachment = new AttachmentBuilder(imageBuffer, { name: 'member-card.jpg' });

  // Kirim pesan card baru (hanya 1 REST call langsung)
  const newMsg = await publishChannel.send({
    content: warmMessage,
    files: [attachment]
  });

  // Simpan message ID baru
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
      .setLabel('Short Bio / Status (Max 100 Karakter)')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Contoh: Suka musik lo-fi, ngoding web & main game pas senggang.')
      .setValue(userCard.bio || '')
      .setRequired(false)
      .setMaxLength(100);

    const asalInput = new TextInputBuilder()
      .setCustomId('card_input_asal')
      .setLabel('Location / Origin (Max 30 Karakter)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Contoh: Depok, Jawa Barat')
      .setValue(userCard.asal || '')
      .setRequired(false)
      .setMaxLength(30);

    const colorInput = new TextInputBuilder()
      .setCustomId('card_input_color')
      .setLabel('Accent Color (Hex Code, Opsional)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Contoh: #5865F2 atau #FF5733')
      .setValue(userCard.color || '')
      .setRequired(false)
      .setMaxLength(7);

    const bgUrlInput = new TextInputBuilder()
      .setCustomId('card_input_bg')
      .setLabel('Custom Background Image URL (Opsional)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Contoh: https://i.imgur.com/image.png')
      .setValue(userCard.bgUrl || '')
      .setRequired(false)
      .setMaxLength(250);

    const linkTitleInput = new TextInputBuilder()
      .setCustomId('card_input_link_title')
      .setLabel('Link Title & URL (Format: Judul | URL)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Contoh: My Spotify | https://open.spotify.com/user/xyz')
      .setValue(userCard.linkTitle && userCard.linkUrl ? `${userCard.linkTitle} | ${userCard.linkUrl}` : (userCard.linkUrl || ''))
      .setRequired(false)
      .setMaxLength(250);

    modal.addComponents(
      new ActionRowBuilder().addComponents(bioInput),
      new ActionRowBuilder().addComponents(asalInput),
      new ActionRowBuilder().addComponents(colorInput),
      new ActionRowBuilder().addComponents(bgUrlInput),
      new ActionRowBuilder().addComponents(linkTitleInput)
    );

    return interaction.showModal(modal);
  }

  // 2. VIEW MY CARD (Private / Ephemeral)
  if (customId === 'card_btn_view_self') {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const cardsData = storage.read('cards');
    const userCard = cardsData[guildId]?.[userId] || {};

    const imageBuffer = await generateMemberCardCanvas(interaction.guild, interaction.member, userCard);
    const attachment = new AttachmentBuilder(imageBuffer, { name: 'member-card.jpg' });

    return interaction.editReply({
      content: '*Your HD Member Profile Card (Only visible to you):*',
      files: [attachment]
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
  // PANGGUL DEFERREPLY DI BARIS PERTAMA AGAR DISCORD TIDAK TIMEOUT (AbortError)!
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const guildId = interaction.guild.id;
  const userId = interaction.user.id;

  let bio = interaction.fields.getTextInputValue('card_input_bio').trim();
  let asal = interaction.fields.getTextInputValue('card_input_asal').trim();
  let color = interaction.fields.getTextInputValue('card_input_color').trim();
  const bgUrl = interaction.fields.getTextInputValue('card_input_bg').trim();
  const linkRaw = interaction.fields.getTextInputValue('card_input_link_title').trim();

  // Enforce Max Length Limits
  if (bio.length > 100) bio = bio.slice(0, 100);
  if (asal.length > 30) asal = asal.slice(0, 30);

  // Validate hex color if provided
  if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
    return interaction.editReply({
      content: 'Invalid hex color format! Please use a format like `#5865F2` or leave it empty.'
    });
  }

  // Parse link title & URL format: "Title | URL" or just "URL"
  let linkTitle = '';
  let linkUrl = '';
  if (linkRaw) {
    if (linkRaw.includes('|')) {
      const parts = linkRaw.split('|');
      linkTitle = parts[0].trim();
      linkUrl = parts.slice(1).join('|').trim();
    } else {
      linkUrl = linkRaw;
    }
  }

  // Validate URL format if provided
  if (linkUrl && !/^https?:\/\/.+/.test(linkUrl)) {
    return interaction.editReply({
      content: 'Invalid URL format! Link harus dimulai dengan `https://` atau `http://`.'
    });
  }

  // Validate background URL format if provided
  if (bgUrl && !/^https?:\/\/.+/.test(bgUrl)) {
    return interaction.editReply({
      content: 'Invalid Background URL format! URL background harus dimulai dengan `https://` atau `http://`.'
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
  if (bgUrl) userCard.bgUrl = bgUrl; else delete userCard.bgUrl;
  if (linkTitle) userCard.linkTitle = linkTitle; else delete userCard.linkTitle;
  if (linkUrl) userCard.linkUrl = linkUrl; else delete userCard.linkUrl;

  storage.write('cards', cardsData);

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
    return interaction.editReply({
      content: `✅ Profile updated successfully! Click **View My Card** to preview your card.`
    });
  }
}

/**
 * Build fallback clean Member Profile Card Embed (kept for backwards compatibility)
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

  const allMembers = guild.members.cache;
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
      iconURL: targetUser.displayAvatarURL({ extension: 'png', size: 64 })
    })
    .setThumbnail(targetUser.displayAvatarURL({ extension: 'png', size: 256 }))
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
    iconURL: targetUser.displayAvatarURL({ extension: 'png', size: 32 })
  }).setTimestamp();

  return embed;
}

module.exports = {
  createCardHubPayload,
  handleCardButton,
  handleCardModalSubmit,
  buildMemberCardEmbed
};
