'use strict';
// Bộ điều phối API; mỗi nghiệp vụ nằm trong controller riêng.
const { summary, dashboard } = require('./controllers/dashboard.cjs');
const { lots, lot, lotStatus } = require('./controllers/lots.cjs');
const { users, user, userStatus } = require('./controllers/users.cjs');
const { logs } = require('./controllers/logs.cjs');
const { records } = require('./controllers/records.cjs');
const { revenue } = require('./controllers/revenue.cjs');
const { settings } = require('./controllers/settings.cjs');

module.exports = {
  readers: { summary, dashboard, lots, lot, users, user, logs, records, revenue, settings },
  writers: { lot_status: lotStatus, user_status: userStatus }
};
