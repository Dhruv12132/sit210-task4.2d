
#define ENABLE_USER_AUTH
#define ENABLE_FIRESTORE

#include <FirebaseClient.h>
#include <ArduinoJson.h>
#include "ExampleFunctions.h"

#define WIFI_SSID "Oneplus"
#define WIFI_PASSWORD "123456789"

#define API_KEY "AIzaSyCYDyZ1oUKBc-9MCWWVrvDByNTNDqK3KM0"
#define USER_EMAIL "dhruvgoyal.dg12@gmail.com"
#define USER_PASSWORD "Dhruv123*"
#define FIREBASE_PROJECT_ID "sit210-embedded"

const int livingLED = 2;
const int bathroomLED = 3;
const int closetLED = 4;

SSL_CLIENT ssl_client;

using AsyncClient = AsyncClientClass;
AsyncClient aClient(ssl_client);

UserAuth user_auth(API_KEY, USER_EMAIL, USER_PASSWORD, 3000);
FirebaseApp app;
Firestore::Documents Docs;

unsigned long lastCheck = 0;
const unsigned long checkInterval = 1000;

bool readRoomState(String documentPath, int ledPin)
{
    String payload = Docs.get(
        aClient,
        Firestore::Parent(FIREBASE_PROJECT_ID),
        documentPath,
        GetDocumentOptions()
    );

    if (aClient.lastError().code() != 0)
    {
        Serial.print("Firestore error: ");
        Serial.println(aClient.lastError().message());
        return false;
    }

    DynamicJsonDocument json(1024);

    DeserializationError error = deserializeJson(json, payload);

    if (error)
    {
        Serial.println("Could not read the Firestore response.");
        return false;
    }

    if (json["fields"]["state"]["booleanValue"].is<bool>())
    {
        bool state = json["fields"]["state"]["booleanValue"];
        digitalWrite(ledPin, state ? HIGH : LOW);

        Serial.print(documentPath);
        Serial.print(": ");
        Serial.println(state ? "ON" : "OFF");

        return true;
    }

    Serial.println("The state field is missing or is not Boolean.");
    return false;
}

void setup()
{
    Serial.begin(115200);

    pinMode(livingLED, OUTPUT);
    pinMode(bathroomLED, OUTPUT);
    pinMode(closetLED, OUTPUT);

    digitalWrite(livingLED, LOW);
    digitalWrite(bathroomLED, LOW);
    digitalWrite(closetLED, LOW);

    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    Serial.print("Connecting to Wi-Fi");

    while (WiFi.status() != WL_CONNECTED)
    {
        Serial.print(".");
        delay(300);
    }

    Serial.println();
    Serial.println("Wi-Fi connected.");

    set_ssl_client_insecure_and_buffer(ssl_client);

    initializeApp(
        aClient,
        app,
        getAuth(user_auth),
        auth_debug_print,
        "authTask"
    );

    app.getApp<Firestore::Documents>(Docs);
}

void loop()
{
    app.loop();

    if (app.ready() &&
        (lastCheck == 0 || millis() - lastCheck >= checkInterval))
    {
        lastCheck = millis();

        readRoomState("rooms/living_room", livingLED);
        readRoomState("rooms/bathroom", bathroomLED);
        readRoomState("rooms/closet", closetLED);
    }
}
