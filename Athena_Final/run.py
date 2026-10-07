from pathlib import Path
import os
import subprocess
import sys

ROOT = Path(__file__).resolve().parent
FRONTEND = ROOT / "frontend"
DIST = FRONTEND / "dist"


def run(cmd, cwd):
    print("$", " ".join(cmd))
    subprocess.check_call(cmd, cwd=cwd)


def main():
    if not (FRONTEND / "node_modules").exists():
        run(["npm", "install"], FRONTEND)
    if not DIST.exists():
        run(["npm", "run", "build"], FRONTEND)

    sys.path.insert(0, str(ROOT / "backend"))
    import uvicorn
    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=False)


if __name__ == "__main__":
    main()
