/**
 * Circuit Breaker untuk YouTube requests.
 * Mencegah error cascade saat YouTube memblokir bot.
 *
 * States:
 *   CLOSED   → request normal
 *   OPEN     → blokir semua request (cooldown)
 *   HALF_OPEN → test 1 request setelah cooldown
 *
 * Improvements v2:
 *   - Exponential backoff: cooldown meningkat setiap kali circuit trip berulang
 *   - Rate limit (429) error tracking terpisah dari auth error
 *   - Auto-recovery timer yang lebih pintar
 *   - Statistik untuk monitoring
 */

const STATES = { CLOSED: 'CLOSED', OPEN: 'OPEN', HALF_OPEN: 'HALF_OPEN' };

// Config
const AUTH_ERROR_THRESHOLD = 3;   // 3x auth error → trip
const RATE_LIMIT_THRESHOLD = 5;   // 5x rate limit error → trip
const WINDOW_MS = 5 * 60 * 1000; // Window 5 menit
const BASE_COOLDOWN_MS = 2 * 60 * 1000;  // Cooldown awal 2 menit
const MAX_COOLDOWN_MS = 15 * 60 * 1000;  // Cooldown maksimal 15 menit
const MAX_CONSECUTIVE_STREAM_ERRORS = 5;  // Max error streaming berturut-turut

let state = STATES.CLOSED;
let authErrors = [];          // Timestamps of auth errors within window
let rateLimitErrors = [];     // Timestamps of 429 errors within window
let openedAt = 0;             // Timestamp saat circuit OPEN
let consecutiveStreamErrors = 0;
let tripCount = 0;            // Berapa kali circuit sudah trip (untuk exponential backoff)
let currentCooldownMs = BASE_COOLDOWN_MS;
let notifyCallback = null;    // Callback untuk kirim pesan ke text channel

// Statistik
let stats = {
  totalRequests: 0,
  totalSuccess: 0,
  totalErrors: 0,
  totalTrips: 0,
  lastTripAt: null,
  lastSuccessAt: null,
  lastErrorAt: null,
};

/**
 * Register callback untuk notifikasi ke Discord text channel
 * @param {Function} cb - function(message: string)
 */
function onNotify(cb) {
  notifyCallback = cb;
}

function notify(msg) {
  if (notifyCallback) notifyCallback(msg);
  console.warn(`⚡ [CircuitBreaker] ${msg}`);
}

/**
 * Cek apakah error termasuk auth/bot-detection error
 */
function isAuthError(errorMessage) {
  if (!errorMessage) return false;
  const lower = errorMessage.toLowerCase();
  return lower.includes('sign in') ||
         lower.includes('login_required') ||
         lower.includes('confirm you\'re not a bot') ||
         lower.includes('bot detection') ||
         lower.includes('consent') ||
         (lower.includes('403') && lower.includes('forbidden'));
}

/**
 * Cek apakah error termasuk rate limit (429)
 */
function isRateLimitError(errorMessage) {
  if (!errorMessage) return false;
  const lower = errorMessage.toLowerCase();
  return lower.includes('429') || lower.includes('too many requests') || lower.includes('rate limit');
}

/**
 * Bersihkan errors yang sudah di luar window
 */
function pruneOldErrors() {
  const cutoff = Date.now() - WINDOW_MS;
  authErrors = authErrors.filter(ts => ts > cutoff);
  rateLimitErrors = rateLimitErrors.filter(ts => ts > cutoff);
}

/**
 * Hitung cooldown dengan exponential backoff.
 * Trip ke-1: 2 menit, ke-2: 4 menit, ke-3: 8 menit, dst. (max 15 menit)
 * @returns {number} cooldown dalam ms
 */
function calculateCooldown() {
  const backoff = BASE_COOLDOWN_MS * Math.pow(2, Math.min(tripCount, 4));
  return Math.min(backoff, MAX_COOLDOWN_MS);
}

/**
 * Laporkan error ke circuit breaker
 * @param {string} errorMessage - pesan error
 * @returns {{ shouldStop: boolean, message: string }}
 */
function recordError(errorMessage) {
  stats.totalErrors++;
  stats.lastErrorAt = new Date().toISOString();

  const isAuth = isAuthError(errorMessage);
  const isRateLimit = isRateLimitError(errorMessage);

  if (isAuth) {
    authErrors.push(Date.now());
    consecutiveStreamErrors++;
  }

  if (isRateLimit) {
    rateLimitErrors.push(Date.now());
    consecutiveStreamErrors++;
  }

  pruneOldErrors();

  // Trip circuit jika threshold tercapai
  if (state === STATES.CLOSED) {
    let shouldTrip = false;
    let tripReason = '';

    if (authErrors.length >= AUTH_ERROR_THRESHOLD) {
      shouldTrip = true;
      tripReason = `${authErrors.length}x auth error dalam ${WINDOW_MS / 60000} menit`;
    } else if (rateLimitErrors.length >= RATE_LIMIT_THRESHOLD) {
      shouldTrip = true;
      tripReason = `${rateLimitErrors.length}x rate limit (429) dalam ${WINDOW_MS / 60000} menit`;
    }

    if (shouldTrip) {
      state = STATES.OPEN;
      openedAt = Date.now();
      tripCount++;
      currentCooldownMs = calculateCooldown();
      stats.totalTrips++;
      stats.lastTripAt = new Date().toISOString();

      const msg = `⚠️ YouTube sedang membatasi bot (${tripReason}). Menunggu ${Math.ceil(currentCooldownMs / 1000)} detik sebelum mencoba lagi... (Trip ke-${tripCount}, backoff aktif)`;
      notify(msg);
      return { shouldStop: true, message: msg };
    }
  }

  if (consecutiveStreamErrors >= MAX_CONSECUTIVE_STREAM_ERRORS) {
    const msg = `⚠️ ${consecutiveStreamErrors} lagu berturut-turut gagal diputar. Antrian dihentikan otomatis.`;
    notify(msg);
    return { shouldStop: true, message: msg };
  }

  return { shouldStop: false, message: '' };
}

/**
 * Laporkan request berhasil → reset counter
 */
function recordSuccess() {
  stats.totalRequests++;
  stats.totalSuccess++;
  stats.lastSuccessAt = new Date().toISOString();
  consecutiveStreamErrors = 0;

  if (state === STATES.HALF_OPEN) {
    state = STATES.CLOSED;
    authErrors = [];
    rateLimitErrors = [];
    // Kurangi trip count secara bertahap setelah sukses (graceful recovery)
    if (tripCount > 0) tripCount = Math.max(0, tripCount - 1);
    console.log(`✅ [CircuitBreaker] Request berhasil. State → CLOSED. (Trip count: ${tripCount})`);
  }
}

/**
 * Cek apakah request diizinkan
 * @returns {{ allowed: boolean, message: string }}
 */
function canRequest() {
  stats.totalRequests++;

  if (state === STATES.CLOSED) {
    return { allowed: true, message: '' };
  }

  if (state === STATES.OPEN) {
    const elapsed = Date.now() - openedAt;
    if (elapsed >= currentCooldownMs) {
      state = STATES.HALF_OPEN;
      console.log(`🔄 [CircuitBreaker] Cooldown ${Math.ceil(currentCooldownMs / 1000)}s selesai. State → HALF_OPEN (testing 1 request).`);
      return { allowed: true, message: '' };
    }
    const remaining = Math.ceil((currentCooldownMs - elapsed) / 1000);
    return {
      allowed: false,
      message: `⚠️ YouTube masih membatasi bot. Coba lagi dalam ${remaining} detik. (Cooldown: ${Math.ceil(currentCooldownMs / 1000)}s, Trip ke-${tripCount})`
    };
  }

  // HALF_OPEN — izinkan 1 test request
  return { allowed: true, message: '' };
}

/**
 * Reset circuit breaker (manual reset)
 */
function reset() {
  state = STATES.CLOSED;
  authErrors = [];
  rateLimitErrors = [];
  openedAt = 0;
  consecutiveStreamErrors = 0;
  tripCount = 0;
  currentCooldownMs = BASE_COOLDOWN_MS;
  console.log('🔄 [CircuitBreaker] Manual reset → CLOSED.');
}

/**
 * Get current state info
 */
function getStatus() {
  return {
    state,
    authErrorCount: authErrors.length,
    rateLimitErrorCount: rateLimitErrors.length,
    consecutiveStreamErrors,
    tripCount,
    currentCooldownMs,
    openedAt: openedAt || null,
    stats: { ...stats },
  };
}

module.exports = {
  recordError,
  recordSuccess,
  canRequest,
  reset,
  getStatus,
  isAuthError,
  isRateLimitError,
  onNotify,
  MAX_CONSECUTIVE_STREAM_ERRORS,
};
