const admin = require("firebase-admin");
const serviceAccount = require("./firebase-key.json");

if (!admin.apps.length) {
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
}

const db = admin.firestore();

async function checkData() {
  const snapshot = await db.collection('predictions').limit(2).get();
  if (snapshot.empty) {
    console.log('No matching documents.');
    return;
  }  

  snapshot.forEach(doc => {
    console.log(doc.id, '=>', doc.data());
  });
}

checkData().catch(console.error);
