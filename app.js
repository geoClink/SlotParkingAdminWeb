import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  GeoPoint,
  where,
  writeBatch
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
const geoapifyApiKey = "3ce85642e3ae4b1387ce2949d50dceb6";
const authSection = document.getElementById("authSection");
const authStatus = document.getElementById("authStatus");
const sessionSection = document.getElementById("sessionSection");
const sessionUserEmail = document.getElementById("sessionUserEmail");
const logoutButton = document.getElementById("logoutButton");
const logoutStatus = document.getElementById("logoutStatus");
const addressInput = document.getElementById("address");
const addressSuggestions = document.getElementById("addressSuggestions");
const validateAddressButton = document.getElementById("validateAddressButton");
const addressStatus = document.getElementById("addressStatus");
const registeredLotsSection = document.getElementById("registeredLotsSection");
const registeredLotsStatus = document.getElementById("registeredLotsStatus");
const registeredLotsList = document.getElementById("registeredLotsList");
let validatedAddressResult = null;
let addressSuggestionsAbortController = null;
let addressSuggestionsDebounce = null;

function setAddressFeedback(message) {
  if (addressStatus) addressStatus.textContent = message;
}

function setLogoutFeedback(message) {
  if (logoutStatus) logoutStatus.textContent = message;
  if (status) status.textContent = message;
}

function normalizeAddress(address) {
  return address.trim().replace(/\s+/g, " ").toLowerCase();
}

function getAddressIndexId(normalizedAddress) {
  return encodeURIComponent(normalizedAddress);
}

function hasGeoapifyKey() {
  return geoapifyApiKey && geoapifyApiKey !== "YOUR_GEOAPIFY_API_KEY";
}

function buildGeoapifyAutocompleteUrl(text, limit = 5) {
  const requestUrl = new URL("https://api.geoapify.com/v1/geocode/autocomplete");
  requestUrl.searchParams.set("text", text);
  requestUrl.searchParams.set("format", "json");
  requestUrl.searchParams.set("filter", "countrycode:us");
  requestUrl.searchParams.set("limit", String(limit));
  requestUrl.searchParams.set("apiKey", geoapifyApiKey);
  return requestUrl;
}

function normalizeGeoapifyResults(payload) {
  const results = payload?.results || [];
  return results
    .filter((result) => result?.formatted && result?.lat && result?.lon)
    .map((result) => ({
      address: result.formatted,
      latitude: Number(result.lat),
      longitude: Number(result.lon),
      resultType: result.result_type || "unknown"
    }));
}

function hideAddressSuggestions() {
  if (addressSuggestions) {
    addressSuggestions.hidden = true;
    addressSuggestions.innerHTML = "";
  }
}

function selectAddressSuggestion(result) {
  validatedAddressResult = result;
  addressInput.value = result.address;
  hideAddressSuggestions();
  setAddressFeedback("Address selected.");
}

function renderAddressSuggestions(results) {
  if (!addressSuggestions) {
    return;
  }

  addressSuggestions.innerHTML = "";

  if (!results.length) {
    hideAddressSuggestions();
    return;
  }

  results.forEach((result) => {
    const suggestionButton = document.createElement("button");
    suggestionButton.type = "button";
    suggestionButton.className = "address-suggestion";
    suggestionButton.textContent = result.address;
    suggestionButton.addEventListener("click", () => {
      selectAddressSuggestion(result);
    });
    addressSuggestions.appendChild(suggestionButton);
  });

  addressSuggestions.hidden = false;
}

function clearValidatedAddress() {
  validatedAddressResult = null;
  if (addressInput.value.trim()) {
    setAddressFeedback("Choose a suggested address or click Validate Address.");
  } else {
    setAddressFeedback("Start typing an address.");
  }
}

async function fetchAddressSuggestions(searchText) {
  if (!hasGeoapifyKey()) {
    hideAddressSuggestions();
    setAddressFeedback("Add your Geoapify API key in app.js to enable address suggestions.");
    return;
  }

  if (searchText.length < 3) {
    hideAddressSuggestions();
    return;
  }

  if (addressSuggestionsAbortController) {
    addressSuggestionsAbortController.abort();
  }

  addressSuggestionsAbortController = new AbortController();

  try {
    const response = await fetch(buildGeoapifyAutocompleteUrl(searchText).toString(), {
      signal: addressSuggestionsAbortController.signal,
      headers: {
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      throw new Error("Could not load address suggestions.");
    }

    const results = normalizeGeoapifyResults(await response.json());
    renderAddressSuggestions(results);
  } catch (error) {
    if (error.name === "AbortError") {
      return;
    }

    hideAddressSuggestions();
    console.error("Address suggestions failed", error);
  }
}

async function validateAddress() {
  const address = addressInput.value.trim();

  if (!address) {
    validatedAddressResult = null;
    setAddressFeedback("Enter an address first.");
    return null;
  }

  validateAddressButton.disabled = true;
  setAddressFeedback("Validating address...");

  try {
    if (!hasGeoapifyKey()) {
      throw new Error("Missing Geoapify API key.");
    }

    const response = await fetch(buildGeoapifyAutocompleteUrl(address, 1).toString(), {
      headers: {
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      throw new Error("Address lookup failed.");
    }

    const results = normalizeGeoapifyResults(await response.json());
    const firstResult = results[0];

    if (!firstResult) {
      throw new Error("No matching address found.");
    }

    selectAddressSuggestion(firstResult);
    setAddressFeedback("Address validated.");
    return validatedAddressResult;
  } catch (error) {
    validatedAddressResult = null;
    setAddressFeedback("Could not validate that address. Choose a suggestion or check your Geoapify API key.");
    console.error("Address validation failed", error);
    return null;
  } finally {
    validateAddressButton.disabled = false;
  }
}

function generateUuid() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
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

    const uuidLine = document.createElement("p");
    uuidLine.className = "lot-card__uuid";
    uuidLine.textContent = `UUID: ${lot.uuid || lot.id}`;

    const statusLine = document.createElement("p");
    statusLine.className = "lot-card__status";
    statusLine.textContent = `Status: ${lot.status || "pending"}`;

    lotCard.append(title, addressLine, details, uuidLine, statusLine);
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
    const lotsSnapshot = await getDocs(
      query(collection(db, "lots"), where("ownerId", "==", auth.currentUser.uid))
    );
    const userLots = lotsSnapshot.docs
      .map((lotDoc) => ({ id: lotDoc.id, ...lotDoc.data() }))
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
    validatedAddressResult = null;
    hideAddressSuggestions();
    setAddressFeedback("");
  }
});

if (!form || !status || !authSection || !authStatus || !sessionSection || !sessionUserEmail || !logoutButton || !logoutStatus || !addressInput || !addressSuggestions || !validateAddressButton || !addressStatus || !registeredLotsSection || !registeredLotsStatus || !registeredLotsList) {
  throw new Error("Required page elements were not found.");
}

// Expose auth functions for inline HTML button handlers
window.signInWithGoogle = signInWithGoogle;
window.signInWithApple = signInWithApple;
window.signUpWithEmail = signUpWithEmail;
window.signInWithEmail = signInWithEmail;
window.handleLogout = handleLogout;

logoutButton.addEventListener("click", handleLogout);
validateAddressButton.addEventListener("click", validateAddress);
addressInput.addEventListener("input", () => {
  clearValidatedAddress();

  if (addressSuggestionsDebounce) {
    window.clearTimeout(addressSuggestionsDebounce);
  }

  addressSuggestionsDebounce = window.setTimeout(() => {
    fetchAddressSuggestions(addressInput.value.trim());
  }, 250);
});
addressInput.addEventListener("focus", () => {
  if (addressInput.value.trim().length >= 3) {
    fetchAddressSuggestions(addressInput.value.trim());
  }
});
document.addEventListener("click", (event) => {
  if (event.target !== addressInput && !addressSuggestions.contains(event.target)) {
    hideAddressSuggestions();
  }
});
setAddressFeedback(hasGeoapifyKey() ? "Start typing and choose a suggested address." : "Add your Geoapify API key in app.js to enable address suggestions.");

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
    const rawAddress = addressInput.value.trim();
    const normalizedAddress = normalizeAddress(rawAddress);
    const totalSpots = Number.parseInt(document.getElementById("totalSpots").value, 10);
    const availableSpots = Number.parseInt(document.getElementById("availableSpots").value, 10);
    const pricePerHour = Number(document.getElementById("pricePerHour").value);

    if (!name || !rawAddress) {
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

    const validatedLocation =
      validatedAddressResult && normalizeAddress(validatedAddressResult.address) === normalizeAddress(rawAddress)
        ? validatedAddressResult
        : await validateAddress();

    if (!validatedLocation) {
      status.textContent = "Please validate the address before saving.";
      return;
    }

    const address = validatedLocation.address;
    const latitude = validatedLocation.latitude;
    const longitude = validatedLocation.longitude;
    const validatedNormalizedAddress = normalizeAddress(address);

    const lotId = generateUuid();
    const addressIndexId = getAddressIndexId(validatedNormalizedAddress);
    const batch = writeBatch(db);

    batch.set(doc(db, "lots", lotId), {
      uuid: lotId,
      name: name,
      address: address,
      addressNormalized: validatedNormalizedAddress,
      location: new GeoPoint(latitude, longitude),
      totalSpots: totalSpots,
      availableSpots: availableSpots,
      pricePerHour: pricePerHour,
      status: "pending",
      ownerId: user.uid,
      updatedAt: serverTimestamp()
    });

    batch.set(doc(db, "lotAddressIndex", addressIndexId), {
      addressNormalized: validatedNormalizedAddress,
      lotId: lotId,
      ownerId: user.uid,
      createdAt: serverTimestamp()
    });

    await batch.commit();

    status.textContent = "Lot saved successfully and is pending approval.";
    form.reset();
    validatedAddressResult = null;
    hideAddressSuggestions();
    setAddressFeedback(hasGeoapifyKey() ? "Start typing and choose a suggested address." : "Add your Geoapify API key in app.js to enable address suggestions.");
    await loadRegisteredLots();
  } catch (error) {
    console.error(error);

    if (error?.code === "permission-denied") {
      status.textContent = "Save blocked by Firestore rules. This usually means the address is already registered or your rules need to allow owner access.";
      return;
    }

    status.textContent = "Error saving lot: " + (error.message || error);
  }
});
