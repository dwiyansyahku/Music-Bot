const {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags
} = require('discord.js');
const storage = require('./storage');

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
      '1. Click **Edit Profile** to customize your Bio, Location, Color & Promo Link.\n' +
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
 * Build clean, aesthetic, and elegant Member Profile Card Embed
 * Contains: Display Name, Avatar Thumbnail, @username, Bio status, Location, Joined Server Date, Account Created Date, Promo Link (optional)
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

  let description = `\`@${targetUser.username}\``;
  if (userCard.bio) {
    description += `\n\n*"${userCard.bio}"*`;
  }

  const embed = new EmbedBuilder()
    .setColor(embedColor)
    .setTitle(member.displayName)
    .setThumbnail(targetUser.displayAvatarURL({ extension: 'png', size: 256 }))
    .setDescription(description);

  if (userCard.asal) {
    embed.addFields({ name: 'Location', value: userCard.asal, inline: true });
  }

  if (member.joinedAt) {
    embed.addFields({ name: 'Joined Server', value: formatDate(member.joinedAt), inline: true });
  }

  if (targetUser.createdAt) {
    embed.addFields({ name: 'Account Created', value: formatDate(targetUser.createdAt), inline: true });
  }

  // Promotional / Custom Link Field
  if (userCard.linkUrl) {
    const title = userCard.linkTitle || 'Featured Link';
    embed.addFields({
      name: title,
      value: userCard.linkUrl,
      inline: false
    });
  }

  embed
    .setFooter({ text: `${guild.name} • Member Card` })
    .setTimestamp();

  return embed;
}

/**
 * Publish or update member card in #card-gallery.
 * @returns {Promise<'first'|'updated'|null>}
 */
async function publishCardToChannel(guild, member, client) {
  const guildId = guild.id;
  const userId = member.id;

  const settings = storage.read('settings');
  const targetChannelId = settings[guildId]?.cardResultChannel || GALLERY_CHANNEL_ID;

  const publishChannel = guild.channels.cache.get(targetChannelId)
    || await client.channels.fetch(targetChannelId).catch(err => {
      console.error(`[CardHandler] Fetch gallery channel failed:`, err.message);
      return null;
    });

  if (!publishChannel) {
    console.error(`[CardHandler] Gallery channel ${targetChannelId} not found.`);
    return null;
  }

  const cardsData = storage.read('cards');
  const userCard = cardsData[guildId]?.[userId] || {};
  const existingMsgId = userCard.publishedMessageId;

  const embed = await buildMemberCardEmbed(guild, member);

  // If card was already published, edit existing message in-place
  if (existingMsgId) {
    try {
      const existingMsg = await publishChannel.messages.fetch(existingMsgId);
      if (existingMsg) {
        await existingMsg.edit({
          content: `**${member.displayName}** updated their Member Card.`,
          embeds: [embed]
        });
        console.log(`[CardHandler] Card for ${member.displayName} updated in-place (msg ${existingMsgId}) in #${publishChannel.name}`);
        return 'updated';
      }
    } catch (fetchErr) {
      console.warn(`[CardHandler] Could not fetch existing message ${existingMsgId} to edit (may be deleted), creating new message instead.`);
    }
  }

  // First time publish OR fallback if existing message was deleted
  try {
    const warmMessage = `**${member.displayName}** published their Member Card.`;
    const newMsg = await publishChannel.send({ content: warmMessage, embeds: [embed] });

    if (!cardsData[guildId]) cardsData[guildId] = {};
    if (!cardsData[guildId][userId]) cardsData[guildId][userId] = {};
    cardsData[guildId][userId].publishedMessageId = newMsg.id;
    storage.write('cards', cardsData);

    console.log(`[CardHandler] Card for ${member.displayName} published to #${publishChannel.name}`);
    return existingMsgId ? 'updated' : 'first';
  } catch (sendErr) {
    console.error(`[CardHandler] Failed to publish card:`, sendErr.message);
    return null;
  }
}

/**
 * Handle when user clicks a button in Card Hub Panel
 */
async function handleCardButton(interaction, client) {
  const customId = interaction.customId;
  const guildId = interaction.guild.id;
  const userId = interaction.user.id;

  // 1. EDIT PROFILE → Modal (5 fields: Bio, Location, Color, Link Title, Link URL)
  if (customId === 'card_btn_edit') {
    const cardsData = storage.read('cards');
    const userCard = cardsData[guildId]?.[userId] || {};

    const modal = new ModalBuilder()
      .setCustomId('card_modal_submit')
      .setTitle('Edit Member Profile');

    const bioInput = new TextInputBuilder()
      .setCustomId('card_input_bio')
      .setLabel('Bio / Status (Optional, Max 100)')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('e.g. Passionate music enthusiast & developer')
      .setValue(userCard.bio || '')
      .setRequired(false)
      .setMaxLength(100);

    const asalInput = new TextInputBuilder()
      .setCustomId('card_input_asal')
      .setLabel('Location (Optional, Max 30)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('e.g. New York, USA')
      .setValue(userCard.asal || '')
      .setRequired(false)
      .setMaxLength(30);

    const colorInput = new TextInputBuilder()
      .setCustomId('card_input_color')
      .setLabel('Accent Color Hex (Optional)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('e.g. #8B5CF6 or #FF5733')
      .setValue(userCard.color || '')
      .setRequired(false)
      .setMaxLength(7);

    const linkTitleInput = new TextInputBuilder()
      .setCustomId('card_input_link_title')
      .setLabel('Promo Link Title (Optional, Max 30)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('e.g. YouTube, Spotify, Portfolio')
      .setValue(userCard.linkTitle || '')
      .setRequired(false)
      .setMaxLength(30);

    const linkUrlInput = new TextInputBuilder()
      .setCustomId('card_input_link_url')
      .setLabel('Promo Link URL (Optional)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('e.g. https://youtube.com/@mychannel')
      .setValue(userCard.linkUrl || '')
      .setRequired(false)
      .setMaxLength(250);

    modal.addComponents(
      new ActionRowBuilder().addComponents(bioInput),
      new ActionRowBuilder().addComponents(asalInput),
      new ActionRowBuilder().addComponents(colorInput),
      new ActionRowBuilder().addComponents(linkTitleInput),
      new ActionRowBuilder().addComponents(linkUrlInput)
    );

    return interaction.showModal(modal);
  }

  // 2. VIEW MY CARD (Ephemeral — Clean Embed)
  if (customId === 'card_btn_view_self') {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const embed = await buildMemberCardEmbed(interaction.guild, interaction.member);
      return await interaction.editReply({
        content: '*Your Member Card:*',
        embeds: [embed]
      });
    } catch (err) {
      console.error('[ViewCard] Error:', err);
      return await interaction.editReply({
        content: `Failed to generate card: ${err.message}`
      });
    }
  }

  // 3. PUBLISH CARD → Send to #card-gallery
  if (customId === 'card_btn_publish') {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const result = await publishCardToChannel(interaction.guild, interaction.member, client);

    if (result === 'first') {
      return interaction.editReply({
        content: `Your Member Card has been successfully published in <#${GALLERY_CHANNEL_ID}>.`
      });
    } else if (result === 'updated') {
      return interaction.editReply({
        content: `Your Member Card has been updated in <#${GALLERY_CHANNEL_ID}>.`
      });
    } else {
      return interaction.editReply({
        content: `Failed to publish card. Please ensure the bot has Send Messages permission in <#${GALLERY_CHANNEL_ID}>.`
      });
    }
  }

  // 4. RESET CARD
  if (customId === 'card_btn_reset') {
    const cardsData = storage.read('cards');
    const userCard = cardsData[guildId]?.[userId];
    if (userCard) {
      if (userCard.publishedMessageId) {
        const settings = storage.read('settings');
        const targetChannelId = settings[guildId]?.cardResultChannel || GALLERY_CHANNEL_ID;
        const publishChannel = interaction.guild.channels.cache.get(targetChannelId)
          || await client.channels.fetch(targetChannelId).catch(() => null);
        if (publishChannel) {
          publishChannel.messages.fetch(userCard.publishedMessageId)
            .then(msg => msg.delete().catch(() => {}))
            .catch(() => {});
        }
      }
      delete cardsData[guildId][userId];
      storage.write('cards', cardsData);
    }
    return interaction.reply({
      content: 'Your profile card has been reset to default and removed from gallery.',
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
  let linkTitle = interaction.fields.getTextInputValue('card_input_link_title').trim();
  let linkUrl = interaction.fields.getTextInputValue('card_input_link_url').trim();

  if (bio.length > 100) bio = bio.slice(0, 100);
  if (asal.length > 30) asal = asal.slice(0, 30);
  if (linkTitle.length > 30) linkTitle = linkTitle.slice(0, 30);

  // Validate hex color
  if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
    return interaction.editReply({
      content: 'Invalid hex color format! Please use a valid hex code like `#8B5CF6`.'
    });
  }

  // Format URL if provided
  if (linkUrl) {
    if (!/^https?:\/\//i.test(linkUrl)) {
      linkUrl = `https://${linkUrl}`;
    }
  }

  // Save profile data
  const cardsData = storage.read('cards');
  if (!cardsData[guildId]) cardsData[guildId] = {};
  if (!cardsData[guildId][userId]) cardsData[guildId][userId] = {};

  const userCard = cardsData[guildId][userId];

  if (bio) userCard.bio = bio; else delete userCard.bio;
  if (asal) userCard.asal = asal; else delete userCard.asal;
  if (color) userCard.color = color.toUpperCase(); else delete userCard.color;

  // Toggle Promo Link: ON if URL exists, OFF if empty
  if (linkUrl) {
    userCard.linkTitle = linkTitle || 'Featured Link';
    userCard.linkUrl = linkUrl;
  } else {
    delete userCard.linkTitle;
    delete userCard.linkUrl;
  }

  storage.write('cards', cardsData);

  // Reply instantly
  await interaction.editReply({
    content: `**Profile saved!** Your Member Card is being published to <#${GALLERY_CHANNEL_ID}>.`
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
  buildMemberCardEmbed
};
