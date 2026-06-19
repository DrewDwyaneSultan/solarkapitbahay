"""
Live clustering overlay — House A / B from MQTT → charge / discharge / balanced.

Uses same action labels as clustering.py (K-means on CSV). SOC from House A battery
divider (D32) via MQTT topics solar/A/battery/*; shared with House B display.
"""

from __future__ import annotations

from typing import Any

from clustering import ACTION_META
from mqtt_bridge import get_live_payload


def _action_from_live(status: str, wattage: float, net_load_w: float) -> str:
    if status == "DEFICIT" or net_load_w > 20:
        return "charge"
    if status == "SURPLUS" and wattage > 0.2:
        return "discharge"
    return "balanced"


def _live_house_record(code: str, house: dict[str, Any], battery_pct: float) -> dict[str, Any]:
    solar = float(house.get("solar", 0))
    load = float(house.get("load", 0))
    net_w = load - solar
    # Scatter X: net load in kWh-scale (instantaneous proxy from watts)
    net_kwh = net_w / 1000.0
    status = str(house.get("status", "UNKNOWN"))
    wattage = float(house.get("wattage", 0))
    action = _action_from_live(status, wattage, net_w)
    meta = ACTION_META[action]

    return {
        "household_id": f"LIVE-{code}",
        "head_name": house.get("name", f"House {code}"),
        "net_load_kwh": round(net_kwh, 4),
        "battery_soc_pct": round(battery_pct, 1),
        "load_kwh": round(load / 1000.0, 4),
        "solar_kwh": round(solar / 1000.0, 4),
        "grid_import_kwh": round(max(net_w, 0) / 1000.0, 4),
        "scatter_x": round(net_kwh, 4),
        "scatter_y": round(battery_pct, 1),
        "cluster_id": -1,
        "action": action,
        "action_label": meta["label"],
        "action_color": meta["color"],
        "action_description": meta["description"],
        "live": True,
        "online": bool(house.get("online")),
        "mqtt_status": status,
        "transfer": house.get("transfer", "STOPPED"),
        "wattage_w": round(wattage, 2),
        "voltage_v": round(float(house.get("voltage", 0)), 2),
        "current_a": round(float(house.get("current", 0)), 3),
    }


def run_live_clustering() -> dict[str, Any]:
    live = get_live_payload()
    battery_pct = float(live.get("battery") or live.get("battery_percent") or 54)

    households: list[dict[str, Any]] = []
    for code, key in (("A", "houseA"), ("B", "houseB")):
        h = live.get(key) or {}
        if h.get("online"):
            pct = float(h.get("battery_percent") or battery_pct)
            households.append(_live_house_record(code, h, pct))

    summary = {a: sum(1 for h in households if h["action"] == a) for a in ACTION_META}

    return {
        "households": households,
        "summary": summary,
        "mqtt": live.get("mqtt"),
        "source": "mqtt_live",
    }
