/*
 * SolarKapitBahay — House B (mirror of House A)
 * MQTT: solar/B/* publish, solar/A/* subscribe
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

const char* ssid       = "SKYFiber_MESH_BEF5";
const char* password   = "548251144";
const char* mqttBroker = "192.168.55.113";
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

bool   houseBOn       = false;
bool   transferOn     = false;
bool   wasTransferOn  = false;
String houseAStatus   = "UNKNOWN";
String houseATransfer = "STOPPED";

void callback(char* topic, byte* payload, unsigned int length) {
  String msg = "";
  for (unsigned int i = 0; i < length; i++) msg += (char)payload[i];

  if (String(topic) == "solar/A/status") {
    houseAStatus = msg;
  }

  if (String(topic) == "solar/A/transfer") {
    houseATransfer = msg;
    if (msg == "SENDING") {
      Serial.println("RECEIVING ENERGY FROM A");
      lcd.clear();
      lcd.setCursor(0, 0);
      lcd.print("RECEIVING!");
      lcd.setCursor(0, 1);
      lcd.print("A --> B ENERGY!");
      delay(2000);
    }
    if (msg == "STOPPED") {
      Serial.println("Transfer from A stopped.");
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
  if (mqtt.connect("ESP32_House_B")) {
    Serial.println(" connected!");
    mqtt.subscribe("solar/A/status");
    mqtt.subscribe("solar/A/transfer");
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
  lcd.print("House B ESP32");
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

  Serial.println("House B ready!");
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("House B Ready!");
  delay(1500);
}

void loop() {
  reconnectMQTT();
  mqtt.loop();

  float voltage = getVoltage();
  float current = getCurrent();
  float wattage = voltage * current;

  String myStatus = (voltage >= VOLTAGE_THRESHOLD) ? "SURPLUS" : "DEFICIT";

  if (voltage >= VOLTAGE_THRESHOLD || houseATransfer == "SENDING") {
    houseBOn = true;
    digitalWrite(RELAY_1, LOW);
  } else {
    houseBOn = false;
    digitalWrite(RELAY_1, HIGH);
  }

  if (voltage >= TRANSFER_VOLTAGE && houseAStatus == "DEFICIT") {
    transferOn = true;
    digitalWrite(RELAY_2, LOW);
  } else {
    transferOn = false;
    digitalWrite(RELAY_2, HIGH);
  }

  if (transferOn && !wasTransferOn) {
    Serial.println("ENERGY TRANSFER: B -> A");
    lcd.clear();
    lcd.setCursor(0, 0);
    lcd.print("TRANSFERRING!");
    lcd.setCursor(0, 1);
    lcd.print("B --> A ENERGY!");
    delay(2000);
    mqtt.publish("solar/B/transfer", "SENDING");
  }

  if (!transferOn && wasTransferOn) {
    Serial.println("Transfer B -> A stopped");
    mqtt.publish("solar/B/transfer", "STOPPED");
  }

  wasTransferOn = transferOn;

  Serial.print("B V=");
  Serial.print(voltage, 2);
  Serial.print(" I=");
  Serial.print(current, 2);
  Serial.print(" W=");
  Serial.print(wattage, 2);
  Serial.print(" ");
  Serial.print(myStatus);
  Serial.print(" A=");
  Serial.println(houseAStatus);

  if (!transferOn && houseATransfer != "SENDING") {
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
    mqtt.publish("solar/B/voltage", String(voltage, 4).c_str());
    mqtt.publish("solar/B/current", String(current, 4).c_str());
    mqtt.publish("solar/B/wattage", String(wattage, 4).c_str());
    mqtt.publish("solar/B/status",   myStatus.c_str());
  }

  delay(1000);
}
