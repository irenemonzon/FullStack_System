import "./env.js";
import express from "express";
import cors from "cors";
import { PORT, WEB_ORIGIN } from "./env.js";

const app = express();

app.use(cors({ origin: WEB_ORIGIN }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
