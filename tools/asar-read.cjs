// One-off: probe asar header layout, then extract a file by archive-relative path.
const fs = require('fs');
const path = require('path');

const [asarPath, wantPath, outPath] = process.argv.slice(2);
const buf = fs.readFileSync(asarPath);

const u32 = (o) => buf.readUInt32LE(o);
const jsonMarker = Buffer.from('{"files"');
const markerAt = buf.indexOf(jsonMarker, 0, 4096);
console.log('u32@0=%d u32@4=%d u32@8=%d u32@12=%d jsonMarkerAt=%d',
  u32(0), u32(4), u32(8), u32(12), markerAt);

// Empirical layout for this archive:
//   [0:4]=4  [4:8]=A  [8:12]=A-4  [12:16]=A-8 (= jsonSize)  [16:16+jsonSize]=JSON
// dataStart = 16 + jsonSize (already 4-byte aligned here).
const candidates = [{ name: '16B-prefix', jsonStart: 16, jsonSize: u32(12), dataStart: 16 + u32(12) }];
for (const c of candidates) console.log('candidate', c.name, JSON.stringify(c));

const chosen = candidates[0];
if (!chosen) { console.error('unknown layout'); process.exit(3); }

const header = JSON.parse(buf.slice(chosen.jsonStart, chosen.jsonStart + chosen.jsonSize).toString('utf8'));

function findFile(node, rel) {
  let cur = node;
  for (const p of rel.split('/').filter(Boolean)) {
    if (!cur || typeof cur !== 'object' || !cur.files || !cur.files[p]) return null;
    cur = cur.files[p];
  }
  return cur && !cur.files ? cur : null;
}

const entry = findFile(header, wantPath);
if (!entry) { console.error('NOT FOUND', wantPath); process.exit(2); }
const start = chosen.dataStart + Number(entry.offset);
const out = Buffer.from(buf.slice(start, start + Number(entry.size)));
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, out);
console.log('OK', outPath, out.length, 'bytes (dataStart', chosen.dataStart + ', offset', entry.offset + ', size', entry.size + ')');
