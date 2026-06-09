import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

// Ojo: Firebase en el frontend usa una configuración pública (apiKey, authDomain).
// El archivo firebase-key.json que tienes es de la cuenta de servicio, que es ÚNICA para el Backend.
// Por favor, ve a la consola de Firebase > Configuración del Proyecto > Agregar App Web
// y reemplaza este objeto con el que te proveen en el SDK Snippet. He mapeado tu projectId.
const firebaseConfig = {
  apiKey: "AIzaSyAVH2AUNTZh5yS3CkORijBehtlMIQKVIEo",
  authDomain: "aplicacioncelucine.firebaseapp.com",
  projectId: "aplicacioncelucine",
  storageBucket: "aplicacioncelucine.appspot.com",
  messagingSenderId: "357929481942",
  appId: "1:357929481942:android:252a53c3592be338137b77"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
