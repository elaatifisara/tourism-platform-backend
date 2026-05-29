const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  if (err.status) {
    return res.status(err.status).json({ message: err.message });
  }

  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: err.message });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  return res.status(500).json({ message: 'Internal server error' });
};

module.exports = errorHandler;
