// GeoNames API helpers for Ethiopia admin boundaries
// Replace 'demo' with your own username for production use
const GEONAMES_USERNAME = 'demo';
const BASE_URL = 'https://secure.geonames.org';

// Ethiopia geonameId: 337996
export async function fetchRegions() {
  const url = `${BASE_URL}/childrenJSON?geonameId=337996&username=${GEONAMES_USERNAME}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch regions');
  const data = await res.json();
  return (data.geonames || []).map(r => ({
    name: r.name,
    geonameId: r.geonameId,
    adminCode1: r.adminCodes1?.ISO3166_2,
  }));
}

export async function fetchZones(regionGeonameId) {
  const url = `${BASE_URL}/childrenJSON?geonameId=${regionGeonameId}&username=${GEONAMES_USERNAME}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch zones');
  const data = await res.json();
  return (data.geonames || []).map(z => ({
    name: z.name,
    geonameId: z.geonameId,
    adminCode2: z.adminCodes2?.ISO3166_2,
  }));
}

export async function fetchWoredas(zoneGeonameId) {
  const url = `${BASE_URL}/childrenJSON?geonameId=${zoneGeonameId}&username=${GEONAMES_USERNAME}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch woredas');
  const data = await res.json();
  return (data.geonames || []).map(w => ({
    name: w.name,
    geonameId: w.geonameId,
  }));
}
