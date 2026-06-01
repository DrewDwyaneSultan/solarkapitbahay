/*
 * SolarKapitBahay — ESP32 MQTT telemetry (starter sketch)
 *
 * Libraries (Arduino Library Manager):
 *   - PubSubClient
 *   - WiFi (built-in with ESP32 board package)
 *
 * Board: ESP32 Dev Module
 * Upload speed: 921600 or 115200 if upload fails
 */

#include <WiFi.h>
#include <PubSubClient.h>

// ---------- EDIT THESE ----------
const char* WIFI_SSID     = "SKYFiber_MESH_BEF5";
const char* WIFI_PASSWORD = "548251144";

const char* MQTT_SERVER   = "192.168.55.114";  // PC IP or HiveMQ host
const uint16_t MQTT_PORT    = 1883;
const char* MQTT_USER     = "";               // leave "" if no auth
const char* MQTT_PASSWORD = "";

const char* DEVICE_ID  = "ESP32_A1";
const char* HOUSE_NAME = "House A";
// --------------------------------

WiFiClient wifiClient;
PubSubClient mqtt(wifiClient);

char topicTelemetry[64];
char topicStatus[64];
char topicCommand[64];

unsigned long lastPublishMs = 0;
const unsigned long PUBLISH_INTERVAL_MS = 5000;

bool relayOn = true;

void buildTopics() {
  snprintf(topicTelemetry, sizeof(topicTelemetry), "solarkapitbahay/%s/telemetry", DEVICE_ID);
  snprintf(topicStatus, sizeof(topicStatus), "solarkapitbahay/%s/status", DEVICE_ID);
  snprintf(topicCommand, sizeof(topicCommand), "solarkapitbahay/%s/command", DEVICE_ID);
}

void mqttCallback(char* topic, byte* payload, unsigned long length) {
  Serial.print("MQTT cmd on ");
  Serial.println(topic);
  // Simple: look for "relay":true/false in JSON
  String msg;
  for (unsigned long i = 0; i < length; i++) {
    msg += (char)payload[i];
  }
  if (msg.indexOf("\"relay\":true") >= 0) relayOn = true;
  if (msg.indexOf("\"relay\":false") >= 0) relayOn = false;
}

void connectWiFi() {
  Serial.printf("WiFi: connecting to %s\n", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.print("WiFi OK, IP: ");
  Serial.println(WiFi.localIP());
}

void connectMqtt() {
  mqtt.setServer(MQTT_SERVER, MQTT_PORT);
  mqtt.setCallback(mqttCallback);
  mqtt.setBufferSize(512);

  while (!mqtt.connected()) {
    Serial.print("MQTT: connecting...");
    String clientId = String("skb-") + DEVICE_ID + "-" + String(random(0xffff), HEX);
    bool ok;
    if (strlen(MQTT_USER) > 0) {
      ok = mqtt.connect(clientId.c_str(), MQTT_USER, MQTT_PASSWORD, topicStatus, 0, true, "offline");
    } else {
      ok = mqtt.connect(clientId.c_str(), topicStatus, 0, true, "offline");
    }
    if (ok) {
      Serial.println(" connected");
      mqtt.publish(topicStatus, "online", true);
      mqtt.subscribe(topicCommand);
      Serial.print("Subscribed: ");
      Serial.println(topicCommand);
    } else {
      Serial.print(" failed, rc=");
      Serial.print(mqtt.state());
      Serial.println(" retry in 3s");
      delay(3000);
    }
  }
}

void publishTelemetry() {
  // Simulated sensors — replace with real ADC / INA219 / PZEM reads
  float solarW = 120.0f + (random(0, 800) / 10.0f);
  float loadW  = 60.0f + (random(0, 400) / 10.0f);
  float batteryPct = 45.0f + (random(0, 300) / 10.0f);

  char payload[192];
  snprintf(
    payload, sizeof(payload),
    "{\"device\":\"%s\",\"house\":\"%s\",\"solar_w\":%.1f,\"load_w\":%.1f,\"battery_pct\":%.1f,\"relay\":%s}",
    DEVICE_ID, HOUSE_NAME, solarW, loadW, batteryPct, relayOn ? "true" : "false"
  );

  if (mqtt.publish(topicTelemetry, payload)) {
    Serial.print("Published: ");
    Serial.println(payload);
  } else {
    Serial.println("Publish failed");
  }
}

void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n=== SolarKapitBahay ESP32 MQTT ===");
  randomSeed(esp_random());

  buildTopics();
  connectWiFi();
  connectMqtt();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }
  if (!mqtt.connected()) {
    connectMqtt();
  }
  mqtt.loop();

  unsigned long now = millis();
  if (now - lastPublishMs >= PUBLISH_INTERVAL_MS) {
    lastPublishMs = now;
    publishTelemetry();
  }
}
