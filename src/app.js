const express = require("express");
const cors = require("cors");
const errorHandler = require("./middleware/errorHandler");

const authRoutes = require("./modules/auth/auth.routes");
const catalogRoutes = require("./modules/catalog/catalog.routes");
const transportRoutes = require("./modules/transport/transport.routes");
const paymentRoutes = require("./modules/payment/payment.routes");
const reviewRoutes = require("./modules/reviews/review.routes");
const supportRoutes = require("./modules/support/support.routes");
const userRoutes = require("./modules/users/user.routes");
const notificationRoutes = require("./modules/notifications/notification.routes");
const rentalRoutes = require("./modules/rentals/rental.routes");
const favoritesRoutes = require("./modules/favorites/favorites.routes");
const adminRoutes = require("./modules/admin/admin.routes");

const app = express();

// ✅ CORS Configuration - Allow frontend to communicate with backend
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3001',
    process.env.FRONTEND_URL || 'http://localhost:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 3600
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ✅ API Routes
app.use("/api/auth", authRoutes);
app.use("/api/catalog", catalogRoutes);
app.use("/api/transport", transportRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/users", userRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/rentals", rentalRoutes);
app.use("/api/favorites", favoritesRoutes);
app.use("/api/admin", adminRoutes);

// ✅ Health Check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date(), message: "Backend is running" });
});

// ✅ 404 Handler
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// ✅ Error Handler Middleware
app.use(errorHandler);

module.exports = app;
