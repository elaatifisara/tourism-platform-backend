const Place = require("./catalog.model");

exports.createPlace = async (data) => {
  return await Place.create(data);
};

exports.getAllPlaces = async () => {
  return await Place.findAll();
};