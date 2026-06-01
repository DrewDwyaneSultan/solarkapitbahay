/*
 * SolarKapitBahay — ESP32_B2 + 1602 LCD Keypad Shield + MQTT
 * Same pin wiring as A1 — upload only to House B board.
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <LiquidCrystal.h>

const char* WIFI_SSID     = "SKYFiber_MESH_BEF5";
const char* WIFI_PASSWORD = "548251144";
const char* MQTT_SERVER   = "192.168.55.114";
const uint16_t MQTT_PORT  = 1883;

const char* DEVICE_ID  = "ESP32_B2";
const char* HOUSE_NAME = "House B";

#define LCD_RS  2
#define LCD_EN  4
#define LCD_D4  5
#define LCD_D5  15
#define LCD_D6  16
#define LCD_D7  17
#define LCD_BL  -1   // Bla->5V Blk->GND; or Bla->18 Blk->GND and set LCD_BL 18
#define KEYPAD_PIN -1

LiquidCrystal lcd(LCD_RS, LCD_EN, LCD_D4, LCD_D5, LCD_D6, LCD_D7);
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
  if (LCD_BL >= 0) {
    pinMode(LCD_BL, OUTPUT);
    digitalWrite(LCD_BL, HIGH);
  }
  lcd.begin(16, 2);
  lcdShow("SolarKapitBahay", DEVICE_ID);
  delay(800);
}

const char* readKeypad() {
  if (KEYPAD_PIN < 0) return "";
  int v = analogRead(KEYPAD_PIN);
  if (v > 1000) return "";
  if (v < 50) return "SEL";
  if (v < 250) return "L";
  if (v < 450) return "U";
  if (v < 650) return "D";
  if (v < 850) return "R";
  return "?";
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
  lastSolarW = 120.0f + (random(0, 800) / 10.0f);
  lastLoadW = 60.0f + (random(0, 400) / 10.0f);
  float batteryPct = 45.0f + (random(0, 300) / 10.0f);

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
  if (KEYPAD_PIN >= 0) analogSetPinAttenuation(KEYPAD_PIN, ADC_11db);

  initLcd();
  buildTopics();
  connectWiFi();
  connectMqtt();
  updateLcdLive("ONLINE");
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) connectWiFi();
  if (!mqtt.connected()) connectMqtt();
  mqtt.loop();

  const char* key = readKeypad();
  if (key[0] != '\0') {
    char line2[17];
    snprintf(line2, sizeof(line2), "Key: %s", key);
    lcdShow(HOUSE_NAME, line2);
    delay(300);
    updateLcdLive("ONLINE");
  }

  if (millis() - lastPublishMs >= PUBLISH_INTERVAL_MS) {
    lastPublishMs = millis();
    publishTelemetry();
  }
}
