import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'

const firebaseConfig = {
  apiKey: 'AIzaSyANTiCGIHZi44vKP1P4mZWv_DVRsjZCcvo',
  authDomain: 'bioflield.firebaseapp.com',
  projectId: 'bioflield',
  storageBucket: 'bioflield.firebasestorage.app',
  messagingSenderId: '263021632716',
  appId: '1:263021632716:web:2dbd7d27a756bba0a1f669',
  measurementId: 'G-9NV9S5J8HL',
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const googleProvider = new GoogleAuthProvider()
