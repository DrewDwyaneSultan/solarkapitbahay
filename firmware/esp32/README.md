# ESP32 + MQTT for SolarKapitBahay

The web app **Settings → MQTT** fields are UI-only for now. This folder is your **hardware starting point**.

## What you need

| Item | Notes |
|------|--------|
| ESP32 dev board | ESP32-WROOM-32 or similar |
| USB cable | Data-capable |
| Arduino IDE | Already installed |
| Wi‑Fi | Same network as your PC |
| MQTT broker | Mosquitto on PC, or free [HiveMQ Cloud](https://www.hivemq.com/mqtt-cloud-broker/) |

## 1602 LCD Keypad Shield (your hardware)

**Not I2C** — use **LiquidCrystal** (built-in library), not LiquidCrystal I2C.

See **`LCD_Keypad_Shield_Wiring.md`** for pin table.

| Board | Sketch folder |
|-------|----------------|
| House A | `SolarKapitBahay_ESP32_A1/` |
| House B | `SolarKapitBahay_ESP32_B2/` |

LCD example:

```
House A ONLINE
S: 180 L:  81W
```

Confirm GPIO wiring with your friends, then edit `LCD_RS`, `LCD_EN`, `LCD_D4`… in the sketch.

---

## Arduino IDE setup (one time)

1. **File → Preferences → Additional boards manager URLs** — add:
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
2. **Tools → Board → Boards Manager** — search **esp32**, install **esp32 by Espressif**.
3. **Tools → Board** → pick your board (e.g. **ESP32 Dev Module**).
4. **Sketch → Include Library → Manage Libraries** — install:
   - **PubSubClient** (Nick O'Leary)
   - **ArduinoJson** (optional, for richer payloads)

5. Open `SolarKapitBahay_ESP32_MQTT.ino`, edit Wi‑Fi and MQTT at the top, upload.

## MQTT broker on your PC (easiest for lab)

**Option A — Mosquitto (Windows)**

1. Install: https://mosquitto.org/download/
2. Run broker (default port **1883**).
3. In the sketch set:
   - `MQTT_SERVER` = your PC’s LAN IP (e.g. `192.168.1.100`)
   - `MQTT_PORT` = `1883`

**Option B — HiveMQ Cloud (no install)**

1. Create free cluster at hivemq.com
2. Copy host, port, username, password into the sketch.

## Topic layout (matches app mock data)

| Topic | Direction | Payload example |
|-------|-----------|-----------------|
| `solarkapitbahay/+/telemetry` | ESP32 → broker | `{"house":"House A","solar_w":180,"load_w":80,"relay":true}` |
| `solarkapitbahay/+/status` | ESP32 → broker | `online` / `offline` |
| `solarkapitbahay/+/command` | broker → ESP32 | `{"relay":true}` |

Replace `+` with device id, e.g. `solarkapitbahay/ESP32_A1/telemetry`.

## Test without the web app

1. Upload sketch to ESP32.
2. Open **Arduino Serial Monitor** (115200 baud) — confirm Wi‑Fi + MQTT connected.
3. Use **MQTT Explorer** (free): https://mqtt-explorer.com  
   - Connect to same broker  
   - Subscribe to `solarkapitbahay/#`  
   - You should see messages every few seconds.

## Connect to SolarKapitBahay (later)

Planned path:

1. ESP32 publishes telemetry → MQTT broker  
2. Python backend subscribes (e.g. `paho-mqtt`) → stores latest readings  
3. Frontend polls API or uses WebSocket → replaces `useLiveData.js` mock data  

Not implemented in `backend/` yet — Greedy simulation only.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Wi‑Fi fails | 2.4 GHz only; check SSID/password |
| MQTT connection refused | Broker running? Correct IP/port? Firewall allow 1883 |
| Publish works, app empty | Expected until backend MQTT bridge is built |
| Board not found | Install CP210x/CH340 USB driver for your ESP32 |
