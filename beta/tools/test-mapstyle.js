// Verifies what restyleGL() does to a real basemap's layers.
//
// The style itself cannot be fetched in CI (and could not be fetched in the
// container this was written in), so this drives the actual restyleGL source
// out of wtm-beta.html against the layer list OpenFreeMap Liberty and Carto
// Positron really ship, with a stub map that records every call.
//
// The point is not that colours are right. It is that the layers Snap does not
// have are actually gone: street names, POIs, house numbers, transit, borders,
// road casings and 3D buildings. That is the whole difference between this and
// a beige road atlas, and it is invisible to the browser test because the
// canvas fallback is what runs offline.

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const src = fs.readFileSync(path.join(__dirname, '..', 'wtm-beta.html'), 'utf8');

// Pull the two pieces under test straight out of the page.
function extract(name, startsWith) {
  const i = src.indexOf(startsWith);
  assert.ok(i !== -1, `could not find ${name} in wtm-beta.html`);
  let depth = 0, started = false;
  for (let j = i; j < src.length; j++) {
    const c = src[j];
    if (c === '{') { depth++; started = true; }
    else if (c === '}') { depth--; if (started && depth === 0) return src.slice(i, j + 1); }
  }
  throw new Error(`unbalanced braces reading ${name}`);
}

const paintSrc = extract('GL_PAINT', 'const GL_PAINT=');
const restyleSrc = extract('restyleGL', 'function restyleGL()');

// Layer ids and source-layers as the two providers actually ship them.
const LAYERS = [
  { id: 'background', type: 'background' },

  { id: 'landcover-grass', type: 'fill', 'source-layer': 'landcover' },
  { id: 'landcover-wood', type: 'fill', 'source-layer': 'landcover' },
  { id: 'park', type: 'fill', 'source-layer': 'park' },
  { id: 'landuse-residential', type: 'fill', 'source-layer': 'landuse' },
  { id: 'landuse-commercial', type: 'fill', 'source-layer': 'landuse' },
  { id: 'landuse-hospital', type: 'fill', 'source-layer': 'landuse' },

  { id: 'water', type: 'fill', 'source-layer': 'water' },
  { id: 'waterway', type: 'line', 'source-layer': 'waterway' },

  { id: 'building', type: 'fill', 'source-layer': 'building' },
  { id: 'building-top', type: 'fill', 'source-layer': 'building' },
  { id: 'building-3d', type: 'fill-extrusion', 'source-layer': 'building' },

  { id: 'highway_motorway_casing', type: 'line', 'source-layer': 'transportation' },
  { id: 'highway_motorway_inner', type: 'line', 'source-layer': 'transportation' },
  { id: 'highway_major_casing', type: 'line', 'source-layer': 'transportation' },
  { id: 'highway_major_inner', type: 'line', 'source-layer': 'transportation' },
  { id: 'highway_minor', type: 'line', 'source-layer': 'transportation' },
  { id: 'highway_path', type: 'line', 'source-layer': 'transportation' },
  { id: 'road_residential', type: 'line', 'source-layer': 'transportation' },
  { id: 'tunnel_motorway_casing', type: 'line', 'source-layer': 'transportation' },
  { id: 'bridge_motorway_inner', type: 'line', 'source-layer': 'transportation' },
  { id: 'railway_transit', type: 'line', 'source-layer': 'transportation' },

  { id: 'boundary_2', type: 'line', 'source-layer': 'boundary' },
  { id: 'boundary_3', type: 'line', 'source-layer': 'boundary' },

  { id: 'highway_name_other', type: 'symbol', 'source-layer': 'transportation_name', layout: { 'text-field': '{name}' } },
  { id: 'highway_name_motorway', type: 'symbol', 'source-layer': 'transportation_name', layout: { 'text-field': '{ref}' } },
  { id: 'poi_z16', type: 'symbol', 'source-layer': 'poi', layout: { 'text-field': '{name}' } },
  { id: 'poi_transit', type: 'symbol', 'source-layer': 'poi', layout: { 'text-field': '{name}' } },
  { id: 'housenumber', type: 'symbol', 'source-layer': 'housenumber', layout: { 'text-field': '{housenumber}' } },
  { id: 'water_name_line', type: 'symbol', 'source-layer': 'water_name', layout: { 'text-field': '{name}' } },
  { id: 'airport_label', type: 'symbol', 'source-layer': 'aerodrome_label', layout: { 'text-field': '{name}' } },

  { id: 'place_city', type: 'symbol', 'source-layer': 'place', layout: { 'text-field': '{name}' } },
  { id: 'place_town', type: 'symbol', 'source-layer': 'place', layout: { 'text-field': '{name}' } },
  { id: 'place_suburb', type: 'symbol', 'source-layer': 'place', layout: { 'text-field': '{name}' } },
];

const hidden = new Set();
const paint = {};
const glMap = {
  getStyle: () => ({ layers: LAYERS }),
  setLayoutProperty(id, prop, val) {
    if (prop === 'visibility' && val === 'none') hidden.add(id);
  },
  setPaintProperty(id, prop, val) {
    (paint[id] = paint[id] || {})[prop] = val;
  },
};

// eslint-disable-next-line no-new-func
new Function('glMap', `${paintSrc}\n${restyleSrc}\nrestyleGL();`)(glMap);

let failures = 0;
function check(label, ok) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}`);
  if (!ok) failures++;
}

const gone = (id) => hidden.has(id);
const kept = (id) => !hidden.has(id);

console.log('--- gone, because Snap has none of it ---');
check('street name labels', gone('highway_name_other') && gone('highway_name_motorway'));
check('POI labels', gone('poi_z16') && gone('poi_transit'));
check('house numbers', gone('housenumber'));
check('water and airport labels', gone('water_name_line') && gone('airport_label'));
check('admin boundaries', gone('boundary_2') && gone('boundary_3'));
check('rail and transit lines', gone('railway_transit'));
check('road casings', gone('highway_motorway_casing') && gone('highway_major_casing') && gone('tunnel_motorway_casing'));
check('3D buildings', gone('building-3d'));
check('non-green landuse tints', gone('landuse-residential') && gone('landuse-commercial') && gone('landuse-hospital'));

console.log('\n--- kept, because the map still has to read as a city ---');
check('neighbourhood and city names', kept('place_city') && kept('place_town') && kept('place_suburb'));
check('the street grid itself', kept('highway_motorway_inner') && kept('highway_minor') && kept('highway_path'));
check('residential roads survive the landuse rule', kept('road_residential'));
check('bridges', kept('bridge_motorway_inner'));
check('water', kept('water') && kept('waterway'));
check('parks and green', kept('park') && kept('landcover-grass') && kept('landcover-wood'));
check('flat buildings', kept('building') && kept('building-top'));

console.log('\n--- the flattening that makes it read as Snap and not a road atlas ---');
const roadColors = new Set(
  LAYERS.filter((l) => l.type === 'line' && /transportation/.test(l['source-layer'] || '') && !hidden.has(l.id))
    .map((l) => paint[l.id] && paint[l.id]['line-color'])
);
check(`every road is one colour (got ${[...roadColors].join(', ')})`, roadColors.size === 1 && roadColors.has('#FFFFFF'));
check('place labels recoloured', (paint['place_city'] || {})['text-color'] === '#8A8578');
check('buildings fade out below z15', Array.isArray((paint['building'] || {})['fill-opacity']));

console.log(`\n${LAYERS.length} layers in, ${hidden.size} hidden, ${failures} failed`);
process.exit(failures ? 1 : 0);
