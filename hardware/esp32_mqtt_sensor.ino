/*
 * ESP32 Predictive Maintenance Sensor Node — MQTT Mode
 *
 * Publishes sensor data to MQTT broker on topic:
 *   factory/machines/{MACHINE_ID}/sensors
 *
 * Required libraries (Arduino Library Manager):
 *   - PubSubClient   (Nick O'Leary)
 *   - ArduinoJson    (Benoit Blanchon)
 *   - MPU6050        (Electronic Cats)
 *   - DallasTemperature + OneWire
 */

#include <Arduino.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <MPU6050.h>
#include <OneWire.h>
#include <DallasTemperature.h>

// ── Configuration ─────────────────────────────────────────────────────────────
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* MACHINE_ID    = "M1";

// MQTT Broker (e.g. HiveMQ public, Mosquitto, EMQX)
const char* MQTT_HOST     = "broker.hivemq.com";
const int   MQTT_PORT     = 1883;
const char* MQTT_USER     = "";         // Leave blank if no auth
const char* MQTT_PASS     = "";
const char* MQTT_CLIENT_ID = "esp32-machine-M1";

char MQTT_TOPIC[64];

const unsigned long PUBLISH_INTERVAL = 5000;  // ms

// ── Hardware ──────────────────────────────────────────────────────────────────
#define ONE_WIRE_BUS  4
#define ACS712_PIN    34
#define HALL_PIN      35

MPU6050 mpu;
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature tempSensor(&oneWire);

WiFiClient   wifiClient;
PubSubClient mqtt(wifiClient);

volatile uint32_t pulseCount = 0;
unsigned long     lastPublish = 0;
unsigned long     lastRPMCalc = 0;
float             currentRPM  = 0;

void IRAM_ATTR hallISR() { pulseCount++; }

// ── Helpers ───────────────────────────────────────────────────────────────────
void connectWiFi() {
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("WiFi");
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print('.'); }
  Serial.println(" OK: " + WiFi.localIP().toString());
}

void connectMQTT() {
  while (!mqtt.connected()) {
    Serial.print("MQTT connecting...");
    if (mqtt.connect(MQTT_CLIENT_ID, MQTT_USER, MQTT_PASS)) {
      Serial.println("OK");
    } else {
      Serial.printf("FAILED rc=%d — retry in 3s\n", mqtt.state());
      delay(3000);
    }
  }
}

float readTemp() {
  tempSensor.requestTemperatures();
  float t = tempSensor.getTempCByIndex(0);
  return (t == DEVICE_DISCONNECTED_C) ? 0.0f : t;
}

float readCurrent() {
  int   raw  = analogRead(ACS712_PIN);
  float vout = raw * (3.3f / 4095.0f);
  return fabs((vout - 1.65f) / 0.066f);
}

float readVibRMS() {
  int16_t ax, ay, az, gx, gy, gz;
  mpu.getMotion6(&ax, &ay, &az, &gx, &gy, &gz);
  float x = ax / 16384.0f, y = ay / 16384.0f, z = az / 16384.0f;
  return sqrtf((x*x + y*y + z*z) / 3.0f);
}

float calcRPM() {
  unsigned long now = millis();
  if (now - lastRPMCalc < 250) return currentRPM;
  noInterrupts(); uint32_t p = pulseCount; pulseCount = 0; interrupts();
  currentRPM = (p / ((now - lastRPMCalc) / 1000.0f)) * 60.0f;
  lastRPMCalc = now;
  return currentRPM;
}

// ── Setup ─────────────────────────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  snprintf(MQTT_TOPIC, sizeof(MQTT_TOPIC), "factory/machines/%s/sensors", MACHINE_ID);

  Wire.begin(21, 22);
  mpu.initialize();
  tempSensor.begin();

  pinMode(HALL_PIN, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(HALL_PIN), hallISR, FALLING);

  connectWiFi();
  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setBufferSize(512);
  connectMQTT();
}

// ── Loop ──────────────────────────────────────────────────────────────────────
void loop() {
  if (WiFi.status() != WL_CONNECTED) connectWiFi();
  if (!mqtt.connected()) connectMQTT();
  mqtt.loop();

  calcRPM();

  unsigned long now = millis();
  if (now - lastPublish >= PUBLISH_INTERVAL) {
    lastPublish = now;

    StaticJsonDocument<256> doc;
    doc["machine_id"]    = MACHINE_ID;
    doc["temperature"]   = round(readTemp() * 10) / 10.0;
    doc["vibration_rms"] = round(readVibRMS() * 1000) / 1000.0;
    doc["current"]       = round(readCurrent() * 100) / 100.0;
    doc["rpm"]           = (int)currentRPM;
    doc["voltage"]       = 220;
    doc["ts"]            = millis();

    char buf[256];
    size_t n = serializeJson(doc, buf, sizeof(buf));
    mqtt.publish(MQTT_TOPIC, buf, n);
    Serial.printf("[MQTT] → %s\n", buf);
  }
}
