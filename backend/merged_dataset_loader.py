"""
Load data/csvmerged2 (1).txt — rural Davao hourly merged dataset.

The file is 24 hourly rows (PVGIS + load bands). Metadata specifies 15 households
with uniform load variation between load_min_kw and load_max_kw per hour.

This module expands those rows into per-household records for clustering.
"""

from __future__ import annotations

import csv
import random
import re
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
BACKEND_DATA = Path(__file__).resolve().parent / "data"
MERGED_TXT = ROOT / "data" / "csvmerged2 (1).txt"
BUNDLED_TXT = BACKEND_DATA / "rural_davao_merged.txt"


def resolve_dataset_path() -> Path | None:
    """Find merged dataset — bundled copy first (Vercel), then repo data/."""
    candidates = [
        BUNDLED_TXT,
        MERGED_TXT,
        ROOT / "data" / "merged_household_dataset.csv",
    ]
    for path in candidates:
        if path.is_file():
            return path
    return None

# From file metadata (lines 33–40)
NUM_HOUSEHOLDS = 15
BATTERY_CAPACITY_KWH = 1.5
BATTERY_EFFICIENCY = 0.90
BATTERY_MIN_SOC = 0.20
BATTERY_MAX_SOC = 0.95
INITIAL_SOC = 1.0

HEAD_NAMES = [
    "Ramon D.", "Linda S.", "Father C.", "Mila G.", "Arnel P.",
    "Jun P.", "Mina T.", "Carlo B.", "Elena V.", "Tito M.",
    "Nora K.", "Ben L.", "Rosa H.", "Paolo N.", "Dina W.",
]


def _parse_metadata_num(text: str, key: str, default: float) -> float:
    m = re.search(rf"{re.escape(key)}\s*=\s*([\d.]+)", text, re.I)
    return float(m.group(1)) if m else default


def parse_hourly_rows(path: Path) -> list[dict[str, str]]:
    lines = path.read_text(encoding="utf-8").splitlines()
    data_lines = [ln for ln in lines if ln.strip() and not ln.strip().startswith("#")]
    if not data_lines:
        return []
    reader = csv.DictReader(data_lines)
    return list(reader)


def _f(row: dict[str, str], key: str) -> float:
    try:
        return float(row.get(key) or 0)
    except ValueError:
        return 0.0


def _simulate_soc(hourly_net_surplus: list[float]) -> tuple[float, list[float]]:
    """Hourly net = solar - load (kWh). Returns (final_soc_pct, soc_trace)."""
    soc = INITIAL_SOC
    cap = BATTERY_CAPACITY_KWH
    trace: list[float] = []

    for net in hourly_net_surplus:
        if net > 0:
            room = (BATTERY_MAX_SOC - soc) * cap
            charge = min(net * BATTERY_EFFICIENCY, room)
            soc += charge / cap
        else:
            deficit = -net
            avail = (soc - BATTERY_MIN_SOC) * cap
            discharge = min(deficit / BATTERY_EFFICIENCY, avail)
            soc -= discharge / cap
        soc = max(BATTERY_MIN_SOC, min(BATTERY_MAX_SOC, soc))
        trace.append(round(soc * 100, 1))

    return round(soc * 100, 1), trace


def expand_to_household_rows(
    path: Path | None = None,
    num_households: int = NUM_HOUSEHOLDS,
    seed: int = 42,
    id_prefix: str = "HH",
) -> list[dict[str, str]]:
    src = path or resolve_dataset_path()
    if src is None or not src.is_file():
        return []

    hourly = parse_hourly_rows(src)
    if not hourly:
        return []

    rows: list[dict[str, str]] = []
    for h_idx in range(num_households):
        rng = random.Random(seed + h_idx * 97)
        hid = f"{id_prefix}-{h_idx + 1:02d}"
        hourly_surplus: list[float] = []
        hourly_load: list[float] = []
        hourly_solar: list[float] = []

        for row in hourly:
            load = round(rng.uniform(_f(row, "load_min_kw"), _f(row, "load_max_kw")), 4)
            solar = _f(row, "solar_power_kw")
            net_surplus = solar - load
            net_load = load - solar
            grid_import = max(0.0, net_load)
            grid_export = max(0.0, -net_load)

            hourly_surplus.append(net_surplus)
            hourly_load.append(load)
            hourly_solar.append(solar)

            rows.append({
                "household_id": hid,
                "head_name": HEAD_NAMES[h_idx % len(HEAD_NAMES)],
                "purok": f"Purok {(h_idx % 5) + 1}",
                "hour": row.get("hour", ""),
                "load_kwh": str(load),
                "solar_kwh": str(round(solar, 4)),
                "net_load_kwh": str(round(net_load, 4)),
                "grid_import_kwh": str(round(grid_import, 4)),
                "grid_export_kwh": str(round(grid_export, 4)),
                "tou_period": row.get("tou_period", ""),
                "tou_rate_php": row.get("tou_rate_php", ""),
                "has_battery": "1",
                "income_tier": "low" if h_idx < 3 else "high" if h_idx >= 12 else "mid",
            })

        final_soc, soc_trace = _simulate_soc(hourly_surplus)
        # Attach running SOC to each hour row for this household
        base = len(rows) - 24
        for i, soc in enumerate(soc_trace):
            rows[base + i]["battery_soc_pct"] = str(soc)
        rows[base + 23]["battery_soc_pct"] = str(final_soc)

    return rows


def dataset_info(path: Path | None = None) -> dict[str, Any]:
    src = path or resolve_dataset_path()
    meta = src.read_text(encoding="utf-8") if src and src.is_file() else ""
    return {
        "dataset_id": "rural_davao_energy_dataset_v2",
        "source_file": str(src) if src else "",
        "households": NUM_HOUSEHOLDS,
        "hourly_rows": 24,
        "battery_capacity_kwh": _parse_metadata_num(meta, "battery_capacity_kwh", 22.5),
        "location": "Davao City, Philippines",
    }
