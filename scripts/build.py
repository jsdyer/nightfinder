"""Build Nightfinder and bundle a pinned copy of Astronomy Engine."""
from base64 import b64decode
from hashlib import sha512
from io import BytesIO
from pathlib import Path
from urllib.request import Request, urlopen
import shutil
import tarfile

ROOT = Path(__file__).resolve().parents[1]
VERSION = "2.1.19"
URL = f"https://registry.npmjs.org/astronomy-engine/-/astronomy-engine-{VERSION}.tgz"
SHA512 = b64decode("8yWKNf7UeNbH458h3sAJ6ZgAjE5jTXp/mNNRFoC20j2SHwZIjAQeEsBB2Q3uCFRaTCCJRv33K2XhkhZQMXoX6w==")


def main():
    request = Request(URL, headers={"User-Agent": "CoolCode Nightfinder build"})
    with urlopen(request, timeout=40) as response:
        payload = response.read(4_000_001)
    if sha512(payload).digest() != SHA512:
        raise SystemExit("Astronomy Engine package integrity check failed.")
    with tarfile.open(fileobj=BytesIO(payload), mode="r:gz") as bundle:
        engine = bundle.extractfile("package/astronomy.browser.min.js").read()
    target = ROOT / "dist"
    if target.exists():
        shutil.rmtree(target)
    shutil.copytree(ROOT / "web", target)
    (target / "astronomy.js").write_bytes(engine)
    print(f"Built Nightfinder with Astronomy Engine {VERSION}.")


if __name__ == "__main__":
    main()
