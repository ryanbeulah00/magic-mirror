require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

// Simple request logger for webhook debugging — logs method, path, content-type and body for webhook paths
app.use((req, res, next) => {
  try {
    if (req.path && req.path.startsWith('/webhook')) {
      console.log('Incoming webhook request:', req.method, req.path, 'Content-Type:', req.headers['content-type']);
      console.log('Body:', JSON.stringify(req.body));
    }
  } catch (err) {
    console.error('Error logging request:', err);
  }
  next();
});

const clients = new Set();
const TASK_EVENT_PREFIX = "item:";

const isTaskEvent = (eventName) =>
  typeof eventName === "string" && eventName.startsWith(TASK_EVENT_PREFIX);

const getTodoistToken = () => 'd95a9b473b9dd39488671fa017b48e0c0e93dd01';

const normalizeTasks = (payload) => {
  const tasks = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.results)
      ? payload.results
      : [];

  return tasks
    .filter((task) => task && !task.completed)
    .sort((a, b) => {
      const aDue = a?.due?.date ? new Date(a.due.date).getTime() : Number.MAX_SAFE_INTEGER;
      const bDue = b?.due?.date ? new Date(b.due.date).getTime() : Number.MAX_SAFE_INTEGER;
      return aDue - bDue;
    })
    .slice(0, 5);
};

app.get("/api/tasks/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  res.write("event: connected\ndata: connected\n\n");
  clients.add(res);

  req.on("close", () => {
    clients.delete(res);
  });
});

const heartbeat = setInterval(() => {
  for (const client of clients) {
    client.write(": heartbeat\n\n");
  }
}, 30000);

app.post("/webhook/todoist", async (req, res) => {
  const eventName = req.body?.event_name;

  if (!isTaskEvent(eventName)) {
    console.log(`Ignoring non-task Todoist webhook event: ${eventName || "unknown"}`);
    return res.sendStatus(200);
  }

  console.log(`Todoist task event received: ${eventName}`);

  const itemId = req.body?.event_data?.id || null;
  const payloadObj = { eventName, itemId, item: null };
  const token = getTodoistToken();

  // If we have the Todoist token and an item ID, try to fetch the full task
  if (itemId && token) {
    try {
      const response = await fetch(`https://api.todoist.com/api/v1/tasks/${itemId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const task = await response.json();
        payloadObj.item = task;
      } else {
        console.error(`Failed to fetch task ${itemId} from Todoist: ${response.status}`);
      }
    } catch (err) {
      console.error('Error fetching task from Todoist', err);
    }
  } else if (req.body?.event_data) {
    // Fallback: include whatever event_data Todoist provided
    payloadObj.item = req.body.event_data;
  }

  const payload = JSON.stringify(payloadObj);

  for (const client of clients) {
    client.write(`event: task-update\ndata: ${payload}\n\n`);
  }

  res.sendStatus(200);
});

app.get("/api/tasks", async (req, res) => {
  const token = getTodoistToken();

  if (!token) {
    return res.status(500).json({ error: "Todoist token missing" });
  }

  try {
    const response = await fetch("https://api.todoist.com/api/v1/tasks", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Todoist API error: ${response.status}`);
    }

    const data = await response.json();
    res.json(normalizeTasks(data));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, () => {
  console.log(`Magic Mirror backend running on port ${PORT}`);
});

process.on("SIGTERM", () => {
  clearInterval(heartbeat);

  for (const client of clients) {
    client.end();
  }

  server.close(() => {
    process.exit(0);
  });
});