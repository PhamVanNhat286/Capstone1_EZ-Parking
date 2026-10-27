import { Response } from "express";
import { query } from "../config/db";
import { AuthRequest } from "../middlewares/auth.middleware";

// GET /api/vehicles - Lấy danh sách xe của user hiện tại
export const getMyVehicles = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Chưa xác thực người dùng" });
      return;
    }

    const result = await query(
      `SELECT id, license_plate, vehicle_name, vehicle_type, is_default, created_at, updated_at
       FROM vehicles 
       WHERE user_id = $1 
       ORDER BY id ASC;`,
      [req.user.id]
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Lỗi lấy danh sách xe:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy danh sách xe",
    });
  }
};

// POST /api/vehicles - Thêm xe mới cho user hiện tại
export const addVehicle = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Chưa xác thực người dùng" });
      return;
    }

    const { license_plate, vehicle_name, vehicle_type } = req.body;

    if (!license_plate || !license_plate.trim()) {
      res.status(400).json({
        success: false,
        message: "Vui lòng nhập biển số xe",
      });
      return;
    }

    const cleanPlate = license_plate.trim().toUpperCase();
    const cleanType = vehicle_type === "SUV" || vehicle_type === "EV" ? vehicle_type : "Sedan";
    const cleanName = vehicle_name && vehicle_name.trim() 
      ? vehicle_name.trim() 
      : (cleanType === "SUV" ? "SUV gầm cao" : cleanType === "EV" ? "Xe điện" : "Sedan cá nhân");

    // Kiểm tra xem biển số này đã tồn tại chưa
    const existing = await query("SELECT id, user_id FROM vehicles WHERE license_plate = $1", [cleanPlate]);
    if (existing.rows.length > 0) {
      if (Number(existing.rows[0].user_id) === Number(req.user.id)) {
        res.status(409).json({
          success: false,
          message: "Bạn đã thêm biển số xe này trong hồ sơ",
        });
        return;
      } else {
        res.status(409).json({
          success: false,
          message: "Biển số xe này đã được liên kết với tài khoản khác",
        });
        return;
      }
    }

    const insertSql = `
      INSERT INTO vehicles (user_id, license_plate, vehicle_name, vehicle_type, is_default)
      VALUES ($1, $2, $3, $4, false)
      RETURNING id, license_plate, vehicle_name, vehicle_type, is_default, created_at, updated_at;
    `;
    const result = await query(insertSql, [req.user.id, cleanPlate, cleanName, cleanType]);

    res.status(201).json({
      success: true,
      message: "Thêm phương tiện thành công",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Lỗi thêm xe:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi thêm phương tiện",
    });
  }
};

// PUT /api/vehicles/:id - Cập nhật thông tin xe
export const updateVehicle = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Chưa xác thực người dùng" });
      return;
    }

    const vehicleId = req.params.id;
    const { license_plate, vehicle_name, vehicle_type } = req.body;

    const cleanPlate = license_plate ? license_plate.trim().toUpperCase() : null;
    const cleanName = vehicle_name ? vehicle_name.trim() : null;
    const cleanType = vehicle_type === "SUV" || vehicle_type === "EV" || vehicle_type === "Sedan" ? vehicle_type : null;

    // Kiểm tra quyền sở hữu xe
    const checkRes = await query("SELECT id, user_id FROM vehicles WHERE id = $1", [vehicleId]);
    if (checkRes.rows.length === 0) {
      res.status(404).json({ success: false, message: "Không tìm thấy xe" });
      return;
    }
    if (Number(checkRes.rows[0].user_id) !== Number(req.user.id)) {
      res.status(403).json({ success: false, message: "Bạn không có quyền sửa xe này" });
      return;
    }

    const updateSql = `
      UPDATE vehicles 
      SET 
        license_plate = COALESCE($1, license_plate),
        vehicle_name = COALESCE($2, vehicle_name),
        vehicle_type = COALESCE($3, vehicle_type),
        updated_at = NOW()
      WHERE id = $4 AND user_id = $5
      RETURNING id, license_plate, vehicle_name, vehicle_type, is_default, created_at, updated_at;
    `;
    const result = await query(updateSql, [cleanPlate, cleanName, cleanType, vehicleId, req.user.id]);

    res.json({
      success: true,
      message: "Cập nhật thông tin xe thành công",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Lỗi cập nhật xe:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi cập nhật xe",
    });
  }
};

// DELETE /api/vehicles/:id - Xóa xe
export const deleteVehicle = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Chưa xác thực người dùng" });
      return;
    }

    const vehicleId = req.params.id;
    const result = await query(
      "DELETE FROM vehicles WHERE id = $1 AND user_id = $2 RETURNING id, license_plate;",
      [vehicleId, req.user.id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        message: "Không tìm thấy xe hoặc bạn không có quyền xóa",
      });
      return;
    }

    res.json({
      success: true,
      message: "Đã xóa phương tiện thành công",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Lỗi xóa xe:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi xóa phương tiện",
    });
  }
};
