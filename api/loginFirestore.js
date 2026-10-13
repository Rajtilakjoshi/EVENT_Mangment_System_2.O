// Vercel/Node.js API route for Firestore-based login and first-login password reset
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

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

const BCRYPT_ROUNDS = 12;

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

    // Forgot password flow — send a temporary reset password
    if (forgot) {
      if (user.firstLogin) return res.status(400).json({ error: 'Forgot password not allowed on first login' });
      // Generate a new temporary password and force first-login flow
      const tempPassword = `divine@${Math.floor(100 + Math.random() * 900)}`;
      const hashedTemp = await bcrypt.hash(tempPassword, BCRYPT_ROUNDS);
      await userDoc.ref.update({ password: hashedTemp, firstLogin: true });
      await transporter.sendMail({
        from: SMTP_USER,
        to: email,
        subject: 'Divine Event — Password Reset',
        html: `<h2>Password Reset</h2>
          <p>Your temporary password is: <b>${tempPassword}</b></p>
          <p>You will be asked to set a new password on your next login.</p>`
      });
      return res.status(200).json({ success: true });
    }

    // Password verification — support both legacy plaintext and bcrypt hashes
    let passwordValid = false;
    if (user.password && user.password.startsWith('$2')) {
      // bcrypt hash
      passwordValid = await bcrypt.compare(password, user.password);
    } else {
      // Legacy plaintext — migrate on successful login
      passwordValid = (user.password === password);
      if (passwordValid) {
        const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);
        await userDoc.ref.update({ password: hashed });
      }
    }
    if (!passwordValid) return res.status(400).json({ error: 'Invalid password' });

    // First login: require password reset
    if (user.firstLogin) {
      if (!newPassword) {
        return res.status(200).json({ firstLogin: true });
      }
      // Hash new password, set firstLogin false, and set authorized true for admin
      const hashedNew = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
      const updateData = { password: hashedNew, firstLogin: false };
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
