/*
 * SolarKapitBahay — House A (working lab firmware)
 * Pins: D34=ACS712, D35=voltage, D26/D27=relay, D21/D22=LCD I2C
 * MQTT: solar/A/* publish, solar/B/* subscribe
 * Broker IP: run ipconfig on laptop (Wi-Fi IPv4) — update mqttBroker below
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

const char* ssid       = "SKYFiber_MESH_BEF5";
const char* password   = "548251144";
const char* mqttBroker = "192.168.55.113";  // laptop Wi-Fi IP from ipconfig
const int   mqttPort   = 1883;

#define VOLT_PIN  35
#define ACS_PIN   34
#define RELAY_1   26
#define RELAY_2   27

const float VOLT_RATIO        = 4.0;
const float ADC_REF           = 3.3;
const float ADC_MAX           = 4095.0;
const float ACS_SENSITIVITY   = 0.100;
const float VOLTAGE_THRESHOLD = 1.0;
const float TRANSFER_VOLTAGE  = 3.0;
float       acsZeroPoint      = 0.0;

LiquidCrystal_I2C lcd(0x27, 16, 2);
WiFiClient        espClient;
PubSubClient      mqtt(espClient);

bool   houseAOn       = false;
bool   transferOn     = false;
bool   wasTransferOn  = false;
String houseBStatus   = "UNKNOWN";
String houseBTransfer = "STOPPED";

void callback(char* topic, byte* payload, unsigned int length) {
  String msg = "";
  for (unsigned int i = 0; i < length; i++) msg += (char)payload[i];

  if (String(topic) == "solar/B/status") {
    houseBStatus = msg;
  }

  if (String(topic) == "solar/B/transfer") {
    houseBTransfer = msg;
    if (msg == "SENDING") {
      Serial.println("RECEIVING ENERGY FROM B");
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("RECEIVING!");
      lcd.setCursor(0, 1);
      lcd.print("B --> A ENERGY!");
      delay(2000);
    }
    if (msg == "STOPPED") {
      Serial.println("Transfer from B stopped.");
    }
  }
}

void calibrateACS() {
  Serial.println("Calibrating ACS712...");
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Calibrating...");
  long sum = 0;
  for (int i = 0; i < 200; i++) {
    sum += analogRead(ACS_PIN);
    delay(5);
  }
  acsZeroPoint = (float)sum / 200.0;
  Serial.print("ACS zero: ");
  Serial.println(acsZeroPoint);
  lcd.setCursor(0, 1);
  lcd.print("Zero: ");
  lcd.print(acsZeroPoint, 0);
  delay(2000);
  lcd.clear();
}

float readAvg(int pin) {
  long sum = 0;
  for (int i = 0; i < 20; i++) {
    sum += analogRead(pin);
    delay(2);
  }
  return (float)sum / 20.0;
}

float getVoltage() {
  float avg  = readAvg(VOLT_PIN);
  float adcV = (avg / ADC_MAX) * ADC_REF;
  float volt = adcV * VOLT_RATIO;
  if (volt < 0.1) volt = 0.0;
  return volt;
}

float getCurrent() {
  float avg     = readAvg(ACS_PIN);
  float voltage = (avg / ADC_MAX) * ADC_REF;
  float zeroV   = (acsZeroPoint / ADC_MAX) * ADC_REF;
  float current = -((voltage - zeroV) / ACS_SENSITIVITY);
  if (abs(current) < 0.1) current = 0.0;
  return current;
}

void connectWiFi() {
  Serial.print("Connecting WiFi");
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Connecting WiFi");
  WiFi.begin(ssid, password);
  int tries = 0;
  while (WiFi.status() != WL_CONNECTED && tries < 20) {
    delay(500);
    Serial.print(".");
    tries++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi OK: " + WiFi.localIP().toString());
    lcd.setCursor(0, 1);
    lcd.print("WiFi OK!");
  } else {
    Serial.println("\nWiFi failed.");
    lcd.setCursor(0, 1);
    lcd.print("No WiFi-offline");
  }
  delay(1500);
}

void reconnectMQTT() {
  if (WiFi.status() != WL_CONNECTED) return;
  if (mqtt.connected()) return;
  Serial.print("Connecting MQTT...");
  if (mqtt.connect("ESP32_House_A")) {
    Serial.println(" connected!");
    mqtt.subscribe("solar/B/status");
    mqtt.subscribe("solar/B/transfer");
  } else {
    Serial.print(" failed. Error: ");
    Serial.println(mqtt.state());
  }
}

void setup() {
  Serial.begin(115200);
  delay(500);

  Wire.begin(21, 22);
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("House A ESP32");
  lcd.setCursor(0, 1);
  lcd.print("Starting...");
  delay(2000);

  pinMode(RELAY_1, OUTPUT);
  pinMode(RELAY_2, OUTPUT);
  digitalWrite(RELAY_1, HIGH);
  digitalWrite(RELAY_2, HIGH);

  calibrateACS();
  connectWiFi();
  mqtt.setServer(mqttBroker, mqttPort);
  mqtt.setCallback(callback);

  Serial.println("House A ready!");
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("House A Ready!");
  delay(1500);
}

void loop() {
  reconnectMQTT();
  mqtt.loop();

  float voltage = getVoltage();
  float current = getCurrent();
  float wattage = voltage * current;

  String myStatus = (voltage >= VOLTAGE_THRESHOLD) ? "SURPLUS" : "DEFICIT";

  if (voltage >= VOLTAGE_THRESHOLD || houseBTransfer == "SENDING") {
    houseAOn = true;
    digitalWrite(RELAY_1, LOW);
  } else {
    houseAOn = false;
    digitalWrite(RELAY_1, HIGH);
  }

  if (voltage >= TRANSFER_VOLTAGE && houseBStatus == "DEFICIT") {
    transferOn = true;
    digitalWrite(RELAY_2, LOW);
  } else {
    transferOn = false;
    digitalWrite(RELAY_2, HIGH);
  }

  if (transferOn && !wasTransferOn) {
    Serial.println("ENERGY TRANSFER: A -> B");
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("TRANSFERRING!");
    lcd.setCursor(0, 1);
    lcd.print("A --> B ENERGY!");
    delay(2000);
    mqtt.publish("solar/A/transfer", "SENDING");
  }

  if (!transferOn && wasTransferOn) {
    Serial.println("Transfer A -> B stopped");
    mqtt.publish("solar/A/transfer", "STOPPED");
  }

  wasTransferOn = transferOn;

  Serial.print("A V=");
  Serial.print(voltage, 2);
  Serial.print(" I=");
  Serial.print(current, 2);
  Serial.print(" W=");
  Serial.print(wattage, 2);
  Serial.print(" ");
  Serial.print(myStatus);
  Serial.print(" B=");
  Serial.println(houseBStatus);

  if (!transferOn && houseBTransfer != "SENDING") {
    lcd.setCursor(0, 0);
    lcd.print("V:");
    lcd.print(voltage, 2);
    lcd.print("V C:");
    lcd.print(current, 2);
    lcd.print("   ");
    lcd.setCursor(0, 1);
    lcd.print("W:");
    lcd.print(wattage, 2);
    lcd.print("W ");
    lcd.print(myStatus);
    lcd.print("   ");
  }

  if (mqtt.connected()) {
    mqtt.publish("solar/A/voltage", String(voltage, 4).c_str());
    mqtt.publish("solar/A/current", String(current, 4).c_str());
    mqtt.publish("solar/A/wattage", String(wattage, 4).c_str());
    mqtt.publish("solar/A/status",   myStatus.c_str());
  }

  delay(1000);
}
