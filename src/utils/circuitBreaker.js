/**
 * Circuit Breaker untuk YouTube requests.
 * Mencegah error cascade saat YouTube memblokir bot.
 *
 * States:
 *   CLOSED   → request normal
 *   OPEN     → blokir semua request (cooldown)
 *   HALF_OPEN → test 1 request setelah cooldown
 */

const STATES = { CLOSED: 'CLOSED', OPEN: 'OPEN', HALF_OPEN: 'HALF_OPEN' };

// Config
const AUTH_ERROR_THRESHOLD = 3;   // 3x auth error → trip
const WINDOW_MS = 5 * 60 * 1000; // Window 5 menit
const COOLDOWN_MS = 2 * 60 * 1000; // Cooldown 2 menit saat OPEN
const MAX_CONSECUTIVE_STREAM_ERRORS = 5; // Max error streaming berturut-turut

let state = STATES.CLOSED;
let authErrors = [];          // Timestamps of auth errors within window
let openedAt = 0;             // Timestamp saat circuit OPEN
let consecutiveStreamErrors = 0;
let notifyCallback = null;    // Callback untuk kirim pesan ke text channel

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
 * Bersihkan auth errors yang sudah di luar window
 */
function pruneOldErrors() {
  const cutoff = Date.now() - WINDOW_MS;
  authErrors = authErrors.filter(ts => ts > cutoff);
}

/**
 * Laporkan error ke circuit breaker
 * @param {string} errorMessage - pesan error
 * @returns {{ shouldStop: boolean, message: string }}
 */
function recordError(errorMessage) {
  if (isAuthError(errorMessage)) {
    authErrors.push(Date.now());
    pruneOldErrors();

    consecutiveStreamErrors++;

    if (authErrors.length >= AUTH_ERROR_THRESHOLD && state === STATES.CLOSED) {
      state = STATES.OPEN;
      openedAt = Date.now();
      const msg = `⚠️ YouTube sedang membatasi bot (${authErrors.length}x auth error). Menunggu ${COOLDOWN_MS / 1000} detik sebelum mencoba lagi...`;
      notify(msg);
      return { shouldStop: true, message: msg };
    }

    if (consecutiveStreamErrors >= MAX_CONSECUTIVE_STREAM_ERRORS) {
      const msg = `⚠️ ${consecutiveStreamErrors} lagu berturut-turut gagal diputar. Antrian dihentikan otomatis.`;
      notify(msg);
      return { shouldStop: true, message: msg };
    }
  }

  return { shouldStop: false, message: '' };
}

/**
 * Laporkan request berhasil → reset counter
 */
function recordSuccess() {
  consecutiveStreamErrors = 0;
  if (state === STATES.HALF_OPEN) {
    state = STATES.CLOSED;
    authErrors = [];
    console.log('✅ [CircuitBreaker] Request berhasil. State → CLOSED.');
  }
}

/**
 * Cek apakah request diizinkan
 * @returns {{ allowed: boolean, message: string }}
 */
function canRequest() {
  if (state === STATES.CLOSED) {
    return { allowed: true, message: '' };
  }

  if (state === STATES.OPEN) {
    const elapsed = Date.now() - openedAt;
    if (elapsed >= COOLDOWN_MS) {
      state = STATES.HALF_OPEN;
      console.log('🔄 [CircuitBreaker] Cooldown selesai. State → HALF_OPEN (testing 1 request).');
      return { allowed: true, message: '' };
    }
    const remaining = Math.ceil((COOLDOWN_MS - elapsed) / 1000);
    return {
      allowed: false,
      message: `⚠️ YouTube masih membatasi bot. Coba lagi dalam ${remaining} detik.`
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
  openedAt = 0;
  consecutiveStreamErrors = 0;
  console.log('🔄 [CircuitBreaker] Manual reset → CLOSED.');
}

/**
 * Get current state info
 */
function getStatus() {
  return {
    state,
    authErrorCount: authErrors.length,
    consecutiveStreamErrors,
    openedAt: openedAt || null,
  };
}

module.exports = {
  recordError,
  recordSuccess,
  canRequest,
  reset,
  getStatus,
  isAuthError,
  onNotify,
  MAX_CONSECUTIVE_STREAM_ERRORS,
};
