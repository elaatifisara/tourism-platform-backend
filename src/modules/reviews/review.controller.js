const Review = require('./review.model');

exports.createReview = async (req, res) => {
  try {
    const { placeId, rating, content } = req.body;
    const userId = req.user.id;

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    const review = await Review.create({ userId, placeId, rating, content }, req.db);
    res.status(201).json(review);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getPlaceReviews = async (req, res) => {
  try {
    const { placeId } = req.params;
    const reviews = await Review.findByPlaceId(placeId, req.db);
    const rating = await Review.getAverageRating(placeId, req.db);

    res.json({ reviews, averageRating: rating.averageRating, totalReviews: rating.totalReviews });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getPlaceRating = async (req, res) => {
  try {
    const { placeId } = req.params;
    const rating = await Review.getAverageRating(placeId, req.db);

    res.json(rating);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
