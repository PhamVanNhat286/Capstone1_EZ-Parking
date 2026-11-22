#!/usr/bin/env python3
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

FILES = [
    r"C:\Users\HP\Downloads\3. Product Backlog\C2SE.11_AA2S_ProductBacklog_v2.0.docx",
]

def extract_docx(docx_path: Path, out_path: Path):
    try:
        with zipfile.ZipFile(docx_path, 'r') as z:
            content = z.read('word/document.xml')
        root = ET.fromstring(content)
        ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
        texts = []
        for p in root.findall('.//w:p', ns):
            t_nodes = p.findall('.//w:t', ns)
            if t_nodes:
                text = ''.join(t.text for t in t_nodes if t.text)
                if text.strip():
                    texts.append(text)
        out_path.write_text('\n'.join(texts), encoding='utf-8')
        print(f"OK: {docx_path.name} -> {out_path.name} ({len(texts)} lines)")
    except Exception as e:
        print(f"ERR: {docx_path.name}: {e}")

if __name__ == "__main__":
    print("=== Extracting Product Backlog ===")
    for f in FILES:
        p = Path(f)
        if p.exists():
            extract_docx(p, p.with_suffix('.txt'))
        else:
            print(f"MISSING: {f}")
    print("=== Done ===")