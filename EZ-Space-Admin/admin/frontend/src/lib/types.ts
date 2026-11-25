export interface AuthResponse {
  authenticated: boolean;
  user: string;
  email: string;
  csrf: string;
}

export interface SummaryResponse {
  users: {
    total: number;
    customers: number;
    managers: number;
  };
  lots: {
    total: number;
    active: number;
    pending: number;
  };
  slots: {
    total: number;
    available: number;
    holding: number;
    occupied: number;
    unavailable: number;
    standard: number;
    ev_charging: number;
    large: number;
    disabled: number;
  };
  sessions: {
    total: number;
    active: number;
    completed: number;
  };
  tickets: {
    total: number;
    active: number;
    used: number;
  };
  vehicles: {
    total: number;
    sedan: number;
    suv: number;
    ev: number;
  };
  platform_config?: PlatformConfig;
  server_time: string;
}

export interface DateRangeDisplay {
  from: string;
  to: string;
}

export interface DashboardResponse {
  range: DateRangeDisplay;
  commission?: {
    rate: number;
    percent: number;
    owner_percent: number;
  };
  books: {
    total: number;
    holding: number;
    paid: number;
    entered: number;
    completed: number;
    cancelled: number;
    forfeited: number;
    refunded: number;
  };
  today_books?: DashboardResponse['books'];
  payments: {
    transactions: number;
    received: number;
    deposits: number;
    finals: number;
    refunds: number;
    successful: number;
    net_received: number;
    admin_revenue: number;
    owner_revenue: number;
  };
  hourly: Array<{ hour: number; status: string; amount: number }>;
  recent: Array<{
    id: number;
    status: string;
    created_at: string;
    start_time: string;
    expected_end_time: string;
    deposit_amount: number;
    total_amount: number | null;
    lot_name: string;
    customer: string;
    slot_code: string;
    license_plate: string;
    vehicle_type: string;
  }>;
  pending: Array<{
    id: number;
    name: string;
    address: string;
    capacity: number;
    open_time: string;
    close_time: string;
    created_at: string;
    managers: string | null;
  }>;
  logs: Array<{
    id: number;
    action: string;
    note: string | null;
    created_at: string;
    entity_type: string | null;
    entity_id: number | null;
    actor: string | null;
    lot_name: string | null;
  }>;
}

export interface LotListItem {
  id: number;
  name: string;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  description?: string | null;
  open_time: string;
  close_time: string;
  capacity: number;
  status: string;
  approved_by?: number | null;
  approved_at?: string | null;
  approver_name: string | null;
  managers: string | null;
  vehicle_types: string | null;
  slot_total: number;
  slot_available: number;
  slot_occupied: number;
  slot_holding: number;
  slot_unavailable: number;
  min_rate: number | null;
  max_rate: number | null;
  reservations: number;
}

export interface LotsResponse {
  items: LotListItem[];
}

export interface LotSlot {
  id: number;
  parking_lot_id: number;
  code: string;
  row_index: number;
  col_index: number;
  slot_type: string;
  status: string;
  is_active: boolean;
}

export interface PricingRule {
  id: number;
  parking_lot_id: number;
  lot_name?: string;
  name: string | null;
  start_time: string;
  end_time: string;
  hourly_rate: number;
  surcharge: number;
  effective_from: string | null;
  effective_to: string | null;
}

export interface LotDetailResponse {
  lot: LotListItem;
  slots: LotSlot[];
  pricing: PricingRule[];
  managers: Array<{
    id: number;
    full_name: string;
    email: string;
    phone: string | null;
    assigned_at: string;
  }>;
  vehicles: Array<{ vehicle_type: string }>;
  reservations: Array<{ status: string; amount: number }>;
}

export interface UserListItem {
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  avatar_url?: string | null;
  created_at: string;
  updated_at?: string;
  vehicles: number;
  reservations: number;
  lots: number;
}

export interface UsersResponse {
  items: UserListItem[];
}

export interface UserDetailResponse {
  user: UserListItem;
  vehicles: Array<{
    id: number;
    license_plate: string;
    vehicle_name: string | null;
    vehicle_type: string;
    is_default: boolean;
    created_at: string;
  }>;
  lots: Array<{
    id: number;
    name: string;
    address: string;
    status: string;
    capacity: number;
    assigned_at: string;
  }>;
  reservations: Array<{
    id: number;
    lot_name: string;
    slot_code: string;
    license_plate: string;
    vehicle_type: string;
    status: string;
    deposit_amount: number;
    total_amount: number | null;
    start_time: string;
    expected_end_time: string;
    created_at: string;
  }>;
}

export interface RevenueLotRow {
  id: number;
  name: string;
  status: string;
  bookings: number;
  deposits: number;
  finals: number;
  received: number;
  refunds: number;
  forfeited_deposits: number;
  net_received: number;
  admin_revenue: number;
  owner_revenue: number;
}

export interface RevenueProviderRow {
  provider: string;
  transactions: number;
  received: number;
  refunds: number;
  net_received: number;
  admin_revenue: number;
  owner_revenue: number;
}

export interface RevenueVehicleRow {
  vehicle_type: string;
  bookings: number;
  received: number;
  refunds: number;
  net_received: number;
  admin_revenue: number;
  owner_revenue: number;
}

export interface RevenueDayRow {
  day: string;
  deposits: number;
  finals: number;
  received: number;
  refunds: number;
  net_received: number;
  admin_revenue: number;
  owner_revenue: number;
}

export interface RevenuePaymentRow {
  id: number;
  reservation_id: number;
  provider: string;
  payment_type: string;
  amount: number;
  status: string;
  transaction_ref: string | null;
  response_code: string | null;
  paid_at: string;
  lot_name: string;
  slot_code: string | null;
  customer: string | null;
  license_plate: string | null;
  received: number;
  refunds: number;
  net_received: number;
  admin_revenue: number;
  owner_revenue: number;
}

export interface RevenueResponse {
  range: DateRangeDisplay;
  totals: {
    transactions: number;
    received: number;
    deposits: number;
    finals: number;
    refunds: number;
    paid_deposits: number;
    net_received: number;
    admin_revenue: number;
    owner_revenue: number;
  };
  byLot: RevenueLotRow[];
  byProvider: RevenueProviderRow[];
  byVehicle: RevenueVehicleRow[];
  byDay: RevenueDayRow[];
  recent: RevenuePaymentRow[];
  commission: {
    rate: number;
    basis: string;
  };
}

export interface LogRecord {
  id: number;
  source: 'admin' | 'manager';
  action: string;
  category: string;
  user_id?: number | null;
  actor: string | null;
  actor_email?: string | null;
  actor_role?: string | null;
  entity_type?: string | null;
  entity_id?: number | null;
  lot_name?: string | null;
  old_value?: unknown;
  new_value?: unknown;
  note?: string | null;
  created_at: string;
  [key: string]: unknown;
}

export interface LogsResponse {
  items: Array<Record<string, unknown>>;
  manager_history: Array<Record<string, unknown>>;
}

export interface PlatformConfig {
  hold_timeout_minutes: number;
  arrival_timeout_minutes: number;
  deposit_amount: number;
  commission_rate: number;
  vnpay_tmn_code: string;
  ipn_webhook_url: string;
  maintenance_mode: boolean;
}

export interface SettingsResponse {
  config: PlatformConfig;
  defaults: PlatformConfig;
  enums: {
    payment_providers: string[];
  };
  gateway_stats: Array<{
    provider: string;
    total_transactions: number;
    success_transactions: number;
    total_amount: number;
    last_paid_at: string | null;
  }>;
  server_time: string;
}

