
import { initializeApp } from
    "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";

import {
    getFirestore,
    doc,
    setDoc,
    onSnapshot
} from
    "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

import {
    getAuth,
    onAuthStateChanged,
    signInAnonymously
} from
    "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";


// Firebase configuration for sit210-embedded
const firebaseConfig = {
    apiKey: "AIzaSyCYDyZ1oUKBc-9MCWWVrvDByNTNDqK3KM0",
    authDomain: "sit210-embedded.firebaseapp.com",
    projectId: "sit210-embedded",
    storageBucket: "sit210-embedded.firebasestorage.app",
    messagingSenderId: "240415096720",
    appId: "1:240415096720:web:6c8642ada0f9f3d679fd15",
    measurementId: "G-ZYHXXLVMJ8"
};


// Start Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);


// HTML elements
const connection = document.getElementById("connection");

const rooms = {
    living_room: {
        name: "Living Room",
        button: document.getElementById("livingBtn"),
        status: document.getElementById("livingStatus"),
        state: false
    },

    bathroom: {
        name: "Bathroom",
        button: document.getElementById("bathroomBtn"),
        status: document.getElementById("bathroomStatus"),
        state: false
    },

    closet: {
        name: "Closet",
        button: document.getElementById("closetBtn"),
        status: document.getElementById("closetStatus"),
        state: false
    }
};


let ready = false;
let signingIn = false;
let listenersStarted = false;


// Update button and status
function updateLight(room, state) {
    room.state = state;

    room.status.textContent = state ? "ON" : "OFF";
    room.button.textContent = state ? "Turn OFF" : "Turn ON";
}


// Read live changes from Firestore
function listenToRooms() {
    if (listenersStarted) return;

    listenersStarted = true;

    for (const [id, room] of Object.entries(rooms)) {
        const roomRef = doc(db, "rooms", id);

        onSnapshot(
            roomRef,
            (snapshot) => {
                if (snapshot.exists()) {
                    const data = snapshot.data();
                    updateLight(room, data.state === true);
                } else {
                    updateLight(room, false);
                }
            },
            (error) => {
                console.error("Firestore read error:", error);
                connection.textContent =
                    "Database read failed: " + error.message;
            }
        );
    }
}


// Send a command to Firestore
async function toggleLight(id) {
    if (!ready) {
        connection.textContent =
            "Firebase is still connecting. Please wait.";
        return;
    }

    const room = rooms[id];
    const newState = !room.state;

    room.button.disabled = true;

    try {
        await setDoc(
            doc(db, "rooms", id),
            {
                name: room.name,
                state: newState
            },
            { merge: true }
        );

        connection.textContent =
            room.name + " command saved to Firestore.";
    } catch (error) {
        console.error("Firestore write error:", error);
        connection.textContent =
            "Could not update light: " + error.message;
    } finally {
        room.button.disabled = false;
    }
}


// Button events
rooms.living_room.button.addEventListener("click", () => {
    toggleLight("living_room");
});

rooms.bathroom.button.addEventListener("click", () => {
    toggleLight("bathroom");
});

rooms.closet.button.addEventListener("click", () => {
    toggleLight("closet");
});


// Check authentication and sign in if necessary
onAuthStateChanged(auth, async (user) => {
    if (user) {
        ready = true;

        connection.textContent =
            "Firebase connected successfully.";

        console.log("Signed in user:", user.uid);

        listenToRooms();
    } else if (!signingIn) {
        signingIn = true;
        ready = false;

        connection.textContent = "Signing in to Firebase...";

        try {
            await signInAnonymously(auth);
        } catch (error) {
            console.error("Authentication error:", error);

            connection.textContent =
                "Sign-in failed: " + error.message;
        } finally {
            signingIn = false;
        }
    }
});
