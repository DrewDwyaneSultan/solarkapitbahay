/*
 * SolarKapitBahay — ESP32_A1 + 1602 LCD Keypad Shield + MQTT
 *
 * Libraries: PubSubClient (built-in WiFi for ESP32)
 *            LiquidCrystal (built-in with Arduino)
 *
 * 1602 LCD Keypad Shield = parallel HD44780 (NOT I2C).
 * Ask your team which GPIOs they used — edit LCD pins below to match.
 *
 * Common ESP32 wiring (if friends broke out shield pins):
 *   RS -> 19    EN -> 18    D4-D7 -> 23,17,16,15    BL -> 4
 *   Keypad analog -> 34 (optional)
 *
 * Arduino shield silkscreen (UNO): RS=8 EN=9 D4=4 D5=5 D6=6 D7=7 BL=10 KEY=A0
 * Do NOT use GPIO 6-11 on ESP32-WROOM (connected to flash).
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <LiquidCrystal.h>

// ---------- Wi-Fi / broker ----------
const char* WIFI_SSID     = "SKYFiber_MESH_BEF5";
const char* WIFI_PASSWORD = "548251144";
const char* MQTT_SERVER   = "192.168.55.114";
const uint16_t MQTT_PORT  = 1883;

const char* DEVICE_ID  = "ESP32_A1";
const char* HOUSE_NAME = "House A";
// ------------------------------------

// 1602 Keypad Shield — your team wiring (D2 = GPIO 2, etc.)
#define LCD_RS  2    // RS  -> ESP32 D2
#define LCD_EN  4    // EN  -> ESP32 D4
#define LCD_D4  5    // LCD D4 -> ESP32 D5
#define LCD_D5  15   // LCD D5 -> ESP32 D15
#define LCD_D6  16   // LCD D6 -> ESP32 D16
#define LCD_D7  17   // LCD D7 -> ESP32 D17
// Backlight: Bla (+) / Blk (-). Easiest: Bla->5V, Blk->GND, LCD_BL -1
#define LCD_BL  -1
#define KEYPAD_PIN -1  // keypad analog pin if wired (e.g. 34); -1 = not used

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
