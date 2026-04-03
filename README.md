# SlotParking Admin Web

A web-based admin platform for registering and managing parking lots. Parking lot owners can sign in, register their lots with address validation and geocoding, and track spot availability and pricing.

## Features

- **Multi-provider authentication** — Sign in with Email/Password, Google, or Apple
- **Address autocomplete & validation** — Powered by Geoapify with real-time suggestions and geocoding
- **Lot registration** — Add lots with name, address, spot counts, and hourly pricing
- **Lot registry** — View all registered lots for the signed-in owner, sorted by most recently updated
- **Duplicate prevention** — Normalized address indexing to prevent duplicate lot entries
- **Pending approval workflow** — Newly registered lots are flagged as `pending` for admin review

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, CSS3, JavaScript (ES6 Modules) |
| Auth & Database | Firebase v11 (Authentication + Firestore) |
| Address Services | Geoapify API (autocomplete + geocoding) |
| Hosting | GitHub Pages (`/docs` directory) |
| Dev Server | VSCode Live Server (port 5502) |

## Getting Started

### Prerequisites

- VSCode with the [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension
- A modern browser (Chrome, Firefox, Safari, Edge)

### Running Locally

1. Clone the repository:
   ```bash
   git clone https://github.com/geoClink/SlotParkingAdminWeb.git
   cd SlotParkingAdminWeb
   ```

2. Open the project folder in VSCode.

3. Right-click `docs/index.html` and select **"Open with Live Server"**.

4. The app will open at `http://localhost:5502`.

> **Note:** The app must be served over HTTP/HTTPS. Opening `index.html` directly via `file://` will not work due to Firebase authentication restrictions.

Alternatively, use any static file server:
```bash
python3 -m http.server 5502
# Then open http://localhost:5502/docs/index.html
```

## Project Structure

```
SlotParkingVSCode/
├── app.js              # Root-level app (development copy)
├── docs/
│   ├── index.html      # Main UI entry point
│   ├── style.css       # Styling and design system
│   ├── app.js          # Production app logic (Firebase, auth, forms)
│   └── script.js       # Legacy/experimental multi-view prototype
└── .vscode/
    └── settings.json   # Live Server port configuration
```

## Data Model

Lots are stored in Firestore under two collections:

**`lots`**
```json
{
  "uuid": "string",
  "name": "string",
  "address": "string",
  "addressNormalized": "string",
  "location": "GeoPoint(lat, lng)",
  "totalSpots": "number",
  "availableSpots": "number",
  "pricePerHour": "number",
  "status": "pending",
  "ownerId": "string",
  "updatedAt": "timestamp"
}
```

**`lotAddressIndex`** — Prevents duplicate registrations by normalized address.

## Configuration

Firebase and Geoapify credentials are currently hardcoded in `docs/app.js`. To use your own backend:

1. Replace the `firebaseConfig` object (lines ~24–32) with your Firebase project credentials.
2. Replace the `geoapifyApiKey` value (line ~41) with your Geoapify API key.

## Deployment

The app is deployed via GitHub Pages from the `/docs` directory. Any push to `main` will update the live site automatically (once GitHub Pages is configured to serve from `/docs`).

## License

This project is unlicensed. All rights reserved.
