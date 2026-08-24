# Lead Time Acquisti — Proposta Vini

Portale interno dell'ufficio acquisti: risponde a "dov'è la merce che ho ordinato ai
produttori, quando arriva, e dove devo intervenire?". Frontend Angular con **mock server**
che definisce il contratto API — il mock è la specifica operativa per il backend.

Design di riferimento: mockup approvato `lead_time_acquisti_v22.html` (iterato v1→v22 col business).

## Avvio in locale

```bash
npm install
npm run mock     # server farlocco su http://localhost:3000
npm start        # app su http://localhost:4200
```

> Nota di onestà: questo repo è stato scritto senza poter eseguire `npm`/`ng` nell'ambiente
> di generazione (registry bloccato). La prima verifica di build/serve va fatta in locale o
> in CI; gli errori di battitura eventuali si sistemano al primo giro.

## Immagini da caricare a mano (GitHub web → Add file → Upload files)

Il push automatico non può caricare binari. Servono in `public/img/`:

- `glass-truck.png` — bicchiere col camioncino (testata + firma), sfondo trasparente
- `logo-vini.png` — logo Proposta Vini, sfondo trasparente
- `logo-spirits.png` — logo Proposta Spirits, sfondo trasparente

e un `public/favicon.ico`. I file pronti sono nella cartella di lavoro di Roberto
(`Portale acquisti/img-per-github/`).

## Cosa fa oggi (con il mock)

- Colonna sinistra: ricerca, filtro ⚠ solo allerte, filtro Ritiro (PA) / Spedizione (PF),
  intervallo date (combinabili); ordini dal più recente. Il **server** filtra e ordina.
- Dettaglio: testata con badge stato e allerta a destra; freccia lead time con linea
  orizzontale agganciata al box tracking (blu se il tracking c'è, celeste se manca);
  matrice a 3 parametri (storico, geografia, PA/PF da NAV); stima standard + **stima PV**
  con calendario e ✕ elimina (persistita via PATCH); box tracking sempre presente;
  fraseggio mail con icone per direzione (uscita, produttore, **spedizioniere** col
  camioncino, NAV) e badge ✦ AI.
- Composer: template suggerito per stato (matrice v2), corpo modificabile, firma
  selezionabile (Matteo Sartori / Francesco Bazzanella / nessuna), **Invia con Outlook**
  (POST al backend, parte da acquisti@) e **Invia da Outlook** (apre il client con la
  mail pronta).

## Contratto API (inglese, snake_case — dettagli in `mock-server/README.md`)

| Rotta | Uso |
| --- | --- |
| `GET /purchase_orders` | lista ordini; filtri `search`, `only_alerts`, `mode=pickup\|shipping`, `start_date`, `end_date` |
| `PATCH /purchase_orders/{id}/pv_estimate` | imposta/elimina la stima PV |
| `POST /mails` | invio mail standard da acquisti@ |

I DTO sono in `src/app/core/models/` e sono la fonte di verità: il backend (esagonale:
validator zod → controller → use case → port → adapter, logger pino) va scritto contro
questi tipi. La matrice stati v2 (NONE, NOT_SENT, SENT, RECEIVED, SHIPPED, ARRIVED, con
la regola di salto sulla mail dello spedizioniere) è documentata nel commento di
`purchase-order.dto.ts`.

## Cosa resta al backend vero

Lettura NAV (ordini, fornitore, storico, PA/PF, provincia→regione, giacenza verde,
pulsante "aggiungi previsione a disponibilità"), lettura Outlook (uscita/entrata/
spedizionieri, chiave `26.AOR.NNNNN` in oggetto o nel "Riferimento ritiro" ARCO),
motore stati/allerte come da matrice, tracking ARCO (API già usata nel Progetto 1),
deep-link NAV sui due bottoni della testata (oggi segnaposto).

## Convenzioni

Conventional Commits (commitlint + husky + semantic-release), Prettier, ESLint,
costanti CAPITAL_CASE con pattern const-object, niente SVG inline (icone in
`public/icons/`), stili dei componenti estratti nei bundle globali (`src/styles/`),
Tailwind per il layout nei template, override PrimeNG negli scss con `!important`
dove serve, budget `anyComponentStyle` sorvegliato.
