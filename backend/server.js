const express = require("express");
const os = require("os");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST || "database",
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || "swarmuser",
  password: process.env.DB_PASSWORD || "swarm_password",
  database: process.env.DB_NAME || "swarmlab",
});

const wait = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

async function initializeDatabase() {
  while (true) {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS messages (
          id SERIAL PRIMARY KEY,
          text VARCHAR(200) NOT NULL,
          backend_instance VARCHAR(100) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      console.log("Base de datos conectada correctamente.");
      break;
    } catch (error) {
      console.error(
        "La base de datos todavía no está disponible. Reintentando...",
        error.message
      );

      await wait(3000);
    }
  }
}

app.get("/api/health", async (_req, res) => {
  try {
    const databaseResult = await pool.query("SELECT NOW() AS database_time");

    res.json({
      status: "ok",
      service: "swarmlab-backend",
      instance: os.hostname(),
      database: "connected",
      databaseTime: databaseResult.rows[0].database_time,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      instance: os.hostname(),
      database: "disconnected",
      error: error.message,
    });
  }
});

app.get("/api/messages", async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, text, backend_instance, created_at
      FROM messages
      ORDER BY id DESC
      LIMIT 20
    `);

    res.json({
      instance: os.hostname(),
      messages: result.rows,
    });
  } catch (error) {
    res.status(500).json({
      message: "No fue posible consultar los mensajes.",
      error: error.message,
    });
  }
});

app.post("/api/messages", async (req, res) => {
  try {
    const text = String(req.body.text || "").trim();

    if (!text) {
      return res.status(400).json({
        message: "El mensaje es obligatorio.",
      });
    }

    if (text.length > 200) {
      return res.status(400).json({
        message: "El mensaje no puede superar los 200 caracteres.",
      });
    }

    const instance = os.hostname();

    const result = await pool.query(
      `
        INSERT INTO messages (text, backend_instance)
        VALUES ($1, $2)
        RETURNING id, text, backend_instance, created_at
      `,
      [text, instance]
    );

    return res.status(201).json({
      message: "Mensaje registrado correctamente.",
      instance,
      data: result.rows[0],
    });
  } catch (error) {
    return res.status(500).json({
      message: "No fue posible registrar el mensaje.",
      error: error.message,
    });
  }
});

app.get("/", (_req, res) => {
  res.send("Backend de SwarmLab funcionando.");
});

async function startServer() {
  await initializeDatabase();

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Backend ejecutándose en el puerto ${PORT}`);
    console.log(`Instancia actual: ${os.hostname()}`);
  });
}

startServer().catch((error) => {
  console.error("Error al iniciar el backend:", error);
  process.exit(1);
});