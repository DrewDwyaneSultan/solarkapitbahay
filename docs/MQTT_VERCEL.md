# Live MQTT on Vercel

Vercel cannot reach Mosquitto on your laptop (`127.0.0.1`). For the **Energy Transfer** live display on `solarkapitbahay.vercel.app`, use a **cloud MQTT broker** that both ESP32 boards and the API can reach.

## Architecture

```
ESP32 House A/B  ──publish──►  Cloud MQTT broker  ◄──poll──  Vercel /api/live
                                      │
                                      └── (optional) webhook ──► POST /api/mqtt/ingest
```

- **Local dev:** background MQTT subscriber (same as before) when `MQTT_BROKER_HOST` is unset → `127.0.0.1:1883`.
- **Vercel:** each `/api/live` poll connects to the cloud broker for ~2s, ingests `solar/#` messages, caches to Supabase, returns JSON.

## Step 1 — Create a cloud broker (HiveMQ Cloud example)

1. Sign up at [HiveMQ Cloud](https://www.hivemq.com/mqtt-cloud-broker/) (free cluster).
2. Create a cluster → note **host**, **port** (usually `8883`), **username**, **password**.
3. TLS is required on port `8883`.

Other options: EMQX Cloud, CloudMQTT, or Mosquitto on a small VPS.

## Step 2 — Vercel environment variables

Vercel → **Settings → Environment Variables** → add:

| Variable | Example |
|----------|---------|
| `MQTT_BROKER_HOST` | `abc123.s1.eu.hivemq.cloud` |
| `MQTT_BROKER_PORT` | `8883` |
| `MQTT_BROKER_USERNAME` | HiveMQ username |
| `MQTT_BROKER_PASSWORD` | HiveMQ password |
| `MQTT_USE_TLS` | `true` |

Optional:

| Variable | Purpose |
|----------|---------|
| `MQTT_SYNC_TIMEOUT` | Seconds to listen per `/api/live` request (default `1.5`) |
| `MQTT_INGEST_SECRET` | Protects `POST /api/mqtt/ingest` if using broker webhooks |

Redeploy after saving.

## Step 3 — Point ESP32 firmware at the cloud broker

In both `firmware/esp32/House_A/House_A.ino` and `House_B/House_B.ino`, update:

```cpp
const char* MQTT_BROKER = "your-cluster.s1.eu.hivemq.cloud";
const int MQTT_PORT = 8883;
// Add PubSubClient TLS + setCredentials() — see HiveMQ ESP32 guide
```

For a quick lab demo you can keep the laptop broker locally and only switch to cloud when demoing on Vercel.

**Topics stay the same:** `solar/A/*`, `solar/B/*` (see `firmware/esp32/FINAL_SYSTEM.md`).

## Step 4 — Verify

1. `https://YOUR-APP.vercel.app/api/health` → `mqtt_bridge.mode` should be `vercel_poll`, broker host set.
2. Power ESP32s with cloud broker configured → MQTT Explorer on `solar/#` shows messages.
3. Open **Energy Transfer** on Vercel → status badge should show live readings within a few seconds.

## Optional: broker webhook (lower latency)

Instead of poll-on-request, configure your broker to HTTP POST each message to:

```
POST https://YOUR-APP.vercel.app/api/mqtt/ingest
Header: x-mqtt-secret: <MQTT_INGEST_SECRET>
Body: { "topic": "solar/A/wattage", "payload": "142.5" }
```

`/api/live` then reads from the Supabase cache instantly.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `mqtt_broker_not_configured` | Set `MQTT_BROKER_HOST` on Vercel and redeploy |
| Broker offline on Vercel | Check TLS (`8883`), username/password, firewall |
| ESP32 online in Explorer, Vercel offline | ESP32 must use the **same cloud broker**, not laptop IP |
| Stale data | Increase `MQTT_SYNC_TIMEOUT`; ESP32 publish interval ≤ 2s |
| Works locally, not on Vercel | Local uses `127.0.0.1`; Vercel needs cloud broker env vars |
