const { query, run, get } = require('./database');

const CHECKLIST_ITEMS = [
  { key: 'client_brief', label: 'Client Brief Received' },
  { key: 'mood_board', label: 'Mood Board Received' },
  { key: 'shoot_date_confirmed', label: 'Shoot Date Confirmed' },
  { key: 'location_confirmed', label: 'Location Confirmed' },
  { key: 'talent_confirmed', label: 'Talent Confirmed' },
  { key: 'script_approved', label: 'Script Approved' },
];

const PACKAGE_REVISIONS = {
  'Starter Package': 1,
  'Growth Package': 2,
  'Premium Package': 3,
};

const PACKAGE_REELS = {
  'Starter Package': 3,
  'Growth Package': 6,
  'Premium Package': 12,
};

async function seed() {
  const bcrypt = require('bcryptjs');

  console.log('[Seed] Starting database seed...');

  // Check if already seeded
  const existingAdmin = get('SELECT id FROM users WHERE email = ?', ['admin@reelsin360.com']);
  if (existingAdmin) {
    console.log('[Seed] Already seeded. Skipping.');
    return;
  }

  const isProd = process.env.NODE_ENV === 'production';
  const hash = (pw) => bcrypt.hashSync(pw, 10);

  const users = [
    { name: 'Admin', email: 'admin@reelsin360.com', password: process.env.SEED_ADMIN_PASSWORD || (isProd ? null : 'admin123'), role: 'admin' },
    { name: 'Sales Team', email: 'sales@reelsin360.com', password: process.env.SEED_SALES_PASSWORD || (isProd ? null : 'sales123'), role: 'sales' },
    { name: 'Arun', email: 'arun@reelsin360.com', password: process.env.SEED_SHOOTER_PASSWORD || (isProd ? null : 'shooter123'), role: 'shooter' },
    { name: 'Rahul', email: 'rahul@reelsin360.com', password: process.env.SEED_SHOOTER_PASSWORD || (isProd ? null : 'shooter123'), role: 'shooter' },
    { name: 'Ameen', email: 'ameen@reelsin360.com', password: process.env.SEED_SHOOTER_PASSWORD || (isProd ? null : 'shooter123'), role: 'shooter' },
    { name: 'Niyas', email: 'niyas@reelsin360.com', password: process.env.SEED_EDITOR_PASSWORD || (isProd ? null : 'editor123'), role: 'editor' },
    { name: 'Rizwan', email: 'rizwan@reelsin360.com', password: process.env.SEED_EDITOR_PASSWORD || (isProd ? null : 'editor123'), role: 'editor' },
    { name: 'Ashiq', email: 'ashiq@reelsin360.com', password: process.env.SEED_EDITOR_PASSWORD || (isProd ? null : 'editor123'), role: 'editor' },
    { name: 'Operations', email: 'ops@reelsin360.com', password: process.env.SEED_OPS_PASSWORD || (isProd ? null : 'ops123'), role: 'operations' },
  ];

  // Validate passwords in production
  for (const u of users) {
    if (!u.password) {
      if (isProd) {
        console.error(`[Seed] ERROR: Missing password env variable for ${u.name} (${u.role}) in production! Skipping seed.`);
        return;
      } else {
        u.password = 'dev123';
      }
    }
  }

  for (const u of users) {
    run(
      'INSERT OR IGNORE INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [u.name, u.email, hash(u.password), u.role]
    );
  }

  console.log(`[Seed] Created ${users.length} users.`);
  console.log('[Seed] Done!');

  if (!isProd) {
    console.log('\n--- LOGIN CREDENTIALS ---');
    users.forEach(u => console.log(`  ${u.role.padEnd(12)} | ${u.email.padEnd(30)} | ${u.password}`));
    console.log('-------------------------\n');
  }
}

module.exports = { seed, CHECKLIST_ITEMS, PACKAGE_REVISIONS, PACKAGE_REELS };
