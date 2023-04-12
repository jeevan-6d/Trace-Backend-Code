const express = require("express");
const mysql = require("mysql");
const ws = require("ws");
const cors = require("cors");

const app = express();
const port = 4000;

// Use cors middleware
app.use(cors());
app.use(express.json());

// Create a MySQL connection pool
const pool = mysql.createPool({
  host: "localhost",
  user: "jeevan",
  password: "jeevan",
  database: "firewall_rule",
});

// Create a WebSocket server
const wss = new ws.Server({ port: 8080 });

wss.on("connection", (ws) => {
  console.log("WebSocket connected");

  // Send a message to the client
  ws.send("Welcome to the CRUD example!");
});

// Define Express routes

// Get all entries
app.get("/entries", (req, res) => {
  pool.query("SELECT * FROM entries", (error, results) => {
    if (error) throw error;

    res.send(results);
  });
});

// Get a single entry by ID
app.get("/entries/:id", (req, res) => {
  const entryId = req.params.id;

  pool.query(
    "SELECT * FROM entries WHERE id = ?",
    entryId,
    (error, results) => {
      if (error) throw error;

      res.send(results[0]);
    }
  );
});

// Create a new entry
app.post("/entries", (req, res) => {
  const { entry_type, param_value } = req.body;

  pool.query(
    "INSERT INTO entries (entry_type, param_value) VALUES (?, ?)",
    [entry_type, param_value],
    (error, results) => {
      if (error) throw error;

      // Get the newly created entry from the database
      const newEntryId = results.insertId;
      pool.query(
        "SELECT * FROM entries WHERE id = ?",
        newEntryId,
        (error, results) => {
          if (error) throw error;

          // Send the new entry to all WebSocket clients
          const newEntry = results[0];
          wss.clients.forEach((client) => {
            client.send(JSON.stringify(newEntry));
          });

          // Return the newly created entry as a JSON response
          res.status(201).json(newEntry);
        }
      );
    }
  );
});

// Update an entry by ID
app.put("/entries/:id", (req, res) => {
  const entryId = req.params.id;
  const { entry_type, param_value } = req.body;

  pool.query(
    "UPDATE entries SET entry_type = ?, param_value = ? WHERE id = ?",
    [entry_type, param_value, entryId],
    (error, results) => {
      if (error) throw error;

      // Get the updated entry from the database
      pool.query(
        "SELECT * FROM entries WHERE id = ?",
        entryId,
        (error, results) => {
          if (error) throw error;

          // Send the updated entry to all WebSocket clients
          const updatedEntry = results[0];
          wss.clients.forEach((client) => {
            client.send(JSON.stringify(updatedEntry));
          });

          res.send("Entry updated successfully!");
        }
      );
    }
  );
});

// Delete an entry by ID
app.delete("/entries/:id", (req, res) => {
  const entryId = req.params.id;

  pool.query("DELETE FROM entries WHERE id = ?", entryId, (error, results) => {
    if (error) throw error;

    // Send a message to all WebSocket clients that the entry was deleted
    wss.clients.forEach((client) => {
      client.send(JSON.stringify({ action: "delete", id: entryId }));
    });

    res.send("Entry deleted successfully!");
  });
});

// Start the Express server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
