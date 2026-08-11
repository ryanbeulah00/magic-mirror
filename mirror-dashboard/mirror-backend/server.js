require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// Connected React clients
let clients = [];

/*
 * --------------------------------------------------
 * SSE: React connects here
 * --------------------------------------------------
 */
app.get("/api/tasks/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // Tell React the connection succeeded
  res.write("data: connected\n\n");

  clients.push(res);

  console.log(`SSE client connected. Clients: ${clients.length}`);

  req.on("close", () => {
    clients = clients.filter((client) => client !== res);

    console.log(`SSE client disconnected. Clients: ${clients.length}`);
  });
});

/*
 * --------------------------------------------------
 * Heartbeat
 * Keeps SSE connections alive
 * --------------------------------------------------
 */
const heartbeat = setInterval(() => {
  clients.forEach((client) => {
    client.write(": heartbeat\n\n");
  });
}, 30000);

/*
 * --------------------------------------------------
 * Todoist Webhook
 * Todoist calls this whenever something changes
 * --------------------------------------------------
 */
app.post("/webhook/todoist", (req, res) => {
  console.log("Todoist webhook received!");
  console.log(req.body);

  // Tell every connected React client to refresh
  clients.forEach((client) => {
    client.write("data: refresh\n\n");
  });

  res.sendStatus(200);
});

/*
 * --------------------------------------------------
 * Fetch current Todoist tasks
 * --------------------------------------------------
 */
app.get("/api/tasks", async (req, res) => {
  try {
    const response = await fetch(
      "https://api.todoist.com/api/v1/tasks",
      {
        headers: {
          Authorization: `Bearer ${process.env.TODOIST_TOKEN}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Todoist API error: ${response.status}`);
    }

    const data = await response.json();

    res.json(data);
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Failed to fetch tasks",
    });
  }
});

/*
 * --------------------------------------------------
 * Start server
 * --------------------------------------------------
 */
const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, () => {
  console.log(`Magic Mirror backend running on port ${PORT}`);
});

/*
 * Clean shutdown
 */
process.on("SIGTERM", () => {
  clearInterval(heartbeat);

  clients.forEach((client) => {
    client.end();
  });

  server.close(() => {
    process.exit(0);
  });
});
