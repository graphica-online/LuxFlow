/**
 * LuxFlow — модуль геолокации по IP.
 *
 * Использует два бесплатных API с автоматическим переключением (fallback):
 *   1. http://ip-api.com/json/ (без HTTPS, но надёжный)
 *   2. https://ipwho.is/ (безопасный HTTPS)
 *
 * Fallback по умолчанию: Москва
 */

export interface GeoLocation {
  city: string;
  lat: number;
  lon: number;
}

const FALLBACK_LOCATION: GeoLocation = {
  city: 'Москва',
  lat: 55.7558,
  lon: 37.6173,
};

/**
 * Запрос координат по IP.
 */
export async function detectLocation(): Promise<GeoLocation> {
  // Попытка 1: ipwho.is (HTTPS)
  try {
    const res = await fetch('https://ipwho.is/');
    if (res.ok) {
      const data = await res.json();
      if (data && data.success && data.latitude && data.longitude) {
        console.log('[LuxFlow Geo] Detected via ipwho.is:', data.city);
        return {
          city: data.city || 'Локальное место',
          lat: data.latitude,
          lon: data.longitude,
        };
      }
    }
  } catch (e) {
    console.warn('[LuxFlow Geo] ipwho.is failed, trying fallback API...', e);
  }

  // Попытка 2: ip-api.com (HTTP)
  try {
    const res = await fetch('http://ip-api.com/json/');
    if (res.ok) {
      const data = await res.json();
      if (data && data.status === 'success' && data.lat && data.lon) {
        console.log('[LuxFlow Geo] Detected via ip-api.com:', data.city);
        return {
          city: data.city || 'Локальное место',
          lat: data.lat,
          lon: data.lon,
        };
      }
    }
  } catch (e) {
    console.warn('[LuxFlow Geo] ip-api.com failed too.', e);
  }

  console.log('[LuxFlow Geo] Using fallback location (Moscow)');
  return FALLBACK_LOCATION;
}