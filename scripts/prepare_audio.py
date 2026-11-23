"""Merge recording backups in order and extract independently playable WebM clips.
Usage: python3 scripts/prepare_audio.py old-backup.json newer-backup.json
Original backups are never modified. Later backups take priority by written form.
"""
import argparse
import base64
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LETTERS = list('ကခဂဃငစဆဇဈညဋဌဍဎဏတထဒဓနပဖဗဘမယရလဝသဟဠအ')
TALL = set('ခဂငဒပဝ')
SUPPORTED = {form for base in LETTERS for form in [base, base+('ါ' if base in TALL else 'ာ'), base+('ါ' if base in TALL else 'ာ')+'း', base+'ိ', base+'ီ', base+'ီး']}

def prepare(sources):
    merged = {}
    decoded = {}
    for source in sources:
        backup = json.loads(Path(source).read_text())
        if backup.get('format') != 'little-lotus-recordings' or backup.get('version') != 1:
            raise ValueError(f'Unsupported backup: {source}')
        seen = set()
        for clip in backup['clips']:
            form, data = clip['letter'], clip['data']
            if form not in SUPPORTED or form in seen:
                raise ValueError(f'Invalid or duplicated form: {form}')
            header, encoded = data.split(',', 1)
            if not header.startswith('data:audio/webm') or not header.endswith(';base64'):
                raise ValueError(f'Unsupported audio format: {form}')
            audio = base64.b64decode(encoded, validate=True)
            if audio[:4] != bytes.fromhex('1a45dfa3'):
                raise ValueError(f'Invalid WebM container: {form}')
            seen.add(form)
            merged[form] = clip
            decoded[form] = (audio, header[5:-7])
    # All sources validate before output is changed.
    manifest = {'format': 'little-lotus-audio-index', 'version': 1, 'clips': []}
    for form, (audio, mime) in decoded.items():
        family = 'alphabet' if len(form) == 1 else ('i' if any(c in form for c in 'ိီ') else 'aa')
        name = '-'.join(f'{ord(c):04x}' for c in form) + '.webm'
        relative = Path('recordings') / 'audio' / family / name
        path = ROOT / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(audio)
        manifest['clips'].append({'letter': form, 'url': relative.as_posix(), 'type': mime,
                                  'size_bytes': len(audio), 'sha256': hashlib.sha256(audio).hexdigest()})
    folder = ROOT / 'recordings'
    folder.mkdir(exist_ok=True)
    (folder / 'audio-index.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n')
    # Small classic-script wrapper also works when opening index.html directly.
    (folder / 'bundled-recordings.js').write_text('// Audio index only. Clips load individually on playback.\nwindow.LITTLE_LOTUS_RECORDINGS = '+json.dumps(manifest, ensure_ascii=False, separators=(',', ':'))+';\n')
    (folder / 'merged-recordings.json').write_text(json.dumps({'format':'little-lotus-recordings','version':1,'clips':list(merged.values())}, ensure_ascii=False, separators=(',', ':'))+'\n')
    print(f'Prepared {len(merged)} separate clips; original backups preserved.')

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('sources', nargs='+', type=Path)
    args = parser.parse_args()
    prepare(args.sources)
