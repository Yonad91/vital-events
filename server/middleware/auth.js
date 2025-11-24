// middleware/auth.js
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { JWT_SECRET } from "../config.js";

export const authMiddleware = (allowedRoles = []) => {
  return async (req, res, next) => {
    try {
      // Allow CORS preflight checks to pass through without auth
      if (req.method === "OPTIONS") {
        return next();
      }
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith("Bearer "))
        return res.status(401).json({ message: "Unauthorized: No token" });

      const token = authHeader.split(" ")[1];

      const decoded = jwt.verify(token, JWT_SECRET);
      console.log("Decoded token:", decoded);
      // Fetch user from DB
      const user = await User.findById(decoded.id).select("-password");
      console.log("Auth middleware user lookup:", user);
      if (!user) return res.status(401).json({ message: "User not found" });
      // Attach user info to request
      req.user = { id: user._id, role: user.role, name: user.name };
      // Check role permissions if any roles are specified
      if (allowedRoles.length && !allowedRoles.includes(user.role)) {
        console.log("Forbidden: role", user.role, "not in", allowedRoles);
        return res.status(403).json({ message: "Forbidden: Insufficient role" });
      }
      next();
    } catch (err) {
      console.error(err);
      res.status(401).json({ message: "Unauthorized: Invalid token" });
    }
  };
};
