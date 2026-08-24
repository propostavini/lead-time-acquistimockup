import pkg from 'json-server';
import { join } from 'path';
const { router: _router, bodyParser, create, defaults } = pkg;
const PORT = 3000;
const server = create();
const router = _router(join(import.meta.dirname, 'db.json'));
const db = router.db; // la stessa fonte dati (db.json) usata da json-server

server.use(defaults()); // logger, static, CORS
server.use(bodyParser);

// ── GET /purchase_orders: filtri combinabili, ordinati dal piu' recente ──
server.get('/purchase_orders', (req, res) => {
  const search = (req.query.search || '').toLowerCase();
  const onlyAlerts = req.query.only_alerts === 'true';
  const mode = req.query.mode; // 'pickup' | 'shipping'
  const state = req.query.state; // stato della matrice, es. 'shipped'
  const start = req.query.start_date;
  const end = req.query.end_date;
  if (start && end && start > end) {
    return res.status(400).json({ error: 'start_date must be <= end_date' });
  }

  const orders = db
    .get('purchase_orders')
    .value()
    .filter((o) => !onlyAlerts || o.alert_message)
    .filter((o) => mode !== 'pickup' || o.is_pickup)
    .filter((o) => mode !== 'shipping' || (!o.is_pickup && o.carrier))
    .filter((o) => !state || o.state === state)
    .filter((o) => !(start || end) || o.order_date)
    .filter((o) => !start || o.order_date >= start)
    .filter((o) => !end || o.order_date <= end)
    .filter(
      (o) =>
        !search ||
        o.supplier_name.toLowerCase().includes(search) ||
        o.order_number.toLowerCase().includes(search),
    )
    .sort((a, b) => (b.order_date || '').localeCompare(a.order_date || ''));

  res.json({ data: orders });
});

// ── PATCH /purchase_orders/:id/pv_estimate: imposta o elimina la stima PV ──
server.patch('/purchase_orders/:id/pv_estimate', (req, res) => {
  const id = Number(req.params.id);
  const body = req.body || {};
  if (!('arrival_date' in body)) {
    return res.status(400).json({ error: 'arrival_date missing (ISO date or null)' });
  }
  if (body.arrival_date !== null && !/^\d{4}-\d{2}-\d{2}$/.test(body.arrival_date)) {
    return res.status(400).json({ error: 'arrival_date must be ISO YYYY-MM-DD or null' });
  }
  const order = db.get('purchase_orders').find({ id }).value();
  if (!order) {
    return res.status(404).json({ error: 'Purchase order not found: ' + id });
  }
  db.get('purchase_orders')
    .find({ id })
    .assign({ lead_time: { ...order.lead_time, pv_arrival: body.arrival_date } })
    .write();
  res.json(db.get('purchase_orders').find({ id }).value());
});

// ── POST /mails: il backend vero comporra' e spedira' da acquisti@ ──
let mailId = 0;
server.post('/mails', (req, res) => {
  const m = req.body || {};
  if (!m.order_number) return res.status(400).json({ error: 'order_number missing' });
  if (!m.template_key) return res.status(400).json({ error: 'template_key missing' });
  if (!m.subject || !String(m.subject).trim())
    return res.status(400).json({ error: 'subject empty' });
  if (!m.body || !String(m.body).trim()) return res.status(400).json({ error: 'body empty' });
  if (String(m.body).length > 5000)
    return res.status(400).json({ error: 'body too long (max 5000)' });
  if (!m.signature_key) return res.status(400).json({ error: 'signature_key missing' });
  mailId += 1;
  console.log(`[mail ${mailId}] ${m.template_key} — order ${m.order_number}`);
  res.json({ ok: true, id: mailId, sent_from: 'acquisti@propostavini.com' });
});

// tutte le altre rotte: REST standard di json-server
server.use(router);

server.listen(PORT, () => {
  console.log(`Mock json-server avviato: http://localhost:${PORT}/purchase_orders`);
});
