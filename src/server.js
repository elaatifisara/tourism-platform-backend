require("dotenv").config();

const app = require('./app');
const sequelize = require('./config/database');
const { ensureDefaultAdmin } = require('./utils/seedAdmin');

const PORT = process.env.PORT || 4000;

sequelize
  .sync()
  .then(async () => {
    console.log('✅ Base de données synchronisée');
    await ensureDefaultAdmin();
    console.log('✅ Admin par défaut configuré');

    app.listen(PORT, () => {
      console.log(`✅ Serveur TravEasy démarré sur le port ${PORT}`);
      console.log(`   Environment: ${process.env.NODE_ENV}`);
      console.log(`   Base: ${process.env.DB_NAME || 'tourism_platform'}`);
      console.log(`   Frontend CORS: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
    });
  })
  .catch((error) => {
    console.error('❌ Erreur de base de données:', error.message);
    console.error('   Assurez-vous que:');
    console.error('   1. MySQL est en cours d\'exécution');
    console.error('   2. Les variables d\'environnement .env.local sont correctes');
    console.error('   3. La base de données existe');
    process.exit(1);
  });
