/*
 * ESP32 #2 — Display hub (two I2C LCDs, MQTT subscriber)
 *
 * Receives solarkapitbahay/controller/telemetry from ESP32 #1.
 *
 * LCD wiring (each module): GND, VCC->VIN, SDA->21, SCL->22
 * Set addresses with I2C_Scanner — common: 0x27 and 0x3F
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

const char* WIFI_SSID     = "SKYFiber_MESH_BEF5";
const char* WIFI_PASSWORD = "548251144";
const char* MQTT_SERVER   = "192.168.55.114";
const uint16_t MQTT_PORT  = 1883;

#define I2C_SDA 21
#define I2C_SCL 22
#define LCD_ADDR_A 0x27
#define LCD_ADDR_B 0x3F   // change if scanner shows different second address

const char* TOPIC_TELEMETRY = "solarkapitbahay/controller/telemetry";

LiquidCrystal_I2C lcdA(LCD_ADDR_A, 16, 2);
LiquidCrystal_I2C lcdB(LCD_ADDR_B, 16, 2);

WiFiClient wifiClient;
PubSubClient mqtt(wifiClient);

float solarV = 0, solarA = 0, solarW = 0;
bool houseA = false, houseB = false;

void lcdWrite(LiquidCrystal_I2C& lcd, const char* l1, const char* l2) {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print(l1);
  lcd.setCursor(0, 1);
  lcd.print(l2);
}

void refreshDisplays() {
  char l1[17];
  char l2[17];

  snprintf(l1, sizeof(l1), "House A %s", houseA ? "ON " : "OFF");
  snprintf(l2, sizeof(l2), "V%4.1f I%4.2f", solarV, solarA);
  lcdWrite(lcdA, l1, l2);

  snprintf(l1, sizeof(l1), "House B %s", houseB ? "ON " : "OFF");
  snprintf(l2, sizeof(l2), "Solar %4.1f W", solarW);
  lcdWrite(lcdB, l1, l2);
}

bool parseBool(const String& json, const char* key) {
  String needle = String("\"") + key + "\":true";
  return json.indexOf(needle) >= 0;
}

float parseFloat(const String& json, const char* key) {
  String needle = String("\"") + key + "\":";
  int i = json.indexOf(needle);
  if (i < 0) return 0;
  i += needle.length();
  return json.substring(i).toFloat();
}

void mqttCallback(char* topic, byte* payload, unsigned long length) {
  String msg;
  for (unsigned long i = 0; i < length; i++) msg += (char)payload[i];

  solarV = parseFloat(msg, "solar_v");
  solarA = parseFloat(msg, "solar_a");
  solarW = parseFloat(msg, "solar_w");
  houseA = parseBool(msg, "house_a");
  houseB = parseBool(msg, "house_b");
  refreshDisplays();
}

void initLcds() {
  Wire.begin(I2C_SDA, I2C_SCL);
  lcdA.init();
  lcdA.backlight();
  lcdB.init();
  lcdB.backlight();
  lcdWrite(lcdA, "Display Hub", "waiting MQTT");
  lcdWrite(lcdB, "Display Hub", "waiting MQTT");
}

void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) delay(500);
}

void connectMqtt() {
  mqtt.setServer(MQTT_SERVER, MQTT_PORT);
  mqtt.setCallback(mqttCallback);
  mqtt.setBufferSize(512);
  while (!mqtt.connected()) {
    String id = String("skb-disp-") + String(random(0xffff), HEX);
    if (mqtt.connect(id.c_str())) {
      mqtt.subscribe(TOPIC_TELEMETRY);
      lcdWrite(lcdA, "MQTT OK", TOPIC_TELEMETRY);
    } else {
      delay(3000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  initLcds();
  connectWiFi();
  connectMqtt();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) connectWiFi();
  if (!mqtt.connected()) connectMqtt();
  mqtt.loop();
}
