import { Request, Response } from "express";
import { query } from "../config/db";

// GET /api/lots - Lấy danh sách tất cả các bãi xe kèm số lượng ô trống
export const getLots = async (req: Request, res: Response): Promise<void> => {
  try {
    const sql = `
      SELECT 
        l.id,
        l.name,
        l.address,
        l.latitude,
        l.longitude,
        l.description,
        l.open_time,
        l.close_time,
        l.capacity AS total,
        l.status,
        COUNT(CASE WHEN s.status = 'available' THEN 1 END) AS available_total,
        COUNT(CASE WHEN s.status = 'available' AND s.slot_type = 'standard' THEN 1 END) AS available_sedan,
        COUNT(CASE WHEN s.status = 'available' AND s.slot_type = 'large' THEN 1 END) AS available_suv,
        COUNT(CASE WHEN s.status = 'available' AND s.slot_type = 'ev_charging' THEN 1 END) AS available_ev,
        COUNT(CASE WHEN s.status = 'holding' THEN 1 END) AS holding,
        COUNT(CASE WHEN s.status = 'occupied' THEN 1 END) AS occupied,
        COALESCE(p.hourly_rate, 20000) AS price
      FROM parking_lots l
      LEFT JOIN slots s ON s.parking_lot_id = l.id AND s.is_active = TRUE
      LEFT JOIN (
        SELECT DISTINCT ON (parking_lot_id) parking_lot_id, hourly_rate
        FROM pricing_rules
        ORDER BY parking_lot_id, id
      ) p ON p.parking_lot_id = l.id
      WHERE l.status = 'active'
      GROUP BY l.id, p.hourly_rate
      ORDER BY l.id ASC;
    `;

    const { rows } = await query(sql);
    
    // Format response to match frontend expectations
    const formattedLots = rows.map((lot) => ({
      id: String(lot.id),
      name: lot.name,
      address: lot.address,
      latitude: Number(lot.latitude),
      longitude: Number(lot.longitude),
      total: Number(lot.total),
      available: {
        total: Number(lot.available_total),
        sedan: Number(lot.available_sedan),
        suv: Number(lot.available_suv),
        ev: Number(lot.available_ev),
      },
      holding: Number(lot.holding),
      occupied: Number(lot.occupied),
      price: Number(lot.price),
    }));

    res.json({ success: true, data: formattedLots });
  } catch (error) {
    console.error("Error fetching lots:", error);
    res.status(500).json({ success: false, message: "Lỗi server khi lấy danh sách bãi xe" });
  }
};

const SLUG_TO_ID: Record<string, number> = {
  "hai-chau-a": 1,
  "cau-rong": 2,
  "san-bay-t1": 3,
};

const resolveLotId = (rawId: string | string[] | number | undefined): number => {
  const str = String(Array.isArray(rawId) ? rawId[0] : rawId).toLowerCase();
  if (SLUG_TO_ID[str]) return SLUG_TO_ID[str];
  const num = parseInt(str, 10);
  return isNaN(num) ? 1 : num;
};

// GET /api/lots/:id - Xem chi tiết 1 bãi xe
export const getLotById = async (req: Request, res: Response): Promise<void> => {
  try {
    const lotId = resolveLotId(req.params.id);
    const lotRes = await query("SELECT * FROM parking_lots WHERE id = $1;", [lotId]);
    
    if (lotRes.rows.length === 0) {
      res.status(404).json({ success: false, message: "Không tìm thấy bãi xe" });
      return;
    }

    const pricingRes = await query("SELECT * FROM pricing_rules WHERE parking_lot_id = $1;", [lotId]);

    res.json({
      success: true,
      data: {
        ...lotRes.rows[0],
        pricing_rules: pricingRes.rows,
      },
    });
  } catch (error) {
    console.error("Error fetching lot by id:", error);
    res.status(500).json({ success: false, message: "Lỗi server khi lấy chi tiết bãi xe" });
  }
};

// GET /api/lots/:id/slots - Lấy danh sách ô đỗ & sơ đồ 2D
export const getLotSlots = async (req: Request, res: Response): Promise<void> => {
  try {
    const lotId = resolveLotId(req.params.id);
    const sql = `
      SELECT 
        id,
        parking_lot_id,
        code,
        row_index,
        col_index,
        slot_type,
        status,
        is_active
      FROM slots
      WHERE parking_lot_id = $1 AND is_active = TRUE
      ORDER BY row_index ASC, col_index ASC;
    `;

    const { rows } = await query(sql, [lotId]);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Error fetching slots:", error);
    res.status(500).json({ success: false, message: "Lỗi server khi lấy sơ đồ ô đỗ" });
  }
};
