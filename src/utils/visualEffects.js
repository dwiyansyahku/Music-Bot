/**
 * Visual Effects (AAA Cutscene & Animated GIFs)
 * Menyediakan aset animasi GIF resolusi tinggi untuk:
 * 1. Gacha Unboxing (Portal summon, aura tier teaser)
 * 2. Boss Raid (Boss battle stance, turn clash, victory/wipeout)
 * 3. Throne Duel (Clash of Thrones standoff & victor)
 */

const GACHA_VISUALS = {
  // Portal pembuka dimensi saat tarikan dimulai
  PORTAL_SUMMON: 'https://media.giphy.com/media/26AHONQ79FdWZhAI0/giphy.gif',

  // Animasi aura kilatan sebelum kartu terbuka berdasarkan tier
  TIER_AURA: {
    ANCIENT: 'https://media.giphy.com/media/xT0xeJpnrWC4XWblEk/giphy.gif', // Supernova Kosmik Multisemesta
    MYTHIC: 'https://media.giphy.com/media/xT0xeJpnrWC4XWblEk/giphy.gif',  // Ledakan Galaksi Merah-Ungu
    LEGENDARY: 'https://media.giphy.com/media/3o7TKtnuHOHHUjR38Y/giphy.gif', // Hujan Meteor Emas Bercahaya
    EPIC: 'https://media.giphy.com/media/l0ExdMHUDKteztyfe/giphy.gif',      // Petir Ungu Misterius
    RARE: 'https://media.giphy.com/media/3o7btPCcdNniyf0ArS/giphy.gif',      // Kilatan Gelombang Biru
    COMMON: 'https://media.giphy.com/media/3o7btPCcdNniyf0ArS/giphy.gif'    // Kilatan Gelombang Biru
  },

  // Animasi multi-pull 10x
  MULTI_PULL: 'https://media.giphy.com/media/3o7TKtnuHOHHUjR38Y/giphy.gif'
};

const BOSS_VISUALS = {
  // Avatar / Visual Boss Berdasarkan Tier
  STANCE: {
    DAILY: 'https://media.giphy.com/media/13HgwGsXF0aiGY/giphy.gif',     // Shadow Demon / Beast
    WEEKLY: 'https://media.giphy.com/media/3o7TKMt1VVNkHV2PaE/giphy.gif',  // Colossal Titan
    MONTHLY: 'https://media.giphy.com/media/l41lI4bYmcsPJX9Go/giphy.gif'  // Void Overlord / Cosmic Entity
  },

  // Animasi Hasil Aduan Taktik Setiap Ronde
  CLASH: {
    attack: 'https://media.giphy.com/media/26FPqAH61DhAndwpa/giphy.gif',
    defend: 'https://media.giphy.com/media/3o7TKDkDbIDJieKbVm/giphy.gif',
    special: 'https://media.giphy.com/media/l0HlTy9x8FxBtVDAA/giphy.gif',
    ATTACK: 'https://media.giphy.com/media/26FPqAH61DhAndwpa/giphy.gif',
    DEFENSE: 'https://media.giphy.com/media/3o7TKDkDbIDJieKbVm/giphy.gif',
    SKILL: 'https://media.giphy.com/media/l0HlTy9x8FxBtVDAA/giphy.gif'
  },

  // Hasil Akhir Sesi Pertarungan Party
  VICTORY: 'https://media.giphy.com/media/26tOZ42Mg6pbTUPHW/giphy.gif',   // Boss Meledak & Perayaan Emas
  WIPEOUT: 'https://media.giphy.com/media/l2YWqU7ev0l5nfYTC/giphy.gif'    // Kabut Kegelapan & Pasukan Gugur
};

const DUEL_VISUALS = {
  // Standoff Perebutan Tahta
  CLASH_STANDOFF: 'https://media.giphy.com/media/3ohhwkKBzc42ECDiEQ/giphy.gif', // Benturan Senjata Pembuka
  VICTORY: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif'         // Aura Kejayaan Mahkota Tahta
};

module.exports = {
  GACHA_VISUALS,
  BOSS_VISUALS,
  DUEL_VISUALS
};
