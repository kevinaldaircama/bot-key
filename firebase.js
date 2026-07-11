import admin from "firebase-admin";
import fs from "fs";

const serviceAccount = JSON.parse(
    fs.readFileSync("firebase-admin.json", "utf8")
);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),

    databaseURL: "https://keygenbpt-default-rtdb.firebaseio.com"
});

const db = admin.database();

export default db;
