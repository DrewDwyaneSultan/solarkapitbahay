# Final working system (team lab build)

## Architecture

**Two independent houses** — each has its own ESP32, solar panel, sensors, relay, LCD, and LED load. They coordinate over **MQTT** on the laptop (Mosquitto).

```
House A                          House B
┌─────────────┐                  ┌─────────────┐
│ Panel → ACS │                  │ Panel → ACS │
│ → V divider │                  │ → V divider │
│ ESP32 A     │◄──── Wi-Fi ────►│ ESP32 B     │
│ Relay 1→LED A                  │ Relay 1→LED B
│ Relay 2─────┼──cross──────────►│ Relay 2     │
│             │◄──cross──────────┼             │
└──────┬──────┘                  └──────┬──────┘
       │         Mosquitto (laptop)      │
       └──────── solar/A/*  solar/B/* ──┘
```

**Shared:** 18650 + booster → row 55 (relay/battery bus), common GND between houses.

## Per-house ESP32 pins

| Pin | Function |
|-----|----------|
| D34 | ACS712 OUT (current) |
| D35 | Voltage divider S |
| D26 | Relay IN1 (own house LED) |
| D27 | Relay IN2 (transfer to other house) |
| D21 | LCD SDA |
| D22 | LCD SCL |
| VIN | 5V rail (ACS712 VCC, LCD VCC) |
| GND | Common ground |

Relay **LOW = ON** (active-low). JD-VCC covered; relay VCC on row 55/60.

## Greedy / transfer logic (in firmware)

| Condition | Relay 1 | Relay 2 |
|-----------|---------|---------|
| Solar V ≥ 1.0 V | ON (own LED) | — |
| Solar V ≥ 3.0 V + other house **DEFICIT** | — | ON (transfer) |
| Receiving from other house (`transfer=SENDING`) | ON (own LED) | — |

House A publishes `solar/A/*`, listens to `solar/B/status` and `solar/B/transfer`. House B is mirrored.

## MQTT topics

| Topic | Publisher | Content |
|-------|-----------|---------|
| `solar/A/voltage` | A | volts |
| `solar/A/current` | A | amps |
| `solar/A/wattage` | A | watts |
| `solar/A/status` | A | SURPLUS / DEFICIT |
| `solar/A/transfer` | A | SENDING / STOPPED |
| `solar/B/...` | B | same pattern |

**MQTT Explorer:** subscribe to `solar/#`

## Sketches in repo

| Folder | Upload to |
|--------|-----------|
| `House_A/House_A.ino` | ESP32 House A |
| `House_B/House_B.ino` | ESP32 House B |

**Broker IP:** `ipconfig` → Wi-Fi IPv4 (currently **192.168.55.113**). Update `mqttBroker` in both sketches if it changes.

## Laptop setup

1. Mosquitto running (port 1883)
2. Same Wi-Fi as both ESP32s
3. Firewall allows 1883 if needed

## Not yet implemented

- Battery % on LCD (D32 + divider when module arrives)
- Web app / backend MQTT bridge (`solar/A/*` → React dashboard)

## Old sketches (archive)

Earlier experiments (`SolarKapitBahay_ESP32_A1`, Controller, DisplayHub, etc.) are superseded by `House_A` / `House_B` for this wiring.
