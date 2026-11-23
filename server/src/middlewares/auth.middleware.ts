import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import config from "../lib/config.js";

const JWT_SECRET = config.JWT_SECRET;

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userEmail?: string;
}

export const authenticateToken = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

  if (!token) {
    res.status(401).json({ error: "Access token required" });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    next();
  } catch {
    res.status(403).json({ error: "Invalid or expired token" });
  }
};
