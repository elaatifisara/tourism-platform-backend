class RentalModel {
  async create(userId, rentalData) {
    return {
      id: Math.random().toString(36).substr(2, 9),
      userId,
      vehicleType: rentalData.vehicleType,
      startDate: rentalData.startDate,
      endDate: rentalData.endDate,
      pickupLocation: rentalData.pickupLocation,
      dropoffLocation: rentalData.dropoffLocation,
      dailyRate: rentalData.dailyRate,
      totalCost: this.calculateTotalCost(rentalData),
      insurance: rentalData.insurance || false,
      status: 'pending',
      driver: rentalData.driver || false,
      createdAt: new Date(),
    };
  }

  calculateTotalCost(rentalData) {
    const startDate = new Date(rentalData.startDate);
    const endDate = new Date(rentalData.endDate);
    const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    let cost = days * rentalData.dailyRate;

    if (rentalData.insurance) {
      cost += days * 15;
    }

    if (rentalData.driver) {
      cost += days * 50;
    }

    return cost;
  }

  async findById(rentalId) {
    return {
      id: rentalId,
      vehicleType: 'sedan',
      startDate: '2024-01-15',
      endDate: '2024-01-18',
      status: 'confirmed',
    };
  }

  async findByUserId(userId) {
    return [];
  }

  async updateStatus(rentalId, status) {
    return { id: rentalId, status };
  }
}

module.exports = new RentalModel();
