// Script to extract all unique region, zone, and woreda names from ethiopia-admin.json
// Output: region-zone-woreda-names.json for manual Amharic translation
const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, 'client', 'public', 'geo', 'ethiopia-admin.json');
const outputPath = path.join(__dirname, 'region-zone-woreda-names.json');

const raw = fs.readFileSync(inputPath, 'utf-8');
const data = JSON.parse(raw);

const regions = new Set();
const zones = new Set();
const woredas = new Set();

(data.basic_woreda_towns || []).forEach(entry => {
  const woreda = entry.name;
  const zone = entry.subcity_zone?.name;
  const region = entry.subcity_zone?.region_city?.name;
  if (region) regions.add(region);
  if (zone) zones.add(zone);
  if (woreda) woredas.add(woreda);
});

const result = {
  regions: Array.from(regions).sort(),
  zones: Array.from(zones).sort(),
  woredas: Array.from(woredas).sort(),
};

fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');
console.log('Unique region, zone, woreda names written to', outputPath);
