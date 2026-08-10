const {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags,
  AttachmentBuilder
} = require('discord.js');
const storage = require('./storage');
const { generateMemberCardCanvas } = require('./cardGenerator');

// Channel ID tempat hasil Member Card diterbitkan (#card-gallery)
const GALLERY_CHANNEL_ID = '1532290934396555354';

/**
 * Creates Embed & ActionRow for Member Profile Card Hub Panel posted in #create-card
 */
function createCardHubPayload(guild) {
  const embed = new EmbedBuilder()
    .setColor('#8B5CF6')
    .setTitle('Member Profile Card')
    .setDescription(
      'Create your custom digital identity card in this server.\n\n' +
      '**How It Works:**\n' +
      '1. Click **Edit Profile** to customize your Bio, Location & Accent Color.\n' +
      '2. Click **View My Card** to preview your card privately.\n' +
      `3. Click **Publish Card** to share your card in <#${GALLERY_CHANNEL_ID}>.`
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
 * Build canvas card as an AttachmentBuilder
 */
async function buildCardAttachment(guild, member) {
  const cardsData = storage.read('cards');
  const userCard = cardsData[guild.id]?.[member.id] || {};

  const buffer = await generateMemberCardCanvas(guild, member, userCard);
  return new AttachmentBuilder(buffer, { name: 'member-card.png' });
}

/**
 * Fallback embed card (used if canvas rendering fails)
 */
async function buildMemberCardEmbed(guild, member) {
  const targetUser = member.user;
  const cardsData = storage.read('cards');
  const userCard = cardsData[guild.id]?.[targetUser.id] || {};

  function formatDate(date) {
    if (!date) return '-';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  const embedColor = userCard.color || member.roles.color?.hexColor || '#8B5CF6';

  const embed = new EmbedBuilder()
    .setColor(embedColor)
    .setTitle(member.displayName)
    .setThumbnail(targetUser.displayAvatarURL({ extension: 'png', size: 256 }))
    .addFields(
      {
        name: 'Username',
        value: `@${targetUser.username}`,
        inline: true
      },
      {
        name: 'Joined',
        value: formatDate(member.joinedAt),
        inline: true
      }
    );

  if (userCard.asal) {
    embed.addFields({ name: 'Location', value: userCard.asal, inline: true });
  }

  if (userCard.bio) {
    embed.addFields({ name: 'Bio', value: `*${userCard.bio}*`, inline: false });
  }

  embed
    .setFooter({ text: `${guild.name} • Member Card` })
    .setTimestamp();

  return embed;
}

/**
 * Publish atau update card member ke #card-gallery.
 * @returns {Promise<'first'|'updated'|null>}
 */
async function publishCardToChannel(guild, member, client) {
  const guildId = guild.id;
  const userId = member.id;

  const publishChannel = guild.channels.cache.get(GALLERY_CHANNEL_ID)
    || await client.channels.fetch(GALLERY_CHANNEL_ID).catch(err => {
      console.error(`[CardHandler] Fetch gallery channel failed:`, err.message);
      return null;
    });

  if (!publishChannel) {
    console.error(`❌ [CardHandler] Gallery channel ${GALLERY_CHANNEL_ID} not found.`);
    return null;
  }

  const cardsData = storage.read('cards');
  const userCard = cardsData[guildId]?.[userId] || {};
  const existingMsgId = userCard.publishedMessageId;
  const isFirstPublish = !existingMsgId;

  // Non-blocking cleanup: delete old card message
  if (existingMsgId) {
    publishChannel.messages.fetch(existingMsgId)
      .then(msg => msg.delete().catch(() => {}))
      .catch(() => {});
  }

  const warmMessage = isFirstPublish
    ? `📌 **${member.displayName}** baru saja publish Member Card pertamanya! 👋`
    : `✏️ **${member.displayName}** just updated their card ✨`;

  // Try canvas card first, fallback to embed
  try {
    const attachment = await buildCardAttachment(guild, member);
    const newMsg = await publishChannel.send({ content: warmMessage, files: [attachment] });

    if (!cardsData[guildId]) cardsData[guildId] = {};
    if (!cardsData[guildId][userId]) cardsData[guildId][userId] = {};
    cardsData[guildId][userId].publishedMessageId = newMsg.id;
    storage.write('cards', cardsData);

    console.log(`✅ [CardHandler] Card for ${member.displayName} published (canvas) → #${publishChannel.name}`);
    return isFirstPublish ? 'first' : 'updated';
  } catch (canvasErr) {
    console.warn(`⚠️ [CardHandler] Canvas failed, trying embed fallback:`, canvasErr.message);

    try {
      const embed = await buildMemberCardEmbed(guild, member);
      const newMsg = await publishChannel.send({ content: warmMessage, embeds: [embed] });

      if (!cardsData[guildId]) cardsData[guildId] = {};
      if (!cardsData[guildId][userId]) cardsData[guildId][userId] = {};
      cardsData[guildId][userId].publishedMessageId = newMsg.id;
      storage.write('cards', cardsData);

      console.log(`✅ [CardHandler] Card for ${member.displayName} published (embed fallback) → #${publishChannel.name}`);
      return isFirstPublish ? 'first' : 'updated';
    } catch (sendErr) {
      console.error(`❌ [CardHandler] Failed to publish card:`, sendErr.message);
      return null;
    }
  }
}

/**
 * Handle when user clicks a button in Card Hub Panel
 */
async function handleCardButton(interaction, client) {
  const customId = interaction.customId;
  const guildId = interaction.guild.id;
  const userId = interaction.user.id;

  // 1. EDIT PROFILE → Modal (3 fields: Bio, Location, Color)
  if (customId === 'card_btn_edit') {
    const cardsData = storage.read('cards');
    const userCard = cardsData[guildId]?.[userId] || {};

    const modal = new ModalBuilder()
      .setCustomId('card_modal_submit')
      .setTitle('Edit Member Profile');

    const bioInput = new TextInputBuilder()
      .setCustomId('card_input_bio')
      .setLabel('Bio / Status (Max 100)')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('Contoh: Suka musik lo-fi & ngoding web 🎵')
      .setValue(userCard.bio || '')
      .setRequired(false)
      .setMaxLength(100);

    const asalInput = new TextInputBuilder()
      .setCustomId('card_input_asal')
      .setLabel('Location (Max 30)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Contoh: Jakarta, Indonesia')
      .setValue(userCard.asal || '')
      .setRequired(false)
      .setMaxLength(30);

    const colorInput = new TextInputBuilder()
      .setCustomId('card_input_color')
      .setLabel('Accent Color Hex')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Contoh: #8B5CF6 atau #FF5733')
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

  // 2. VIEW MY CARD (Ephemeral — canvas image)
  if (customId === 'card_btn_view_self') {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const attachment = await buildCardAttachment(interaction.guild, interaction.member);
      return await interaction.editReply({
        content: '🎴 *Your Member Card:*',
        files: [attachment]
      });
    } catch (err) {
      console.warn('[ViewCard] Canvas failed, using embed:', err.message);
      const embed = await buildMemberCardEmbed(interaction.guild, interaction.member);
      return await interaction.editReply({
        content: '🎴 *Your Member Card:*',
        embeds: [embed]
      });
    }
  }

  // 3. PUBLISH CARD → Send to #card-gallery
  if (customId === 'card_btn_publish') {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const result = await publishCardToChannel(interaction.guild, interaction.member, client);

    if (result === 'first') {
      return interaction.editReply({
        content: `✅ Member Card kamu berhasil dipublish di <#${GALLERY_CHANNEL_ID}>! 🎉`
      });
    } else if (result === 'updated') {
      return interaction.editReply({
        content: `✅ Member Card kamu diperbarui di <#${GALLERY_CHANNEL_ID}>! ✨`
      });
    } else {
      return interaction.editReply({
        content: `❌ Gagal publish card. Pastikan bot memiliki izin Send Messages di <#${GALLERY_CHANNEL_ID}>.`
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
      content: '✅ Profil card kamu sudah direset ke default.',
      flags: MessageFlags.Ephemeral
    });
  }
}

/**
 * Handle modal form submit — save data & auto-publish
 */
async function handleCardModalSubmit(interaction, client) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const guildId = interaction.guild.id;
  const userId = interaction.user.id;

  let bio = interaction.fields.getTextInputValue('card_input_bio').trim();
  let asal = interaction.fields.getTextInputValue('card_input_asal').trim();
  let color = interaction.fields.getTextInputValue('card_input_color').trim();

  if (bio.length > 100) bio = bio.slice(0, 100);
  if (asal.length > 30) asal = asal.slice(0, 30);

  // Validate hex color
  if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
    return interaction.editReply({
      content: '❌ Format warna salah! Gunakan format hex seperti `#8B5CF6`.'
    });
  }

  // Save profile data
  const cardsData = storage.read('cards');
  if (!cardsData[guildId]) cardsData[guildId] = {};
  if (!cardsData[guildId][userId]) cardsData[guildId][userId] = {};

  const userCard = cardsData[guildId][userId];

  if (bio) userCard.bio = bio; else delete userCard.bio;
  if (asal) userCard.asal = asal; else delete userCard.asal;
  if (color) userCard.color = color.toUpperCase(); else delete userCard.color;

  storage.write('cards', cardsData);

  // Reply instantly
  await interaction.editReply({
    content: `✅ **Profil tersimpan!** Card kamu sedang dipublish di <#${GALLERY_CHANNEL_ID}> ✨`
  });

  // Auto-publish in background
  publishCardToChannel(interaction.guild, interaction.member, client).catch(err => {
    console.error('[CardHandler] Background auto-publish failed:', err.message);
  });
}

module.exports = {
  createCardHubPayload,
  handleCardButton,
  handleCardModalSubmit,
  buildMemberCardEmbed,
  buildCardAttachment
};
