"""Simulation constants — aligned with notebooks/SolarKapitBahay_Colab_Simulation.py."""

# Davao Light TOU (PHP/kWh)
GRID_PRICE_PEAK = 12.70
GRID_PRICE_MID = 10.58
GRID_PRICE_OFF = 8.99
SHARED_PRICE = 11.0
EXPORT_PRICE = 5.0

# Community battery (LiFePO4)
BATTERY_EFFICIENCY = 0.92
BATTERY_MIN_SOC = 0.20
BATTERY_MAX_SOC = 0.95
BATTERY_MAX_POWER_KW = 30.0

# Household / P2P
MAX_HOUSEHOLD_DRAW_KW = 2.0
HOUSEHOLD_SOLAR_PCT = 0.60
SOLAR_PANEL_KW_RANGE = (1.0, 2.5)

SIM_DAYS_DEFAULT = 30
HOURS = 24

# Greedy deployment (Colab TOPSIS winner — ESP32-only stack)
GREEDY_HARDWARE_COST_PHP = 1500

HARDWARE_COST_BY_ALGO = {
    "greedy": GREEDY_HARDWARE_COST_PHP,
    "lp": 5000,
    "hybrid": 6500,
}


def grid_price(hour: int) -> float:
    if 18 <= hour <= 21:
        return GRID_PRICE_PEAK
    if 5 <= hour <= 17 or hour == 22:
        return GRID_PRICE_MID
    return GRID_PRICE_OFF


def tariff_by_hour() -> dict[int, float]:
    return {h: grid_price(h) for h in range(HOURS)}


# Back-compat alias used elsewhere
TARIFF_BY_HOUR = tariff_by_hour()
