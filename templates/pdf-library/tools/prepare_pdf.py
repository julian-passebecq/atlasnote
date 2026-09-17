#!/usr/bin/env python3
"""Offline PDF preparation. Never uploads, OCRs, rasterizes pages or grants rights.

Exit: 0 prepared; 1 unsafe/invalid; 2 dependency/usage; 3 hard size cap; 4 duplicate.
Requires PyMuPDF >= 1.26 (tested 1.26.7) and Pillow for optional render comparison.
Lossy profiles require a QA output folder. Human review remains mandatory.
"""
from __future__ import annotations
import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
import shutil
import sys
import tempfile

MAX = 20 * 1024 * 1024
TARGET = 12 * 1024 * 1024
PROFILES = {"lossless": None, "study": {"dpi_threshold": 220, "dpi_target": 160, "quality": 82},
            "compact": {"dpi_threshold": 180, "dpi_target": 130, "quality": 75}}


def sha(path: Path) -> str:
    h = hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda: f.read(1048576), b''):
            h.update(chunk)
    return h.hexdigest()


def inspect(path: Path, pdf) -> dict:
    with path.open('rb') as f:
        if not f.read(8).startswith(b'%PDF-'):
            raise ValueError('Missing %PDF- signature')
    with pdf.open(path) as doc:
        if doc.needs_pass or doc.is_encrypted or doc.metadata.get('encryption'):
            raise ValueError('Encrypted PDFs need a separate explicit unlock workflow')
        if not doc.is_pdf or doc.page_count < 1:
            raise ValueError('Not a nonempty PDF')
        if doc.is_repaired:
            raise ValueError('Malformed PDF required repair; review the original instead')
        if doc.embfile_count():
            raise ValueError('Embedded files are not accepted by this preparation workflow')
        # Inspect resolved object dictionaries, not arbitrary binary image streams.
        # PDF names may use #xx escapes; normalize before checking action names.
        for xref in range(1, doc.xref_length()):
            obj = doc.xref_object(xref, compressed=False)
            obj = re.sub(r'#([0-9a-fA-F]{2})', lambda m: chr(int(m[1], 16)), obj)
            if re.search(r'/(?:JavaScript|JS|Launch|RichMedia|EmbeddedFile|SubmitForm|ImportData|GoToR)\b', obj):
                raise ValueError('Active content, embedded file or external action is not accepted')
        texts = [re.sub(r'\s+', ' ', p.get_text('text')).strip() for p in doc]
        text_hashes = [hashlib.sha256(t.encode()).hexdigest() for t in texts]
        return {'bytes': path.stat().st_size, 'sha256': sha(path), 'pageCount': doc.page_count,
                'hasSelectableText': any(texts), 'textSha256': hashlib.sha256('\n'.join(texts).encode()).hexdigest(),
                'pageTextSha256': text_hashes, 'dimensions': [[round(p.rect.width, 4), round(p.rect.height, 4)] for p in doc]}


def verify(before: dict, candidate: dict) -> None:
    for field in ['pageCount', 'pageTextSha256', 'dimensions']:
        if before[field] != candidate[field]:
            raise ValueError(f'Refusing output: {field} changed')


def optimize(src: Path, dst: Path, profile: str, pdf) -> None:
    with pdf.open(src) as doc:
        if PROFILES[profile]:
            doc.rewrite_images(**PROFILES[profile])
        doc.save(dst, garbage=4, deflate=True, deflate_images=True, deflate_fonts=True,
                 use_objstms=1, compression_effort=100, preserve_metadata=True)


def qa(before: Path, after: Path, folder: Path, pdf) -> dict:
    from PIL import Image, ImageChops, ImageStat
    folder.mkdir(parents=True, exist_ok=True)
    rows = []
    with pdf.open(before) as a, pdf.open(after) as b:
        # All pages for small PDFs; representative first/middle/last for larger inputs.
        page_count = a.page_count
        pages = list(range(a.page_count)) if a.page_count <= 12 else sorted({0, 1, a.page_count//4, a.page_count//2, 3*a.page_count//4, a.page_count-2, a.page_count-1})
        for i in pages:
            images = []
            for label, doc in [('before', a), ('after', b)]:
                pix = doc[i].get_pixmap(dpi=120, colorspace=pdf.csRGB, alpha=False)
                image = Image.frombytes('RGB', (pix.width, pix.height), pix.samples)
                image.save(folder/f'page-{i+1:04d}-{label}.png')
                images.append(image)
            if images[0].size != images[1].size:
                raise ValueError('Rendered dimensions changed')
            diff = ImageChops.difference(*images)
            diff.save(folder/f'page-{i+1:04d}-diff.png')
            mae = sum(ImageStat.Stat(diff).mean)/3
            rows.append({'page': i+1, 'meanAbsoluteChannelDifference': round(mae, 6), 'maxChannelDifference': max(x[1] for x in diff.getextrema())})
    return {'dpi': 120, 'pages': rows, 'coverage': 'all' if len(pages) == page_count else 'representative',
            'humanReviewRequired': True, 'humanApproved': False,
            'note': 'Render metrics are evidence, not a guarantee of legibility. Inspect small labels, diagrams and tables before accepting lossy output.'}


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('input', type=Path); ap.add_argument('output', type=Path)
    ap.add_argument('--profile', choices=PROFILES, default='lossless')
    ap.add_argument('--report', type=Path); ap.add_argument('--qa-dir', type=Path)
    ap.add_argument('--hash-index', type=Path, help='JSON object sha256 -> canonical document ID; read-only duplicate check')
    ap.add_argument('--max-mb', type=float, default=20, help='May lower, never raise the 20 MiB application cap')
    ap.add_argument('--target-mb', type=float, default=12)
    args = ap.parse_args()
    src, dst = args.input.resolve(), args.output.resolve()
    report_path = args.report or dst.with_suffix('.processing.json')
    report = {'format': 'atlasnote-pdf-processing', 'schemaVersion': 1, 'timestamp': datetime.now(timezone.utc).isoformat(),
              'profile': args.profile, 'options': PROFILES[args.profile], 'inputName': src.name, 'outputName': dst.name,
              'processor': {'tool': 'AtlasNote prepare-pdf', 'version': '1.1.0'}, 'warnings': [],
              'rights': 'unchanged; no permission inferred', 'status': 'FAIL'}
    code = 1
    try:
        import pymupdf as pdf
        report['processor']['pymupdf'] = pdf.VersionBind
        if not (0 < args.max_mb <= 20) or not (0 < args.target_mb <= args.max_mb):
            raise ValueError('Limits must satisfy 0 < target <= max <= 20 MiB')
        if src == dst or dst.exists():
            raise ValueError('Refusing to overwrite an original or existing output; choose a new path')
        if report_path.resolve() in {src, dst}:
            raise ValueError('Report path must not overwrite a PDF')
        if args.profile != 'lossless' and not args.qa_dir:
            raise ValueError('Lossy profiles require --qa-dir and human review of the generated before/after/diff images')
        before = inspect(src, pdf); report['before'] = before
        index = json.loads(args.hash_index.read_text()) if args.hash_index else {}
        if not isinstance(index, dict):
            raise ValueError('Hash index must be an object mapping SHA-256 to canonical document ID')
        if before['sha256'] in index:
            report.update(status='DUPLICATE', duplicateOf=index[before['sha256']], error='Use the existing canonical document; no output created')
            code = 4
        else:
            dst.parent.mkdir(parents=True, exist_ok=True)
            with tempfile.TemporaryDirectory(prefix='atlas-pdf-', dir=dst.parent) as tmp:
                structural = Path(tmp)/'lossless.pdf'
                optimize(src, structural, 'lossless', pdf)
                lossless = inspect(structural, pdf); verify(before, lossless)
                report['losslessCandidate'] = lossless
                candidate, candidate_info = structural, lossless
                # Recompression always follows the structural pass and never rasterizes pages.
                if args.profile != 'lossless':
                    lossy = Path(tmp)/'lossy.pdf'; optimize(structural, lossy, args.profile, pdf)
                    lossy_info = inspect(lossy, pdf); verify(before, lossy_info)
                    report['lossyCandidate'] = lossy_info
                    if lossy_info['bytes'] < candidate_info['bytes']:
                        candidate, candidate_info = lossy, lossy_info
                    else:
                        report['warnings'].append('Image rewrite was not smaller; retained lossless candidate')
                kept = candidate_info['bytes'] >= before['bytes']
                chosen, after = (src, before) if kept else (candidate, candidate_info)
                report.update(after=after, keptOriginalBecauseCandidateWasNotSmaller=kept,
                              savedBytes=before['bytes']-after['bytes'], ratio=round(after['bytes']/before['bytes'], 6),
                              targetBytes=int(args.target_mb*1024*1024), hardLimitBytes=int(args.max_mb*1024*1024),
                              targetMet=after['bytes'] <= args.target_mb*1024*1024,
                              hardLimitMet=after['bytes'] <= args.max_mb*1024*1024)
                if not report['targetMet']:
                    report['warnings'].append('Prepared PDF exceeds the 12 MiB recommended target' if args.target_mb == 12 else 'Prepared PDF exceeds configured target')
                if after['sha256'] in index:
                    report.update(status='DUPLICATE', duplicateOf=index[after['sha256']], error='Prepared hash already exists; no output created'); code = 4
                elif not report['hardLimitMet']:
                    report.update(status='REJECTED_SIZE', error='Prepared PDF exceeds the hard cap; no output created'); code = 3
                else:
                    if args.qa_dir:
                        report['visualQA'] = qa(src, chosen, args.qa_dir, pdf)
                    shutil.copyfile(chosen, dst)
                    report['outputWritten'] = True
                    report['status'] = 'PREPARED_REVIEW_REQUIRED' if args.profile != 'lossless' else 'PASS'
                    code = 0
    except ImportError as exc:
        report['error'] = 'Missing optional authoring dependency: '+str(exc); report['status'] = 'BLOCKED'; code = 2
    except Exception as exc:
        report['error'] = str(exc)
    payload = json.dumps(report, indent=2)
    print(payload)
    if report_path.resolve() not in {src, dst}:
        report_path.parent.mkdir(parents=True, exist_ok=True)
        report_path.write_text(payload+'\n', encoding='utf-8')
    return code

if __name__ == '__main__':
    raise SystemExit(main())
