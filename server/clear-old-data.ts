import { getDb } from "./db";
import { 
  doctors, 
  schedules, 
  scheduleEntries,
  scheduleProfiles,
  dateUnavailabilities,
  fixedUnavailabilities,
  monthlyExceptions,
  nightRotationState,
  weeklyRules,
  weekendRules
} from "../drizzle/schema";

async function clearOldData() {
  const db = await getDb();
  if (!db) {
    console.error("Database not connected");
    process.exit(1);
  }

  console.log("Starting cleanup of old system data...");
  
  try {
    // In Drizzle/MySQL, we might need to disable foreign key checks to delete everything easily,
    // or just delete in the right order.
    console.log("Deleting schedule entries...");
    await db.delete(scheduleEntries);
    
    console.log("Deleting schedules...");
    await db.delete(schedules);
    
    console.log("Deleting night rotation state...");
    await db.delete(nightRotationState);
    
    console.log("Deleting date unavailabilities...");
    await db.delete(dateUnavailabilities);
    
    console.log("Deleting fixed unavailabilities...");
    await db.delete(fixedUnavailabilities);
    
    console.log("Deleting monthly exceptions...");
    await db.delete(monthlyExceptions);

    console.log("Deleting weekly rules...");
    await db.delete(weeklyRules);

    console.log("Deleting weekend rules...");
    await db.delete(weekendRules);
    
    console.log("Deleting doctors...");
    await db.delete(doctors);

    console.log("Deleting old schedule profiles...");
    // Only delete profiles that are not the active one or just delete all and we will recreate default
    await db.delete(scheduleProfiles);

    console.log("Successfully wiped old schedules, rules, and doctors.");
    process.exit(0);
  } catch (error) {
    console.error("Error cleaning up data:", error);
    process.exit(1);
  }
}

clearOldData();
