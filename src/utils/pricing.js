const calculateTransportPrice = (data) => {
  const {
    baseRate,
    distance,
    duration,
    vehicleType = 'standard',
    pickupTime,
    luggageCount = 0,
  } = data;

  let subtotal = baseRate;

  const hours = duration / 60;
  const durationFactor = hours * 0.15;
  subtotal += baseRate * durationFactor;

  const hour = new Date(pickupTime).getHours();
  if (hour >= 22 || hour < 6) {
    subtotal *= 1.25;
  }

  const day = new Date(pickupTime).getDay();
  if (day === 0 || day === 6) {
    subtotal *= 1.1;
  }

  const month = new Date(pickupTime).getMonth();
  if (month === 6 || month === 7) {
    subtotal *= 1.15;
  }
  const luggageFee = Math.max(0, (luggageCount - 1) * 5);
  subtotal += luggageFee;

  return Math.round(subtotal * 100) / 100;
};

module.exports = {
  calculateTransportPrice,
};
