"""Verify that every production web asset is the one actually bundled in an APK."""
from pathlib import Path
import hashlib
import json
import struct
import zipfile

root = Path(__file__).resolve().parents[1]
output_dir = root / 'android/app/build/outputs/apk/debug'
metadata = json.loads((output_dir / 'output-metadata.json').read_text(encoding='utf-8'))
apk = output_dir / metadata['elements'][0]['outputFile']
files = sorted(p for p in (root / 'dist').rglob('*') if p.is_file())
pngs = 0
with zipfile.ZipFile(apk) as archive:
    for path in files:
        relative = path.relative_to(root / 'dist').as_posix()
        expected = path.read_bytes()
        actual = archive.read('assets/public/' + relative)
        if hashlib.sha256(actual).digest() != hashlib.sha256(expected).digest():
            raise RuntimeError('Asset mismatch: ' + relative)
        if path.suffix == '.png':
            if actual[:8] != b'\x89PNG\r\n\x1a\n' or min(struct.unpack('>II', actual[16:24])) <= 0:
                raise RuntimeError('Invalid PNG: ' + relative)
            pngs += 1
report = {'apk': str(apk), 'bytes': apk.stat().st_size, 'sha256': hashlib.sha256(apk.read_bytes()).hexdigest().upper(), 'matched_web_files': len(files), 'valid_local_pngs': pngs}
(root / 'docs/journey-v3-apk-verification.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
print(json.dumps(report, ensure_ascii=False))
