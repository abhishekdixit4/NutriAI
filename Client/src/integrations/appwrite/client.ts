import { Client, Account, Databases, Storage, Functions } from "appwrite";

const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT;
const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID;

const normalizedEndpoint = endpoint?.trim() || "https://cloud.appwrite.io/v1";
const normalizedProjectId = projectId?.trim() || "";

export const appwriteConfigIssues: string[] = [];
if (!endpoint?.trim()) {
  appwriteConfigIssues.push("VITE_APPWRITE_ENDPOINT is missing");
}
if (!projectId?.trim()) {
  appwriteConfigIssues.push("VITE_APPWRITE_PROJECT_ID is missing");
}

export const appwrite = new Client()
  .setEndpoint(normalizedEndpoint)
  .setProject(normalizedProjectId);

export const account = new Account(appwrite);
export const databases = new Databases(appwrite);
export const storage = new Storage(appwrite);
export const functions = new Functions(appwrite);

export const DB_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID || "69e1eedf001b32221fc0";
export const PROFILES_COLLECTION = "profiles";
export const MEAL_LOGS_COLLECTION = "meal_logs";
export const MEAL_IMAGES_BUCKET = import.meta.env.VITE_APPWRITE_MEAL_IMAGES_BUCKET_ID || "meal-images";
export const ANALYZE_FUNCTION_ID = import.meta.env.VITE_APPWRITE_ANALYZE_FUNCTION_ID || "analyze-food-image";
