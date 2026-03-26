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
const isFileProtocol = window.location.protocol === "file:";

const form = document.getElementById("garageForm");
const status = document.getElementById("status");

// Helper: sign in with Google if not already signed in
function signInIfNeeded() {
  if (auth.currentUser) {
    return Promise.resolve(auth.currentUser);
  }

  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();

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

if (!form || !status) {
  throw new Error("Register form elements were not found on the page.");
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  status.textContent = "";

  try {
    if (isFileProtocol) {
      status.textContent = "Open this page from http://localhost, not directly as a file, before signing in.";
      return;
    }

    const user = await signInIfNeeded();
    const name = document.getElementById("name").value.trim();
    const address = document.getElementById("address").value.trim();
    const totalSpots = Number.parseInt(document.getElementById("totalSpots").value, 10);
    const availableSpots = Number.parseInt(document.getElementById("availableSpots").value, 10);
    const pricePerHour = Number(document.getElementById("pricePerHour").value);

    if (!name || !address) {
      status.textContent = "Please enter a lot name and address.";
      return;
    }

    if (!Number.isInteger(totalSpots) || totalSpots <= 0) {
      status.textContent = "Total spots must be a whole number greater than 0.";
      return;
    }

    if (!Number.isInteger(availableSpots) || availableSpots < 0) {
      status.textContent = "Available spots must be a whole number 0 or greater.";
      return;
    }

    if (availableSpots > totalSpots) {
      status.textContent = "Available spots cannot be greater than total spots.";
      return;
    }

    if (Number.isNaN(pricePerHour) || pricePerHour < 0) {
      status.textContent = "Price per hour must be 0 or greater.";
      return;
    }

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

    if (error?.code === "auth/unauthorized-domain") {
      status.textContent = "Google sign-in is blocked for this domain. Add your site domain in Firebase Auth Authorized domains and use localhost instead of opening the file directly.";
      return;
    }

    if (error?.code === "auth/operation-not-allowed") {
      status.textContent = "Google sign-in is not enabled for this Firebase project. Turn on Google in Firebase Authentication -> Sign-in method.";
      return;
    }

    status.textContent = "Error saving lot: " + (error.message || error);
  }
});
