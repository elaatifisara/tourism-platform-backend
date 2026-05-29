const { Sequelize } = require("sequelize");

const sequelize = new Sequelize(
  process.env.DB_NAME || 'tourism_platform',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: "mysql",
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
  }
);

// Test connexion à la base de données
sequelize
  .authenticate()
  .then(() => {
    console.log('✅ Connexion MySQL réussie');
    console.log(`   Hôte: ${process.env.DB_HOST || 'localhost'}`);
    console.log(`   Base: ${process.env.DB_NAME || 'tourism_platform'}`);
  })
  .catch((err) => {
    console.error('❌ Erreur de connexion MySQL:', err.message);
    console.error('   Configuration:');
    console.error(`   - Host: ${process.env.DB_HOST || 'localhost'}`);
    console.error(`   - User: ${process.env.DB_USER || 'root'}`);
    console.error(`   - Database: ${process.env.DB_NAME || 'tourism_platform'}`);
    console.error(`   - Port: ${process.env.DB_PORT || 3306}`);
  });

module.exports = sequelize;