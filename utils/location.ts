import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { saudiCities } from '@/mocks/cities';

// TODO: [PRODUCTION] Restrict Google Maps API key in Google Cloud Console
// - Set HTTP referrer restrictions for web (allowed domains only)
// - Set Android/iOS app restrictions for mobile builds
// - Enable only required APIs (Geocoding, Places, Maps JavaScript)
// - Set usage quotas and billing alerts
const GOOGLE_MAPS_API_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
  (Constants.expoConfig?.extra as { googleMapsApiKey?: string } | undefined)?.googleMapsApiKey ||
  '';

export interface LocationCoords {
  latitude: number;
  longitude: number;
}

export async function getCurrentLocation(): Promise<LocationCoords | null> {
  try {
    if (Platform.OS === 'web') {
      return new Promise((resolve) => {
        if (!navigator.geolocation) {
          resolve(null);
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
            });
          },
          () => {
            resolve(null);
          },
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
        );
      });
    } else {
      const Location = require('expo-location');
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return null;
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      return {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };
    }
  } catch (error) {
    return null;
  }
}

export function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function reverseGeocodeToCity(coords: LocationCoords): Promise<string | null> {
  try {
    if (GOOGLE_MAPS_API_KEY) {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coords.latitude},${coords.longitude}&language=ar&key=${GOOGLE_MAPS_API_KEY}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.status === 'OK' && data.results?.length > 0) {
        for (const result of data.results) {
          for (const component of result.address_components) {
            if (component.types.includes('locality') || component.types.includes('administrative_area_level_2')) {
              return component.long_name;
            }
          }
        }
        for (const result of data.results) {
          for (const component of result.address_components) {
            if (component.types.includes('administrative_area_level_1')) {
              return component.long_name;
            }
          }
        }
      }
    }
    return findNearestCity(coords);
  } catch (error) {
    return findNearestCity(coords);
  }
}

function findNearestCity(coords: LocationCoords): string | null {
  let nearest: string | null = null;
  let minDist = Infinity;
  for (const city of saudiCities) {
    const dist = getDistance(coords.latitude, coords.longitude, city.lat, city.lng);
    if (dist < minDist) {
      minDist = dist;
      nearest = city.nameAr;
    }
  }
  if (minDist > 200) return null;
  return nearest;
}

/** أقرب مدينة من القائمة الكاملة (بدون سقف كيلومترات) — احتياط عند فشل الجيوكودينغ */
function nearestSaudiCityEntry(coords: LocationCoords): { nameAr: string; nameEn: string } {
  let best = saudiCities[0]!;
  let minDist = Infinity;
  for (const city of saudiCities) {
    const dist = getDistance(coords.latitude, coords.longitude, city.lat, city.lng);
    if (dist < minDist) {
      minDist = dist;
      best = city;
    }
  }
  return { nameAr: best.nameAr, nameEn: best.nameEn };
}

/**
 * اسم مدينة/محافظة يطابق الإحداثيات: جيوكودينغ ثم مطابقة قائمة المدن السعودية، ثم أقرب مدينة من القائمة الكاملة.
 * يُفضّل على findNearestMajorCity لأن الأخيرة تقتصر على مدن «رئيسية» قليلة وتُضلّل العرض.
 */
export async function resolveSaudiCityFromCoords(
  coords: LocationCoords,
  lang: 'ar' | 'he' = 'ar'
): Promise<string> {
  const fromGeo = await reverseGeocodeToCity(coords);
  if (fromGeo) {
    const g = fromGeo.trim();
    for (const c of saudiCities) {
      if (g === c.nameAr || g === c.nameEn) {
        return lang === 'ar' ? c.nameAr : c.nameEn;
      }
    }
    for (const c of saudiCities) {
      if (g.includes(c.nameAr) || (c.nameEn && g.toLowerCase().includes(c.nameEn.toLowerCase()))) {
        return lang === 'ar' ? c.nameAr : c.nameEn;
      }
    }
  }
  const fallback = findNearestCity(coords);
  if (fallback) {
    const row = saudiCities.find((c) => c.nameAr === fallback);
    if (row) return lang === 'ar' ? row.nameAr : row.nameEn;
  }
  const n = nearestSaudiCityEntry(coords);
  return lang === 'ar' ? n.nameAr : n.nameEn;
}

/**
 * يستخرج اسم مدينة سعودية من نص عنوان/منطقة (مثل سطر العنوان في منتقي الخريطة بعد التأكيد).
 * يُفضّل الأسماء الأطول لتقليل المطابقات الجزئية الخاطئة.
 */
export function matchSaudiCityFromLabel(label: string | null | undefined): string | null {
  if (!label?.trim()) return null;
  const normalized = label.replace(/\s+/g, ' ').trim();
  if (looksLikeRawCoordinatesLabel(normalized)) return null;
  const sorted = [...saudiCities].sort((a, b) => b.nameAr.length - a.nameAr.length);
  for (const c of sorted) {
    if (c.nameAr.length >= 2 && normalized.includes(c.nameAr)) {
      return c.nameAr;
    }
    if (c.nameEn && c.nameEn.length >= 3) {
      const low = normalized.toLowerCase();
      const en = c.nameEn.toLowerCase();
      if (low.includes(en)) return c.nameAr;
    }
  }
  return null;
}

/** تقريب حدود المملكة — لرفض مواقع المحاكي/الـ GPS خارج السعودية بدل ربطها بأقرب مدينة خاطئة. */
export function isCoordLikelyInSaudiArabia(coords: LocationCoords): boolean {
  const { latitude: lat, longitude: lng } = coords;
  if (typeof lat !== 'number' || typeof lng !== 'number' || Number.isNaN(lat) || Number.isNaN(lng)) {
    return false;
  }
  return lat >= 15.5 && lat <= 32.8 && lng >= 34.4 && lng <= 56.0;
}

const MAJOR_CITY_IDS = ['1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','18'];
const majorCities = saudiCities.filter(c => MAJOR_CITY_IDS.includes(c.id));

/** نص يبدو كإحداثيات خام فقط — لا يُستخدم كعنوان للعرض. */
export function looksLikeRawCoordinatesLabel(text: string): boolean {
  const compact = text.replace(/\s+/g, '').trim();
  if (/^-?\d+\.?\d*,-?\d+\.?\d*$/.test(compact)) return true;
  return /^-?\d+\.?\d*\s*,\s*-?\d+\.?\d*$/.test(text.trim());
}

/** نص يشبه مُعرّف مستند/مكان بدل عنوان مقروء (مثل معرف Firestore الطويل). */
export function looksLikeOpaqueAddressToken(text: string): boolean {
  const t = text.trim();
  if (t.length < 16) return false;
  if (/[\u0600-\u06FF\s،]/.test(t)) return false;
  return /^[a-zA-Z0-9_-]+$/.test(t);
}

/**
 * رابط فتح Google Maps لطلب توصيل أو استلام فرع — إحداثيات أولاً، ثم نص بحث من العنوان/المدينة.
 */
export function buildGoogleMapsUrlForOrder(opts: {
  addressCoords?: { latitude: number; longitude: number } | null;
  address?: string;
  city?: string;
  region?: string;
  branchName?: string;
  branchLocation?: string;
  deliveryMethod?: 'branch' | 'delivery';
}): string | null {
  const { addressCoords, address, city, region, branchName, branchLocation, deliveryMethod } = opts;

  if (
    addressCoords &&
    typeof addressCoords.latitude === 'number' &&
    typeof addressCoords.longitude === 'number' &&
    !Number.isNaN(addressCoords.latitude) &&
    !Number.isNaN(addressCoords.longitude)
  ) {
    const q = `${addressCoords.latitude},${addressCoords.longitude}`;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
  }

  if (deliveryMethod === 'branch') {
    const bl = branchLocation?.trim() ?? '';
    if (bl.startsWith('http')) return bl;
    const parts: string[] = [];
    if (branchName?.trim()) parts.push(branchName.trim());
    if (bl && !looksLikeOpaqueAddressToken(bl)) {
      if (looksLikeRawCoordinatesLabel(bl)) parts.push(bl.replace(/\s+/g, ''));
      else parts.push(bl);
    }
    const c = city?.trim();
    if (c) parts.push(c);
    if (parts.length === 0) return null;
    const query = `${parts.join(', ')}, Saudi Arabia`;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }

  const parts: string[] = [];
  const addr = address?.trim() ?? '';
  if (addr) {
    if (looksLikeRawCoordinatesLabel(addr)) {
      parts.push(addr.replace(/\s+/g, ''));
    } else if (!looksLikeOpaqueAddressToken(addr)) {
      parts.push(addr);
    }
  }
  const c = city?.trim();
  if (c) parts.push(c);
  const r = region?.trim();
  if (r) parts.push(r);

  if (parts.length === 0) return null;
  const query = `${parts.join(', ')}, Saudi Arabia`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/** عنوان مختصر لعرضه في رأس «التوصيل إلى» (بدون كسر الفلترة حسب المدينة). */
export function shortenAddressLabel(address: string | null | undefined, maxLen = 56): string | null {
  if (address == null || typeof address !== 'string') return null;
  const t = address.replace(/\s+/g, ' ').trim();
  if (!t) return null;
  if (looksLikeRawCoordinatesLabel(t)) return null;
  if (t.length <= maxLen) return t;
  return `${t.slice(0, Math.max(1, maxLen - 1))}…`;
}

function isStreetLikeSegment(s: string): boolean {
  const t = s.trim();
  if (/^\d+[\s\-]/.test(t) || /^\d+$/.test(t)) return true;
  return /street|st\.|st |road|rd\.|avenue|ave |boulevard|blvd|drive|dr\.|lane|ln\.|way|court|plaza|شارع|طريق/i.test(t);
}

function isCountryOrStateTail(s: string): boolean {
  const u = s.trim();
  const l = u.toLowerCase();
  if (/^\d{4,}/.test(l)) return true;
  if (/saudi|السعودية|المملكة|united states|\busa\b|u\.s\.a|kingdom of saudi/i.test(l)) return true;
  /* ذيل عناوين أمريكية: رمز ولاية */
  return /^(ca|tx|ny|fl|wa|or|nv|az|co|il|pa|ga|nc|mi|oh)$/i.test(u.trim());
}

/**
 * يعرض منطقة/حي مختصر فقط بدل العنوان الكامل (بدون رقم، شارع، مدينة كاملة، دولة).
 * مناسب لرأس «التوصيل إلى» وبطاقات المتاجر.
 */
export function formatAddressAsAreaOnly(address: string | null | undefined, maxLen = 34): string {
  if (address == null || typeof address !== 'string') return '';
  const raw = address.replace(/\s+/g, ' ').trim();
  if (!raw) return '';
  if (looksLikeRawCoordinatesLabel(raw)) {
    return raw.length > maxLen ? `${raw.slice(0, maxLen - 1)}…` : raw;
  }
  if (!raw.includes(',')) {
    return raw.length > maxLen ? `${raw.slice(0, maxLen - 1)}…` : raw;
  }
  const segs = raw.split(',').map((x) => x.trim()).filter(Boolean);
  let i = 0;
  while (i < segs.length && (isStreetLikeSegment(segs[i]) || /^\d+$/.test(segs[i]))) {
    i += 1;
  }
  let j = segs.length - 1;
  while (j > i && isCountryOrStateTail(segs[j])) {
    j -= 1;
  }
  while (j > i && /^\d{5}(-\d{4})?$/i.test(segs[j].trim())) {
    j -= 1;
  }
  const rest = segs.slice(i, j + 1);
  let label = rest.length > 0 ? rest[0] : segs[0];
  if (label.length > maxLen) {
    label = `${label.slice(0, Math.max(10, maxLen - 1))}…`;
  }
  return label;
}

/** تسمية منطقة من Google (أدق من تقسيم النص عند توفر المفتاح). */
export async function reverseGeocodeToAreaLabel(
  coords: LocationCoords,
  lang: 'ar' | 'he' = 'ar'
): Promise<string> {
  const glang = lang === 'ar' ? 'ar' : 'he';
  const typesPriority = [
    'neighborhood',
    'sublocality_level_1',
    'sublocality',
    'administrative_area_level_3',
    'locality',
  ];
  try {
    if (GOOGLE_MAPS_API_KEY) {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coords.latitude},${coords.longitude}&language=${glang}&key=${GOOGLE_MAPS_API_KEY}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.status === 'OK' && data.results?.length > 0) {
        for (const result of data.results) {
          const comps = result.address_components as Array<{ long_name: string; types: string[] }>;
          if (!comps) continue;
          for (const type of typesPriority) {
            const hit = comps.find((c) => c.types?.includes(type));
            if (hit?.long_name?.trim()) {
              return formatAddressAsAreaOnly(hit.long_name.trim(), 40);
            }
          }
        }
      }
    }
  } catch {
    /* fall through */
  }
  const full = await reverseGeocodeToAddress(coords, lang);
  return formatAddressAsAreaOnly(full, 34);
}

export function findNearestMajorCity(coords: LocationCoords, lang: 'ar' | 'he' = 'ar'): string {
  let nearest = majorCities[0];
  let minDist = Infinity;
  for (const city of majorCities) {
    const dist = getDistance(coords.latitude, coords.longitude, city.lat, city.lng);
    if (dist < minDist) {
      minDist = dist;
      nearest = city;
    }
  }
  return lang === 'ar' ? nearest.nameAr : nearest.nameEn;
}

async function reverseGeocodeNominatim(coords: LocationCoords, lang: 'ar' | 'he'): Promise<string | null> {
  try {
    const accept = lang === 'ar' ? 'ar,he' : 'he';
    const q = new URLSearchParams({
      lat: String(coords.latitude),
      lon: String(coords.longitude),
      format: 'json',
      'accept-language': accept,
      zoom: '18',
    });
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${q}`, {
      headers: { 'User-Agent': 'GlordaDeliveryApp/1.0' },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { display_name?: string; error?: string };
    if (data?.error) return null;
    const name = typeof data.display_name === 'string' ? data.display_name.trim() : '';
    return name || null;
  } catch {
    return null;
  }
}

/** عنوان بشري للعرض فقط (لا يعيد سلسلة إحداثيات خام). */
export async function reverseGeocodeToAddress(
  coords: LocationCoords,
  lang: 'ar' | 'he' = 'ar'
): Promise<string> {
  const glang = lang === 'ar' ? 'ar' : 'he';
  try {
    if (GOOGLE_MAPS_API_KEY) {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${coords.latitude},${coords.longitude}&language=${glang}&key=${GOOGLE_MAPS_API_KEY}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.status === 'OK' && data.results?.length > 0) {
        const fa = data.results[0].formatted_address;
        if (fa && String(fa).trim()) return String(fa).trim();
      }
    }
  } catch {
    /* fall through */
  }
  const nom = await reverseGeocodeNominatim(coords, lang);
  if (nom) return nom;
  const city = findNearestCity(coords);
  if (city) return city;
  return findNearestMajorCity(coords, lang);
}

export async function searchPlaces(query: string): Promise<Array<{ name: string; nameAr: string; lat: number; lng: number }>> {
  if (!query.trim()) return [];

  if (GOOGLE_MAPS_API_KEY) {
    try {
      const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&region=sa&language=ar&key=${GOOGLE_MAPS_API_KEY}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.status === 'OK' && data.results?.length > 0) {
        return data.results.slice(0, 5).map((r: any) => ({
          name: r.name,
          nameAr: r.name,
          lat: r.geometry.location.lat,
          lng: r.geometry.location.lng,
        }));
      }
    } catch (error) {
      // fall through to local search
    }
  }

  const q = query.toLowerCase().trim();
  return saudiCities
    .filter(c => c.nameAr.includes(q) || c.nameEn.toLowerCase().includes(q))
    .slice(0, 5)
    .map(c => ({ name: c.nameEn, nameAr: c.nameAr, lat: c.lat, lng: c.lng }));
}

/** Match product city to selected city (handles Arabic/English, city id, and legacy formats) */
export function productMatchesCity(productCity: string | undefined, selectedCity: string): boolean {
  if (!productCity || !selectedCity) return false;
  const pc = productCity.trim();
  const sc = selectedCity.trim();
  if (pc === sc) return true;
  const pl = pc.toLowerCase();
  const sl = sc.toLowerCase();
  if (pl === sl) return true;

  const prodCity = saudiCities.find(
    (c) => c.id === pc || c.nameAr === pc || c.nameEn === pc || c.nameAr.toLowerCase() === pl || c.nameEn.toLowerCase() === pl
  );
  const selCity = saudiCities.find(
    (c) => c.id === sc || c.nameAr === sc || c.nameEn === sc || c.nameAr.toLowerCase() === sl || c.nameEn.toLowerCase() === sl
  );
  if (prodCity && selCity) return prodCity.id === selCity.id;

  const entry = saudiCities.find(
    (c) => c.nameAr === sc || c.nameEn === sc || c.nameAr.toLowerCase() === sl || c.nameEn.toLowerCase() === sl
  );
  if (entry) {
    return (
      pl === entry.nameAr.toLowerCase() ||
      pl === entry.nameEn.toLowerCase() ||
      pc === entry.nameAr ||
      pc === entry.nameEn ||
      pc === entry.id
    );
  }
  return false;
}
