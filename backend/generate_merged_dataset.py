"""
Build data/merged_household_dataset.csv from PVGIS-style simulation (Colab parity).

Run from repo root:
  python backend/generate_merged_dataset.py

Replace the CSV with your real merged dataset — keep column names or update
backend/clustering.py COLUMN_ALIASES.
"""

from __future__ import annotations

import csv
import random
from pathlib import Path

from solar_data import generate_load_profiles, generate_solar_profiles, sample_irradiance

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "merged_household_dataset.csv"

HEAD_NAMES = [
    "Ramon D.", "Linda S.", "Father C.", "Mila G.", "Arnel P.", "Jun P.", "Mina T.",
    "Carlo B.", "Elena V.", "Tito M.", "Nora K.", "Ben L.", "Rosa H.", "Paolo N.",
]


def main(num_households: int = 50, seed: int = 42) -> None:
    rng = random.Random(seed)
    loads, mults = generate_load_profiles(num_households, seed)
    irr = sample_irradiance(seed * 1000)
    solar_profiles = generate_solar_profiles(irr, num_households, seed)
    tiers = ["low" if m < 1.0 else "high" if m > 1.0 else "mid" for m in mults]

    OUT.parent.mkdir(parents=True, exist_ok=True)
    rows = []
    for h in range(num_households):
        for hour in range(24):
            load = loads[h][hour]
            solar = solar_profiles[h][hour]
            net = round(load - solar, 4)
            grid_import = round(max(0.0, net), 4)
            grid_export = round(max(0.0, -net), 4)
            has_battery = rng.random() < 0.55
            cap = rng.uniform(3.0, 10.0) if has_battery else 0.0
            if has_battery:
                soc = max(
                    0.15,
                    min(
                        0.95,
                        0.5
                        - net * 0.08
                        + (0.05 if 11 <= hour <= 14 else -0.02)
                        + rng.uniform(-0.08, 0.08),
                    ),
                )
            else:
                soc = 0.0

            rows.append({
                "household_id": f"HH-{h + 1:02d}",
                "head_name": HEAD_NAMES[h % len(HEAD_NAMES)],
                "purok": f"Purok {(h % 5) + 1}",
                "hour": hour,
                "load_kwh": load,
                "solar_kwh": solar,
                "net_load_kwh": net,
                "battery_soc_pct": round(soc * 100, 1),
                "battery_capacity_kwh": round(cap, 2),
                "grid_import_kwh": grid_import,
                "grid_export_kwh": grid_export,
                "has_battery": int(has_battery),
                "income_tier": tiers[h],
            })

    fieldnames = list(rows[0].keys())
    with OUT.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        w.writerows(rows)

    print(f"Wrote {len(rows)} rows -> {OUT}")


if __name__ == "__main__":
    main()
