const express = require('express');
const router = express.Router();
const controller = require('./review.controller');
const { verifyToken } = require('../../middleware/auth');

router.post('/', verifyToken, controller.createReview);
router.get('/place/:placeId', controller.getPlaceReviews);
router.get('/place/:placeId/rating', controller.getPlaceRating);

module.exports = router;
