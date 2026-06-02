/**
 * db/seed.js
 * Seeds initial admin users with properly hashed passwords.
 * Usage: node db/seed.js
 */

require('dotenv').config();
const bcrypt = require('bcrypt');
const { query, pool } = require('./pool');

const SALT_ROUNDS = 12;

const users = [
  {
    first_name: 'Yahuza',
    last_name: 'Abdul-Hakim',
    username: 'Vendetta',
    email: 'vendetta@smarthr.local',
    password: 'vendetta',
    phone: '233209229025',
    address: 'San Francisco Bay Area',
    role: 'admin',
  },
  {
    first_name: 'dhruv',
    last_name: 'gothiya',
    username: 'dhruv',
    email: 'dhruv@smarthr.local',
    password: 'dhruv',
    phone: '9324175216',
    address: 'Los Angeles, California',
    role: 'hr',
  },
];

async function seed() {
  console.log('Seeding admin users...');

  for (const user of users) {
    const hash = await bcrypt.hash(user.password, SALT_ROUNDS);
    const roleRes = await query(
      'SELECT id FROM user_roles WHERE role = $1',
      [user.role]
    );
    if (!roleRes.rows.length) {
      console.warn(`Role "${user.role}" not found, skipping ${user.username}`);
      continue;
    }
    const roleId = roleRes.rows[0].id;

    await query(
      `INSERT INTO users (first_name, last_name, username, email, password_hash, phone, address, role_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
      [user.first_name, user.last_name, user.username, user.email, hash, user.phone, user.address, roleId]
    );
    console.log(`âœ… Seeded user: ${user.username} (${user.role})`);
  }

  await pool.end();
  console.log('ðŸŽ‰ Seed complete.');
}

seed().catch((err) => {
  console.error('âŒ Seed failed:', err.message);
  process.exit(1);
});