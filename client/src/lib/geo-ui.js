let GEO = null;
async function loadGeo() {
  if (GEO) return GEO;
  const res = await fetch("/geo/ethiopia-admin.json");
  GEO = await res.json();
  return GEO;
}
export async function getRegionOptions() {
  const g = await loadGeo();
  return Object.keys(g).map(r => ({ value: r, labelAm: r, labelEn: r }));
}
export async function getZoneOptions(region) {
  const g = await loadGeo();
  const zones = g[region]?.zones ? Object.keys(g[region].zones) : [];
  return zones.map(z => ({ value: z, labelAm: z, labelEn: z }));
}
export async function getWoredaOptions(region, zone) {
  const g = await loadGeo();
  const ws = g[region]?.zones?.[zone]?.woredas || [];
  return ws.map(w => ({ value: w, labelAm: w, labelEn: w }));
}