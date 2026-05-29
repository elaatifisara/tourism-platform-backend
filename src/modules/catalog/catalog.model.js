const { DataTypes } = require("sequelize");
const sequelize = require("../../config/database");

const Place = sequelize.define("Place", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },

  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },

  country: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  city: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  price: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },

  image: {
    type: DataTypes.STRING,
  },

  rating: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },
});

module.exports = Place;