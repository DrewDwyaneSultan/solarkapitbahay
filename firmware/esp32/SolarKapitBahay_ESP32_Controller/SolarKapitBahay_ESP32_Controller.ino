/*
 * ESP32 #1 — Controller ("brain")
 *
 * Reads solar V (D35) + I (D34), runs Greedy, drives relays D26/D27,
 * publishes MQTT for ESP32 #2 displays + laptop.
 *
 * Wiring per CIRCUIT_ARCHITECTURE.md
 * Relay IN: LOW = ON (active-low module)
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include "SolarKapitBahay_Sensors.h"

const char* WIFI_SSID     = "SKYFiber_MESH_BEF5";
const char* WIFI_PASSWORD = "548251144";
const char* MQTT_SERVER   = "192.168.55.114";
const uint16_t MQTT_PORT  = 1883;

#define RELAY_PIN_HOUSE_A  26   // D26 -> relay IN1
#define RELAY_PIN_HOUSE_B  27   // D27 -> relay IN2
#define RELAY_ACTIVE_LOW   1    // LOW = LED on

// Tune after bench test (cover panel / lamp on panel)
#define WATTS_BOTH_HOUSES   4.0f   // enough for A + B
#define WATTS_HOUSE_A_ONLY  1.5f   // enough for A only

#define LOOP_MS  2000

const char* TOPIC_TELEMETRY = "solarkapitbahay/controller/telemetry";
const char* TOPIC_STATUS    = "solarkapitbahay/controller/status";

WiFiClient wifiClient;
PubSubClient mqtt(wifiClient);

bool houseAOn = false;
bool houseBOn = false;
float lastVolts = 0;
float lastAmps = 0;
float lastWatts = 0;

void setRelay(int pin, bool on) {
#if RELAY_ACTIVE_LOW
  digitalWrite(pin, on ? LOW : HIGH);
#else
  digitalWrite(pin, on ? HIGH : LOW);
#endif
}

void applyGreedy(float solarW) {
  houseAOn = false;
  houseBOn = false;

  if (solarW >= WATTS_BOTH_HOUSES) {
    houseAOn = true;
    houseBOn = true;
  } else if (solarW >= WATTS_HOUSE_A_ONLY) {
    houseAOn = true;
    houseBOn = false;
  }

  setRelay(RELAY_PIN_HOUSE_A, houseAOn);
  setRelay(RELAY_PIN_HOUSE_B, houseBOn);
}

void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println(" OK");
}

void connectMqtt() {
  mqtt.setServer(MQTT_SERVER, MQTT_PORT);
  mqtt.setBufferSize(512);
  while (!mqtt.connected()) {
    Serial.print("MQTT...");
    String id = String("skb-ctrl-") + String(random(0xffff), HEX);
    if (mqtt.connect(id.c_str(), TOPIC_STATUS, 0, true, "offline")) {
      mqtt.publish(TOPIC_STATUS, "online", true);
      Serial.println(" OK");
    } else {
      Serial.print(" fail ");
      Serial.println(mqtt.state());
      delay(3000);
    }
  }
}

void publishState() {
  char payload[256];
  snprintf(
    payload, sizeof(payload),
    "{\"solar_v\":%.2f,\"solar_a\":%.3f,\"solar_w\":%.2f,"
    "\"house_a\":%s,\"house_b\":%s,\"greedy\":\"ok\"}",
    lastVolts, lastAmps, lastWatts,
    houseAOn ? "true" : "false",
    houseBOn ? "true" : "false"
  );
  mqtt.publish(TOPIC_TELEMETRY, payload);
  Serial.println(payload);
}

void setup() {
  Serial.begin(115200);
  randomSeed(esp_random());

  pinMode(RELAY_PIN_HOUSE_A, OUTPUT);
  pinMode(RELAY_PIN_HOUSE_B, OUTPUT);
  setRelay(RELAY_PIN_HOUSE_A, false);
  setRelay(RELAY_PIN_HOUSE_B, false);

  skbInitSensors();
  connectWiFi();
  connectMqtt();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) connectWiFi();
  if (!mqtt.connected()) connectMqtt();
  mqtt.loop();

  static unsigned long lastMs = 0;
  if (millis() - lastMs >= LOOP_MS) {
    lastMs = millis();
    skbReadSolar(lastVolts, lastAmps, lastWatts);
    applyGreedy(lastWatts);
    publishState();
  }
}
