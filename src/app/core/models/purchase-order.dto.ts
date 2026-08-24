/**
 * Contratto dati del portale Lead Time Acquisti.
 * API in inglese snake_case; questo file e' la specifica per il backend
 * (architettura esagonale: validator zod -> controller -> use case -> port -> adapter).
 *
 * Matrice stati v2 (decisa col business, 21/08/2026):
 * - NONE: nessun ordine attivo per il fornitore.
 * - NOT_SENT: ordine presente in NAV ma mail in uscita NON trovata in Outlook (allerta dopo 1 gg).
 * - SENT: mail d'ordine partita da acquisti@ (allerta: >2 gg senza risposta).
 * - RECEIVED: mail del fornitore che conferma, letta dall'AI (allerta: >3 gg senza spedizione).
 * - SHIPPED: mail "spedito" del fornitore O mail dello spedizioniere di presa in carico/ritiro
 *   (da SENT o RECEIVED si salta direttamente qui se arriva la mail dello spedizioniere).
 * - ARRIVED: giacenza verde su NAV. Chiuso, mai allerta. Mai regressioni automatiche.
 */
export const PURCHASE_ORDER_STATES = {
  NONE: 'none',
  NOT_SENT: 'not_sent',
  SENT: 'sent',
  RECEIVED: 'received',
  SHIPPED: 'shipped',
  ARRIVED: 'arrived',
} as const;

export type PurchaseOrderState = (typeof PURCHASE_ORDER_STATES)[keyof typeof PURCHASE_ORDER_STATES];

/** Etichette e classi CSS delle pillole di stato (stati "asciutti", senza la parola ORDINE). */
export const STATE_LABELS: Record<PurchaseOrderState, { label: string; cssClass: string }> = {
  none: { label: 'NESSUNO', cssClass: 'p-none' },
  not_sent: { label: 'NON INVIATO', cssClass: 'p-notsent' },
  sent: { label: 'INVIATO', cssClass: 'p-sent' },
  received: { label: 'RICEVUTO', cssClass: 'p-received' },
  shipped: { label: 'SPEDITO', cssClass: 'p-shipped' },
  arrived: { label: 'ARRIVATO', cssClass: 'p-arrived' },
};

/** Provenienza di una mail nel fraseggio dell'ordine. */
export const MAIL_DIRECTIONS = {
  /** In uscita da acquisti@. */
  OUT: 'out',
  /** In entrata dal fornitore. */
  IN: 'in',
  /** In entrata dallo spedizioniere (presa in carico, ritiro ARCO, tracking). */
  CARRIER: 'carrier',
  /** Evento da NAV (es. giacenza verde = arrivato). */
  NAV: 'nav',
} as const;

export type MailDirection = (typeof MAIL_DIRECTIONS)[keyof typeof MAIL_DIRECTIONS];

export interface PurchaseOrderMailDTO {
  direction: MailDirection;
  /** "2026-07-11T16:05" — ISO senza secondi; il fuso e' quello di sede. */
  datetime: string;
  subject: string;
  snippet: string;
  /** Etichetta stato prodotta dalla lettura (es. "SPEDITO · data 11/07"). */
  detected_state_label: string;
  /** true se lo stato e' stato assegnato dall'AI (badge "AI" nel fraseggio). */
  by_ai: boolean;
}

export interface TrackingEventDTO {
  /** "2026-07-12T06:40" oppure solo data "2026-07-12". */
  datetime: string;
  description: string;
  /** current = ultimo evento; exception = giacenza/anomalia (rosso). */
  kind: 'past' | 'current' | 'exception';
}

export interface PurchaseOrderTrackingDTO {
  /** carrier = spedisce il produttore (PF); pickup = ritiro nostro (PA). */
  mode: 'carrier' | 'pickup';
  carrier_name: string;
  /** Riferimento con cui interroghiamo: numero ordine nostro o numero spedizione. */
  reference: string;
  events: TrackingEventDTO[];
}

export interface LeadTimeDTO {
  /** Parametro 1 — storico del fornitore (media NAV). */
  history_days: number | null;
  history_note: string;
  /** Parametro 2 — geografia (dalla provincia di partenza letta su NAV). */
  geo_zone: string;
  geo_days: number | null;
  geo_note: string;
  /** Stima standard calcolata dai parametri. */
  standard_days: number | null;
  /** "2026-07-21"; null quando non calcolabile (stato NONE). */
  standard_arrival: string | null;
  standard_basis: string;
  /** Stima PV: override manuale dell'operatore, vale per questo ordine. */
  pv_arrival: string | null;
}

export interface PurchaseOrderDTO {
  id: number;
  supplier_name: string;
  /** Codice fornitore NAV, es. "P00412". */
  supplier_code: string;
  /** Chiave universale: "26.AOR.NNNNN" (prefisso 27 dal 2027). "" per stato NONE. */
  order_number: string;
  /** Localita' di partenza, es. "Fumane (VR)". */
  zone: string;
  /** Nome spedizioniere ("ARCO", "GLS", ...); null quando non definito. */
  carrier: string | null;
  /** Binario NAV: true = RITIRO (PA), false = SPEDIZIONE (PF). */
  is_pickup: boolean;
  /** Data ordine ISO "2026-07-08"; null per stato NONE. */
  order_date: string | null;
  state: PurchaseOrderState;
  /** Messaggio parlante dell'allerta; null se nessuna allerta. */
  alert_message: string | null;
  milestones: {
    sent: string | null;
    received: string | null;
    shipped: string | null;
    arrived: string | null;
  };
  lead_time: LeadTimeDTO;
  tracking: PurchaseOrderTrackingDTO | null;
  mails: PurchaseOrderMailDTO[];
}

export interface PurchaseOrdersResponseDTO {
  data: PurchaseOrderDTO[];
}

export interface PurchaseOrdersFilters {
  /** Testo libero su nome fornitore o numero ordine. */
  search?: string;
  onlyAlerts?: boolean;
  /** pickup = RITIRO (PA), shipping = SPEDIZIONE (PF). */
  mode?: 'pickup' | 'shipping';
  /** ISO "2026-07-01" — ordini dal. */
  startDate?: string;
  /** ISO "2026-07-15" — ordini fino al. */
  endDate?: string;
}

export interface PvEstimateUpdateDTO {
  /** ISO "2026-07-23"; null per eliminare la stima e tornare alla standard. */
  arrival_date: string | null;
}
