class FavoritesModel {
  async addFavorite(userId, placeId) {
    return {
      id: Math.random().toString(36).substr(2, 9),
      userId,
      placeId,
      addedAt: new Date(),
    };
  }

  async removeFavorite(userId, placeId) {
    return {
      userId,
      placeId,
      removed: true,
    };
  }

  async getUserFavorites(userId) {
    return {
      favorites: [
        { id: 1, placeId: 1, name: 'Louvre Museum', image: 'louvre.jpg' },
        { id: 2, placeId: 3, name: 'Eiffel Tower', image: 'eiffel.jpg' },
      ],
      count: 2,
    };
  }

  async isFavorite(userId, placeId) {
    return {
      userId,
      placeId,
      isFavorite: true,
    };
  }
}

module.exports = new FavoritesModel();
