"""
MQTT subscriber for House A / B firmware topics (solar/A/*, solar/B/*).

Local dev: background thread keeps latest readings in memory.
Vercel: polls the cloud broker on each /api/live request and caches to the database.
"""

from __future__ import annotations

import os
import threading
import time
from datetime import datetime, timezone
from typing import Any

try:
    import paho.mqtt.client as mqtt
except ImportError:  # pragma: no cover
    mqtt = None  # type: ignore

from mqtt_store import load_mqtt_state, save_mqtt_state

_lock = threading.Lock()
_max_log = 30
_sync_debounce_sec = 1.0

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

_last_sync_at = 0.0


def _is_vercel() -> bool:
    return bool(os.getenv("VERCEL"))


def _broker_config() -> dict[str, Any]:
    host = (os.getenv("MQTT_BROKER_HOST") or "").strip()
    port = int(os.getenv("MQTT_BROKER_PORT") or ("8883" if host else "1883"))
    use_tls = os.getenv("MQTT_USE_TLS", "").lower() in ("1", "true", "yes")
    if port == 8883:
        use_tls = True
    return {
        "host": host,
        "port": port,
        "username": (os.getenv("MQTT_BROKER_USERNAME") or "").strip() or None,
        "password": (os.getenv("MQTT_BROKER_PASSWORD") or "").strip() or None,
        "use_tls": use_tls,
        "configured": bool(host),
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


def _snapshot_for_storage() -> dict[str, Any]:
    with _lock:
        return {
            "client_connected": _state["client_connected"],
            "broker": _state["broker"],
            "last_message_at": _state["last_message_at"],
            "houses": {
                "A": dict(_state["houses"]["A"]),
                "B": dict(_state["houses"]["B"]),
            },
            "transfer_log": list(_state["transfer_log"]),
            "_prev_transfer": dict(_state["_prev_transfer"]),
            "battery_shared": dict(_battery_shared),
        }


def _restore_from_storage(data: dict[str, Any]) -> None:
    global _battery_shared
    with _lock:
        _state["client_connected"] = bool(data.get("client_connected"))
        _state["broker"] = data.get("broker")
        _state["last_message_at"] = data.get("last_message_at")
        for code in ("A", "B"):
            saved = (data.get("houses") or {}).get(code)
            if saved:
                _state["houses"][code] = dict(saved)
        _state["transfer_log"] = list(data.get("transfer_log") or [])
        _state["_prev_transfer"] = dict(data.get("_prev_transfer") or {"A": "STOPPED", "B": "STOPPED"})
        bat = data.get("battery_shared")
        if bat:
            _battery_shared = dict(bat)


def _persist_state() -> None:
    try:
        save_mqtt_state(_snapshot_for_storage())
    except Exception:
        pass


def _load_cached_state() -> bool:
    cached = load_mqtt_state()
    if not cached:
        return False
    _restore_from_storage(cached)
    return True


def apply_mqtt_message(topic: str, payload: str) -> None:
    """Apply one MQTT reading (used by subscriber and HTTP ingest)."""
    parts = topic.split("/")
    if len(parts) < 3 or parts[0] != "solar":
        return

    house_code = parts[1].upper()
    if house_code not in ("A", "B"):
        return

    with _lock:
        _state["last_message_at"] = _now_iso()

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


def _on_message(_client: Any, _userdata: Any, msg: Any) -> None:
    apply_mqtt_message(msg.topic, msg.payload.decode("utf-8", errors="replace").strip())


def _on_connect(client: Any, _userdata: Any, _flags: Any, rc: int, *_args: Any) -> None:
    with _lock:
        _state["client_connected"] = rc == 0
    if rc == 0:
        client.subscribe("solar/#")


def _on_disconnect(_client: Any, _userdata: Any, _rc: int, *_args: Any) -> None:
    with _lock:
        _state["client_connected"] = False


def _build_client(client_id: str) -> Any:
    try:
        client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id=client_id)
    except AttributeError:
        client = mqtt.Client(client_id=client_id)
    client.on_connect = _on_connect
    client.on_disconnect = _on_disconnect
    client.on_message = _on_message
    return client


def _configure_client(client: Any, cfg: dict[str, Any]) -> None:
    if cfg["username"]:
        client.username_pw_set(cfg["username"], cfg["password"] or "")
    if cfg["use_tls"]:
        client.tls_set()


def sync_mqtt_from_broker(timeout: float | None = None) -> dict[str, Any]:
    """Connect briefly, ingest retained/live messages, persist, disconnect."""
    cfg = _broker_config()
    if not cfg["configured"]:
        return {"synced": False, "reason": "mqtt_broker_not_configured"}
    if mqtt is None:
        return {"synced": False, "reason": "paho_mqtt_not_installed"}

    wait = timeout
    if wait is None:
        wait = float(os.getenv("MQTT_SYNC_TIMEOUT", "1.5"))

    broker_label = f"{cfg['host']}:{cfg['port']}"
    with _lock:
        _state["broker"] = broker_label

    client_id = f"skb-api-{'vercel' if _is_vercel() else 'sync'}-{int(time.time())}"
    client = _build_client(client_id)
    _configure_client(client, cfg)

    try:
        client.connect(cfg["host"], cfg["port"], keepalive=30)
        client.loop_start()
        time.sleep(max(0.5, wait))
        client.loop_stop()
        client.disconnect()
        _persist_state()
        return {
            "synced": True,
            "broker": broker_label,
            "last_message_at": _state.get("last_message_at"),
        }
    except Exception as exc:
        with _lock:
            _state["client_connected"] = False
        return {"synced": False, "broker": broker_label, "error": str(exc)}


def ensure_fresh_live_data() -> None:
    """On Vercel, poll the cloud broker (debounced) and fall back to DB cache."""
    global _last_sync_at

    if not _is_vercel():
        return

    cfg = _broker_config()
    if not cfg["configured"]:
        _load_cached_state()
        return

    now = time.time()
    if now - _last_sync_at < _sync_debounce_sec:
        return
    _last_sync_at = now

    result = sync_mqtt_from_broker()
    if not result.get("synced"):
        _load_cached_state()


def ingest_mqtt_message(topic: str, payload: str) -> None:
    """HTTP webhook path (optional broker integration)."""
    apply_mqtt_message(topic, payload)
    _persist_state()


def start_mqtt_bridge() -> dict[str, Any]:
    """Start background MQTT client locally; on Vercel use poll-on-request mode."""
    cfg = _broker_config()
    if not cfg["configured"]:
        if _is_vercel():
            _load_cached_state()
            return {"started": False, "reason": "mqtt_broker_not_configured", "mode": "vercel_poll"}
        cfg = {**cfg, "host": "127.0.0.1", "port": 1883, "configured": True}

    broker_label = f"{cfg['host']}:{cfg['port']}"
    with _lock:
        _state["broker"] = broker_label

    if _is_vercel():
        _load_cached_state()
        return {
            "started": False,
            "mode": "vercel_poll",
            "broker": broker_label,
            "reason": "serverless_poll_on_live_request",
        }

    if mqtt is None:
        return {"started": False, "error": "paho-mqtt not installed"}

    if getattr(start_mqtt_bridge, "_started", False):
        return {"started": True, "broker": broker_label, "already_running": True, "mode": "background"}

    client = _build_client("skb-api-bridge")
    _configure_client(client, cfg)

    try:
        client.connect(cfg["host"], cfg["port"], keepalive=60)
        client.loop_start()
        start_mqtt_bridge._started = True  # type: ignore[attr-defined]
        return {"started": True, "broker": broker_label, "mode": "background"}
    except Exception as exc:
        return {"started": False, "broker": broker_label, "error": str(exc)}


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
    if status == "DEFICIT":
        return max(wattage + 50.0, 80.0)
    return max(wattage * 0.45, 10.0)


def get_live_payload() -> dict[str, Any]:
    ensure_fresh_live_data()

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

    houses_online = int(online_a) + int(online_b)
    broker_reachable = bool(broker) and bool(mqtt_ok or houses_online > 0 or last_msg)

    return {
        "mqtt": {
            "connected": broker_reachable,
            "broker": broker,
            "last_message_at": last_msg,
            "houses_online": houses_online,
            "mode": "vercel_poll" if _is_vercel() else "background",
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
            "relay": online_a and _relay_on("A", ha, hb),
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
            "relay": online_b and _relay_on("B", hb, ha),
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
    cfg = _broker_config()
    with _lock:
        return {
            "connected": _state["client_connected"],
            "broker": _state["broker"],
            "last_message_at": _state["last_message_at"],
            "topic_prefix": "solar/#",
            "configured": cfg["configured"],
            "mode": "vercel_poll" if _is_vercel() else "background",
        }
