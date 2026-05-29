const bcrypt = require('bcrypt');
const User = require('../modules/auth/auth.model');

const DEFAULT_ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@tourism.com';
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const DEFAULT_ADMIN_FIRST_NAME = process.env.ADMIN_FIRST_NAME || 'Admin';
const DEFAULT_ADMIN_LAST_NAME = process.env.ADMIN_LAST_NAME || 'User';

const shouldSeedDefaultAdmin = () =>
  process.env.SEED_DEFAULT_ADMIN !== 'false' &&
  process.env.NODE_ENV !== 'production';

const ensureDefaultAdmin = async () => {
  if (!shouldSeedDefaultAdmin()) {
    return;
  }

  const existingUser = await User.findOne({
    where: { email: DEFAULT_ADMIN_EMAIL },
  });

  const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 12);

  if (!existingUser) {
    await User.create({
      firstName: DEFAULT_ADMIN_FIRST_NAME,
      lastName: DEFAULT_ADMIN_LAST_NAME,
      email: DEFAULT_ADMIN_EMAIL,
      password: hashedPassword,
      role: 'admin',
      preferredLanguage: 'fr',
      emailNotifications: true,
      smsNotifications: false,
      isDeleted: false,
    });

    console.log(`Admin seed created: ${DEFAULT_ADMIN_EMAIL}`);
    return;
  }

  const updates = {};

  if (existingUser.role !== 'admin') {
    updates.role = 'admin';
  }

  const validPassword = await bcrypt.compare(
    DEFAULT_ADMIN_PASSWORD,
    existingUser.password
  );

  if (!validPassword) {
    updates.password = hashedPassword;
  }

  if (!existingUser.firstName) {
    updates.firstName = DEFAULT_ADMIN_FIRST_NAME;
  }

  if (!existingUser.lastName) {
    updates.lastName = DEFAULT_ADMIN_LAST_NAME;
  }

  if (Object.keys(updates).length > 0) {
    await existingUser.update(updates);
    console.log(`Admin seed updated: ${DEFAULT_ADMIN_EMAIL}`);
  }
};

module.exports = {
  ensureDefaultAdmin,
};
