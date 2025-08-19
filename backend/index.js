const express = require("express");
const pool = require("./db");
const Queue = require('bull');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Basic route
app.get("/", (req, res) => {
  res.status(200).send("App is running on port http://localhost:3000/");
});

// Transactions routes
app.get("/transactions", async (req, res) => {
  try {
    const query = `SELECT id, client_id, amount, currency, description, timestamp, metadata, status FROM transactions;`;
    const data = await pool.query(query);
    if (data.rows.length === 0) {
      return res.status(204).send("Database is Empty");
    }
    res.status(200).json(data.rows);
  } catch (e) {
    console.error("Error in /transactions:", e);
    res.status(500).send(`Error occurred: ${e.message}`);
  }
});

app.get("/transactions/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const query = `SELECT id, client_id, amount, currency, description, timestamp, metadata, status FROM transactions WHERE client_id = $1;`;
    const data = await pool.query(query, [id]);
    if (data.rows.length === 0) {
      return res.status(404).send("Transaction Not Found");
    }
    res.status(200).json(data.rows[0]);
  } catch (e) {
    console.error("Error in /transactions/:id:", e);
    res.status(500).send(`Error occurred: ${e.message}`);
  }
});

app.post("/cleanup", async (req, res) => {
  try {
    const query = `SELECT COUNT(*) FROM transactions;`;
    const { rows } = await pool.query(query);
    const count = parseInt(rows[0].count);

    if (count === 0) {
      res.status(200).send("No transactions to delete");
    } else {
      await pool.query(`DELETE FROM transactions;`);
      res.status(200).send(`DELETED ${count} transactions successfully.`);
    }
  } catch (e) {
    console.error("Error in /cleanup:", e);
    if (e.code === '42P01') {
      res.status(404).send("Table 'transactions' does not exist. Please create it first.");
    } else {
      res.status(500).send(`Database error: ${e.message}`);
    }
  }
});

// Queue setup
// Update your Bull queue setup
// ONLY CHANGE THE REDIS CONFIGURATION - around line 25
const transactionQueue = new Queue("transactions", {
  redis: { 
    host: process.env.REDIS_HOST || "localhost",  // CHANGED: Use environment variable
    port: process.env.REDIS_PORT || 6379,
    connectTimeout: 5000,
    retryStrategy: (times) => Math.min(times * 1000, 5000),
  }
});

// Transaction processing
app.post("/transactions/send", async (req, res) => {
  try {
    if (!req.body) {
      return res.status(400).send("Request body missing or invalid JSON");
    }

    const { id: clientId, amount, currency, description, timestamp, metadata } = req.body;

    // Validation
    if (!clientId || !amount || !currency || !description || !timestamp) {
      return res.status(400).send("Missing required fields");
    }

    // Check for duplicates
    const existing = await pool.query(
      "SELECT id FROM transactions WHERE client_id = $1 AND timestamp = $2 AND amount = $3",
      [clientId, timestamp,amount]
    );

    let transactionId;
    if (existing.rows.length > 0) {
      transactionId = existing.rows[0].id;
      return res.status(200).json({
        status: "duplicate",
        message: "Transaction already exists",
        id: transactionId,
      });
    } else {
      transactionId = uuidv4();
    }

    // Add to queue
    await transactionQueue.add({
      id: transactionId,
      clientId,
      amount,
      currency,
      description,
      timestamp,
      metadata
    }, {
      attempts: 5,
      backoff: 5000
    });

    res.status(200).json({
      status: "pending",
      message: "Transaction queued successfully",
      id: transactionId,
    });
  } catch (e) {
    console.error("Error in /transactions/send:", e);
    res.status(500).send(`Error occurred: ${e.message}`);
  }
});

// Queue processor
transactionQueue.process(async (job) => {
  const { id, clientId, amount, currency, description, timestamp, metadata } = job.data;

  try {
    // Set status to processing
    await pool.query(
      `UPDATE transactions SET status='processing' WHERE id=$1`,
      [id]
    );

    // Insert transaction
    await pool.query(
      `INSERT INTO transactions (id, client_id, amount, currency, description, timestamp, metadata, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'completed')
       ON CONFLICT (id) DO UPDATE SET status='completed'`,
      [id, clientId, amount, currency, description, timestamp, metadata]
    );

    console.log(`Transaction ${id} processed successfully`);
  } catch (e) {
    console.error(`Transaction failed: ${e.message}`);
    await pool.query(
      `UPDATE transactions SET status='failed' WHERE id=$1`,
      [id]
    );
    throw e;
  }
});

// Queue event handlers
transactionQueue.on("failed", (job, err) => {
  console.error(`Job ${job.id} failed:`, err.message);
});

transactionQueue.on("completed", (job) => {
  console.log(`Job ${job.id} completed`);
});

// Health check
app.get("/api/health", async (req, res) => {
  try {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      transactionQueue.getWaitingCount(),
      transactionQueue.getActiveCount(),
      transactionQueue.getCompletedCount(),
      transactionQueue.getFailedCount(),
      transactionQueue.getDelayedCount()
    ]);

    res.status(200).json({
      status: "ok",
      serverTime: new Date().toISOString(),
      queue: { waiting, active, completed, failed, delayed }
    });
  } catch (e) {
    console.error("Health check failed:", e);
    res.status(500).json({ status: "error", message: e.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Internal Server Error');
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});