# MQTT broker setup (Windows) — SolarKapitBahay

Recreate your lab broker if you reinstall Mosquitto or move to another PC.

## Quick status on your PC (check anytime)

```powershell
# Wi-Fi IP for ESP32 sketches (use the Wi-Fi adapter, not 192.168.56.x VirtualBox)
ipconfig

# Mosquitto service
Get-Service mosquitto

# Port listening?
netstat -an | findstr 1883
```

**ESP32 sketch setting:** `MQTT_SERVER` = your **Wi-Fi IPv4** (e.g. `192.168.55.114`), `MQTT_PORT` = `1883`.

ESP32 and PC must be on the **same Wi‑Fi**.

---

## Install Mosquitto (if missing)

1. Download: https://mosquitto.org/download/
2. Install (include **Service** so it starts automatically).
3. Edit config (run Notepad **as Administrator**):

   `C:\Program Files\mosquitto\mosquitto.conf`

4. Add at the **end** of the file (required for ESP32 on your LAN):

   ```
   listener 1883 0.0.0.0
   allow_anonymous true
   ```

5. Restart broker:

   ```powershell
   Restart-Service mosquitto
   ```

6. Confirm:

   ```powershell
   netstat -an | findstr 1883
   ```

   You should see `0.0.0.0:1883` **LISTENING**.

---

## Windows Firewall (if ESP32 stuck on MQTT...)

Allow inbound **TCP 1883** for **Mosquitto** or create a rule:

- Windows Security → Firewall → Advanced → Inbound Rules → New Rule
- Port → TCP → **1883** → Allow → name: `MQTT Mosquitto`

---

## MQTT Explorer (PC test tool)

1. Download: https://mqtt-explorer.com
2. New connection:
   - **Host:** `192.168.55.114` (your `ipconfig` Wi‑Fi IP)
   - **Port:** `1883`
   - **Username/Password:** leave empty (anonymous)
3. Connect → subscribe to `solarkapitbahay/#`

After ESP32 A1 is running you should see:

| Topic | Example |
|-------|---------|
| `solarkapitbahay/ESP32_A1/telemetry` | JSON solar/load |
| `solarkapitbahay/ESP32_A1/status` | `online` |

---

## ESP32 sketches

| File | Device |
|------|--------|
| `SolarKapitBahay_ESP32_A1/...ino` | House A |
| `SolarKapitBahay_ESP32_B2/...ino` | House B |

Edit top of file:

```cpp
const char* MQTT_SERVER = "192.168.55.114";  // your PC Wi-Fi IP
const uint16_t MQTT_PORT = 1883;
```

LCD should show: `WiFi OK` → `MQTT OK` → `House A ONLINE`.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| LCD stuck `MQTT...` | Restart Mosquitto; check IP; firewall 1883; same Wi‑Fi |
| MQTT Explorer can’t connect | Use Wi‑Fi IP not `127.0.0.1` when testing from same PC is OK with localhost — ESP32 needs LAN IP |
| `rc=-2` (ESP32) | Broker not reachable — wrong IP or firewall |
| Was working, IP changed | Run `ipconfig`, update `MQTT_SERVER`, re-upload sketch |

---

## Optional: test broker from PC

```powershell
& "C:\Program Files\mosquitto\mosquitto_pub.exe" -h 127.0.0.1 -t "solarkapitbahay/test" -m "hello"
```

Use MQTT Explorer on topic `solarkapitbahay/test` to see the message.
