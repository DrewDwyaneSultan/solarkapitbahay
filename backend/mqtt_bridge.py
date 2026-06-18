"""
MQTT subscriber for House A / B firmware topics (solar/A/*, solar/B/*).
Runs in a background thread; latest readings kept in memory for /api/live.
"""

from __future__ import annotations

import os
import threading
from datetime import datetime, timezone
from typing import Any

try:
    import paho.mqtt.client as mqtt
except ImportError:  # pragma: no cover
    mqtt = None  # type: ignore

_lock = threading.Lock()
_max_log = 30

_default_house = {
    "voltage": 0.0,
    "current": 0.0,
    "wattage": 0.0,
    "status": "UNKNOWN",
    "transfer": "STOPPED",
    "battery_voltage": 0.0,
    "battery_percent": 0,
    "battery_status": "UNKNOWN",
    "updated_at": None,
}

_battery_shared = {
    "voltage": 0.0,
    "percent": 0,
    "status": "UNKNOWN",
}

_state: dict[str, Any] = {
    "client_connected": False,
    "broker": None,
    "last_message_at": None,
    "houses": {"A": dict(_default_house), "B": dict(_default_house)},
    "transfer_log": [],
    "_prev_transfer": {"A": "STOPPED", "B": "STOPPED"},
}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _parse_float(payload: str) -> float:
    try:
        return float(payload.strip())
    except ValueError:
        return 0.0


def _house_label(code: str) -> str:
    return "House A" if code == "A" else "House B"


def _other_label(code: str) -> str:
    return "House B" if code == "A" else "House A"


_transfer_active = {"PREPARING", "TRANSFERRING", "SENDING"}


def _on_message(_client: Any, _userdata: Any, msg: Any) -> None:
    topic = msg.topic
    payload = msg.payload.decode("utf-8", errors="replace").strip()
    parts = topic.split("/")
    if len(parts) < 3 or parts[0] != "solar":
        return

    house_code = parts[1].upper()
    if house_code not in ("A", "B"):
        return

    with _lock:
        _state["last_message_at"] = _now_iso()

        # solar/A/battery/percent (House A only — shared community battery)
        if len(parts) == 4 and parts[2].lower() == "battery":
            metric = parts[3].lower()
            if metric == "voltage":
                _battery_shared["voltage"] = _parse_float(payload)
            elif metric == "percent":
                _battery_shared["percent"] = int(_parse_float(payload))
            elif metric == "status":
                _battery_shared["status"] = payload.upper()
            if house_code == "A":
                house = _state["houses"]["A"]
                house["updated_at"] = _state["last_message_at"]
                house["battery_voltage"] = _battery_shared["voltage"]
                house["battery_percent"] = _battery_shared["percent"]
                house["battery_status"] = _battery_shared["status"]
            return

        if len(parts) != 3:
            return

        house = _state["houses"][house_code]
        house["updated_at"] = _state["last_message_at"]
        metric = parts[2].lower()

        if metric == "voltage":
            house["voltage"] = _parse_float(payload)
        elif metric == "current":
            house["current"] = _parse_float(payload)
        elif metric == "wattage":
            house["wattage"] = _parse_float(payload)
        elif metric == "status":
            house["status"] = payload.upper()
        elif metric == "transfer":
            prev = _state["_prev_transfer"][house_code]
            house["transfer"] = payload.upper()
            if house["transfer"] in _transfer_active and prev not in _transfer_active:
                entry = {
                    "time": datetime.now().strftime("%I:%M %p").lstrip("0"),
                    "from": _house_label(house_code),
                    "to": _other_label(house_code),
                    "kw": f"{max(house['wattage'], 0) / 1000:.2f}",
                    "status": house["transfer"],
                }
                _state["transfer_log"].insert(0, entry)
                _state["transfer_log"] = _state["transfer_log"][:_max_log]
            _state["_prev_transfer"][house_code] = house["transfer"]


def _on_connect(client: Any, _userdata: Any, _flags: Any, rc: int, *_args: Any) -> None:
    with _lock:
        _state["client_connected"] = rc == 0
    if rc == 0:
        client.subscribe("solar/#")


def _on_disconnect(_client: Any, _userdata: Any, _rc: int, *_args: Any) -> None:
    with _lock:
        _state["client_connected"] = False


def start_mqtt_bridge() -> dict[str, Any]:
    """Start background MQTT client. Safe to call if broker is down."""
    if os.getenv("VERCEL"):
        return {"started": False, "reason": "mqtt_disabled_on_vercel"}

    host = os.getenv("MQTT_BROKER_HOST", "127.0.0.1")
    port = int(os.getenv("MQTT_BROKER_PORT", "1883"))

    with _lock:
        _state["broker"] = f"{host}:{port}"

    if mqtt is None:
        return {"started": False, "error": "paho-mqtt not installed"}

    if getattr(start_mqtt_bridge, "_started", False):
        return {"started": True, "broker": f"{host}:{port}", "already_running": True}

    try:
        client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id="skb-api-bridge")
    except AttributeError:
        client = mqtt.Client(client_id="skb-api-bridge")

    client.on_connect = _on_connect
    client.on_disconnect = _on_disconnect
    client.on_message = _on_message

    try:
        client.connect(host, port, keepalive=60)
        client.loop_start()
        start_mqtt_bridge._started = True  # type: ignore[attr-defined]
        return {"started": True, "broker": f"{host}:{port}"}
    except Exception as exc:
        return {"started": False, "broker": f"{host}:{port}", "error": str(exc)}


def _is_online(house: dict[str, Any], stale_sec: int = 30) -> bool:
    ts = house.get("updated_at")
    if not ts:
        return False
    try:
        updated = datetime.fromisoformat(ts.replace("Z", "+00:00"))
        age = (datetime.now(timezone.utc) - updated).total_seconds()
        return age <= stale_sec
    except ValueError:
        return False


def _relay_on(house_code: str, house: dict[str, Any], other: dict[str, Any]) -> bool:
    if house.get("status") == "SURPLUS":
        return True
    other_xfer = str(other.get("transfer", "STOPPED")).upper()
    if other_xfer in _transfer_active:
        return True
    return False


def _estimate_load(wattage: float, status: str) -> float:
    """Panel wattage only — rough load for surplus display until battery sensing."""
    if status == "DEFICIT":
        return max(wattage + 50.0, 80.0)
    return max(wattage * 0.45, 10.0)


def get_live_payload() -> dict[str, Any]:
    with _lock:
        ha = dict(_state["houses"]["A"])
        hb = dict(_state["houses"]["B"])
        bat = dict(_battery_shared)
        mqtt_ok = _state["client_connected"]
        broker = _state["broker"]
        last_msg = _state["last_message_at"]
        transfer_log = list(_state["transfer_log"])

    online_a = _is_online(ha)
    online_b = _is_online(hb)

    solar_a = ha["wattage"]
    solar_b = hb["wattage"]
    load_a = _estimate_load(solar_a, ha["status"])
    load_b = _estimate_load(solar_b, hb["status"])

    bat_pct = int(bat.get("percent") or ha.get("battery_percent") or 0)
    bat_v = float(bat.get("voltage") or ha.get("battery_voltage") or 0)
    bat_stat = str(bat.get("status") or ha.get("battery_status") or "UNKNOWN")

    return {
        "mqtt": {
            "connected": mqtt_ok,
            "broker": broker,
            "last_message_at": last_msg,
            "houses_online": int(online_a) + int(online_b),
        },
        "houseA": {
            "name": "House A",
            "voltage": ha["voltage"],
            "current": ha["current"],
            "solar": round(solar_a, 2),
            "load": round(load_a, 1),
            "wattage": round(solar_a, 2),
            "status": ha["status"],
            "transfer": ha["transfer"],
            "relay": _relay_on("A", ha, hb),
            "online": online_a,
            "battery_voltage": bat_v,
            "battery_percent": bat_pct,
            "battery_status": bat_stat,
        },
        "houseB": {
            "name": "House B",
            "voltage": hb["voltage"],
            "current": hb["current"],
            "solar": round(solar_b, 2),
            "load": round(load_b, 1),
            "wattage": round(solar_b, 2),
            "status": hb["status"],
            "transfer": hb["transfer"],
            "relay": _relay_on("B", hb, ha),
            "online": online_b,
            "battery_voltage": bat_v,
            "battery_percent": bat_pct,
            "battery_status": bat_stat,
        },
        "transfer_log": transfer_log,
        "devices": [
            {
                "id": "ESP32_House_A",
                "mac": "—",
                "house": "House A",
                "solar": ha["status"] == "SURPLUS",
                "status": "Online" if online_a else "Offline",
            },
            {
                "id": "ESP32_House_B",
                "mac": "—",
                "house": "House B",
                "solar": hb["status"] == "SURPLUS",
                "status": "Online" if online_b else "Offline",
            },
        ],
        "surplus_sources": [
            {
                "value": "House A",
                "surplus": max(0, round(solar_a - load_a)),
                "status": ha["status"],
            },
            {
                "value": "House B",
                "surplus": max(0, round(solar_b - load_b)),
                "status": hb["status"],
            },
        ],
        "battery": bat_pct if bat_pct > 0 else 54,
        "battery_voltage": bat_v,
        "battery_status": bat_stat,
        "savings": 1250,
        "gridRed": 32,
        "gini": 0.18,
        "co2": 45,
    }


def get_mqtt_status() -> dict[str, Any]:
    with _lock:
        return {
            "connected": _state["client_connected"],
            "broker": _state["broker"],
            "last_message_at": _state["last_message_at"],
            "topic_prefix": "solar/#",
        }
