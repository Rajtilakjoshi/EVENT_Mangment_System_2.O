const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const USERS_FILE = path.join(__dirname, 'users.json');
function readUsers() {
  if (!fs.existsSync(USERS_FILE)) return [];
  return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
}
function writeUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function generatePassword() {
  const randomDigit = Math.floor(Math.random() * 10);
  return `divine@123${randomDigit}`;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  const { firstName, lastName, email, mobile, whatsappMobile, role } = req.body;
  if (!firstName || !lastName || !email || !mobile || !whatsappMobile || !role) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const users = readUsers();
  if (users.find(u => u.email === email)) {
    return res.status(409).json({ error: 'User already exists' });
  }
  const password = generatePassword();
  const user = {
    firstName,
    lastName,
    email,
    mobile,
    whatsappMobile,
    role,
    password,
    needsPasswordReset: true
  };
  users.push(user);
  writeUsers(users);

  // Send email to admins
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'rajtilakjoshij@gmail.com',
      pass: 'fqpxeduqphomimyx'
    }
  });
  const mailOptions = {
    from: 'Raj <rajtilakjoshij@gmail.com>',
    to: 'joshirajtilak0@gmail.com,krishna.d.upadhyay@gmail.com',
    subject: `New ${role} Registration`,
    text: `Name: ${firstName} ${lastName}\nEmail: ${email}\nMobile: ${mobile}\nWhatsApp: ${whatsappMobile}\nRole: ${role}\nPassword: ${password}`
  };
  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error('EMAIL ERROR:', err);
    return res.status(500).json({ error: 'Failed to send email', details: err.message });
  }
  res.status(201).json({ success: true });
};
