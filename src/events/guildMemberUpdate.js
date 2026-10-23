const storage = require('../utils/storage');
const { publishCardToChannel } = require('../utils/cardHandler');

const updateDebounce = new Map();

module.exports = {
  name: 'guildMemberUpdate',
  async execute(oldMember, newMember, client) {
    if (!newMember || newMember.user?.bot) return;

    const guild = newMember.guild;
    const guildId = guild.id;
    const userId = newMember.id;

    // Cek apakah ada perubahan yang berdampak pada tampilan kartu:
    // 1. Nickname server
    // 2. Display Name
    // 3. Avatar (Server avatar atau user avatar)
    // 4. Role list / Role color
    const nickChanged = oldMember.nickname !== newMember.nickname;
    const nameChanged = oldMember.displayName !== newMember.displayName;
    const avatarChanged = (oldMember.avatar !== newMember.avatar) || (oldMember.user?.avatar !== newMember.user?.avatar);
    const rolesChanged = !oldMember.roles.cache.equals(newMember.roles.cache);

    if (!nickChanged && !nameChanged && !avatarChanged && !rolesChanged) {
      return;
    }

    // Pastikan user memiliki data kartu terbit di server ini
    const cardsData = storage.read('cards');
    const userCard = cardsData[guildId]?.[userId];
    if (!userCard || !userCard.publishedMessageId) {
      return;
    }

    // Debounce 2000ms untuk mencegah multi-render saat Discord mengirim event beruntun
    const debounceKey = `${guildId}_${userId}`;
    if (updateDebounce.has(debounceKey)) {
      clearTimeout(updateDebounce.get(debounceKey));
    }

    const timer = setTimeout(async () => {
      updateDebounce.delete(debounceKey);
      try {
        await publishCardToChannel(guild, newMember, client, true);
        console.log(`🎨 [Card Auto-Sync] Kartu member ${newMember.user.tag} di ${guild.name} otomatis diperbarui (Profil/Role Discord diupdate).`);
      } catch (err) {
        console.warn(`[guildMemberUpdate] Gagal auto-update kartu ${userId}:`, err.message);
      }
    }, 2000);

    updateDebounce.set(debounceKey, timer);
  }
};
