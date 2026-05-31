"""Synthetic household solar/load profiles for simulation."""

import random
from typing import List

from config import HOURS, SIM_DAYS


def _hourly_load_kwh(income_tier: str, hour: int, rng: random.Random) -> float:
    base = {
        "low": 0.75,
        "mid": 1.0,
        "high": 1.30,
    }[income_tier]

    if hour == 5:
        demand = 0.85
    elif 7 <= hour <= 16:
        demand = 0.14
    elif 18 <= hour <= 21:
        demand = 0.75 if hour == 18 else 0.22
    else:
        demand = 0.10

    varied = demand * base * rng.uniform(0.7, 1.3)
    return round(max(0.05, varied), 3)


def _hourly_solar_kwh(panel_kw: float, hour: int, rng: random.Random) -> float:
    if hour < 5 or hour >= 18:
        return 0.0
    peak = {5: 0.05, 6: 0.15, 7: 0.35, 8: 0.55, 9: 0.70, 10: 0.85, 11: 0.95,
            12: 0.90, 13: 0.75, 14: 0.55, 15: 0.35, 16: 0.15, 17: 0.05}
    factor = peak.get(hour, 0.0) * rng.uniform(0.85, 1.15)
    return round(panel_kw * factor, 3)


def generate_households(count: int, seed: int = 42) -> List[dict]:
    rng = random.Random(seed)
    tiers = (["low"] * max(1, count // 5) + ["mid"] * max(1, (count * 7) // 10)
             + ["high"] * max(1, count // 10))
    while len(tiers) < count:
        tiers.append("mid")
    tiers = tiers[:count]
    rng.shuffle(tiers)

    households = []
    for i in range(count):
        has_solar = rng.random() < 0.60
        panel_kw = rng.uniform(1.0, 2.5) if has_solar else 0.0
        tier = tiers[i]
        profiles = []
        for day in range(SIM_DAYS):
            day_load = [_hourly_load_kwh(tier, h, rng) for h in range(HOURS)]
            day_solar = [_hourly_solar_kwh(panel_kw, h, rng) for h in range(HOURS)]
            profiles.append({"load": day_load, "solar": day_solar})
        households.append({
            "id": f"HH-{i + 1:02d}",
            "tier": tier,
            "has_solar": has_solar,
            "panel_kw": round(panel_kw, 2),
            "profiles": profiles,
        })
    return households
