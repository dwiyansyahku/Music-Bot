const fs = require('fs');
const path = require('path');
const storage = require('./storage');

const ORG_PHOTOS_DIR = path.join(process.cwd(), 'data', 'org_photos');
if (!fs.existsSync(ORG_PHOTOS_DIR)) {
  fs.mkdirSync(ORG_PHOTOS_DIR, { recursive: true });
}

const DIVISIONS = {
  head_admin: {
    id: 'head_admin',
    name: 'Head Admin',
    icon: '⚡',
    color: '#00f2fe',
    accent: 'rgba(0, 242, 254, 0.25)'
  },
  security: {
    id: 'security',
    name: 'Security',
    icon: '🛡️',
    color: '#ff3366',
    accent: 'rgba(255, 51, 102, 0.25)'
  },
  admin_tiktok: {
    id: 'admin_tiktok',
    name: 'Admin TikTok',
    icon: '📱',
    color: '#00e5ff',
    accent: 'rgba(0, 229, 255, 0.25)'
  },
  admin_instagram: {
    id: 'admin_instagram',
    name: 'Admin Instagram',
    icon: '📸',
    color: '#e1306c',
    accent: 'rgba(225, 48, 108, 0.25)'
  },
  streamer: {
    id: 'streamer',
    name: 'Streamer',
    icon: '🎙️',
    color: '#bf5af2',
    accent: 'rgba(191, 90, 242, 0.25)'
  },
  team_creative: {
    id: 'team_creative',
    name: 'Team Creative',
    icon: '🎨',
    color: '#ffaa00',
    accent: 'rgba(255, 170, 0, 0.25)'
  }
};

/**
 * Mendapatkan data struktur organisasi untuk guild tertentu
 */
function getGuildOrg(guildId) {
  const allOrg = storage.read('organization') || {};
  let guildData = allOrg[guildId];

  if (!guildData) {
    guildData = {
      title: 'QUMPRUY',
      subtitle: 'COMMUNITY & CLUB',
      leader: null,
      divisions: {}
    };
  }

  // Pastikan semua 6 divisi terinisialisasi
  if (!guildData.divisions) guildData.divisions = {};
  for (const [divKey, divInfo] of Object.entries(DIVISIONS)) {
    if (!guildData.divisions[divKey]) {
      guildData.divisions[divKey] = {
        name: divInfo.name,
        members: []
      };
    } else if (!Array.isArray(guildData.divisions[divKey].members)) {
      guildData.divisions[divKey].members = [];
    }
  }

  return guildData;
}

/**
 * Menyimpan data struktur organisasi untuk guild
 */
function saveGuildOrg(guildId, orgData) {
  const allOrg = storage.read('organization') || {};
  allOrg[guildId] = orgData;
  storage.write('organization', allOrg);
}

/**
 * Download dan simpan buffer foto ke folder lokal data/org_photos/
 * Menghindari issue expired signature Discord CDN
 */
async function saveCustomPhoto(guildId, userId, slotKey, imageUrl) {
  if (!imageUrl) return null;
  try {
    const res = await fetch(imageUrl, {
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) return null;

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length < 100) return null;

    const ext = imageUrl.includes('.png') ? 'png' : imageUrl.includes('.webp') ? 'webp' : 'jpg';
    const filename = `${guildId}_${userId}_${slotKey}_${Date.now()}.${ext}`;
    const filePath = path.join(ORG_PHOTOS_DIR, filename);

    // Hapus foto lama untuk slot & user ini jika ada
    try {
      const files = fs.readdirSync(ORG_PHOTOS_DIR);
      const prefix = `${guildId}_${userId}_${slotKey}_`;
      for (const file of files) {
        if (file.startsWith(prefix)) {
          fs.unlinkSync(path.join(ORG_PHOTOS_DIR, file));
        }
      }
    } catch (_) {}

    fs.writeFileSync(filePath, buffer);
    return filePath;
  } catch (err) {
    console.error(`[OrgHelper] Gagal download foto custom (${imageUrl}):`, err.message);
    return null;
  }
}

/**
 * Set Ketua Organisasi
 */
async function setLeader(guildId, { userId, name, customPhotoUrl, roleTitle = 'Ketua' }) {
  const orgData = getGuildOrg(guildId);
  let localPhoto = null;

  if (customPhotoUrl) {
    localPhoto = await saveCustomPhoto(guildId, userId, 'leader', customPhotoUrl);
  }

  orgData.leader = {
    userId,
    name: name.trim(),
    roleTitle: roleTitle.trim() || 'Ketua',
    photoPath: localPhoto || null,
    avatarFallbackUrl: null, // akan diisi avatar discord jika localPhoto kosong
    updatedAt: new Date().toISOString()
  };

  saveGuildOrg(guildId, orgData);
  return orgData.leader;
}

/**
 * Hapus Ketua
 */
function removeLeader(guildId) {
  const orgData = getGuildOrg(guildId);
  orgData.leader = null;
  saveGuildOrg(guildId, orgData);
}

/**
 * Tambah / update anggota di divisi tertentu
 */
async function addDivisionMember(guildId, divisionId, { userId, name, customPhotoUrl, roleDetail = 'Anggota' }) {
  if (!DIVISIONS[divisionId]) {
    throw new Error(`Divisi '${divisionId}' tidak valid.`);
  }

  const orgData = getGuildOrg(guildId);
  const div = orgData.divisions[divisionId];
  let localPhoto = null;

  if (customPhotoUrl) {
    localPhoto = await saveCustomPhoto(guildId, userId, divisionId, customPhotoUrl);
  }

  const existingIndex = div.members.findIndex(m => m.userId === userId);
  const memberData = {
    userId,
    name: name.trim(),
    roleDetail: (roleDetail || 'Anggota').trim(),
    photoPath: localPhoto || (existingIndex >= 0 ? div.members[existingIndex].photoPath : null),
    updatedAt: new Date().toISOString()
  };

  if (existingIndex >= 0) {
    div.members[existingIndex] = memberData;
  } else {
    div.members.push(memberData);
  }

  saveGuildOrg(guildId, orgData);
  return memberData;
}

/**
 * Hapus anggota dari divisi tertentu
 */
function removeDivisionMember(guildId, divisionId, userId) {
  if (!DIVISIONS[divisionId]) {
    throw new Error(`Divisi '${divisionId}' tidak valid.`);
  }

  const orgData = getGuildOrg(guildId);
  const div = orgData.divisions[divisionId];
  const initialCount = div.members.length;
  div.members = div.members.filter(m => m.userId !== userId);

  if (div.members.length < initialCount) {
    saveGuildOrg(guildId, orgData);
    return true;
  }
  return false;
}

/**
 * Reset seluruh struktur organisasi guild
 */
function resetOrgData(guildId) {
  const orgData = {
    title: 'QUMPRUY',
    subtitle: 'COMMUNITY & CLUB',
    leader: null,
    divisions: {}
  };
  for (const [divKey, divInfo] of Object.entries(DIVISIONS)) {
    orgData.divisions[divKey] = {
      name: divInfo.name,
      members: []
    };
  }
  saveGuildOrg(guildId, orgData);
  return true;
}

/**
 * Mendapatkan referensi pesan org chart yang sedang "live" (persistent message)
 * @returns {{ channelId: string, messageId: string } | null}
 */
function getOrgMessage(guildId) {
  const allOrg = storage.read('organization') || {};
  const guildData = allOrg[guildId];
  if (!guildData || !guildData._liveMessage) return null;
  return guildData._liveMessage;
}

/**
 * Menyimpan referensi pesan org chart yang sedang "live"
 */
function setOrgMessage(guildId, channelId, messageId) {
  const allOrg = storage.read('organization') || {};
  if (!allOrg[guildId]) allOrg[guildId] = getGuildOrg(guildId);
  allOrg[guildId]._liveMessage = { channelId, messageId };
  storage.write('organization', allOrg);
}

/**
 * Hapus referensi pesan org chart live (misalnya jika pesan sudah dihapus)
 */
function clearOrgMessage(guildId) {
  const allOrg = storage.read('organization') || {};
  if (allOrg[guildId]) {
    delete allOrg[guildId]._liveMessage;
    storage.write('organization', allOrg);
  }
}

module.exports = {
  DIVISIONS,
  getGuildOrg,
  saveGuildOrg,
  saveCustomPhoto,
  setLeader,
  removeLeader,
  addDivisionMember,
  removeDivisionMember,
  resetOrgData,
  getOrgMessage,
  setOrgMessage,
  clearOrgMessage
};
