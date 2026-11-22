import { Router, type Response } from 'express';
import { pool } from '../config/db';
import { authenticateToken, type AuthRequest } from '../middlewares/auth.middleware';
import { PartnerError, id, requireManager, loadSnapshot, saveLot, toggleLot, saveSlot, savePricing, cancelHolding, saveProfile } from './partner.service';
import type { PoolClient } from 'pg';

const router = Router();
router.use(authenticateToken);
router.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
const endpoint = (readOnly: boolean, run: (client: PoolClient, manager: string, req: AuthRequest) => Promise<any>) => async (req: AuthRequest, res: Response) => {
  let client: PoolClient | undefined;
  try {
    const manager = id(req.user?.id);
    if (!readOnly && (!req.body || typeof req.body !== 'object' || Array.isArray(req.body))) throw new PartnerError(400, 'Nội dung yêu cầu không hợp lệ.');
    client = await pool.connect();
    await client.query(readOnly ? 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY' : 'BEGIN');
    if (!readOnly) await requireManager(client, manager, true);
    const data = await run(client, manager, req);
    await client.query('COMMIT');
    res.json({ success: true, data });
  } catch (cause) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    const error = cause as { code?: string; message?: string };
    if (cause instanceof PartnerError) res.status(cause.status).json({ success: false, message: cause.message });
    else if (error.code === '23505') res.status(409).json({ success: false, message: 'Mã ô, tọa độ hoặc số điện thoại đã tồn tại. Hãy kiểm tra lại.' });
    else if (['40001', '40P01'].includes(error.code ?? '')) res.status(409).json({ success: false, message: 'Dữ liệu đang được xử lý đồng thời. Hãy làm mới rồi thử lại.' });
    else {
      console.error('[Partner API]', error.code ?? 'CONNECTION_ERROR');
      res.status(503).json({ success: false, message: 'Không truy cập được PostgreSQL. Kiểm tra kết nối và schema database trên develop.' });
    }
  } finally { client?.release(); }
};
router.get('/snapshot', endpoint(true, (client, manager) => loadSnapshot(client, manager)));
router.post('/lots', endpoint(false, async (client, manager, req) => ({ id: await saveLot(client, manager, req.body) })));
router.put('/lots/:id', endpoint(false, async (client, manager, req) => ({ id: await saveLot(client, manager, req.body, id(req.params.id)) })));
router.patch('/lots/:id/status', endpoint(false, async (client, manager, req) => ({ id: await toggleLot(client, manager, id(req.params.id), req.body) })));
router.post('/slots', endpoint(false, async (client, manager, req) => ({ id: await saveSlot(client, manager, req.body) })));
router.put('/slots/:id', endpoint(false, async (client, manager, req) => ({ id: await saveSlot(client, manager, req.body, id(req.params.id)) })));
router.post('/pricing', endpoint(false, async (client, manager, req) => ({ id: await savePricing(client, manager, req.body) })));
router.put('/pricing/:id', endpoint(false, async (client, manager, req) => ({ id: await savePricing(client, manager, req.body, id(req.params.id)) })));
router.post('/reservations/:id/cancel', endpoint(false, async (client, manager, req) => ({ id: await cancelHolding(client, manager, id(req.params.id), req.body) })));
router.patch('/profile', endpoint(false, async (client, manager, req) => ({ id: await saveProfile(client, manager, req.body) })));
export default router;
