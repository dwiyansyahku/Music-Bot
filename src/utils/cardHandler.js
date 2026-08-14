const {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags,
  AttachmentBuilder
} = require('discord.js');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const storage = require('./storage');

// Local storage directory for cropped banner images (inside persistent volume)
const BANNERS_DIR = path.join(process.cwd(), 'data', 'banners');
if (!fs.existsSync(BANNERS_DIR)) {
  fs.mkdirSync(BANNERS_DIR, { recursive: true });
}

function getBannerFilePath(guildId, userId) {
  return path.join(BANNERS_DIR, `${guildId}_${userId}.png`);
}

function normalizeBannerUrl(url) {
  if (!url) return '';
  let clean = url.trim();
  if (!/^https?:\/\//i.test(clean)) clean = `https://${clean}`;
  // Convert imgur.com/abc to i.imgur.com/abc.png
  const imgurMatch = clean.match(/^https?:\/\/imgur\.com\/([a-zA-Z0-9]+)$/i);
  if (imgurMatch) {
    clean = `https://i.imgur.com/${imgurMatch[1]}.png`;
  }
  return clean;
}

/**
 * Center-crop any image (square/vertical/landscape) to exactly 800x240 PNG and save to disk
 */
async function cropAndSaveBanner(url, guildId, userId) {
  if (!url) return false;
  const outPath = getBannerFilePath(guildId, userId);
  const targetUrl = normalizeBannerUrl(url);
  try {
    const res = await fetch(targetUrl, {
      signal: AbortSignal.timeout(8000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
      }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const img = await loadImage(buf);

    const canvas = createCanvas(800, 240);
    const ctx = canvas.getContext('2d');

    const srcRatio = img.width / img.height;
    const dstRatio = 800 / 240;
    let sx, sy, sw, sh;
    if (srcRatio > dstRatio) {
      sh = img.height;
      sw = img.height * dstRatio;
      sx = (img.width - sw) / 2;
      sy = 0;
    } else {
      sw = img.width;
      sh = img.width / dstRatio;
      sx = 0;
      sy = (img.height - sh) / 2;
    }
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, 800, 240);
    fs.writeFileSync(outPath, canvas.toBuffer('image/png'));
    console.log(`[CardHandler] Cropped banner 800x240 saved for ${userId}`);
    return true;
  } catch (err) {
    console.warn(`[CardHandler] Banner crop failed for ${userId}:`, err.message);
    if (fs.existsSync(outPath)) {
      try { fs.unlinkSync(outPath); } catch (_) {}
    }
    return false;
  }
}



/**
 * Parse promo link input: supports 'Title | URL' or standalone 'URL' (auto-detects platform name)
 */
function parsePromoLink(input) {
  if (!input || !input.trim()) return null;
  let title = '';
  let url = '';

  if (input.includes('|')) {
    const parts = input.split('|');
    title = parts[0].trim();
    url = parts.slice(1).join('|').trim();
  } else {
    url = input.trim();
  }

  if (!url) return null;
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }

  // If no custom title was provided, auto-detect platform name from URL
  if (!title) {
    const lower = url.toLowerCase();
    if (lower.includes('youtube.com') || lower.includes('youtu.be')) title = 'YouTube';
    else if (lower.includes('spotify.com')) title = 'Spotify';
    else if (lower.includes('instagram.com')) title = 'Instagram';
    else if (lower.includes('tiktok.com')) title = 'TikTok';
    else if (lower.includes('github.com')) title = 'GitHub';
    else if (lower.includes('twitter.com') || lower.includes('x.com')) title = 'X (Twitter)';
    else if (lower.includes('twitch.tv')) title = 'Twitch';
    else if (lower.includes('soundcloud.com')) title = 'SoundCloud';
    else if (lower.includes('discord.gg') || lower.includes('discord.com')) title = 'Discord';
    else if (lower.includes('steamcommunity.com') || lower.includes('steampowered.com')) title = 'Steam';
    else {
      try {
        const parsed = new URL(url);
        title = parsed.hostname.replace(/^www\./i, '');
      } catch (_) {
        title = 'Visit Link ↗';
      }
    }
  }

  return { title, url };
}

/**
 * Comprehensive bilingual Color Map (140+ Standard CSS & Indonesian Color Names)
 */
const COLOR_MAP = {
  // English (Standard & Popular CSS Colors)
  'purple': '#8B5CF6',
  'violet': '#7C3AED',
  'darkviolet': '#9400D3',
  'indigo': '#6366F1',
  'blue': '#3B82F6',
  'royalblue': '#4169E1',
  'dodgerblue': '#1E90FF',
  'deepskyblue': '#00BFFF',
  'skyblue': '#0EA5E9',
  'sky': '#0EA5E9',
  'cyan': '#06B6D4',
  'aqua': '#00FFFF',
  'teal': '#14B8A6',
  'turquoise': '#40E0D0',
  'aquamarine': '#7FFFD4',
  'green': '#10B981',
  'emerald': '#059669',
  'lime': '#84CC16',
  'limegreen': '#32CD32',
  'forestgreen': '#228B22',
  'seagreen': '#2E8B57',
  'mint': '#6EE7B7',
  'olive': '#808000',
  'darkgreen': '#006400',
  'red': '#EF4444',
  'crimson': '#DC2626',
  'firebrick': '#B22222',
  'darkred': '#8B0000',
  'rose': '#F43F5E',
  'ruby': '#E0115F',
  'scarlet': '#FF2400',
  'maroon': '#800000',
  'pink': '#EC4899',
  'hotpink': '#FF69B4',
  'deeppink': '#FF1493',
  'lightpink': '#FFB6C1',
  'fuchsia': '#D946EF',
  'magenta': '#E11D48',
  'orange': '#F97316',
  'darkorange': '#FF8C00',
  'coral': '#FF7F50',
  'salmon': '#FA8072',
  'peach': '#FFDAB9',
  'amber': '#F59E0B',
  'yellow': '#EAB308',
  'gold': '#FFD700',
  'golden': '#FFD700',
  'khaki': '#F0E68C',
  'black': '#1E1E2E',
  'dark': '#181825',
  'charcoal': '#36454F',
  'white': '#FFFFFF',
  'silver': '#C0C0C0',
  'gray': '#6B7280',
  'grey': '#6B7280',
  'darkgray': '#4B5563',
  'darkgrey': '#4B5563',
  'lightgray': '#D1D5DB',
  'lightgrey': '#D1D5DB',
  'navy': '#1E3A8A',
  'midnightblue': '#191970',
  'brown': '#78350F',
  'chocolate': '#D2691E',
  'coffee': '#6F4E37',
  'sienna': '#A0522D',
  'lavender': '#E6E6FA',
  'plum': '#DDA0DD',
  'thistle': '#D8BFD8',
  'beige': '#F5F5DC',

  // Bahasa Indonesia
  'ungu': '#8B5CF6',
  'ungutua': '#7C3AED',
  'ungu tua': '#7C3AED',
  'ungumuda': '#C084FC',
  'ungu muda': '#C084FC',
  'nila': '#6366F1',
  'lembayung': '#A855F7',
  'biru': '#3B82F6',
  'birumuda': '#38BDF8',
  'biru muda': '#38BDF8',
  'birulangit': '#0EA5E9',
  'biru langit': '#0EA5E9',
  'birutua': '#1E3A8A',
  'biru tua': '#1E3A8A',
  'birulaut': '#0284C7',
  'biru laut': '#0284C7',
  'hijau': '#10B981',
  'hijautua': '#047857',
  'hijau tua': '#047857',
  'hijaumuda': '#34D399',
  'hijau muda': '#34D399',
  'hijaupupus': '#A3E635',
  'hijau pupus': '#A3E635',
  'hijaugelap': '#064E3B',
  'hijau gelap': '#064E3B',
  'merah': '#EF4444',
  'merahmuda': '#EC4899',
  'merah muda': '#EC4899',
  'merahtua': '#991B1B',
  'merah tua': '#991B1B',
  'merahhati': '#800000',
  'merah hati': '#800000',
  'merahmaron': '#800000',
  'merah maron': '#800000',
  'maron': '#800000',
  'kuning': '#EAB308',
  'kuningmuda': '#FEF08A',
  'kuning muda': '#FEF08A',
  'kuningtua': '#CA8A04',
  'kuning tua': '#CA8A04',
  'emas': '#FFD700',
  'oranye': '#F97316',
  'orange': '#F97316',
  'jingga': '#F97316',
  'toska': '#06B6D4',
  'tosca': '#06B6D4',
  'hitam': '#1E1E2E',
  'hitampekat': '#11111B',
  'hitam pekat': '#11111B',
  'putih': '#FFFFFF',
  'putihbersih': '#FFFFFF',
  'putih bersih': '#FFFFFF',
  'abu': '#6B7280',
  'abu-abu': '#6B7280',
  'abu abu': '#6B7280',
  'abumuda': '#9CA3AF',
  'abu muda': '#9CA3AF',
  'abutua': '#374151',
  'abu tua': '#374151',
  'perak': '#C0C0C0',
  'cokelat': '#78350F',
  'coklat': '#78350F',
  'coklattua': '#451A03',
  'coklat tua': '#451A03',
  'coklatmuda': '#B45309',
  'coklat muda': '#B45309'
};

/**
 * Resolve color from English name, Indonesian name, or Hex code (#RGB / #RRGGBB / RRGGBB)
 */
function resolveColor(input) {
  if (!input || !input.trim()) return null;
  const clean = input.trim().toLowerCase();

  // 1. Direct name lookup
  if (COLOR_MAP[clean]) {
    return COLOR_MAP[clean];
  }

  // 2. Lookup with spaces/hyphens removed
  const noSpace = clean.replace(/[\s-_]+/g, '');
  if (COLOR_MAP[noSpace]) {
    return COLOR_MAP[noSpace];
  }

  // 3. Hex code matching (supports 3 or 6 hex digits, with or without #)
  const hexMatch = clean.match(/^#?([0-9a-f]{6}|[0-9a-f]{3})$/i);
  if (hexMatch) {
    const hex = hexMatch[1];
    if (hex.length === 3) {
      return `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`.toUpperCase();
    }
    return `#${hex}`.toUpperCase();
  }

  return null;
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
      `1. Click **Edit Profile** to customize your Bio, Location, Social Link, Card Color & Banner. Your card will be automatically published/updated in <#${targetChannelId}>.\n` +
      '2. **Banner Image:** Any image size/ratio is supported (auto-cropped to **800×240 px**). Get the link via *Right-click image ➔ Copy Image Link*.\n' +
      '3. Click **View My Card** to preview your card privately.\n' +
      '4. Click **Reset** to clear all your data and remove your card from the gallery.'
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

const { getVoiceStats } = require('./voiceTracker');

/**
 * Helper to calculate member join position order in the guild (e.g. #42 of 250)
 */
async function getMemberJoinPosition(guild, member) {
  if (!guild || !member) return null;
  try {
    const members = await guild.members.fetch().catch(() => guild.members.cache);
    const sorted = [...members.values()]
      .filter(m => !m.user.bot && m.joinedTimestamp)
      .sort((a, b) => a.joinedTimestamp - b.joinedTimestamp);

    const index = sorted.findIndex(m => m.id === member.id);
    if (index !== -1) {
      return `#${index + 1} of ${sorted.length}`;
    }
  } catch (err) {
    console.warn('[CardHandler] Failed to get member join position:', err.message);
  }
  return null;
}

/**
 * Build clean, aesthetic, and elegant Member Profile Card Embed
 * @param {Object} options - { useFiles: boolean } — if true, attach local file; if false, use URL only
 * Returns { embed, files }
 */
async function buildMemberCardEmbed(guild, member, options = {}) {
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

  // Row 1: Core Server & Account Info (Inline 3 Columns)
  const joinPos = await getMemberJoinPosition(guild, member);
  if (joinPos) {
    embed.addFields({ name: 'Member #', value: joinPos, inline: true });
  }

  if (member.joinedAt) {
    embed.addFields({ name: 'Join Server', value: formatDate(member.joinedAt), inline: true });
  }

  if (targetUser.createdAt) {
    embed.addFields({ name: 'Created', value: formatDate(targetUser.createdAt), inline: true });
  }

  // Row 2: Real-time Voice Stats & Personal Info (Inline 3 Columns)
  const voiceStats = getVoiceStats(guild.id, targetUser.id, guild);
  embed.addFields({ name: 'Voice Time', value: voiceStats.formattedTime, inline: true });

  if (userCard.asal) {
    embed.addFields({ name: 'Location', value: userCard.asal, inline: true });
  }

  if (userCard.linkUrl) {
    const linkTitle = userCard.linkTitle || 'Visit Link ↗';
    embed.addFields({
      name: 'Social Link',
      value: `[${linkTitle}](${userCard.linkUrl})`,
      inline: true
    });
  }

  // Row 3: Top Voice Friends (Full Width, Vertical List)
  if (voiceStats.topCompanions && voiceStats.topCompanions.length > 0) {
    const compText = voiceStats.topCompanions
      .map((c, i) => `${i + 1}. **${c.name}** — ${c.timeFormatted}`)
      .join('\n');
    embed.addFields({ name: 'Top Voice Friends', value: compText, inline: false });
  }

  // Banner image handling — 3 modes:
  //   attachFiles: true      → upload local cropped file (initial gallery publish)
  //   referenceAttachment: true → use attachment:// ref (auto-sync/like edits on existing gallery msg)
  //   default (both false)   → use bannerCropUrl CDN URL (View My Card, /card)
  const files = [];
  const bannerPath = getBannerFilePath(guild.id, targetUser.id);
  const hasCroppedFile = fs.existsSync(bannerPath);

  if (options.attachFiles && hasCroppedFile) {
    // Mode 1: Upload local cropped file to Discord (only on first publish after new crop)
    files.push(new AttachmentBuilder(bannerPath, { name: 'banner.png' }));
    embed.setImage('attachment://banner.png');
  } else if (options.referenceAttachment && hasCroppedFile) {
    // Mode 2: Reference existing attachment on gallery message (auto-sync, like/respect)
    // Discord preserves attachments when editing — attachment:// resolves to existing file
    embed.setImage('attachment://banner.png');
  } else if (userCard.bannerCropUrl && /^https?:\/\/.+/i.test(userCard.bannerCropUrl)) {
    // Mode 3: Use saved Discord CDN URL (View My Card, /card — zero upload)
    embed.setImage(userCard.bannerCropUrl);
  } else if (userCard.bannerUrl && /^https?:\/\/.+/i.test(userCard.bannerUrl)) {
    // Fallback: use original banner URL (GIF or not yet cropped)
    embed.setImage(userCard.bannerUrl);
  }

  embed
    .setFooter({ text: `${guild.name} • Member Card` })
    .setTimestamp();

  return { embed, files };
}

/**
 * Publish or update member card in #card-gallery.
 * After successful publish with file, extracts Discord CDN URL and saves it.
 * @param {boolean} isAutoSync — if true, never uploads files (uses saved CDN URL)
 * @param {boolean} forceFiles — if true, forces file upload (used after new crop)
 * @returns {Promise<'first'|'updated'|null>}
 */
async function publishCardToChannel(guild, member, client, isAutoSync = false, forceFiles = false) {
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
    return null;
  }

  const cardsData = storage.read('cards');
  const userCard = cardsData[guildId]?.[userId] || {};
  const existingMsgId = userCard.publishedMessageId;

  const likesCount = (userCard.likes || []).length;
  const respectsCount = (userCard.respects || []).length;

  // Determine banner mode based on context
  const attachFiles = forceFiles && !isAutoSync;
  const referenceAttachment = isAutoSync;
  const { embed, files } = await buildMemberCardEmbed(guild, member, { attachFiles, referenceAttachment });
  const components = createPublishedCardComponents(userId, likesCount, respectsCount);

  // If card was already published, edit existing message in-place
  if (existingMsgId) {
    try {
      const existingMsg = await publishChannel.messages.fetch(existingMsgId);
      if (existingMsg) {
        const editPayload = {
          content: `**${member.displayName}** updated their Member Card.`,
          embeds: [embed],
          components: components
        };
        if (attachFiles && files.length > 0) {
          editPayload.files = files;
        }

        const editedMsg = await existingMsg.edit(editPayload);

        // Extract Discord CDN URL from uploaded attachment and save it
        if (attachFiles && editedMsg.attachments && editedMsg.attachments.size > 0) {
          const bannerAttachment = editedMsg.attachments.find(a => a.name === 'banner.png');
          if (bannerAttachment) {
            userCard.bannerCropUrl = bannerAttachment.url.split('?')[0];
            storage.write('cards', cardsData);
            console.log(`[CardHandler] Saved banner CDN URL for ${member.displayName}: ${userCard.bannerCropUrl}`);
          }
        }

        console.log(`[CardHandler] Card for ${member.displayName} updated in-place in #${publishChannel.name}`);
        return 'updated';
      }
    } catch (fetchErr) {
      if (fetchErr.code === 10008 || fetchErr.status === 404) {
        delete userCard.publishedMessageId;
        storage.write('cards', cardsData);
      } else {
        console.error(`[CardHandler] Edit failed:`, fetchErr.message);
      }
    }
  }

  // First time publish OR fallback if existing message was deleted
  try {
    // For first publish, always include files if available
    const sendPayload = {
      content: `**${member.displayName}** published their Member Card.`,
      embeds: [embed],
      components: components
    };
    // On first publish, use local files even if useFiles was false
    const bannerPath = getBannerFilePath(guildId, userId);
    if (fs.existsSync(bannerPath)) {
      sendPayload.files = [new AttachmentBuilder(bannerPath, { name: 'banner.png' })];
      embed.setImage('attachment://banner.png');
      sendPayload.embeds = [embed];
    }

    const newMsg = await publishChannel.send(sendPayload);

    if (!cardsData[guildId]) cardsData[guildId] = {};
    if (!cardsData[guildId][userId]) cardsData[guildId][userId] = {};
    cardsData[guildId][userId].publishedMessageId = newMsg.id;

    // Extract Discord CDN URL from the newly uploaded attachment
    if (newMsg.attachments && newMsg.attachments.size > 0) {
      const bannerAttachment = newMsg.attachments.find(a => a.name === 'banner.png');
      if (bannerAttachment) {
        cardsData[guildId][userId].bannerCropUrl = bannerAttachment.url.split('?')[0];
        console.log(`[CardHandler] Saved banner CDN URL for ${member.displayName}`);
      }
    }

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

    const linkInput = new TextInputBuilder()
      .setCustomId('card_input_link')
      .setLabel('Promo Link (Judul | URL, atau langsung URL)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('e.g. YouTube | https://youtube.com/@mychannel')
      .setValue(userCard.linkTitle && userCard.linkUrl ? `${userCard.linkTitle} | ${userCard.linkUrl}` : (userCard.linkUrl || ''))
      .setRequired(false)
      .setMaxLength(250);

    const colorInput = new TextInputBuilder()
      .setCustomId('card_input_color')
      .setLabel('Card Color (Nama / Hex)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('e.g. biru, merah, pink, ungu, gold, atau #8B5CF6')
      .setValue(userCard.color || '')
      .setRequired(false)
      .setMaxLength(25);

    const bannerInput = new TextInputBuilder()
      .setCustomId('card_input_banner')
      .setLabel('Banner Image (Auto-Crop 800x240)')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Bebas ukuran gambar (otomatis di-crop ke 800x240). Klik kanan gambar -> Copy Image Link')
      .setValue(userCard.bannerUrl || '')
      .setRequired(false)
      .setMaxLength(250);

    modal.addComponents(
      new ActionRowBuilder().addComponents(bioInput),
      new ActionRowBuilder().addComponents(asalInput),
      new ActionRowBuilder().addComponents(linkInput),
      new ActionRowBuilder().addComponents(colorInput),
      new ActionRowBuilder().addComponents(bannerInput)
    );

    return interaction.showModal(modal);
  }

  // 2. VIEW MY CARD (Ephemeral Preview) — never uploads files, uses CDN URL
  if (customId === 'card_btn_view_self') {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const { embed } = await buildMemberCardEmbed(interaction.guild, interaction.member);
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
            .then(msg => msg.delete().catch(() => { }))
            .catch(() => { });
        }
      }
      delete cardsData[guildId][userId];
      storage.write('cards', cardsData);

      // Delete cropped banner file
      const outPath = getBannerFilePath(guildId, userId);
      if (fs.existsSync(outPath)) {
        try { fs.unlinkSync(outPath); } catch (_) {}
      }
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

    // Use referenceAttachment mode — gallery message already has banner.png attached
    const { embed: updatedEmbed } = await buildMemberCardEmbed(interaction.guild, authorMember, { referenceAttachment: true });
    const updatedComponents = createPublishedCardComponents(
      authorId,
      (targetCard.likes || []).length,
      (targetCard.respects || []).length
    );

    // Update the message instantly (real-time update)
    await interaction.update({
      embeds: [updatedEmbed],
      components: updatedComponents
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
    }).catch(() => { });
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
  let linkRaw = interaction.fields.getTextInputValue('card_input_link').trim();
  let colorRaw = interaction.fields.getTextInputValue('card_input_color').trim();
  let bannerUrl = interaction.fields.getTextInputValue('card_input_banner').trim();
  let resolvedColor = null;

  // Resolve color by name (English / Indonesian) or hex, with graceful fallback
  if (colorRaw) {
    resolvedColor = resolveColor(colorRaw);
  }

  // Parse custom title & URL or auto-detect platform
  const parsedLink = parsePromoLink(linkRaw);

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

  if (parsedLink) {
    userCard.linkTitle = parsedLink.title;
    userCard.linkUrl = parsedLink.url;
  } else {
    delete userCard.linkTitle;
    delete userCard.linkUrl;
  }

  if (resolvedColor) userCard.color = resolvedColor; else delete userCard.color;

  if (bannerUrl) {
    const oldBannerUrl = userCard.bannerUrl;
    userCard.bannerUrl = bannerUrl;
    const isGif = /\.gif(\?.*)?$/i.test(bannerUrl) || /tenor\.com|giphy\.com/i.test(bannerUrl);
    let bannerCropped = false;
    if (!isGif) {
      // Crop banner once to 800x240 and save to disk
      bannerCropped = await cropAndSaveBanner(bannerUrl, guildId, userId);
      // Clear old CDN URL so it gets refreshed on publish
      if (bannerCropped) {
        delete userCard.bannerCropUrl;
      }
    } else {
      delete userCard.bannerCropUrl;
      const outPath = getBannerFilePath(guildId, userId);
      if (fs.existsSync(outPath)) {
        try { fs.unlinkSync(outPath); } catch (_) {}
      }
    }

    storage.write('cards', cardsData);

    // Publish with file upload and AWAIT so CDN URL is saved before user clicks View
    await interaction.editReply({
      content: `**Profile saved!** Publishing your card to <#${targetChannelId}>...`
    });

    try {
      await publishCardToChannel(interaction.guild, interaction.member, client, false, bannerCropped);
      // Update reply with success message including CDN URL status
      const updatedCard = storage.read('cards')[guildId]?.[userId];
      const hasCdn = updatedCard?.bannerCropUrl ? ' ✅ Banner 800×240 saved!' : '';
      await interaction.editReply({
        content: `**Profile saved & published to <#${targetChannelId}>!**${hasCdn}`
      }).catch(() => {});
    } catch (err) {
      console.error('[CardHandler] Publish failed:', err.message);
      await interaction.editReply({
        content: `**Profile saved!** Card published to <#${targetChannelId}>.`
      }).catch(() => {});
    }
  } else {
    delete userCard.bannerUrl;
    delete userCard.bannerCropUrl;
    const outPath = getBannerFilePath(guildId, userId);
    if (fs.existsSync(outPath)) {
      try { fs.unlinkSync(outPath); } catch (_) {}
    }

    storage.write('cards', cardsData);

    await interaction.editReply({
      content: `**Profile saved!** Publishing your card to <#${targetChannelId}>...`
    });

    try {
      await publishCardToChannel(interaction.guild, interaction.member, client);
      await interaction.editReply({
        content: `**Profile saved & published to <#${targetChannelId}>!**`
      }).catch(() => {});
    } catch (err) {
      console.error('[CardHandler] Publish failed:', err.message);
    }
  }
}

module.exports = {
  createCardHubPayload,
  handleCardButton,
  handleCardModalSubmit,
  buildMemberCardEmbed,
  publishCardToChannel
};
