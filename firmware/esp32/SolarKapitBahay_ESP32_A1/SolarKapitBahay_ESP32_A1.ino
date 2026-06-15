/*
 * SolarKapitBahay — ESP32_A1 + 16x2 I2C LCD + MQTT
 *
 * LCD wiring: GND, VCC->VIN, SDA->21, SCL->22
 * Libraries: PubSubClient, LiquidCrystal I2C (Frank de Brabander)
 * Run I2C_Scanner first; set LCD_I2C_ADDR (0x27 or 0x3F).
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include "SolarKapitBahay_Sensors.h"

// ---------- Wi-Fi / broker ----------
const char* WIFI_SSID     = "SKYFiber_MESH_BEF5";
const char* WIFI_PASSWORD = "548251144";
const char* MQTT_SERVER   = "192.168.55.114";
const uint16_t MQTT_PORT  = 1883;

const char* DEVICE_ID  = "ESP32_A1";
const char* HOUSE_NAME = "House A";
// ------------------------------------

#define I2C_SDA 21
#define I2C_SCL 22
#define LCD_I2C_ADDR 0x27   // 0x3F if I2C_Scanner says so

LiquidCrystal_I2C lcd(LCD_I2C_ADDR, 16, 2);
WiFiClient wifiClient;
PubSubClient mqtt(wifiClient);

char topicTelemetry[64];
char topicStatus[64];
char topicCommand[64];

unsigned long lastPublishMs = 0;
const unsigned long PUBLISH_INTERVAL_MS = 5000;

bool relayOn = true;
float lastSolarW = 0;
float lastLoadW = 0;

void buildTopics() {
  snprintf(topicTelemetry, sizeof(topicTelemetry), "solarkapitbahay/%s/telemetry", DEVICE_ID);
  snprintf(topicStatus, sizeof(topicStatus), "solarkapitbahay/%s/status", DEVICE_ID);
  snprintf(topicCommand, sizeof(topicCommand), "solarkapitbahay/%s/command", DEVICE_ID);
}

void lcdShow(const char* line1, const char* line2) {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print(line1);
  lcd.setCursor(0, 1);
  lcd.print(line2);
}

void initLcd() {
  Wire.begin(I2C_SDA, I2C_SCL);
  lcd.init();
  lcd.backlight();
  lcdShow("SolarKapitBahay", DEVICE_ID);
  delay(800);
}

void updateLcdLive(const char* status) {
  char line1[17];
  char line2[17];
  snprintf(line1, sizeof(line1), "%s %s", HOUSE_NAME, status);
  snprintf(line2, sizeof(line2), "S:%4.0f L:%4.0fW", lastSolarW, lastLoadW);
  lcdShow(line1, line2);
}

void mqttCallback(char* topic, byte* payload, unsigned long length) {
  String msg;
  for (unsigned long i = 0; i < length; i++) msg += (char)payload[i];
  if (msg.indexOf("\"relay\":true") >= 0) relayOn = true;
  if (msg.indexOf("\"relay\":false") >= 0) relayOn = false;
}

void connectWiFi() {
  lcdShow(HOUSE_NAME, "WiFi...");
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) delay(500);
  lcdShow(HOUSE_NAME, "WiFi OK");
  delay(400);
}

void connectMqtt() {
  mqtt.setServer(MQTT_SERVER, MQTT_PORT);
  mqtt.setCallback(mqttCallback);
  mqtt.setBufferSize(512);
  while (!mqtt.connected()) {
    lcdShow(HOUSE_NAME, "MQTT...");
    String clientId = String("skb-") + DEVICE_ID + "-" + String(random(0xffff), HEX);
    if (mqtt.connect(clientId.c_str(), topicStatus, 0, true, "offline")) {
      mqtt.publish(topicStatus, "online", true);
      mqtt.subscribe(topicCommand);
      lcdShow(HOUSE_NAME, "MQTT OK");
      delay(400);
    } else {
      delay(3000);
    }
  }
}

void publishTelemetry() {
  float batteryPct = 0.0f;
  skbReadPower(lastSolarW, lastLoadW, batteryPct);

  char payload[192];
  snprintf(
    payload, sizeof(payload),
    "{\"device\":\"%s\",\"house\":\"%s\",\"solar_w\":%.1f,\"load_w\":%.1f,\"battery_pct\":%.1f,\"relay\":%s}",
    DEVICE_ID, HOUSE_NAME, lastSolarW, lastLoadW, batteryPct, relayOn ? "true" : "false"
  );

  if (mqtt.publish(topicTelemetry, payload)) {
    Serial.println(payload);
    updateLcdLive("ONLINE");
  } else {
    updateLcdLive("PUB ERR");
  }
}

void setup() {
  Serial.begin(115200);
  randomSeed(esp_random());
  initLcd();
  skbInitSensors();
  buildTopics();
  connectWiFi();
  connectMqtt();
  updateLcdLive("ONLINE");
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) connectWiFi();
  if (!mqtt.connected()) connectMqtt();
  mqtt.loop();

  if (millis() - lastPublishMs >= PUBLISH_INTERVAL_MS) {
    lastPublishMs = millis();
    publishTelemetry();
  }
}
