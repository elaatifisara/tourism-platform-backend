const rentalModel = require('./rental.model');

exports.getAvailableVehicles = async (req, res) => {
  try {
    const { startDate, endDate, location } = req.query;

    const vehicles = [
      { id: 1, type: 'sedan', seats: 4, dailyRate: 30, image: 'sedan.jpg' },
      { id: 2, type: 'suv', seats: 5, dailyRate: 50, image: 'suv.jpg' },
      { id: 3, type: 'van', seats: 8, dailyRate: 70, image: 'van.jpg' },
      { id: 4, type: 'luxury', seats: 4, dailyRate: 100, image: 'luxury.jpg' },
    ];

    res.json({
      vehicles,
      filters: {
        startDate,
        endDate,
        location,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createRental = async (req, res) => {
  try {
    const { vehicleType, startDate, endDate, pickupLocation, dropoffLocation, driver, insurance } = req.body;
    const userId = req.user?.id || 1;

    const rentalData = {
      vehicleType,
      startDate,
      endDate,
      pickupLocation,
      dropoffLocation,
      dailyRate: { sedan: 30, suv: 50, van: 70, luxury: 100 }[vehicleType] || 30,
      driver,
      insurance,
    };

    const rental = await rentalModel.create(userId, rentalData);

    res.status(201).json({
      rentalId: rental.id,
      status: 'confirmed',
      totalCost: rental.totalCost,
      vehicle: vehicleType,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getRental = async (req, res) => {
  try {
    const { rentalId } = req.params;
    const rental = await rentalModel.findById(rentalId);

    if (!rental) {
      return res.status(404).json({ error: 'Rental not found' });
    }

    res.json(rental);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.cancelRental = async (req, res) => {
  try {
    const { rentalId } = req.params;

    const rental = await rentalModel.updateStatus(rentalId, 'cancelled');

    res.json({
      status: 'cancelled',
      refundAmount: 100,
      message: 'Rental cancelled successfully',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getUserRentals = async (req, res) => {
  try {
    const userId = req.user?.id || 1;
    const rentals = await rentalModel.findByUserId(userId);

    res.json({ rentals });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
