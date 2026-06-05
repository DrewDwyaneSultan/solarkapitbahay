"""Legacy household dict builder — simulation uses solar_data + greedy directly."""

from solar_data import generate_load_profiles, generate_solar_profiles, sample_irradiance

__all__ = [
    "generate_households",
    "generate_load_profiles",
    "generate_solar_profiles",
    "sample_irradiance",
]


def generate_households(count: int, seed: int = 42, days: int = 30) -> list[dict]:
    loads, mults = generate_load_profiles(count, seed)
    households = []
    for i in range(count):
        profiles = []
        for day in range(days):
            irr = sample_irradiance(seed * 1000 + day)
            solar_day = generate_solar_profiles(irr, count, seed + day)
            profiles.append({"load": loads[i], "solar": solar_day[i]})
        tier = "mid"
        if mults[i] < 1.0:
            tier = "low"
        elif mults[i] > 1.0:
            tier = "high"
        households.append({
            "id": f"HH-{i + 1:02d}",
            "tier": tier,
            "has_solar": any(s > 0 for p in profiles for s in p["solar"]),
            "panel_kw": 0.0,
            "profiles": profiles,
        })
    return households
