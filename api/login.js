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

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  const { email, password } = req.body;
  const users = readUsers();
  const user = users.find(u => u.email === email);
  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  if (user.needsPasswordReset) {
    return res.status(200).json({ needsPasswordReset: true });
  }
  res.status(200).json({ success: true, user: { firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role } });
};
