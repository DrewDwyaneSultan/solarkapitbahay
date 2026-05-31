"""Simulation constants aligned with the manuscript (Philippine TOU + battery)."""

SHARED_PRICE = 11.0  # PHP/kWh neighbor sharing rate
BATTERY_EFFICIENCY = 0.92
BATTERY_MIN_SOC = 0.20
BATTERY_MAX_SOC = 0.95
SIM_DAYS = 7
HOURS = 24

# Estimated Davao Light TOU (PHP/kWh)
TARIFF_BY_HOUR = {
    **{h: 8.99 for h in range(0, 5)},
    **{h: 10.58 for h in range(5, 18)},
    **{h: 12.70 for h in range(18, 21)},
    **{h: 10.58 for h in range(21, 22)},
    **{h: 8.99 for h in range(22, 24)},
}
