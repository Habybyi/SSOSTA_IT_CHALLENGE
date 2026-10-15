import "dotenv/config";

const required = (name) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Chýba premenná prostredia ${name} (pozri server/.env.example).`);
  }
  return value;
};

export const config = {
  port: Number(process.env.PORT || 3001),
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "12h",
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
};
