const {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags,
  AttachmentBuilder
} = require('discord.js');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const https = require('https');
const http = require('http');
const storage = require('./storage');

// Banner dimensions (fixed for all cards)
const BANNER_WIDTH = 800;
const BANNER_HEIGHT = 240;

/**
 * Download image buffer from URL with timeout
 */
function fetchImageBuffer(urlStr, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    try {
      const parsed = new URL(urlStr);
      const proto = parsed.protocol === 'https:' ? https : http;
      let settled = false;
      const settle = (fn, val) => { if (!settled) { settled = true; fn(val); } };

      const req = proto.get(parsed, {
        agent: false,
        family: 4,
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'image/*' }
      }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return fetchImageBuffer(res.headers.location, timeoutMs)
            .then(b => settle(resolve, b), e => settle(reject, e));
        }
        if (res.statusCode !== 200) return settle(reject, new Error(`HTTP ${res.statusCode}`));
        const chunks = [];
        res.on('data', c => chunks.push(c));
        res.on('end', () => settle(resolve, Buffer.concat(chunks)));
        res.on('error', e => settle(reject, e));
      });
      req.setTimeout(timeoutMs, () => { req.destroy(); settle(reject, new Error('Timeout')); });
      req.on('error', e => settle(reject, e));
    } catch (e) { reject(e); }
  });
}

/**
 * Download and center-crop any image to a fixed banner size (800x240).
 * Returns a PNG Buffer or null on failure.
 */
async function cropBannerImage(url) {
  try {
    const buffer = await fetchImageBuffer(url, 4000);
    const img = await loadImage(buffer);

    const canvas = createCanvas(BANNER_WIDTH, BANNER_HEIGHT);
    const ctx = canvas.getContext('2d');

    // Calculate center-crop (cover)
    const srcRatio = img.width / img.height;
    const dstRatio = BANNER_WIDTH / BANNER_HEIGHT;
    let sx, sy, sw, sh;

    if (srcRatio > dstRatio) {
      // Source is wider — crop sides
      sh = img.height;
      sw = img.height * dstRatio;
      sx = (img.width - sw) / 2;
      sy = 0;
    } else {
      // Source is taller — crop top/bottom
      sw = img.width;
      sh = img.width / dstRatio;
      sx = 0;
      sy = (img.height - sh) / 2;
    }

    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, BANNER_WIDTH, BANNER_HEIGHT);
    return canvas.toBuffer('image/png');
  } catch (err) {
    console.warn('[CardHandler] Banner crop failed:', err.message);
    return null;
  }
}

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
    .setTitle('Member Profile Card')
    .setDescription(
      'Create your custom digital identity card in this server.\n\n' +
      '**How It Works:**\n' +
      `1. Click **Edit Profile** to customize your Bio, Location, Music, Hobbies & Banner. Your card will be automatically published/updated in <#${targetChannelId}>.\n` +
      '2. Click **View My Card** to preview your card privately.\n' +
      '3. Click **Reset** to clear all your data and remove your card from the gallery.'
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
      .setCustomId('card_btn_reset')
      .setLabel('Reset')
      .setStyle(ButtonStyle.Danger)
  );

  return { embeds: [embed], components: [row] };
}

/**
 * Helper to build interactive Like & Respect buttons for published cards in gallery
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
 * Returns { embed, files } — files contains the cropped banner attachment if applicable
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

  if (userCard.hobbies) {
    embed.addFields({ name: 'Hobbies', value: userCard.hobbies, inline: true });
  }

  // Process banner: crop to fixed size for consistency
  const files = [];
  if (userCard.bannerUrl && /^https?:\/\/.+/i.test(userCard.bannerUrl)) {
    const croppedBuffer = await cropBannerImage(userCard.bannerUrl);
    if (croppedBuffer) {
      files.push(new AttachmentBuilder(croppedBuffer, { name: 'banner.png' }));
      embed.setImage('attachment://banner.png');
    } else {
      // Fallback: use raw URL if crop fails
      embed.setImage(userCard.bannerUrl);
    }
  }

  embed
    .setFooter({ text: `${guild.name} • Member Card` })
    .setTimestamp();

  return { embed, files };
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

  const { embed, files } = await buildMemberCardEmbed(guild, member);
  const components = createPublishedCardComponents(userId, likesCount, respectsCount);

  // If card was already published, edit existing message in-place
  if (existingMsgId) {
    try {
      const existingMsg = await publishChannel.messages.fetch(existingMsgId);
      if (existingMsg) {
        await existingMsg.edit({
          content: `**${member.displayName}** updated their Member Card.`,
          embeds: [embed],
          components: components,
          files: files
        });
        console.log(`[CardHandler] Card for ${member.displayName} updated in-place in #${publishChannel.name}`);
        return 'updated';
      }
    } catch (fetchErr) {
      console.warn(`[CardHandler] Could not fetch existing message ${existingMsgId}, creating new message.`);
    }
  }

  // First time publish OR fallback if existing message was deleted
  try {
    const warmMessage = `**${member.displayName}** published their Member Card.`;
    const newMsg = await publishChannel.send({
      content: warmMessage,
      embeds: [embed],
      components: components,
      files: files
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

  // 1. EDIT PROFILE → Single Modal (5 fields: Bio, Location, Hobbies, Color, Banner URL)
  if (customId === 'card_btn_edit') {
    const cardsData = storage.read('cards');
    const userCard = cardsData[guildId]?.[userId] || {};

    const modal = new ModalBuilder()
      .setCustomId('card_modal_submit')
      .setTitle('Edit Member Profile');

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
      .setLabel('Location (Max 30)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('e.g. Jakarta, Indonesia')
      .setValue(userCard.asal || '')
      .setRequired(false)
      .setMaxLength(30);

    const hobbiesInput = new TextInputBuilder()
      .setCustomId('card_input_hobbies')
      .setLabel('Hobbies & Interests (Max 50)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('e.g. Gaming, Coding, Music, Anime')
      .setValue(userCard.hobbies || '')
      .setRequired(false)
      .setMaxLength(50);

    const colorInput = new TextInputBuilder()
      .setCustomId('card_input_color')
      .setLabel('Card Accent Color Hex')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('e.g. #8B5CF6 or #FF5733')
      .setValue(userCard.color || '')
      .setRequired(false)
      .setMaxLength(7);

    const bannerInput = new TextInputBuilder()
      .setCustomId('card_input_banner')
      .setLabel('Banner Image URL (direct link to image)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Paste direct image link (.png/.jpg/.gif)')
      .setValue(userCard.bannerUrl || '')
      .setRequired(false)
      .setMaxLength(250);

    modal.addComponents(
      new ActionRowBuilder().addComponents(bioInput),
      new ActionRowBuilder().addComponents(asalInput),
      new ActionRowBuilder().addComponents(hobbiesInput),
      new ActionRowBuilder().addComponents(colorInput),
      new ActionRowBuilder().addComponents(bannerInput)
    );

    return interaction.showModal(modal);
  }

  // 2. VIEW MY CARD (Ephemeral Preview)
  if (customId === 'card_btn_view_self') {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const { embed, files } = await buildMemberCardEmbed(interaction.guild, interaction.member);
      return await interaction.editReply({
        content: '*Your Member Card Preview:*',
        embeds: [embed],
        files: files
      });
    } catch (err) {
      console.error('[ViewCard] Error:', err);
      return await interaction.editReply({
        content: `Failed to generate card preview: ${err.message}`
      });
    }
  }


  // 4. RESET CARD
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
      content: 'Your profile card has been reset and removed from the gallery.',
      flags: MessageFlags.Ephemeral
    });
  }

  // 5. LIKE & RESPECT BUTTONS (on published cards in gallery)
  if (customId.startsWith('card_btn_like_') || customId.startsWith('card_btn_respect_')) {
    const isLike = customId.startsWith('card_btn_like_');
    const authorId = customId.replace(isLike ? 'card_btn_like_' : 'card_btn_respect_', '');
    const voterId = interaction.user.id;

    const cardsData = storage.read('cards');
    if (!cardsData[guildId]?.[authorId]) {
      return interaction.reply({
        content: 'Card data not found.',
        flags: MessageFlags.Ephemeral
      });
    }

    const targetCard = cardsData[guildId][authorId];

    // Toggle vote (add or remove)
    if (isLike) {
      if (!Array.isArray(targetCard.likes)) targetCard.likes = [];
      const idx = targetCard.likes.indexOf(voterId);
      if (idx > -1) targetCard.likes.splice(idx, 1);
      else targetCard.likes.push(voterId);
    } else {
      if (!Array.isArray(targetCard.respects)) targetCard.respects = [];
      const idx = targetCard.respects.indexOf(voterId);
      if (idx > -1) targetCard.respects.splice(idx, 1);
      else targetCard.respects.push(voterId);
    }

    storage.write('cards', cardsData);

    // Re-build and update the message in-place (real-time)
    const authorMember = await interaction.guild.members.fetch(authorId).catch(() => null);
    if (!authorMember) {
      return interaction.reply({
        content: 'Card author not found in this server.',
        flags: MessageFlags.Ephemeral
      });
    }

    const { embed: updatedEmbed, files } = await buildMemberCardEmbed(interaction.guild, authorMember);
    const updatedComponents = createPublishedCardComponents(
      authorId,
      (targetCard.likes || []).length,
      (targetCard.respects || []).length
    );

    // Update the message instantly (real-time update)
    await interaction.update({
      embeds: [updatedEmbed],
      components: updatedComponents,
      files: files
    });

    const isAdded = isLike
      ? targetCard.likes.includes(voterId)
      : targetCard.respects.includes(voterId);

    const actionText = isLike
      ? (isAdded ? 'You liked this card.' : 'You removed your like.')
      : (isAdded ? 'You gave respect.' : 'You removed your respect.');

    return interaction.followUp({
      content: actionText,
      flags: MessageFlags.Ephemeral
    }).catch(() => {});
  }
}

/**
 * Handle modal form submit — save data & auto-update if already published
 */
async function handleCardModalSubmit(interaction, client) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const guildId = interaction.guild.id;
  const userId = interaction.user.id;

  const settings = storage.read('settings');
  const targetChannelId = settings[guildId]?.cardResultChannel || GALLERY_CHANNEL_ID;

  let bio = interaction.fields.getTextInputValue('card_input_bio').trim();
  let asal = interaction.fields.getTextInputValue('card_input_asal').trim();
  let hobbies = interaction.fields.getTextInputValue('card_input_hobbies').trim();
  let color = interaction.fields.getTextInputValue('card_input_color').trim();
  let bannerUrl = interaction.fields.getTextInputValue('card_input_banner').trim();

  if (bio.length > 100) bio = bio.slice(0, 100);
  if (asal.length > 30) asal = asal.slice(0, 30);
  if (hobbies.length > 50) hobbies = hobbies.slice(0, 50);

  // Validate hex color
  if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
    return interaction.editReply({
      content: 'Invalid color format. Use hex like `#8B5CF6`.'
    });
  }

  // Format banner URL
  if (bannerUrl && !/^https?:\/\//i.test(bannerUrl)) {
    bannerUrl = `https://${bannerUrl}`;
  }

  // Save profile data
  const cardsData = storage.read('cards');
  if (!cardsData[guildId]) cardsData[guildId] = {};
  if (!cardsData[guildId][userId]) cardsData[guildId][userId] = {};

  const userCard = cardsData[guildId][userId];

  if (bio) userCard.bio = bio; else delete userCard.bio;
  if (asal) userCard.asal = asal; else delete userCard.asal;
  if (hobbies) userCard.hobbies = hobbies; else delete userCard.hobbies;
  if (color) userCard.color = color.toUpperCase(); else delete userCard.color;
  if (bannerUrl) userCard.bannerUrl = bannerUrl; else delete userCard.bannerUrl;

  storage.write('cards', cardsData);

  // Always auto-publish/update card in gallery on submit
  await interaction.editReply({
    content: `**Profile saved!** Publishing your card to <#${targetChannelId}>...`
  });

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
