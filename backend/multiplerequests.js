const axios = require("axios");
const { faker } = require("@faker-js/faker");

const currencies = ["USD", "EUR", "GBP", "INR"];
const vendors = ["FreshMart", "Zen Yoga Studio", "FastNet", "TechStore", "CafeBrew", "SkillLearn", "FitLife Gym"];
const categories = ["food", "education", "utilities", "electronics", "entertainment"];
const descriptions = [
  "Gym membership",
  "Online course purchase",
  "Grocery shopping",
  "Monthly internet bill",
  "Coffee shop visit",
  "Yoga subscription",
  "Electronics purchase"
];

// Generate transactions
const generateTransactions = (n = 1000) => {
  const transactions = [];
  for (let i = 0; i < n; i++) {
    transactions.push({
      id: Math.floor(Math.random() * (99999999 - 100000 + 1)) + 100000,
      amount: parseFloat((Math.random() * 300 + 10).toFixed(2)),
      currency: currencies[Math.floor(Math.random() * currencies.length)],
      description: descriptions[Math.floor(Math.random() * descriptions.length)],
      timestamp: faker.date.recent().toISOString(),
      status: "pending",
      metadata: {
        vendor: vendors[Math.floor(Math.random() * vendors.length)],
        category: categories[Math.floor(Math.random() * categories.length)]
      }
    });
  }
  return transactions;
};

const transactions = generateTransactions(1000);

// Send transactions in batches to avoid overloading the server
const sendTransactions = async (txs, batchSize = 50) => {
  for (let i = 0; i < txs.length; i += batchSize) {
    const batch = txs.slice(i, i + batchSize);

    // Send batch in parallel
    await Promise.all(
      batch.map(tx =>
        axios.post("http://localhost:3000/transactions/send", tx, {
          headers: { "Content-Type": "application/json" }
        })
        .then(res => console.log(`Transaction ${tx.id} queued:`, res.data))
        .catch(err => console.error(`Transaction ${tx.id} failed:`, err.response?.data || err.message))
      )
    );
  }
  console.log("All transactions sent!");
};

// Start sending
sendTransactions(transactions);