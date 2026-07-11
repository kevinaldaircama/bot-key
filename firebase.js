import admin from "firebase-admin";

import config from "./config.js";

import fs from "fs";

const serviceAccount = JSON.parse(
fs.readFileSync(config.FIREBASE_CREDENTIALS, "utf8")
);

admin.initializeApp({

credential: admin.credential.cert(serviceAccount),

databaseURL: serviceAccount.databaseURL

});

const db = admin.database();

export default db;
