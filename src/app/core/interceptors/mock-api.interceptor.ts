import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { of } from 'rxjs';
import mockDb from '../../../../mock-server/db.json';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Order = (typeof mockDb.purchase_orders)[number] & Record<string, any>;

export const mockApiInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.method === 'GET' && req.url.endsWith('/purchase_orders')) {
    const search = (req.params.get('search') ?? '').toLowerCase();
    const onlyAlerts = req.params.get('only_alerts') === 'true';
    const mode = req.params.get('mode');
    const state = req.params.get('state');
    const start = req.params.get('start_date');
    const end = req.params.get('end_date');

    let orders: Order[] = [...mockDb.purchase_orders];
    if (onlyAlerts) orders = orders.filter((o) => !!o.alert_message);
    if (mode === 'pickup') orders = orders.filter((o) => o.is_pickup);
    if (mode === 'shipping') orders = orders.filter((o) => !o.is_pickup && o.carrier);
    if (state) orders = orders.filter((o) => o.state === state);
    if (start) orders = orders.filter((o) => o.order_date && o.order_date >= start);
    if (end) orders = orders.filter((o) => o.order_date && o.order_date <= end);
    if (search) {
      orders = orders.filter(
        (o) =>
          o.supplier_name.toLowerCase().includes(search) ||
          o.order_number.toLowerCase().includes(search),
      );
    }
    orders = orders.sort((a, b) => (b.order_date ?? '').localeCompare(a.order_date ?? ''));
    return of(new HttpResponse({ status: 200, body: { data: orders } }));
  }

  const pvMatch = req.url.match(/\/purchase_orders\/(\d+)\/pv_estimate$/);
  if (req.method === 'PATCH' && pvMatch) {
    const id = Number(pvMatch[1]);
    const order = mockDb.purchase_orders.find((o) => o.id === id) as Order | undefined;
    if (!order) return of(new HttpResponse({ status: 404, body: { error: 'Not found' } }));
    const body = req.body as { arrival_date: string | null };
    return of(
      new HttpResponse({
        status: 200,
        body: {
          ...order,
          lead_time: { ...order.lead_time, pv_arrival: body?.arrival_date ?? null },
        },
      }),
    );
  }

  if (req.method === 'POST' && req.url.endsWith('/mails')) {
    return of(
      new HttpResponse({
        status: 200,
        body: { ok: true, id: 1, sent_from: 'acquisti@propostavini.com' },
      }),
    );
  }

  return next(req);
};
