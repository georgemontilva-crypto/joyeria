import { pool, runMigrations, seedIfEmpty } from "./index";

await runMigrations();
const seeded = await seedIfEmpty();
console.log(seeded ? "Catalog seeded." : "Database already has a catalog; nothing was changed.");
await pool.end();
