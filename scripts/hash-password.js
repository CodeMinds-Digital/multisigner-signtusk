const bcrypt = require('bcryptjs');

async function hashPasswords() {
  const passwords = [
    { email: 'admin@signtusk.com', password: 'admin123!' },
    { email: 'support@signtusk.com', password: 'support123!' },
    { email: 'auditor@signtusk.com', password: 'auditor123!' }
  ];

  console.log('🔐 Generating password hashes...\n');

  for (const user of passwords) {
    const hash = await bcrypt.hash(user.password, 10);
    console.log(`${user.email}: ${hash}`);
  }
}

hashPasswords();
