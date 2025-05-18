#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include <DHT.h>
#include <ESP32Servo.h>
#include <NewPing.h>
#include <time.h>
#include <ArduinoJson.h>
#include "addons/TokenHelper.h"
#include "addons/RTDBHelper.h"

// WiFi credentials
#define WIFI_SSID "SHOKO 4413"  // Updated with your SSID
#define WIFI_PASSWORD "drill123"    // Updated with your password

// Firebase credentials
#define API_KEY "AIzaSyAJcVgw5VpT2CEHLqgIRjvt6Lc0x_Lrys4"
#define DATABASE_URL "https://smartpoultry-4d359-default-rtdb.asia-southeast1.firebasedatabase.app/"

// Pin definitions
#define DHT_PIN 4          // DHT22 sensor pin
#define ULTRASONIC_TRIG 14  // Ultrasonic sensor trigger pin for food level
#define ULTRASONIC_ECHO 12 // Ultrasonic sensor echo pin for food level
#define WATER_LEVEL_MAIN 34 // Water level sensor for main tank
#define WATER_LEVEL_DRINKER 35 // Water level sensor for drinker
#define SERVO_PIN 13       // Servo motor pin for feeder
#define RELAY_FAN 5       // Relay pin for fan
#define RELAY_HEAT 17      // Relay pin for heat lamp
#define RELAY_PUMP 16      // Relay pin for water pump
#define RELAY_SPARE 25     // Spare relay pin

// Constants
#define DHT_TYPE DHT11     // DHT sensor type
#define MAX_DISTANCE 200   // Maximum distance for ultrasonic sensor (in cm)
#define TEMP_HIGH_THRESHOLD 32.0  // High temperature threshold (°C)
#define TEMP_LOW_THRESHOLD 24.0   // Low temperature threshold (°C)
#define FOOD_LOW_THRESHOLD 20     // Low food level threshold (%)
#define WATER_MAIN_LOW_THRESHOLD 10 // Low water level threshold for main tank (%)
#define WATER_DRINKER_LOW_THRESHOLD 5 // Low water level threshold for drinker (%)
#define SERVO_OPEN_ANGLE 45      // Servo open angle (45 degrees)
#define SERVO_CLOSE_ANGLE 0      // Servo close angle (0 degrees)
#define GRAMS_PER_SECOND 50      // Calibrated feed rate: 50g per second at 45 degrees

// Water system constants
#define WATER_FLOW_RATE 100      // Default water flow rate: 100ml per second
#define WATER_FILL_DURATION 30   // Default water fill duration: 30 seconds
#define HYDRATION_WARNING_THRESHOLD 180 // Warning threshold for water consumption (ml per bird per day)
#define HYDRATION_ALERT_THRESHOLD 120  // Alert threshold for water consumption (ml per bird per day)

// Firebase objects
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;
bool signupOK = false;

// Objects
DHT dht(DHT_PIN, DHT_TYPE);
Servo feederServo;
NewPing sonar(ULTRASONIC_TRIG, ULTRASONIC_ECHO, MAX_DISTANCE);

// Variables
float temperature = 0;
float humidity = 0;
int foodLevel = 0;
int waterLevelMain = 0;
int waterLevelDrinker = 0;
bool fanState = false;
bool heatState = false;
bool pumpState = false;
bool automationEnabled = true;
unsigned long previousMillis = 0;
const long interval = 1000; // Interval for sensor readings (1 second)

// Alert tracking variables
bool highTempAlertActive = false;
bool lowTempAlertActive = false;
bool lowFoodAlertActive = false;
bool lowWaterMainAlertActive = false;
bool lowWaterDrinkerAlertActive = false;
bool lowHydrationAlertActive = false;

// Feeding schedule
int feedingHours[] = {8, 12, 16}; // Feeding times (24-hour format)
int lastFeedingHour = -1;

// History update timer
unsigned long lastHistoryUpdate = 0;
const long historyInterval = 300000; // 5 minutes in milliseconds

// Intelligent feeding variables
float feedDuration = 0;       // Duration to keep servo open in seconds
unsigned long lastFeedingTime = 0;
bool intelligentFeedingEnabled = true;
String currentAgeGroup = "adult"; // Default age group (chick, grower, adult)
int chickenCount = 10;           // Default chicken count
bool isFeeding = false;          // Flag to prevent multiple feeding commands
unsigned long feedingStartTime = 0; // Track when feeding started
unsigned long feedingCooldown = 0;  // Cooldown period after feeding
unsigned long lastFeedCommandTime = 0; // Track when the last feed command was received
const unsigned long FEED_COMMAND_TIMEOUT = 30000; // 30 seconds timeout for feed commands

// Water system variables
int waterFlowRate = WATER_FLOW_RATE;  // Water flow rate in ml/second
int waterFillDuration = WATER_FILL_DURATION; // Water fill duration in seconds
bool autoWaterEnabled = true;         // Auto water filling enabled
bool isWaterFilling = false;          // Flag to prevent multiple water filling commands
unsigned long waterFillStartTime = 0; // Track when water filling started
unsigned long waterFillCooldown = 0;  // Cooldown period after water filling
unsigned long lastWaterFillTime = 0;  // Track when the last water fill occurred
unsigned long lastWaterCommandTime = 0; // Track when the last water command was received
const unsigned long WATER_COMMAND_TIMEOUT = 60000; // 60 seconds timeout for water commands
int lastWaterFillHour = -1;           // Track the last hour water was filled
unsigned long totalWaterToday = 0;    // Total water dispensed today in ml
unsigned long waterPerBird = 0;       // Water per bird in ml
unsigned long dayStartTime = 0;       // Start of the current day

// Function to log events to Firebase
void logEvent(String eventType, String description) {
  if (Firebase.ready() && signupOK) {
    FirebaseJson json;
    json.set("timestamp", time(NULL));
    json.set("type", eventType);
    json.set("description", description);
    
    String path = "/events/" + String(time(NULL));  
    if (Firebase.RTDB.setJSON(&fbdo, path.c_str(), &json)) {
      Serial.println("Event logged: " + eventType + " - " + description);
    } else {
      Serial.println("Failed to log event: " + fbdo.errorReason());
    }
  }
}

// Function to log feeding data for analytics
void logFeedingData(int gramsDispensed, String ageGroup, int count) {
  if (Firebase.ready() && signupOK) {
    FirebaseJson json;
    json.set("timestamp", time(NULL));
    json.set("gramsDispensed", gramsDispensed);
    json.set("ageGroup", ageGroup);
    json.set("chickenCount", count);
    
    String path = "/feedingLogs/" + String(time(NULL));  
    if (Firebase.RTDB.setJSON(&fbdo, path.c_str(), &json)) {
      Serial.println("Feeding data logged successfully");
    } else {
      Serial.println("Failed to log feeding data: " + fbdo.errorReason());
    }
  }
}

// Function to log water data for analytics
void logWaterData(int volumeDispensed, int durationSeconds) {
  if (Firebase.ready() && signupOK) {
    FirebaseJson json;
    json.set("timestamp", time(NULL));
    json.set("volumeDispensed", volumeDispensed);
    json.set("durationSeconds", durationSeconds);
    
    String path = "/waterLogs/" + String(time(NULL));  
    if (Firebase.RTDB.setJSON(&fbdo, path.c_str(), &json)) {
      Serial.println("Water data logged successfully");
      
      // Update total water dispensed today
      totalWaterToday += volumeDispensed;
      
      // Update water per bird
      if (chickenCount > 0) {
        waterPerBird = totalWaterToday / chickenCount;
      }
      
      // Check hydration status and update alert if needed
      checkHydrationStatus();
    } else {
      Serial.println("Failed to log water data: " + fbdo.errorReason());
    }
  }
}

// Function to check hydration status
void checkHydrationStatus() {
  // Only check if we have birds
  if (chickenCount <= 0) return;
  
  // Calculate water per bird
  int waterPerBirdToday = totalWaterToday / chickenCount;
  
  // Check against thresholds
  bool isLowHydration = waterPerBirdToday < HYDRATION_ALERT_THRESHOLD;
  
  // Update Firebase alert if status changed
  if (isLowHydration != lowHydrationAlertActive) {
    lowHydrationAlertActive = isLowHydration;
    Firebase.RTDB.setBool(&fbdo, "/alerts/lowHydration", lowHydrationAlertActive);
    
    if (lowHydrationAlertActive) {
      logEvent("lowHydration", "Low hydration detected: " + String(waterPerBirdToday) + "ml per bird (threshold: " + String(HYDRATION_ALERT_THRESHOLD) + "ml)");
    } else {
      logEvent("resolved", "Hydration level returned to normal: " + String(waterPerBirdToday) + "ml per bird");
    }
  }
}

// Reset daily water counters at midnight
void resetDailyWaterCounters() {
  time_t now;
  struct tm timeinfo;
  time(&now);
  localtime_r(&now, &timeinfo);
  
  // Check if it's a new day (midnight)
  if (timeinfo.tm_hour == 0 && timeinfo.tm_min == 0 && timeinfo.tm_sec < 10) {
    // Reset counters
    totalWaterToday = 0;
    waterPerBird = 0;
    dayStartTime = now;
    
    // Log the reset
    Serial.println("Daily water counters reset at midnight");
  }
}

void setup() {
  Serial.begin(115200);
  
  // Initialize pins
  pinMode(RELAY_FAN, OUTPUT);
  pinMode(RELAY_HEAT, OUTPUT);
  pinMode(RELAY_PUMP, OUTPUT);
  pinMode(RELAY_SPARE, OUTPUT);
  pinMode(WATER_LEVEL_MAIN, INPUT);
  pinMode(WATER_LEVEL_DRINKER, INPUT);
  
  // Initialize with everything off
  digitalWrite(RELAY_FAN, HIGH);    // Relays are active LOW
  digitalWrite(RELAY_HEAT, HIGH);
  digitalWrite(RELAY_PUMP, HIGH);
  digitalWrite(RELAY_SPARE, HIGH);
  
  // Initialize servo
  feederServo.attach(SERVO_PIN);
  feederServo.write(SERVO_CLOSE_ANGLE); // Ensure servo starts in closed position
  
  // Initialize DHT sensor
  dht.begin();
  
  // Connect to WiFi
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    delay(500);
  }
  Serial.println();
  Serial.print("Connected with IP: ");
  Serial.println(WiFi.localIP());
  
  // Initialize time
  configTime(8 * 3600, 0, "pool.ntp.org", "time.nist.gov");
  
  // Initialize Firebase
  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;

  // Anonymous sign-in
  if (Firebase.signUp(&config, &auth, "", "")) {
    Serial.println("✅ Firebase SignUp OK");
    signupOK = true;
  } else {
    Serial.printf("❌ Firebase SignUp Failed: %s\n", config.signer.signupError.message.c_str());
  }

  config.token_status_callback = tokenStatusCallback; // Set token callback
  
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
  
  Serial.println("System initialized");
  
  // Initialize day start time
  time_t now;
  time(&now);
  struct tm timeinfo;
  localtime_r(&now, &timeinfo);
  
  // Set day start time to the beginning of the current day
  timeinfo.tm_hour = 0;
  timeinfo.tm_min = 0;
  timeinfo.tm_sec = 0;
  dayStartTime = mktime(&timeinfo);
  
  // Check if automation is enabled from Firebase
  if (Firebase.ready() && signupOK) {
    if (Firebase.RTDB.getBool(&fbdo, "/controls/automationEnabled")) {
      automationEnabled = fbdo.boolData();
    }
    
    // Reset feed control on startup to prevent accidental feeding
    Firebase.RTDB.setBool(&fbdo, "/controls/feed", false);
    
    // Reset water fill control on startup
    Firebase.RTDB.setBool(&fbdo, "/controls/waterFill", false);
    
    // Reset isFeeding state
    Firebase.RTDB.setBool(&fbdo, "/deviceStates/isFeeding", false);
    
    // Reset isWaterFilling state
    Firebase.RTDB.setBool(&fbdo, "/deviceStates/isWaterFilling", false);
    
    // Initialize water settings
    if (Firebase.RTDB.getInt(&fbdo, "/waterSettings/flowRate")) {
      waterFlowRate = fbdo.intData();
    } else {
      // Set default water flow rate
      Firebase.RTDB.setInt(&fbdo, "/waterSettings/flowRate", waterFlowRate);
    }
    
    if (Firebase.RTDB.getInt(&fbdo, "/waterSettings/fillDuration")) {
      waterFillDuration = fbdo.intData();
    } else {
      // Set default water fill duration
      Firebase.RTDB.setInt(&fbdo, "/waterSettings/fillDuration", waterFillDuration);
    }
    
    if (Firebase.RTDB.getBool(&fbdo, "/waterSettings/autoEnabled")) {
      autoWaterEnabled = fbdo.boolData();
    } else {
      // Set default auto water enabled
      Firebase.RTDB.setBool(&fbdo, "/waterSettings/autoEnabled", autoWaterEnabled);
    }
  }
  
  // Initialize lastFeedingHour to current hour to prevent immediate feeding on boot
  time_t now2;
  struct tm timeinfo2;
  time(&now2);
  localtime_r(&now2, &timeinfo2);
  lastFeedingHour = timeinfo2.tm_hour;
  lastWaterFillHour = timeinfo2.tm_hour;
  
  Serial.print("System initialized. Last feeding hour set to: ");
  Serial.println(lastFeedingHour);
  
  // Log system startup
  logEvent("system", "Smart Poultry System started");
}

void readSensors() {
  // Read DHT22 sensor
  temperature = dht.readTemperature();
  humidity = dht.readHumidity();
  
  // Check if readings are valid
  if (isnan(temperature) || isnan(humidity)) {
    Serial.println("Failed to read from DHT sensor!");
    temperature = 0;
    humidity = 0;
  }
  
  // Read ultrasonic sensor for food level
  int distance = sonar.ping_cm();
  if (distance == 0) distance = MAX_DISTANCE; // Handle out of range
  
  // Convert distance to percentage (assuming 1cm is full and 5cm is empty)
  foodLevel = map(constrain(distance, 1, 5), 1, 5, 100, 0);
  
  // Read water level sensors
  // Assuming analog sensors that give higher values when more water is present
  int waterMainRaw = analogRead(WATER_LEVEL_MAIN);
  int waterDrinkerRaw = analogRead(WATER_LEVEL_DRINKER);
  
  // Main tank calibration (e.g., 13cm = full)
  waterLevelMain = map(constrain(waterMainRaw, 600, 2800), 600, 2800, 0, 100);

  // Drinker tank calibration (e.g., 4.5cm = full)
  waterLevelDrinker = map(constrain(waterDrinkerRaw, 700, 2400), 700, 2400, 0, 100);

  // Clamp values just in case
  waterLevelMain = constrain(waterLevelMain, 0, 100);
  waterLevelDrinker = constrain(waterLevelDrinker, 0, 100);
  
  // Print sensor readings for debugging
  Serial.println("Sensor Readings:");
  Serial.print("Temperature: "); Serial.print(temperature); Serial.println(" °C");
  Serial.print("Humidity: "); Serial.print(humidity); Serial.println(" %");
  Serial.print("Food Level: "); Serial.print(foodLevel); Serial.println(" %");
  Serial.print("Main Water Level: "); Serial.print(waterLevelMain); Serial.println(" %");
  Serial.print("Drinker Water Level: "); Serial.print(waterLevelDrinker); Serial.println(" %");
}

void updateFirebase() {
  if (Firebase.ready() && signupOK) {
    // Update sensor readings
    Firebase.RTDB.setFloat(&fbdo, "/sensors/temperature", temperature);
    Firebase.RTDB.setFloat(&fbdo, "/sensors/humidity", humidity);
    Firebase.RTDB.setInt(&fbdo, "/sensors/foodLevel", foodLevel);
    Firebase.RTDB.setInt(&fbdo, "/sensors/waterLevelMain", waterLevelMain);
    Firebase.RTDB.setInt(&fbdo, "/sensors/waterLevelDrinker", waterLevelDrinker);
    Firebase.RTDB.setInt(&fbdo, "/sensors/timestamp", time(NULL));
    
    // Update device states
    Firebase.RTDB.setBool(&fbdo, "/deviceStates/fan", !fanState); // Invert because relays are active LOW
    Firebase.RTDB.setBool(&fbdo, "/deviceStates/heat", !heatState);
    Firebase.RTDB.setBool(&fbdo, "/deviceStates/pump", !pumpState);
    
    // Update alert states
    Firebase.RTDB.setBool(&fbdo, "/alerts/highTemperature", temperature > TEMP_HIGH_THRESHOLD);
    Firebase.RTDB.setBool(&fbdo, "/alerts/lowTemperature", temperature < TEMP_LOW_THRESHOLD);
    Firebase.RTDB.setBool(&fbdo, "/alerts/lowFood", foodLevel < FOOD_LOW_THRESHOLD);
    Firebase.RTDB.setBool(&fbdo, "/alerts/lowWaterMain", waterLevelMain < WATER_MAIN_LOW_THRESHOLD);
    Firebase.RTDB.setBool(&fbdo, "/alerts/lowWaterDrinker", waterLevelDrinker < WATER_DRINKER_LOW_THRESHOLD);
    
    // Update feeding status
    Firebase.RTDB.setBool(&fbdo, "/deviceStates/isFeeding", isFeeding);
    
    // Update water filling status
    Firebase.RTDB.setBool(&fbdo, "/deviceStates/isWaterFilling", isWaterFilling);
    
    // Update water consumption data
    Firebase.RTDB.setInt(&fbdo, "/waterConsumption/totalToday", totalWaterToday);
    Firebase.RTDB.setInt(&fbdo, "/waterConsumption/perBird", waterPerBird);
  }
}

void updateHistory() {
  unsigned long currentMillis = millis();
  if (currentMillis - lastHistoryUpdate >= historyInterval) {
    lastHistoryUpdate = currentMillis;

    FirebaseJson historyData;
    historyData.set("timestamp", time(NULL));
    historyData.set("temperature", temperature);
    historyData.set("humidity", humidity);
    historyData.set("foodLevel", foodLevel);
    historyData.set("waterLevelMain", waterLevelMain);
    historyData.set("waterLevelDrinker", waterLevelDrinker);

    String historyPath = "/history/" + String(time(NULL));
    if (Firebase.RTDB.setJSON(&fbdo, historyPath.c_str(), &historyData)) {
      Serial.println("History data added successfully");
    } else {
      Serial.println("Failed to add history data");
      Serial.println(fbdo.errorReason());
    }
  }
}

void checkAndUpdateAlerts() {
  // Check temperature alerts - high
  bool highTemp = temperature > TEMP_HIGH_THRESHOLD;
  if (highTemp && !highTempAlertActive) {
    logEvent("highTemperature", "High temperature detected: " + String(temperature) + "°C");
    highTempAlertActive = true;
  } else if (!highTemp && highTempAlertActive) {
    logEvent("resolved", "High temperature alert resolved: " + String(temperature) + "°C");
    highTempAlertActive = false;
  }
  
  // Check temperature alerts - low
  bool lowTemp = temperature < TEMP_LOW_THRESHOLD;
  if (lowTemp && !lowTempAlertActive) {
    logEvent("lowTemperature", "Low temperature detected: " + String(temperature) + "°C");
    lowTempAlertActive = true;
  } else if (!lowTemp && lowTempAlertActive) {
    logEvent("resolved", "Low temperature alert resolved: " + String(temperature) + "°C");
    lowTempAlertActive = false;
  }
  
  // Check food level alert
  bool lowFood = foodLevel < FOOD_LOW_THRESHOLD;
  if (lowFood && !lowFoodAlertActive) {
    logEvent("lowFood", "Low food level detected: " + String(foodLevel) + "%");
    lowFoodAlertActive = true;
  } else if (!lowFood && lowFoodAlertActive) {
    logEvent("resolved", "Low food level alert resolved: " + String(foodLevel) + "%");
    lowFoodAlertActive = false;
  }
  
  // Check main water tank alert
  bool lowWaterMain = waterLevelMain < WATER_MAIN_LOW_THRESHOLD;
  if (lowWaterMain && !lowWaterMainAlertActive) {
    logEvent("lowWaterMain", "Low water level in main tank: " + String(waterLevelMain) + "%");
    lowWaterMainAlertActive = true;
  } else if (!lowWaterMain && lowWaterMainAlertActive) {
    logEvent("resolved", "Main tank water level alert resolved: " + String(waterLevelMain) + "%");
    lowWaterMainAlertActive = false;
  }
  
  // Check drinker water level alert
  bool lowWaterDrinker = waterLevelDrinker < WATER_DRINKER_LOW_THRESHOLD;
  if (lowWaterDrinker && !lowWaterDrinkerAlertActive) {
    logEvent("lowWaterDrinker", "Low water level in drinker: " + String(waterLevelDrinker) + "%");
    lowWaterDrinkerAlertActive = true;
  } else if (!lowWaterDrinker && lowWaterDrinkerAlertActive) {
    logEvent("resolved", "Drinker water level alert resolved: " + String(waterLevelDrinker) + "%");
    lowWaterDrinkerAlertActive = false;
  }
}

// Modified checkManualControls function to log manual actions
void checkManualControls() {
  if (Firebase.ready() && signupOK) {
    // Check if automation is enabled
    bool previousAutomation = automationEnabled;
    if (Firebase.RTDB.getBool(&fbdo, "/controls/automationEnabled")) {
      automationEnabled = fbdo.boolData();
      Serial.print("Automation enabled: ");
      Serial.println(automationEnabled);
      
      // Log automation mode change
      if (previousAutomation != automationEnabled) {
        if (automationEnabled) {
          logEvent("system", "System switched to automatic mode");
        } else {
          logEvent("system", "System switched to manual mode");
        }
      }
    }
    
    // If automation is disabled, check manual controls
    if (!automationEnabled) {
      Serial.println("Checking manual controls...");
      
      // Check fan control - FIXED
      if (Firebase.RTDB.getBool(&fbdo, "/controls/fan")) {
        bool newFanState = fbdo.boolData();
        Serial.print("Fan control value from Firebase: ");
        Serial.println(newFanState);
        
        // Log if state changed
        if (fanState != newFanState) {
          logEvent("manual", newFanState ? "Fan manually turned ON" : "Fan manually turned OFF");
        }
        
        // Always update the state and relay regardless of previous state
        fanState = newFanState;
        digitalWrite(RELAY_FAN, !fanState); // Invert because relays are active LOW
        Serial.print("Fan state set to: ");
        Serial.println(fanState);
      }
      
      // Check heat lamp control - FIXED
      if (Firebase.RTDB.getBool(&fbdo, "/controls/heat")) {
        bool newHeatState = fbdo.boolData();
        Serial.print("Heat control value from Firebase: ");
        Serial.println(newHeatState);
        
        // Log if state changed
        if (heatState != newHeatState) {
          logEvent("manual", newHeatState ? "Heat lamp manually turned ON" : "Heat lamp manually turned OFF");
        }
        
        // Always update the state and relay regardless of previous state
        heatState = newHeatState;
        digitalWrite(RELAY_HEAT, !heatState); // Invert because relays are active LOW
        Serial.print("Heat state set to: ");
        Serial.println(heatState);
      }
      
      // Check water pump control - FIXED
      if (Firebase.RTDB.getBool(&fbdo, "/controls/pump")) {
        bool newPumpState = fbdo.boolData();
        Serial.print("Pump control value from Firebase: ");
        Serial.println(newPumpState);
        
        // Log if state changed
        if (pumpState != newPumpState) {
          logEvent("manual", newPumpState ? "Water pump manually turned ON" : "Water pump manually turned OFF");
        }
        
        // Always update the state and relay regardless of previous state
        pumpState = newPumpState;
        digitalWrite(RELAY_PUMP, !pumpState); // Invert because relays are active LOW
        Serial.print("Pump state set to: ");
        Serial.println(pumpState);
      }
    }
    
    // Check for intelligent feeding controls (these work regardless of automation mode)
    checkIntelligentFeedingControls();
    
    // Check for water filling controls (these work regardless of automation mode)
    checkWaterFillingControls();
  }
}

// New function to check water filling controls
void checkWaterFillingControls() {
  unsigned long currentMillis = millis();
  
  // Check if we're already filling water
  if (isWaterFilling) {
    // Check if we've been filling for too long (timeout)
    if (currentMillis - waterFillStartTime > WATER_COMMAND_TIMEOUT) {
      Serial.println("Water filling timeout reached - resetting water filling state");
      isWaterFilling = false;
      digitalWrite(RELAY_PUMP, HIGH); // Turn off pump (active LOW)
      Firebase.RTDB.setBool(&fbdo, "/deviceStates/isWaterFilling", false);
      Firebase.RTDB.setBool(&fbdo, "/controls/waterFill", false);
    }
    return; // Don't process new water fill commands while filling
  }
  
  // Check if we're in a cooldown period after filling
  if (waterFillCooldown > 0 && currentMillis - lastWaterFillTime < waterFillCooldown) {
    // Still in cooldown period, don't process water fill commands
    return;
  }
  
  // Check for water fill command
  if (Firebase.RTDB.getBool(&fbdo, "/controls/waterFill")) {
    bool shouldFill = fbdo.boolData();
    
    // Only process if the command is true
    if (shouldFill) {
      Serial.println("Water fill command received");
      
      // Record the time we received the command
      lastWaterCommandTime = currentMillis;
      
      // Set water filling flag to prevent multiple activations
      isWaterFilling = true;
      waterFillStartTime = currentMillis;
      
      // Update water filling state in Firebase
      Firebase.RTDB.setBool(&fbdo, "/deviceStates/isWaterFilling", true);
      
      // Get water settings
      if (Firebase.RTDB.getInt(&fbdo, "/waterSettings/fillDuration")) {
        waterFillDuration = fbdo.intData();
      }
      
      if (Firebase.RTDB.getInt(&fbdo, "/waterSettings/flowRate")) {
        waterFlowRate = fbdo.intData();
      }
      
      // Fill water
      fillWater(waterFillDuration);
      
      // Reset the water fill control
      Firebase.RTDB.setBool(&fbdo, "/controls/waterFill", false);
      
      // Set cooldown period to prevent rapid re-triggering (30 seconds)
      waterFillCooldown = 30000;
      
      // Reset water filling flag
      isWaterFilling = false;
      Firebase.RTDB.setBool(&fbdo, "/deviceStates/isWaterFilling", false);
    }
  }
}

// Function to fill water
void fillWater(int durationSeconds) {
  Serial.print("Filling water for ");
  Serial.print(durationSeconds);
  Serial.println(" seconds");
  
  // Calculate volume based on flow rate
  int volumeDispensed = durationSeconds * waterFlowRate;
  
  // Log water filling event BEFORE activating the pump
  String description = "Dispensed " + String(volumeDispensed) + "ml of water";
  logEvent("waterFilling", description);
  
  // Log water data for analytics
  logWaterData(volumeDispensed, durationSeconds);
  
  // Turn on the pump
  digitalWrite(RELAY_PUMP, LOW); // Active LOW
  
  // Keep the pump on for the specified duration
  delay(durationSeconds * 1000);
  
  // Turn off the pump
  digitalWrite(RELAY_PUMP, HIGH); // Active LOW (OFF)
  
  // Update last water fill time
  lastWaterFillTime = millis();
}

// New function to check intelligent feeding controls
void checkIntelligentFeedingControls() {
  unsigned long currentMillis = millis();
  
  // Check if we're already feeding
  if (isFeeding) {
    // Check if we've been feeding for too long (timeout)
    if (currentMillis - feedingStartTime > FEED_COMMAND_TIMEOUT) {
      Serial.println("Feeding timeout reached - resetting feeding state");
      isFeeding = false;
      feederServo.write(SERVO_CLOSE_ANGLE); // Ensure servo is closed
      Firebase.RTDB.setBool(&fbdo, "/deviceStates/isFeeding", false);
      Firebase.RTDB.setBool(&fbdo, "/controls/feed", false);
    }
    return; // Don't process new feed commands while feeding
  }
  
  // Check if we're in a cooldown period after feeding
  if (feedingCooldown > 0 && currentMillis - lastFeedingTime < feedingCooldown) {
    // Still in cooldown period, don't process feed commands
    return;
  }
  
  // Check for feed command - now works regardless of automation mode
  if (Firebase.RTDB.getBool(&fbdo, "/controls/feed")) {
    bool shouldFeed = fbdo.boolData();
    
    // Only process if the command is true
    if (shouldFeed) {
      Serial.println("Feed command received");
      
      // Record the time we received the command
      lastFeedCommandTime = currentMillis;
      
      // Set feeding flag to prevent multiple activations
      isFeeding = true;
      feedingStartTime = currentMillis;
      
      // Update feeding state in Firebase
      Firebase.RTDB.setBool(&fbdo, "/deviceStates/isFeeding", true);
      
      // Check if we have a custom feed duration
      float customDuration = 0;
      if (Firebase.RTDB.getFloat(&fbdo, "/controls/feedDuration")) {
        customDuration = fbdo.floatData();
        Serial.print("Custom feed duration: ");
        Serial.println(customDuration);
      }

      // Only proceed with feeding if we have a valid duration
      if (customDuration > 0) {
        // Use intelligent feeding with custom duration
        activateFeederWithDuration(customDuration);

        // Log the feed command details
        Serial.print("Feed command executed with duration: ");
        Serial.print(customDuration);
        Serial.println(" seconds");
      } else {
        Serial.println("Feed command received but no valid duration provided");
        // Use standard feeding based on current settings
        activateFeeder();
      }
      
      // Reset the feed control - IMPORTANT: This must happen AFTER feeding is complete
      Firebase.RTDB.setBool(&fbdo, "/controls/feed", false);
      
      // Set cooldown period to prevent rapid re-triggering (30 seconds)
      feedingCooldown = 30000;
      
      // Reset feeding flag
      isFeeding = false;
      Firebase.RTDB.setBool(&fbdo, "/deviceStates/isFeeding", false);
    }
  }
  
  // Check for feeding settings updates
  if (Firebase.RTDB.getJSON(&fbdo, "/feedingSettings")) {
    FirebaseJson *json = fbdo.jsonObjectPtr();
    if (json != NULL) {
      FirebaseJsonData result;
      
      // Get age group
      json->get(result, "ageGroup");
      if (result.success) {
        currentAgeGroup = result.stringValue;
        Serial.print("Age group updated: ");
        Serial.println(currentAgeGroup);
      }
      
      // Get chicken count
      json->get(result, "chickenCount");
      if (result.success && result.intValue > 0) {
        chickenCount = result.intValue;
        Serial.print("Chicken count updated: ");
        Serial.println(chickenCount);
      }
    }
  }
}

void applyAutomation() {
  Serial.println("Applying automation...");
  Serial.print("Current temperature: ");
  Serial.print(temperature);
  Serial.print(" (High threshold: ");
  Serial.print(TEMP_HIGH_THRESHOLD);
  Serial.print(", Low threshold: ");
  Serial.print(TEMP_LOW_THRESHOLD);
  Serial.println(")");
  
  // Temperature control
  if (temperature > TEMP_HIGH_THRESHOLD) {
    Serial.println("Temperature above high threshold - turning fan ON, heat OFF");
    // Too hot, turn on fan and turn off heat
    bool previousFanState = fanState;
    bool previousHeatState = heatState;
    
    fanState = true;
    heatState = false;
    
    digitalWrite(RELAY_FAN, !fanState); // Invert because relays are active LOW
    digitalWrite(RELAY_HEAT, !heatState); // Invert because relays are active LOW
    
    // Log state changes if needed
    if (previousFanState != fanState) {
      logEvent("automatic", "Fan automatically turned ON due to high temperature");
    }
    if (previousHeatState != heatState) {
      logEvent("automatic", "Heat lamp automatically turned OFF due to high temperature");
    }
  } else if (temperature < TEMP_LOW_THRESHOLD) {
    Serial.println("Temperature below low threshold - turning fan OFF, heat ON");
    // Too cold, turn on heat and turn off fan
    bool previousFanState = fanState;
    bool previousHeatState = heatState;
    
    fanState = false;
    heatState = true;
    
    digitalWrite(RELAY_FAN, !fanState); // Invert because relays are active LOW
    digitalWrite(RELAY_HEAT, !heatState); // Invert because relays are active LOW
    
    // Log state changes if needed
    if (previousFanState != fanState) {
      logEvent("automatic", "Fan automatically turned OFF due to low temperature");
    }
    if (previousHeatState != heatState) {
      logEvent("automatic", "Heat lamp automatically turned ON due to low temperature");
    }
  } else {
    Serial.println("Temperature in acceptable range - turning fan OFF, heat OFF");
    // Temperature is in the acceptable range, turn off both
    bool previousFanState = fanState;
    bool previousHeatState = heatState;
    
    fanState = false;
    heatState = false;
    
    digitalWrite(RELAY_FAN, !fanState); // Invert because relays are active LOW
    digitalWrite(RELAY_HEAT, !heatState); // Invert because relays are active LOW
    
    // Log state changes if needed
    if (previousFanState != fanState) {
      logEvent("automatic", "Fan automatically turned OFF - temperature in normal range");
    }
    if (previousHeatState != heatState) {
      logEvent("automatic", "Heat lamp automatically turned OFF - temperature in normal range");
    }
  }
  
  Serial.print("Water level drinker: ");
  Serial.print(waterLevelDrinker);
  Serial.print(" (Threshold: ");
  Serial.print(WATER_DRINKER_LOW_THRESHOLD);
  Serial.println(")");
  Serial.print("Water level main: ");
  Serial.print(waterLevelMain);
  Serial.print(" (Threshold: ");
  Serial.print(WATER_MAIN_LOW_THRESHOLD);
  Serial.println(")");
  
  // Water level control - only if not already filling water
  if (!isWaterFilling) {
    bool previousPumpState = pumpState;
    
    if (waterLevelDrinker < WATER_DRINKER_LOW_THRESHOLD && waterLevelMain > WATER_MAIN_LOW_THRESHOLD) {
      Serial.println("Drinker water low and main tank has water - turning pump ON");
      // Drinker is low but main tank has water, turn on pump
      pumpState = true;
      digitalWrite(RELAY_PUMP, !pumpState); // Invert because relays are active LOW
      
      // Log pump activation
      if (!previousPumpState) {
        logEvent("automatic", "Water pump automatically activated to refill drinker");
      }
    } else {
      Serial.println("Either drinker water sufficient or main tank empty - turning pump OFF");
      // Either drinker is full or main tank is empty, turn off pump
      if (pumpState) {
        pumpState = false;
        digitalWrite(RELAY_PUMP, !pumpState); // Invert because relays are active LOW
        logEvent("automatic", "Water pump automatically deactivated");
      }
    }
  }
}

// Calculate recommended feed amount based on age group and chicken count
int calculateRecommendedFeedAmount() {
  int gramsPerChicken = 0;
  
  if (currentAgeGroup == "chick") {
    gramsPerChicken = 50; // 50g per chick per day
  } else if (currentAgeGroup == "grower") {
    gramsPerChicken = 100; // 100g per grower per day
  } else { // adult
    gramsPerChicken = 150; // 150g per adult per day
  }
  
  return gramsPerChicken * chickenCount;
}

// Calculate servo open time based on grams
float calculateServoOpenTime(int grams) {
  // Calibration: 1 second = 50g of feed at 45 degrees
  return grams / GRAMS_PER_SECOND;
}

// Activate feeder with intelligent feeding
void activateFeederWithDuration(float duration) {
  Serial.print("Activating feeder with duration: ");
  Serial.print(duration);
  Serial.println(" seconds");
  
  // Calculate grams based on duration (50g per second)
  int gramsDispensed = duration * GRAMS_PER_SECOND;
  
  // Log feeding event BEFORE activating the servo
  String description = "Dispensed " + String(gramsDispensed) + "g of feed for " + 
                      String(chickenCount) + " " + currentAgeGroup + " chickens";
  logEvent("feeding", description);
  
  // Log feeding data for analytics
  logFeedingData(gramsDispensed, currentAgeGroup, chickenCount);
  
  // Open the servo for the specified duration
  feederServo.write(SERVO_OPEN_ANGLE); // Open position (45 degrees)
  delay(duration * 1000); // Convert seconds to milliseconds
  feederServo.write(SERVO_CLOSE_ANGLE); // Close position (0 degrees)
  
  // Ensure the servo has time to close completely
  delay(1000);
  
  // Update last feeding time
  lastFeedingTime = millis();
  
  // Double-check that the servo is closed
  feederServo.write(SERVO_CLOSE_ANGLE);
}

// Original feeder activation function (for backward compatibility)
void activateFeeder() {
  Serial.println("Activating feeder with intelligent feeding");
  
  // Calculate recommended feed amount
  int recommendedGrams = calculateRecommendedFeedAmount();
  
  // Calculate servo open time
  float openTime = calculateServoOpenTime(recommendedGrams);
  
  // Activate feeder with calculated duration
  activateFeederWithDuration(openTime);
}

// Improve the checkFeedingSchedule function to be more reliable
void checkFeedingSchedule() {
  time_t now;
  struct tm timeinfo;
  time(&now);
  localtime_r(&now, &timeinfo);
  
  int currentHour = timeinfo.tm_hour;
  int currentMinute = timeinfo.tm_min;
  
  // Check if we're in a cooldown period after feeding
  unsigned long currentMillis = millis();
  if (feedingCooldown > 0 && currentMillis - lastFeedingTime < feedingCooldown) {
    // Still in cooldown period, don't process scheduled feeding
    return;
  }
  
  // Check for custom feeding schedule from Firebase
  if (Firebase.ready() && signupOK) {
    // Get feeding schedule JSON from Firebase
    if (Firebase.RTDB.getJSON(&fbdo, "/feedingSchedule")) {
      FirebaseJson *json = fbdo.jsonObjectPtr();
      if (json != NULL) {
        FirebaseJsonData result;
        
        // Check if current hour is scheduled for feeding
        String hourKey = String(currentHour);
        json->get(result, hourKey);
        
        // Only activate if we're in the first minute of the hour to prevent feeding on boot
        if (result.success && result.to<bool>() == true && currentMinute == 0 && lastFeedingHour != currentHour) {
          Serial.print("Scheduled feeding for hour ");
          Serial.print(currentHour);
          Serial.println(" triggered");
          
          // Use the current feeding settings from Intelligent Feeding Control
          activateFeeder();
          lastFeedingHour = currentHour;
          lastFeedingTime = currentMillis;
          feedingCooldown = 10000; // 10 second cooldown
          
          // Log the scheduled feeding event
          logEvent("scheduledFeeding", "Scheduled feeding activated at hour " + String(currentHour));
        }
      }
    }
  }
  
  // Reset lastFeedingHour if the hour has changed
  if (lastFeedingHour != -1 && lastFeedingHour != currentHour) {
    lastFeedingHour = -1;
  }
}

// Improve the checkWaterSchedule function to be more reliable
void checkWaterSchedule() {
  time_t now;
  struct tm timeinfo;
  time(&now);
  localtime_r(&now, &timeinfo);
  
  int currentHour = timeinfo.tm_hour;
  int currentMinute = timeinfo.tm_min;
  
  // Check if we're in a cooldown period after water filling
  unsigned long currentMillis = millis();
  if (waterFillCooldown > 0 && currentMillis - lastWaterFillTime < waterFillCooldown) {
    // Still in cooldown period, don't process scheduled water filling
    return;
  }
  
  // Check if auto water is enabled
  if (!autoWaterEnabled) {
    return;
  }
  
  // Check for custom water schedule from Firebase
  if (Firebase.ready() && signupOK) {
    // Get water schedule JSON from Firebase
    if (Firebase.RTDB.getJSON(&fbdo, "/waterSchedule")) {
      FirebaseJson *json = fbdo.jsonObjectPtr();
      if (json != NULL) {
        FirebaseJsonData result;
        
        // Check if current hour is scheduled for water filling
        String hourKey = String(currentHour);
        json->get(result, hourKey);
        
        // Only activate if we're in the first minute of the hour to prevent filling on boot
        if (result.success && result.to<bool>() == true && currentMinute == 0 && lastWaterFillHour != currentHour) {
          Serial.print("Scheduled water filling for hour ");
          Serial.print(currentHour);
          Serial.println(" triggered");
          
          // Fill water using current settings
          fillWater(waterFillDuration);
          lastWaterFillHour = currentHour;
          lastWaterFillTime = currentMillis;
          waterFillCooldown = 10000; // 10 second cooldown
          
          // Log the scheduled water filling event
          logEvent("scheduledWaterFill", "Scheduled water filling activated at hour " + String(currentHour));
        }
      }
    }
  }
  
  // Reset lastWaterFillHour if the hour has changed
  if (lastWaterFillHour != -1 && lastWaterFillHour != currentHour) {
    lastWaterFillHour = -1;
  }
}

void loop() {
  unsigned long currentMillis = millis();
  
  // Read sensors and update Firebase every interval
  if (currentMillis - previousMillis >= interval) {
    previousMillis = currentMillis;
    
    // Read sensors
    readSensors();
      
    // Check and update alerts
    checkAndUpdateAlerts();
    
    // Update Firebase
    updateFirebase();
    
    // Check for manual controls from Firebase
    checkManualControls();
    
    // Apply automation if enabled
    if (automationEnabled) {
      applyAutomation();
    } else {
      Serial.println("Automation disabled - using manual controls");
    }
    
    // Check feeding schedule
    checkFeedingSchedule();
    
    // Check water schedule
    checkWaterSchedule();
    
    // Reset daily water counters at midnight
    resetDailyWaterCounters();
  }
  
  // Update history at separate intervals
  updateHistory();
  
  // Periodically check if the servo is in the correct position
  if (currentMillis % 60000 == 0) { // Every minute
    if (!isFeeding) {
      // Make sure servo is closed when not feeding
      feederServo.write(SERVO_CLOSE_ANGLE);
    }
  }
}
