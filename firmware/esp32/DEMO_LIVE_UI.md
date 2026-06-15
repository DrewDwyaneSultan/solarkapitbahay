# Demo script — shade A, sun on B → LCD + web app + MQTT

Skip battery % for this demo. Circuit + battery + booster can stay connected.

---

## Before the demo (15 min setup)

### 1. Laptop

```powershell
# Wi-Fi IP for ESP32 sketches (update mqttBroker in House_A / House_B)
ipconfig
# Use Wi-Fi IPv4 e.g. 192.168.55.113

# Mosquitto running
Get-Service mosquitto

# Install backend MQTT client (once)
cd backend
pip install -r requirements.txt
```

### 2. Start backend + frontend

**Terminal 1:**
```powershell
cd backend
python -m uvicorn main:app --reload --port 8000
```

Check: http://127.0.0.1:8000/api/live/status → `"connected": true`

**Terminal 2:**
```powershell
npm run dev
```

Open: http://localhost:5173 → login → **Energy Transfer** + **Settings**

### 3. ESP32s (both USB to laptop)

| Board | Sketch | `mqttBroker` in code |
|-------|--------|----------------------|
| House A | `firmware/esp32/House_A/House_A.ino` | laptop Wi-Fi IP |
| House B | `firmware/esp32/House_B/House_B.ino` | same IP |

Same Wi-Fi as laptop. LCD shows V, C, W, SURPLUS/DEFICIT.

### 4. Optional — MQTT Explorer

- Host: laptop Wi-Fi IP, port **1883**
- Subscribe: `solar/#`

---

## Demo flow (5–10 min)

### Scene 1 — Both online

1. Power both ESP32s (USB).
2. **Settings** → Last ESP32 message updates within ~2 s.
3. **Energy Transfer** → green dot **Live MQTT**.
4. **Registered Devices** → House A & B **Online**.

### Scene 2 — House B in deficit (shade B)

1. **Cover House B solar panel** (or move indoors).
2. Watch **House B LCD** → **DEFICIT**, relay off, LED B dims.
3. **MQTT Explorer** → `solar/B/status` = `DEFICIT`.
4. **Web app** → House B card shows **DEFICIT**, surplus 0.

### Scene 3 — House A surplus (sun on A)

1. **Full sun on House A panel**.
2. **House A LCD** → SURPLUS, higher W.
3. **MQTT** → `solar/A/status` = `SURPLUS`, wattage rising.

### Scene 4 — Transfer A → B

When **A voltage ≥ 3 V** (TRANSFER_VOLTAGE in sketch) and **B is DEFICIT**:

1. **House A LCD** flashes **TRANSFERRING! / A --> B ENERGY!**
2. **House A relay 2** closes → **House B LED** may light (cross-wire).
3. **MQTT** → `solar/A/transfer` = `SENDING`
4. **Web app** → Recent Transfers shows **House A → House B**
5. **House B LCD** may show **RECEIVING! / B <-- A**

### Scene 5 — Reverse (optional)

1. Shade A, sun on B.
2. B sends to A when B has surplus and A is DEFICIT.

### Scene 6 — Stop transfer

1. Shade A or give B sun until B = SURPLUS.
2. `solar/A/transfer` → `STOPPED`
3. Transfer log entry complete in web UI.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Web shows mock data | Backend not running on :8000 |
| Bridge not connected | `Get-Service mosquitto`; restart service |
| ESP32 MQTT fail | Wrong `mqttBroker` IP; not same Wi-Fi |
| No transfer | A needs V ≥ 3.0 and B must be DEFICIT |
| Devices offline | No MQTT in 30 s — check ESP32 Serial |

---

## What to say to panel / prof

> "Each house ESP32 measures real solar V, I, and W, classifies SURPLUS or DEFICIT, runs Greedy on-device, and coordinates transfer over MQTT. The laptop broker feeds our FastAPI backend, and the operator dashboard shows live circuit status and transfer history — no battery % yet; that's the next sensor."

---

## Battery

**Leave battery + booster connected** for LED loads when solar is low. No need to remove for this demo.
