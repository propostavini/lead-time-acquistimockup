# Mock server — Lead Time Acquisti

Server farlocco (json-server usato come libreria) che implementa il contratto API
del portale. E' la specifica operativa per il backend vero.

Avvio: `npm run mock` → http://localhost:3000

## Rotte

- `GET /purchase_orders` — lista ordini a fornitore, dal piu' recente al meno recente.
  Filtri (tutti combinabili): `search` (testo su fornitore/numero ordine),
  `only_alerts=true`, `mode=pickup|shipping` (PA/PF), `start_date`/`end_date` (ISO,
  start <= end obbligatorio).
- `PATCH /purchase_orders/{id}/pv_estimate` — body `{ "arrival_date": "2026-07-23" }`
  oppure `{ "arrival_date": null }` per eliminare la stima PV.
- `POST /mails` — invio mail standard dal portale (parte da acquisti@).
  Body: `order_number`, `template_key`, `subject`, `body`, `signature_key`.

I dati di `db.json` coprono tutti gli stati della matrice v2, compreso `not_sent`
(ordine in NAV senza mail in uscita) e le mail dello spedizioniere (`direction:
"carrier"`), inclusa la mail reale di ritiro ARCO col riferimento `26.AOR.NNNNN`.
