const express = require("express");
const app = express();
const PORT = 3000;

app.use(express.json());

// ----------------------------------
// In-memory data structure for seats
// ----------------------------------
const seats = {};
const TOTAL_SEATS = 10;
const LOCK_DURATION_MS = 60 * 1000; // 1 minute

// Initialize seats
for (let i = 1; i <= TOTAL_SEATS; i++) {
  seats[i] = {
    id: i,
    status: "available", // available | locked | booked
    lockedBy: null,
    lockExpireTime: null
  };
}

// ----------------------------------
// Utility: Check and auto-unlock expired locks
// ----------------------------------
function clearExpiredLocks() {
  const now = Date.now();
  for (const seat of Object.values(seats)) {
    if (seat.status === "locked" && seat.lockExpireTime < now) {
      seat.status = "available";
      seat.lockedBy = null;
      seat.lockExpireTime = null;
    }
  }
}

// Run cleanup every 5 seconds
setInterval(clearExpiredLocks, 5000);

// ----------------------------------
// 1️⃣ View all seats
// ----------------------------------
app.get("/api/seats", (req, res) => {
  clearExpiredLocks();
  res.json({
    success: true,
    data: Object.values(seats)
  });
});

// ----------------------------------
// 2️⃣ Lock a seat
// ----------------------------------
app.post("/api/seats/:id/lock", (req, res) => {
  const seatId = parseInt(req.params.id);
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ success: false, message: "User ID required." });
  }

  const seat = seats[seatId];
  if (!seat) {
    return res.status(404).json({ success: false, message: "Seat not found." });
  }

  clearExpiredLocks();

  if (seat.status === "booked") {
    return res.status(400).json({ success: false, message: "Seat already booked." });
  }

  if (seat.status === "locked" && seat.lockedBy !== userId) {
    return res.status(400).json({ success: false, message: "Seat is already locked by another user." });
  }

  // Lock the seat
  seat.status = "locked";
  seat.lockedBy = userId;
  seat.lockExpireTime = Date.now() + LOCK_DURATION_MS;

  res.json({
    success: true,
    message: `Seat ${seatId} locked successfully for 1 minute.`,
    expiresAt: new Date(seat.lockExpireTime).toLocaleTimeString()
  });
});

// ----------------------------------
// 3️⃣ Confirm a booking
// ----------------------------------
app.post("/api/seats/:id/confirm", (req, res) => {
  const seatId = parseInt(req.params.id);
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ success: false, message: "User ID required." });
  }

  const seat = seats[seatId];
  if (!seat) {
    return res.status(404).json({ success: false, message: "Seat not found." });
  }

  clearExpiredLocks();

  if (seat.status === "available") {
    return res.status(400).json({ success: false, message: "Seat is not locked yet." });
  }

  if (seat.status === "locked" && seat.lockedBy !== userId) {
    return res.status(403).json({ success: false, message: "You cannot confirm this seat; it’s locked by another user." });
  }

  if (seat.status === "locked") {
    // Confirm booking
    seat.status = "booked";
    seat.lockedBy = null;
    seat.lockExpireTime = null;

    return res.json({
      success: true,
      message: `Seat ${seatId} successfully booked!`
    });
  }

  if (seat.status === "booked") {
    return res.status(400).json({ success: false, message: "Seat already booked." });
  }
});

// ----------------------------------
// 4️⃣ Default route
// ----------------------------------
app.get("/", (req, res) => {
  res.send("🎫 Welcome to the Ticket Booking System API!");
});

// ----------------------------------
// Start server
// ----------------------------------
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
