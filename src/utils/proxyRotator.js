/**
 * Proxy Rotator — Rotasi otomatis antar beberapa proxy untuk menghindari rate limit YouTube.
 *
 * Fitur:
 *   - Mendukung banyak proxy URL (HTTP/HTTPS/SOCKS5)
 *   - Rotasi otomatis round-robin
 *   - Health tracking: proxy yang error akan di-cooldown
 *   - Fallback ke direct (tanpa proxy) jika semua proxy down
 *
 * Konfigurasi via .env:
 *   PROXY_URLS=http://proxy1:port,http://proxy2:port,socks5://proxy3:port
 *   PROXY_URL=http://single-proxy:port  (fallback jika PROXY_URLS tidak diset)
 */

const PROXY_COOLDOWN_MS = 3 * 60 * 1000; // Cooldown 3 menit untuk proxy yang gagal
const MAX_FAILURES_BEFORE_COOLDOWN = 3;   // Maksimal gagal sebelum cooldown

class ProxyRotator {
  constructor() {
    this.proxies = [];
    this.currentIndex = 0;
    this.proxyHealth = new Map(); // Map<proxyUrl, { failures, cooldownUntil, successes, totalRequests }>
    this._initialized = false;
  }

  /**
   * Inisialisasi daftar proxy dari environment variables.
   * Dipanggil sekali saat bot start.
   */
  init() {
    if (this._initialized) return;
    this._initialized = true;

    const proxyUrls = process.env.PROXY_URLS || '';
    const singleProxy = process.env.PROXY_URL || process.env.YTDL_PROXY || process.env.YTDLP_PROXY || '';

    if (proxyUrls.trim()) {
      // Daftar proxy dipisahkan koma
      this.proxies = proxyUrls.split(',')
        .map(p => p.trim())
        .filter(p => p.length > 0);
    } else if (singleProxy.trim()) {
      // Fallback: single proxy dari PROXY_URL
      this.proxies = [singleProxy.trim()];
    }

    // Inisialisasi health tracking
    for (const proxy of this.proxies) {
      this.proxyHealth.set(proxy, {
        failures: 0,
        cooldownUntil: 0,
        successes: 0,
        totalRequests: 0
      });
    }

    if (this.proxies.length > 0) {
      const maskedList = this.proxies.map(p => this._maskProxy(p));
      console.log(`🌐 [ProxyRotator] Diinisialisasi dengan ${this.proxies.length} proxy: ${maskedList.join(', ')}`);
    } else {
      console.log('ℹ️ [ProxyRotator] Tidak ada proxy dikonfigurasi. Bot akan menggunakan koneksi langsung (tanpa proxy).');
    }
  }

  /**
   * Dapatkan proxy berikutnya yang sehat (belum di-cooldown).
   * Menggunakan strategi round-robin dengan health check.
   *
   * @returns {string|null} URL proxy, atau null jika tidak ada proxy / semua di-cooldown
   */
  getProxy() {
    if (this.proxies.length === 0) return null;

    const now = Date.now();
    const totalProxies = this.proxies.length;

    // Coba cari proxy yang sehat (round-robin)
    for (let i = 0; i < totalProxies; i++) {
      const index = (this.currentIndex + i) % totalProxies;
      const proxy = this.proxies[index];
      const health = this.proxyHealth.get(proxy);

      if (!health || now >= health.cooldownUntil) {
        // Proxy tersedia — rotasi ke index berikutnya untuk request selanjutnya
        this.currentIndex = (index + 1) % totalProxies;
        return proxy;
      }
    }

    // Semua proxy di-cooldown — cari yang cooldown-nya paling cepat habis
    let soonestProxy = null;
    let soonestTime = Infinity;

    for (const proxy of this.proxies) {
      const health = this.proxyHealth.get(proxy);
      if (health && health.cooldownUntil < soonestTime) {
        soonestTime = health.cooldownUntil;
        soonestProxy = proxy;
      }
    }

    // Jika cooldown paling cepat tinggal < 30 detik, pakai proxy itu
    if (soonestProxy && (soonestTime - now) < 30000) {
      console.log(`⏳ [ProxyRotator] Semua proxy di-cooldown. Menggunakan proxy dengan cooldown terpendek: ${this._maskProxy(soonestProxy)}`);
      return soonestProxy;
    }

    // Semua proxy benar-benar down — kembalikan null (gunakan direct)
    console.warn('⚠️ [ProxyRotator] Semua proxy di-cooldown. Menggunakan koneksi langsung (tanpa proxy).');
    return null;
  }

  /**
   * Laporkan bahwa request dengan proxy tertentu berhasil.
   * @param {string} proxyUrl
   */
  recordSuccess(proxyUrl) {
    if (!proxyUrl) return;
    const health = this.proxyHealth.get(proxyUrl);
    if (health) {
      health.failures = 0;
      health.cooldownUntil = 0;
      health.successes++;
      health.totalRequests++;
    }
  }

  /**
   * Laporkan bahwa request dengan proxy tertentu gagal.
   * Jika gagal terlalu banyak, proxy akan di-cooldown.
   * @param {string} proxyUrl
   * @param {string} [errorMessage] - pesan error untuk logging
   */
  recordFailure(proxyUrl, errorMessage = '') {
    if (!proxyUrl) return;
    const health = this.proxyHealth.get(proxyUrl);
    if (health) {
      health.failures++;
      health.totalRequests++;

      if (health.failures >= MAX_FAILURES_BEFORE_COOLDOWN) {
        health.cooldownUntil = Date.now() + PROXY_COOLDOWN_MS;
        console.warn(`🚫 [ProxyRotator] Proxy ${this._maskProxy(proxyUrl)} di-cooldown ${PROXY_COOLDOWN_MS / 1000}s setelah ${health.failures}x gagal. Error: ${errorMessage.slice(0, 100)}`);
        health.failures = 0; // Reset setelah cooldown diset
      }
    }
  }

  /**
   * Cek apakah proxy rotator memiliki proxy yang dikonfigurasi.
   * @returns {boolean}
   */
  hasProxies() {
    return this.proxies.length > 0;
  }

  /**
   * Dapatkan jumlah proxy yang saat ini sehat (tidak di-cooldown).
   * @returns {number}
   */
  getHealthyCount() {
    const now = Date.now();
    return this.proxies.filter(p => {
      const health = this.proxyHealth.get(p);
      return !health || now >= health.cooldownUntil;
    }).length;
  }

  /**
   * Dapatkan status lengkap semua proxy.
   * @returns {Object[]}
   */
  getStatus() {
    const now = Date.now();
    return this.proxies.map(p => {
      const health = this.proxyHealth.get(p) || {};
      return {
        proxy: this._maskProxy(p),
        healthy: now >= (health.cooldownUntil || 0),
        successes: health.successes || 0,
        totalRequests: health.totalRequests || 0,
        cooldownRemaining: Math.max(0, (health.cooldownUntil || 0) - now)
      };
    });
  }

  /**
   * Mask proxy URL untuk logging (sembunyikan password).
   * @param {string} proxyUrl
   * @returns {string}
   */
  _maskProxy(proxyUrl) {
    if (!proxyUrl) return 'direct';
    return proxyUrl.replace(/:([^:@]+)@/, ':***@');
  }
}

// Singleton instance
const proxyRotator = new ProxyRotator();

module.exports = proxyRotator;
