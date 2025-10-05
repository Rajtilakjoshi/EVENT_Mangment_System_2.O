// Vercel/Node.js API route for Firestore-based login and first-login password reset
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
import nodemailer from 'nodemailer';

if (!global._firebaseApp) {
  global._firebaseApp = initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.project_id,
  });
}
const db = getFirestore();

const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { email, password, newPassword, forgot } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  try {
    // Find user by email
    const userSnap = await db.collection('users').where('email', '==', email).get();
    if (userSnap.empty) return res.status(400).json({ error: 'User not found' });
    const userDoc = userSnap.docs[0];
    const user = userDoc.data();
    // Forgot password flow (only after first login)
    if (forgot) {
      if (user.firstLogin) return res.status(400).json({ error: 'Forgot password not allowed on first login' });
      // Send credentials to user
      await transporter.sendMail({
        from: SMTP_USER,
        to: email,
        subject: 'Your Divine Event Credentials',
        html: `<h2>Your Credentials</h2><b>Email:</b> ${email}<br/><b>Password:</b> ${user.password}`
      });
      return res.status(200).json({ success: true });
    }
    // Normal login
    if (user.password !== password) return res.status(400).json({ error: 'Invalid password' });
    // First login: require password reset
    if (user.firstLogin) {
      if (!newPassword) {
        return res.status(200).json({ firstLogin: true });
      }
      // Update password, set firstLogin false, and set authorized true for admin
      const updateData = { password: newPassword, firstLogin: false };
      if (user.role === 'admin') {
        updateData.authorized = true;
      }
      await userDoc.ref.update(updateData);
      return res.status(200).json({ success: true, reset: true });
    }
    // Normal login success
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
