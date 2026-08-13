const {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags
} = require('discord.js');
const storage = require('./storage');

// Default Channel ID tempat hasil Member Card diterbitkan (#card-gallery)
const GALLERY_CHANNEL_ID = '1532290934396555354';

/**
 * Creates Embed & ActionRow for Member Profile Card Hub Panel posted in #create-card
 */
function createCardHubPayload(guild) {
  const settings = storage.read('settings');
  const targetChannelId = settings[guild.id]?.cardResultChannel || GALLERY_CHANNEL_ID;

  const embed = new EmbedBuilder()
    .setColor('#8B5CF6')
    .setTitle('🎴 Member Profile Card Hub')
    .setDescription(
      'Create your custom digital identity card in this server.\n\n' +
      '**How It Works:**\n' +
      '1. Click **Edit Info** to set your Bio, Location, Fav Music & Hobbies.\n' +
      '2. Click **Customization** to set Color Hex, Banner Image/GIF & Promo Links.\n' +
      '3. Click **View My Card** to preview your card privately.\n' +
      `4. Click **Publish Card** to share/update your card in <#${targetChannelId}>.`
    )
    .setFooter({ text: `${guild.name} • Member Identity System` })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('card_btn_edit_info')
      .setLabel('Edit Info')
      .setEmoji('📝')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('card_btn_edit_style')
      .setLabel('Customization')
      .setEmoji('🎨')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId('card_btn_view_self')
      .setLabel('View My Card')
      .setEmoji('👁️')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId('card_btn_publish')
      .setLabel('Publish Card')
      .setEmoji('📢')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId('card_btn_reset')
      .setLabel('Reset')
      .setEmoji('🗑️')
      .setStyle(ButtonStyle.Danger)
  );

  return { embeds: [embed], components: [row] };
}

/**
 * Helper to build interactive ActionRow buttons for published cards in gallery
 */
function createPublishedCardComponents(authorId, likesCount = 0, respectsCount = 0) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`card_btn_like_${authorId}`)
      .setLabel(`Like (${likesCount})`)
      .setEmoji('❤️')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`card_btn_respect_${authorId}`)
      .setLabel(`Respect (${respectsCount})`)
      .setEmoji('⭐')
      .setStyle(ButtonStyle.Secondary)
  );

  return [row];
}

/**
 * Build clean, aesthetic, and elegant Member Profile Card Embed
 * Contains: Display Name, Avatar, Username, Badges, Bio, Location, Joined Server Date, Account Created Date, Fav Music, Hobbies, Promo Link, Image Banner
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

  // Automatic Server Badges
  const badges = [];
  if (guild.ownerId === targetUser.id) {
    badges.push('👑 Owner');
  } else if (member.permissions.has('Administrator') || member.permissions.has('ManageGuild')) {
    badges.push('🛡️ Staff');
  } else if (member.permissions.has('ManageMessages') || member.permissions.has('ModerateMembers')) {
    badges.push('🛡️ Mod');
  }

  if (member.premiumSince) {
    badges.push('🚀 Booster');
  }

  badges.push('🎵 Music Lover');

  let description = `\`@${targetUser.username}\` • ${badges.join(' • ')}`;
  if (userCard.bio) {
    description += `\n\n*"${userCard.bio}"*`;
  }

  const embed = new EmbedBuilder()
    .setColor(embedColor)
    .setTitle(member.displayName)
    .setThumbnail(targetUser.displayAvatarURL({ extension: 'png', size: 256 }))
    .setDescription(description);

  if (userCard.asal) {
    embed.addFields({ name: '📍 Location', value: userCard.asal, inline: true });
  }

  if (member.joinedAt) {
    embed.addFields({ name: '📅 Joined Server', value: formatDate(member.joinedAt), inline: true });
  }

  if (targetUser.createdAt) {
    embed.addFields({ name: '🎂 Account Created', value: formatDate(targetUser.createdAt), inline: true });
  }

  if (userCard.favMusic) {
    embed.addFields({ name: '🎵 Fav Music', value: userCard.favMusic, inline: true });
  }

  if (userCard.hobbies) {
    embed.addFields({ name: '🎮 Hobbies', value: userCard.hobbies, inline: true });
  }

  // Promotional / Custom Link Field
  if (userCard.linkUrl) {
    const title = userCard.linkTitle || '🔗 Featured Link';
    embed.addFields({
      name: title,
      value: userCard.linkUrl,
      inline: false
    });
  }

  // Custom Banner / GIF Image below fields
  if (userCard.bannerUrl && /^https?:\/\/.+/i.test(userCard.bannerUrl)) {
    embed.setImage(userCard.bannerUrl);
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

  const likesCount = (userCard.likes || []).length;
  const respectsCount = (userCard.respects || []).length;

  const embed = await buildMemberCardEmbed(guild, member);
  const components = createPublishedCardComponents(userId, likesCount, respectsCount);

  // If card was already published, edit existing message in-place
  if (existingMsgId) {
    try {
      const existingMsg = await publishChannel.messages.fetch(existingMsgId);
      if (existingMsg) {
        await existingMsg.edit({
          content: `**${member.displayName}** updated their Member Card.`,
          embeds: [embed],
          components: components
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
    const newMsg = await publishChannel.send({
      content: warmMessage,
      embeds: [embed],
      components: components
    });

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
 * Handle when user clicks a button in Card Hub Panel or Published Card
 */
async function handleCardButton(interaction, client) {
  const customId = interaction.customId;
  const guildId = interaction.guild.id;
  const userId = interaction.user.id;

  const settings = storage.read('settings');
  const targetChannelId = settings[guildId]?.cardResultChannel || GALLERY_CHANNEL_ID;

  // 1. EDIT PROFILE INFO (Bio, Location, Fav Music, Hobbies)
  if (customId === 'card_btn_edit_info') {
    const cardsData = storage.read('cards');
    const userCard = cardsData[guildId]?.[userId] || {};

    const modal = new ModalBuilder()
      .setCustomId('card_modal_info_submit')
      .setTitle('Edit Profile Info');

    const bioInput = new TextInputBuilder()
      .setCustomId('card_input_bio')
      .setLabel('Bio / Status Tagline (Max 100)')
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder('e.g. Passionate music enthusiast & developer')
      .setValue(userCard.bio || '')
      .setRequired(false)
      .setMaxLength(100);

    const asalInput = new TextInputBuilder()
      .setCustomId('card_input_asal')
      .setLabel('Location / Asal (Max 30)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('e.g. Jakarta, Indonesia')
      .setValue(userCard.asal || '')
      .setRequired(false)
      .setMaxLength(30);

    const favMusicInput = new TextInputBuilder()
      .setCustomId('card_input_favmusic')
      .setLabel('Fav Music / Genre (Max 50)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('e.g. Indie Pop, Lo-Fi, Metal')
      .setValue(userCard.favMusic || '')
      .setRequired(false)
      .setMaxLength(50);

    const hobbiesInput = new TextInputBuilder()
      .setCustomId('card_input_hobbies')
      .setLabel('Hobbies & Minat (Max 50)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('e.g. Gaming, Coding, Watching Anime')
      .setValue(userCard.hobbies || '')
      .setRequired(false)
      .setMaxLength(50);

    modal.addComponents(
      new ActionRowBuilder().addComponents(bioInput),
      new ActionRowBuilder().addComponents(asalInput),
      new ActionRowBuilder().addComponents(favMusicInput),
      new ActionRowBuilder().addComponents(hobbiesInput)
    );

    return interaction.showModal(modal);
  }

  // 2. EDIT CUSTOMIZATION & LINKS (Color, Banner URL, Promo Title & Link)
  if (customId === 'card_btn_edit_style') {
    const cardsData = storage.read('cards');
    const userCard = cardsData[guildId]?.[userId] || {};

    const modal = new ModalBuilder()
      .setCustomId('card_modal_style_submit')
      .setTitle('Customization & Links');

    const colorInput = new TextInputBuilder()
      .setCustomId('card_input_color')
      .setLabel('Accent Color Hex (Optional)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('e.g. #8B5CF6 or #FF5733')
      .setValue(userCard.color || '')
      .setRequired(false)
      .setMaxLength(7);

    const bannerInput = new TextInputBuilder()
      .setCustomId('card_input_banner')
      .setLabel('Banner Image/GIF URL (Optional)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('e.g. https://i.imgur.com/example.gif')
      .setValue(userCard.bannerUrl || '')
      .setRequired(false)
      .setMaxLength(250);

    const linkTitleInput = new TextInputBuilder()
      .setCustomId('card_input_link_title')
      .setLabel('Promo Link Title (Max 30)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('e.g. YouTube Channel, Spotify, Portfolio')
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
      new ActionRowBuilder().addComponents(colorInput),
      new ActionRowBuilder().addComponents(bannerInput),
      new ActionRowBuilder().addComponents(linkTitleInput),
      new ActionRowBuilder().addComponents(linkUrlInput)
    );

    return interaction.showModal(modal);
  }

  // 3. VIEW MY CARD (Ephemeral — Clean Embed)
  if (customId === 'card_btn_view_self') {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const embed = await buildMemberCardEmbed(interaction.guild, interaction.member);
      return await interaction.editReply({
        content: '*Your Member Card Preview:*',
        embeds: [embed]
      });
    } catch (err) {
      console.error('[ViewCard] Error:', err);
      return await interaction.editReply({
        content: `Failed to generate card preview: ${err.message}`
      });
    }
  }

  // 4. PUBLISH CARD → Send or update in #card-gallery
  if (customId === 'card_btn_publish') {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const result = await publishCardToChannel(interaction.guild, interaction.member, client);

    if (result === 'first') {
      return interaction.editReply({
        content: `Your Member Card has been successfully published in <#${targetChannelId}>!`
      });
    } else if (result === 'updated') {
      return interaction.editReply({
        content: `Your Member Card has been updated in <#${targetChannelId}>!`
      });
    } else {
      return interaction.editReply({
        content: `Failed to publish card. Please ensure the bot has Send Messages permission in <#${targetChannelId}>.`
      });
    }
  }

  // 5. RESET CARD
  if (customId === 'card_btn_reset') {
    const cardsData = storage.read('cards');
    const userCard = cardsData[guildId]?.[userId];
    if (userCard) {
      if (userCard.publishedMessageId) {
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
      content: 'Your profile card has been reset to default and removed from the gallery.',
      flags: MessageFlags.Ephemeral
    });
  }

  // 6. LIKE & RESPECT BUTTONS ON PUBLISHED CARD
  if (customId.startsWith('card_btn_like_') || customId.startsWith('card_btn_respect_')) {
    const isLike = customId.startsWith('card_btn_like_');
    const authorId = customId.replace(isLike ? 'card_btn_like_' : 'card_btn_respect_', '');

    const voterId = interaction.user.id;
    const cardsData = storage.read('cards');

    if (!cardsData[guildId] || !cardsData[guildId][authorId]) {
      return interaction.reply({
        content: '❌ Card data not found.',
        flags: MessageFlags.Ephemeral
      });
    }

    const targetCard = cardsData[guildId][authorId];
    if (isLike) {
      if (!Array.isArray(targetCard.likes)) targetCard.likes = [];
      const idx = targetCard.likes.indexOf(voterId);
      if (idx > -1) {
        targetCard.likes.splice(idx, 1);
      } else {
        targetCard.likes.push(voterId);
      }
    } else {
      if (!Array.isArray(targetCard.respects)) targetCard.respects = [];
      const idx = targetCard.respects.indexOf(voterId);
      if (idx > -1) {
        targetCard.respects.splice(idx, 1);
      } else {
        targetCard.respects.push(voterId);
      }
    }

    storage.write('cards', cardsData);

    const authorMember = await interaction.guild.members.fetch(authorId).catch(() => null);
    if (!authorMember) {
      return interaction.reply({
        content: '❌ Member card author not found.',
        flags: MessageFlags.Ephemeral
      });
    }

    const updatedEmbed = await buildMemberCardEmbed(interaction.guild, authorMember);
    const updatedComponents = createPublishedCardComponents(
      authorId,
      (targetCard.likes || []).length,
      (targetCard.respects || []).length
    );

    // Update message in-place instantly
    await interaction.update({
      embeds: [updatedEmbed],
      components: updatedComponents
    });

    const isAdded = isLike
      ? targetCard.likes.includes(voterId)
      : targetCard.respects.includes(voterId);

    const actionText = isLike
      ? (isAdded ? '❤️ You liked this Member Card!' : 'You removed your like.')
      : (isAdded ? '⭐ You gave respect to this Member Card!' : 'You removed your respect.');

    return interaction.followUp({
      content: actionText,
      flags: MessageFlags.Ephemeral
    }).catch(() => {});
  }
}

/**
 * Handle modal form submit — save data & auto-publish
 */
async function handleCardModalSubmit(interaction, client) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const guildId = interaction.guild.id;
  const userId = interaction.user.id;
  const customId = interaction.customId;

  const settings = storage.read('settings');
  const targetChannelId = settings[guildId]?.cardResultChannel || GALLERY_CHANNEL_ID;

  const cardsData = storage.read('cards');
  if (!cardsData[guildId]) cardsData[guildId] = {};
  if (!cardsData[guildId][userId]) cardsData[guildId][userId] = {};

  const userCard = cardsData[guildId][userId];

  if (customId === 'card_modal_info_submit') {
    let bio = interaction.fields.getTextInputValue('card_input_bio').trim();
    let asal = interaction.fields.getTextInputValue('card_input_asal').trim();
    let favMusic = interaction.fields.getTextInputValue('card_input_favmusic').trim();
    let hobbies = interaction.fields.getTextInputValue('card_input_hobbies').trim();

    if (bio.length > 100) bio = bio.slice(0, 100);
    if (asal.length > 30) asal = asal.slice(0, 30);
    if (favMusic.length > 50) favMusic = favMusic.slice(0, 50);
    if (hobbies.length > 50) hobbies = hobbies.slice(0, 50);

    if (bio) userCard.bio = bio; else delete userCard.bio;
    if (asal) userCard.asal = asal; else delete userCard.asal;
    if (favMusic) userCard.favMusic = favMusic; else delete userCard.favMusic;
    if (hobbies) userCard.hobbies = hobbies; else delete userCard.hobbies;

    storage.write('cards', cardsData);

    await interaction.editReply({
      content: `**Profile info saved!** Updating your Member Card in <#${targetChannelId}>...`
    });
  } else if (customId === 'card_modal_style_submit') {
    let color = interaction.fields.getTextInputValue('card_input_color').trim();
    let bannerUrl = interaction.fields.getTextInputValue('card_input_banner').trim();
    let linkTitle = interaction.fields.getTextInputValue('card_input_link_title').trim();
    let linkUrl = interaction.fields.getTextInputValue('card_input_link_url').trim();

    if (linkTitle.length > 30) linkTitle = linkTitle.slice(0, 30);

    // Validate hex color
    if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
      return interaction.editReply({
        content: 'Invalid hex color format! Please use a valid hex code like `#8B5CF6`.'
      });
    }

    // Format URLs if provided
    if (bannerUrl && !/^https?:\/\//i.test(bannerUrl)) {
      bannerUrl = `https://${bannerUrl}`;
    }
    if (linkUrl && !/^https?:\/\//i.test(linkUrl)) {
      linkUrl = `https://${linkUrl}`;
    }

    if (color) userCard.color = color.toUpperCase(); else delete userCard.color;
    if (bannerUrl) userCard.bannerUrl = bannerUrl; else delete userCard.bannerUrl;

    if (linkUrl) {
      userCard.linkTitle = linkTitle || 'Featured Link';
      userCard.linkUrl = linkUrl;
    } else {
      delete userCard.linkTitle;
      delete userCard.linkUrl;
    }

    storage.write('cards', cardsData);

    await interaction.editReply({
      content: `**Customization saved!** Updating your Member Card in <#${targetChannelId}>...`
    });
  }

  // Auto-update published card in gallery if card was already published
  if (userCard.publishedMessageId) {
    publishCardToChannel(interaction.guild, interaction.member, client).catch(err => {
      console.error('[CardHandler] Background auto-update failed:', err.message);
    });
  }
}

module.exports = {
  createCardHubPayload,
  handleCardButton,
  handleCardModalSubmit,
  buildMemberCardEmbed
};
