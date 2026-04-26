// ============================================
// RN SPORTS HUB — Firebase Setup
// ============================================
// ⚠️ REPLACE THESE VALUES with your actual Firebase project config.
// How to get them:
//   1. Go to https://console.firebase.google.com
//   2. Create a new project → "RN Sports Hub"
//   3. Add a Web App → copy the firebaseConfig object below
//   4. Enable Firestore Database (in production mode)
//   5. Set Firestore Rules (see FIRESTORE_RULES.txt)

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey:            "AIzaSyDDptpAG0EobYhlL4LaLFJsrUBryUo49kg",
  authDomain:        "rn-sports-hub.firebaseapp.com",
  projectId:         "rn-sports-hub",
  storageBucket:     "rn-sports-hub.firebasestorage.app",
  messagingSenderId: "106233462040",
  appId:             "1:106233462040:web:f049b34f658dec0c93b26d"
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

export { db };
