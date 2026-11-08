import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthUser {
  id: number;
  email: string;
  role: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

export const authenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer <token>

  if (!token) {
    res.status(401).json({
      success: false,
      message: "Vui lòng đăng nhập để tiếp tục (Thiếu token)",
    });
    return;
  }

  const secret = process.env.JWT_SECRET || "ezspace_jwt_secret_capstone_2026";

  jwt.verify(token, secret, (err, decoded) => {
    if (err) {
      res.status(403).json({
        success: false,
        message: "Phiên đăng nhập hết hạn hoặc token không hợp lệ",
      });
      return;
    }

    req.user = decoded as AuthUser;
    next();
  });
};

export const optionalAuthenticateToken = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return next();
  }

  const secret = process.env.JWT_SECRET || "ezspace_jwt_secret_capstone_2026";
  jwt.verify(token, secret, (err, decoded) => {
    if (!err && decoded) {
      req.user = decoded as AuthUser;
    }
    next();
  });
};
