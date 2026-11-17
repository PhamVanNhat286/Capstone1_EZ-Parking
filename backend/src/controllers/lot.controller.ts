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
    const start = typeof req.query.start_time === "string" ? new Date(req.query.start_time) : new Date();
    const end = typeof req.query.end_time === "string" ? new Date(req.query.end_time) : new Date(start.getTime() + 2 * 3600_000);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start || end.getTime() - start.getTime() > 24 * 3600_000) {
      res.status(400).json({ success: false, message: "Khoảng ngày giờ không hợp lệ." });
      return;
    }
    const sql = `
      SELECT 
        s.id, s.parking_lot_id, s.code, s.row_index, s.col_index, s.slot_type,
        CASE WHEN EXISTS (
          SELECT 1 FROM reservations r
          WHERE r.slot_id=s.id AND r.status='entered'
            AND r.start_time < $3::timestamptz
            AND r.expected_end_time > $2::timestamptz
        ) THEN 'occupied'
        WHEN EXISTS (
          SELECT 1 FROM reservations r
          WHERE r.slot_id=s.id AND r.status IN ('holding', 'paid')
            AND r.start_time < $3::timestamptz
            AND r.expected_end_time > $2::timestamptz
            AND (r.status <> 'holding' OR r.hold_expires_at > NOW())
        ) THEN 'holding'
        WHEN s.status='occupied' AND $2::timestamptz <= NOW() THEN 'occupied'
        WHEN s.status IN ('holding', 'occupied') AND EXISTS (
          SELECT 1 FROM reservations r WHERE r.slot_id=s.id
            AND r.status IN ('holding', 'paid', 'entered')
        ) THEN 'available' ELSE s.status END AS status,
        COALESCE((
          SELECT json_agg(json_build_object(
            'startTime', r.start_time, 'endTime', r.expected_end_time, 'status', r.status
          ) ORDER BY r.start_time)
          FROM reservations r WHERE r.slot_id=s.id
            AND r.status IN ('holding', 'paid', 'entered')
            AND r.expected_end_time > NOW() - INTERVAL '1 day'
            AND r.start_time < NOW() + INTERVAL '30 days'
            AND (r.status <> 'holding' OR r.hold_expires_at > NOW())
        ), '[]'::json) AS booked_intervals,
        s.is_active
      FROM slots s
      WHERE s.parking_lot_id = $1 AND s.is_active = TRUE
      ORDER BY s.row_index ASC, s.col_index ASC;
    `;

    const { rows } = await query(sql, [lotId, start, end]);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Error fetching slots:", error);
    res.status(500).json({ success: false, message: "Lỗi server khi lấy sơ đồ ô đỗ" });
  }
};
