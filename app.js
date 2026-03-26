import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import {
  getFirestore,
  doc,
  setDoc,
  serverTimestamp,
  GeoPoint
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyBTyPvvKam6hVF_P5wrORdg0_LhE8H-gI8",
  authDomain: "slotpark.firebaseapp.com",
  projectId: "slotpark",
  storageBucket: "slotpark.firebasestorage.app",
  messagingSenderId: "767849647875",
  appId: "1:767849647875:web:5d790ef6c5fd3643b52336",
  measurementId: "G-CR7PT426BS"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const analytics = getAnalytics(app);

const form = document.getElementById("garageForm");
const status = document.getElementById("status");

// Helper: sign in with Google if not already signed in
function signInIfNeeded() {
  return new Promise((resolve, reject) => {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        resolve(user);
      } else {
        const provider = new GoogleAuthProvider();
        signInWithPopup(auth, provider)
          .then((result) => resolve(result.user))
          .catch(reject);
      }
    });
  });
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  status.textContent = "";

  try {
    const user = await signInIfNeeded();
    const name = document.getElementById("name").value.trim();
    const address = document.getElementById("address").value.trim();
    const totalSpots = Number(document.getElementById("totalSpots").value);
    const availableSpots = Number(document.getElementById("availableSpots").value);
    const pricePerHour = Number(document.getElementById("pricePerHour").value);

    // Geocode address to get latitude and longitude
    const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
    const geoResp = await fetch(geocodeUrl);
    const geoData = await geoResp.json();
    if (!geoData.length) {
      status.textContent = "Could not geocode address. Please enter a valid address.";
      return;
    }
    const latitude = parseFloat(geoData[0].lat);
    const longitude = parseFloat(geoData[0].lon);

    // Generate a unique lotId (could use name + timestamp or Firestore auto-id)
    const lotId = name.replace(/\s+/g, "_").toLowerCase() + "_" + Date.now();

    await setDoc(doc(db, "lots", lotId), {
      name: name,
      address: address,
      location: new GeoPoint(latitude, longitude),
      totalSpots: totalSpots,
      availableSpots: availableSpots,
      pricePerHour: pricePerHour,
      status: "pending",
      ownerId: user.uid,
      updatedAt: serverTimestamp()
    });

    status.textContent = "Lot saved successfully and is pending approval.";
    form.reset();
  } catch (error) {
    console.error(error);
    status.textContent = "Error saving lot: " + (error.message || error);
  }
});