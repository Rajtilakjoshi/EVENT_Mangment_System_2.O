import { auth, db, storage } from '../firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, updateProfile } from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Helper to upload photo and return download URL
export async function uploadUserPhoto(file, role, fullName) {
  const folder = role === 'admin' ? 'admins' : 'volunteers';
  const fileRef = ref(storage, `${folder}/${fullName.replace(/\s+/g, '_')}_${Date.now()}`);
  await uploadBytes(fileRef, file);
  return getDownloadURL(fileRef);
}

// Register user (does not activate volunteer until approved)
export async function registerUser({ firstName, lastName, email, password, role, photo }) {
  const fullName = `${firstName} ${lastName}`;
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const user = userCredential.user;
  let photoURL = '';
  if (photo) {
    photoURL = await uploadUserPhoto(photo, role, fullName);
    await updateProfile(user, { displayName: fullName, photoURL });
  }
  // Save user to Firestore
  await setDoc(doc(db, 'users', user.uid), {
    uid: user.uid,
    firstName,
    lastName,
    email,
    role,
    photoURL,
    approved: role === 'admin' ? false : role === 'volunteer' ? false : true,
    createdAt: Date.now(),
  });
  return user;
}

// Login user
export async function loginUser(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

// Forgot password (send reset email)
export async function forgotPassword(email) {
  return sendPasswordResetEmail(auth, email);
}

// Approve volunteer (admin only)
export async function approveVolunteer(uid) {
  await updateDoc(doc(db, 'users', uid), { approved: true });
}

// Get user by email
export async function getUserByEmail(email) {
  // Not efficient for large user base, but works for now
  // In production, use a backend function
  const userDocs = await db.collection('users').where('email', '==', email).get();
  if (!userDocs.empty) {
    return userDocs.docs[0].data();
  }
  return null;
}
