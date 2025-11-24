// Script to convert ethiopia-admin.json to ETH_GEO nested structure
// Usage: node convert-ethiopia-admin.js
const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, 'client', 'public', 'geo', 'ethiopia-admin.json');
const outputPath = path.join(__dirname, 'client', 'public', 'geo', 'ethiopia-ethgeo.json');

const raw = fs.readFileSync(inputPath, 'utf-8');
const data = JSON.parse(raw);


// Amharic mapping for common regions, zones, and woredas
const amharicMap = {
  regions: {
    "Oromia": "ኦሮሚያ",
    "Amhara": "አማራ",
    "Tigray": "ትግራይ",
    "Afar": "አፋር",
    "Somali": "ሶማሌ",
    "Benishangul-Gumuz": "ቤኒሻንጉል-ጉሙዝ",
    "SNNP": "ደቡብ",
    "Sidama": "ሲዳማ",
    "Harari": "ሀረሪ",
    "Gambela": "ጋምቤላ",
    "Addis Ababa": "አዲስ አበባ",
    "Dire Dawa": "ድሬዳዋ"
  },
  zones: {
    "Arsi": "አርሲ",
    "Gurage": "ጉራጌ",
    "North Shewa": "ሰሜን ሸዋ",
    "South Wollo": "ደቡብ ወሎ",
    "West Gojjam": "ምዕራብ ጎጅጃም",
    // Add more as needed
  },
  woredas: {
    "Asella": "አሰላ",
    "Butajira": "ቡታጅራ",
    // Add more as needed
  }
};

const ethGeo = {};

(data.basic_woreda_towns || []).forEach(entry => {
  const woredaEn = entry.name;
  const woredaAm = amharicMap.woredas[woredaEn] || woredaEn;
  const zoneEn = entry.subcity_zone?.name || 'Unknown Zone';
  const zoneAm = amharicMap.zones[zoneEn] || zoneEn;
  const regionEn = entry.subcity_zone?.region_city?.name || 'Unknown Region';
  const regionAm = amharicMap.regions[regionEn] || regionEn;

  if (!ethGeo[regionEn]) ethGeo[regionEn] = { en: regionEn, am: regionAm, zones: {} };
  if (!ethGeo[regionEn].zones[zoneEn]) ethGeo[regionEn].zones[zoneEn] = { en: zoneEn, am: zoneAm, woredas: [] };
  // Avoid duplicates
  if (!ethGeo[regionEn].zones[zoneEn].woredas.some(w => w.en === woredaEn)) {
    ethGeo[regionEn].zones[zoneEn].woredas.push({ en: woredaEn, am: woredaAm });
  }
});

fs.writeFileSync(outputPath, JSON.stringify(ethGeo, null, 2), 'utf-8');
console.log('ETH_GEO structure written to', outputPath);
