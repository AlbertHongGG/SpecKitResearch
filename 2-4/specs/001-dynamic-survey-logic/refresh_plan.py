from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path


PLACEHOLDER_RE = re.compile(r"NEEDS CLARIFICATION|\[FEATURE\]|\[DATE\]|\[###-feature", re.IGNORECASE)


def _run_setup_plan(repo_root: Path) -> dict:
    script = repo_root / ".specify" / "scripts" / "bash" / "setup-plan.sh"
    if not script.exists():
        raise FileNotFoundError(f"Missing setup-plan script: {script}")

    res = subprocess.run([str(script), "--json"], cwd=str(repo_root), text=True, capture_output=True)
    stdout = (res.stdout or "").strip()

    # The script may print human-readable lines; JSON is on the last JSON-looking line.
    lines = [ln for ln in stdout.splitlines() if ln.strip()]
    json_line = next(
        (ln for ln in reversed(lines) if ln.lstrip().startswith("{") and ln.rstrip().endswith("}")),
        None,
    )
    if not json_line:
        preview = "\n".join(lines[:20])
        raise RuntimeError(
            "setup-plan.sh --json did not produce a JSON line. "
            f"exit_code={res.returncode}\nstdout_preview=\n{preview}\n"
        )

    try:
        return json.loads(json_line)
    except json.JSONDecodeError as e:
        raise RuntimeError(f"Failed to parse JSON line: {json_line}") from e


def _rewrite_plan(spec_dir: Path) -> None:
    rewrite = spec_dir / "_rewrite_plan.py"
    if not rewrite.exists():
        raise FileNotFoundError(f"Missing plan rewrite script: {rewrite}")

    res = subprocess.run([sys.executable, str(rewrite)], cwd=str(spec_dir), text=True, capture_output=True)
    if res.returncode != 0:
        raise RuntimeError(
            "_rewrite_plan.py failed. "
            f"exit_code={res.returncode}\nstderr=\n{res.stderr}\nstdout=\n{res.stdout}"
        )


def _verify_no_placeholders(plan_path: Path) -> None:
    text = plan_path.read_text(encoding="utf-8")
    m = PLACEHOLDER_RE.search(text)
    if m:
        raise RuntimeError(f"plan.md still contains placeholder text: {m.group(0)}")


def main() -> None:
    repo_root = Path(__file__).resolve().parents[2]
    obj = _run_setup_plan(repo_root)

    spec_dir = Path(obj["SPECS_DIR"]).resolve()
    plan_path = Path(obj["IMPL_PLAN"]).resolve()

    # setup-plan overwrites plan.md with a template; immediately restore the curated plan.
    _rewrite_plan(spec_dir)
    _verify_no_placeholders(plan_path)

    print("OK: plan refreshed and verified")
    for k in ["BRANCH", "FEATURE_SPEC", "IMPL_PLAN", "SPECS_DIR", "HAS_GIT"]:
        print(f"{k}={obj.get(k)}")


if __name__ == "__main__":
    main()
