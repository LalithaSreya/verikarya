# VeriKarya (Workforce Verification & Performance Management System)

VeriKarya is a workforce audit and performance tracking platform designed to verify that reported employee work is authentic. It implements a Node/Express REST API backend and a Vite React frontend, incorporating camera-only proof streams and GPS geofence validation.

---

## Key Features

1. **Daily Attendance Management:** Employee check-ins and check-outs with manager audit reports.
2. **Inside Premises Activity Tracking:** Task management, priorities, and deadlines.
3. **Field Activity tracking:** Geofenced client visits (within 100 meters validation range).
4. **VeriKarya Verification Engine:**
   * **Direct Camera Capture:** Uses canvas render capture streams to block pre-recorded gallery uploads.
   * **Dynamic Verification Codes:** Matches single-use `VK-XXXX` shortcodes for every task submission.
   * **GPS Validation:** Backend Haversine distance calculations block remote check-ins.
5. **Manager Review Desk:** Review, comment on, and approve/reject evidence trails with live analytics widgets.

---

## Directory Overview

* `/backend` - Express API servers, Mongoose database schemas, location geofencing solvers, and seed scripts.
* `/frontend` - Vite React client, role-based Routing components, camera frames, and Leaflet map widgets.

---

## Quickstart Run Instructions

### 1. Prerequisite Checks
Make sure you have:
* **Node.js** (v18+)
* **MongoDB** server running locally on port `27017`

### 2. Set Up Backend
Open your terminal in the `backend/` directory:
```bash
# Install dependencies
npm install

# Run database seeder (clears database, hashes passwords, seeds default users/tasks)
npm run seed

# Launch the API server
npm start
```
*The backend API will run on http://localhost:5000.*

### 3. Set Up Frontend
Open a separate terminal in the `frontend/` directory:
```bash
# Install dependencies
npm install

# Start the Vite local developer server
npm run dev
```
*The React client will run on http://localhost:5173.*

---

## Seed Accounts (Demo Logins)

* **Employee Login:**
  * **Email:** `employee@verikarya.com`
  * **Password:** `password123`
* **Manager Login:**
  * **Email:** `manager@verikarya.com`
  * **Password:** `password123`

---

## Permissions Checklist
* **Camera Access:** Grant browser permission on first canvas complete request to stream camera feed.
* **Location Access:** Grant browser permission on check-in or visit start to capture active GPS coordinates.

---

For deep-dive developer details on calculations, schemas, and configurations, check out the [walkthrough.md](file:///C:/Users/sreya/.gemini/antigravity/brain/af71f9b4-c420-407e-9d5e-abd732ad1420/walkthrough.md) artifact.
