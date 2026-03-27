import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  setDoc,
  serverTimestamp,
  GeoPoint
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  OAuthProvider,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
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
const authSection = document.getElementById("authSection");
const authStatus = document.getElementById("authStatus");
const sessionSection = document.getElementById("sessionSection");
const sessionUserEmail = document.getElementById("sessionUserEmail");
const logoutButton = document.getElementById("logoutButton");
const logoutStatus = document.getElementById("logoutStatus");
const registeredLotsSection = document.getElementById("registeredLotsSection");
const registeredLotsStatus = document.getElementById("registeredLotsStatus");
const registeredLotsList = document.getElementById("registeredLotsList");

function setLogoutFeedback(message) {
  if (logoutStatus) logoutStatus.textContent = message;
  if (status) status.textContent = message;
}

function normalizeAddress(address) {
  return address.trim().replace(/\s+/g, " ").toLowerCase();
}

function formatPrice(pricePerHour) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(pricePerHour);
}

function clearRegisteredLots() {
  registeredLotsList.innerHTML = "";
}

function renderRegisteredLots(lots) {
  clearRegisteredLots();

  if (!lots.length) {
    registeredLotsStatus.textContent = "No registered lots yet.";
    return;
  }

  registeredLotsStatus.textContent = `${lots.length} registered lot${lots.length === 1 ? "" : "s"}.`;

  lots.forEach((lot) => {
    const lotCard = document.createElement("article");
    lotCard.className = "lot-card";

    const title = document.createElement("h3");
    title.textContent = lot.name || "Untitled Lot";

    const addressLine = document.createElement("p");
    addressLine.textContent = lot.address || "No address provided";

    const details = document.createElement("p");
    details.className = "lot-card__meta";
    details.textContent = `${lot.availableSpots}/${lot.totalSpots} spots available • ${formatPrice(Number(lot.pricePerHour || 0))}/hr`;

    const statusLine = document.createElement("p");
    statusLine.className = "lot-card__status";
    statusLine.textContent = `Status: ${lot.status || "pending"}`;

    lotCard.append(title, addressLine, details, statusLine);
    registeredLotsList.appendChild(lotCard);
  });
}

async function loadRegisteredLots() {
  if (!auth.currentUser) {
    clearRegisteredLots();
    registeredLotsStatus.textContent = "";
    if (registeredLotsSection) registeredLotsSection.hidden = true;
    return;
  }

  if (registeredLotsSection) registeredLotsSection.hidden = false;
  registeredLotsStatus.textContent = "Loading registered lots...";

  try {
    const lotsSnapshot = await getDocs(collection(db, "lots"));
    const userLots = lotsSnapshot.docs
      .map((lotDoc) => ({ id: lotDoc.id, ...lotDoc.data() }))
      .filter((lot) => lot.ownerId === auth.currentUser.uid)
      .sort((a, b) => {
        const aTime = a.updatedAt?.seconds || 0;
        const bTime = b.updatedAt?.seconds || 0;
        return bTime - aTime;
      });

    renderRegisteredLots(userLots);
  } catch (error) {
    clearRegisteredLots();
    registeredLotsStatus.textContent = "Could not load registered lots.";
    console.error("Failed to load registered lots", error);
  }
}

// --- Explicit auth actions ---

export async function signInWithGoogle() {
  if (isFileProtocol) {
    authStatus.textContent = "Open this page from http://localhost, not directly as a file, before signing in.";
    return;
  }
  try {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  } catch (error) {
    authStatus.textContent = "Google sign-in failed: " + (error.message || error);
  }
}

export async function signInWithApple() {
  if (isFileProtocol) {
    authStatus.textContent = "Open this page from http://localhost, not directly as a file, before signing in.";
    return;
  }
  try {
    const provider = new OAuthProvider("apple.com");
    await signInWithPopup(auth, provider);
  } catch (error) {
    authStatus.textContent = "Apple sign-in failed: " + (error.message || error);
  }
}

export async function signUpWithEmail() {
  if (isFileProtocol) {
    authStatus.textContent = "Open this page from http://localhost, not directly as a file, before signing in.";
    return;
  }
  const email = document.getElementById("authEmail").value.trim();
  const password = document.getElementById("authPassword").value;
  if (!email || !password) {
    authStatus.textContent = "Please enter an email and password.";
    return;
  }
  try {
    await createUserWithEmailAndPassword(auth, email, password);
  } catch (error) {
    authStatus.textContent = "Sign-up failed: " + (error.message || error);
  }
}

export async function signInWithEmail() {
  if (isFileProtocol) {
    authStatus.textContent = "Open this page from http://localhost, not directly as a file, before signing in.";
    return;
  }
  const email = document.getElementById("authEmail").value.trim();
  const password = document.getElementById("authPassword").value;
  if (!email || !password) {
    authStatus.textContent = "Please enter an email and password.";
    return;
  }
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    authStatus.textContent = "Sign-in failed: " + (error.message || error);
  }
}

export async function handleLogout(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  logoutButton.disabled = true;
  setLogoutFeedback("Signing out...");
  authStatus.textContent = "";

  if (!auth.currentUser) {
    if (authSection) authSection.hidden = false;
    if (form) form.hidden = true;
    if (registeredLotsSection) registeredLotsSection.hidden = true;
    if (sessionUserEmail) sessionUserEmail.textContent = "";
    setLogoutFeedback("You are already signed out.");
    logoutButton.disabled = false;
    return;
  }

  try {
    await signOut(auth);
    if (authSection) authSection.hidden = false;
    if (form) form.hidden = true;
    if (registeredLotsSection) registeredLotsSection.hidden = true;
    if (sessionUserEmail) sessionUserEmail.textContent = "";
    clearRegisteredLots();
    registeredLotsStatus.textContent = "";
    setLogoutFeedback("You have been signed out.");
  } catch (error) {
    const message = "Logout failed: " + (error.message || error);
    setLogoutFeedback(message);
    authStatus.textContent = message;
    console.error("Logout failed", error);
  } finally {
    logoutButton.disabled = false;
  }
}

// Show/hide auth panel vs form based on auth state
onAuthStateChanged(auth, (user) => {
  if (authSection) authSection.hidden = !!user;
  if (form) form.hidden = !user;
  if (registeredLotsSection) registeredLotsSection.hidden = !user;
  if (sessionUserEmail) sessionUserEmail.textContent = user?.email || "current user";
  if (user) {
    if (logoutStatus) logoutStatus.textContent = "";
    if (status) status.textContent = "";
    loadRegisteredLots();
  } else if (form) {
    form.reset();
    clearRegisteredLots();
    registeredLotsStatus.textContent = "";
  }
});

if (!form || !status || !authSection || !authStatus || !sessionSection || !sessionUserEmail || !logoutButton || !logoutStatus || !registeredLotsSection || !registeredLotsStatus || !registeredLotsList) {
  throw new Error("Required page elements were not found.");
}

// Expose auth functions for inline HTML button handlers
window.signInWithGoogle = signInWithGoogle;
window.signInWithApple = signInWithApple;
window.signUpWithEmail = signUpWithEmail;
window.signInWithEmail = signInWithEmail;
window.handleLogout = handleLogout;

logoutButton.addEventListener("click", handleLogout);

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  status.textContent = "";

  try {
    const user = auth.currentUser;
    if (!user) {
      status.textContent = "You must be signed in to save a lot.";
      return;
    }
    const name = document.getElementById("name").value.trim();
    const address = document.getElementById("address").value.trim();
    const normalizedAddress = normalizeAddress(address);
    const totalSpots = Number.parseInt(document.getElementById("totalSpots").value, 10);
    const availableSpots = Number.parseInt(document.getElementById("availableSpots").value, 10);
    const pricePerHour = Number(document.getElementById("pricePerHour").value);

    if (!name || !address) {
      status.textContent = "Please enter a lot name and address.";
      return;
    }

    const existingLotsSnapshot = await getDocs(collection(db, "lots"));
    const duplicateLot = existingLotsSnapshot.docs.find((lotDoc) => {
      const existingAddress = lotDoc.data().addressNormalized || lotDoc.data().address || "";
      return normalizeAddress(existingAddress) === normalizedAddress;
    });

    if (duplicateLot) {
      status.textContent = "A parking lot with this address is already registered.";
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
      addressNormalized: normalizedAddress,
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
    await loadRegisteredLots();
  } catch (error) {
    console.error(error);

    status.textContent = "Error saving lot: " + (error.message || error);
  }
});
