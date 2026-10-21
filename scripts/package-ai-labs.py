"""Build/check the deterministic, offline CPU lab distribution using stdlib."""
import argparse
import hashlib
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parents[1] / "public" / "ai-labs"
FILES = [ROOT / name for name in ["README.md", "environment.json", "ai_lab.py", "practice.py",
                                "test_ai_lab.py", "make_media.py"]]
FILES += sorted(p for p in (ROOT / "data").rglob("*") if p.is_file() and "__pycache__" not in p.parts)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    checksums = "".join(hashlib.sha256(p.read_bytes()).hexdigest() + "  " +
                        p.relative_to(ROOT).as_posix() + "\n" for p in FILES)
    manifest = ROOT / "SHA256SUMS"
    archive = ROOT / "ai-cpu-labs.zip"
    if args.check:
        web_manifest = ROOT / "SHA256SUMS.txt"
        if (not manifest.exists() or manifest.read_text() != checksums or not archive.exists()
                or not web_manifest.exists() or web_manifest.read_text() != checksums):
            raise SystemExit("Lab package missing or stale; run python3 -B scripts/package-ai-labs.py")
        with zipfile.ZipFile(archive) as package:
            expected = {"ai-cpu-labs/" + p.relative_to(ROOT).as_posix(): p.read_bytes() for p in FILES}
            expected["ai-cpu-labs/SHA256SUMS"] = checksums.encode()
            if set(package.namelist()) != set(expected) or package.testzip() is not None:
                raise SystemExit("Lab ZIP contents differ")
            if any(package.read(name) != payload for name, payload in expected.items()):
                raise SystemExit("Lab ZIP bytes differ from source")
        print("Verified lab source hashes, ZIP entries and CRC")
        return
    manifest.write_text(checksums)
    (ROOT / "SHA256SUMS.txt").write_text(checksums)
    with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED) as package:
        for path in [*FILES, manifest]:
            info = zipfile.ZipInfo("ai-cpu-labs/" + path.relative_to(ROOT).as_posix(), (2026, 10, 21, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            package.writestr(info, path.read_bytes())
    print(f"Packaged {len(FILES)} source/data files plus SHA256SUMS")


if __name__ == "__main__":
    main()
