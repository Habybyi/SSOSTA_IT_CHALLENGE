import { PrismaClient } from "@prisma/client";

// Jedna inštancia pre celý proces, inak by každý import otváral nové spojenia.
export const prisma = new PrismaClient();
