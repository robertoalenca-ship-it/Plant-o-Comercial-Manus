import { drizzle } from "drizzle-orm/mysql2";
import { eq } from "drizzle-orm";
import { scheduleProfiles } from "../drizzle/schema";
import "dotenv/config";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL missing");
    process.exit(1);
  }
  const db = drizzle(process.env.DATABASE_URL);
  
  await db
    .update(scheduleProfiles)
    .set({
      name: "Clínica Padrão",
      description: "Escala principal",
    })
    .where(eq(scheduleProfiles.name, "Ortopedia"));
    
  console.log("Renamed 'Ortopedia' to 'Clínica Padrão' sucessfully.");
  process.exit(0);
}

main().catch(console.error);
