import { PurchaseOrderState } from './purchase-order.dto';

/**
 * Template delle mail standard del composer.
 * Segnaposto: {ORD} = numero ordine, {DATE} = data ordine (gg/mm).
 * Il template suggerito dipende dallo stato (vedi suggestedTemplateKey).
 */
export const MAIL_TEMPLATES = {
  new_order: {
    label: 'Nuovo ordine',
    subject: 'Nuovo ordine — Proposta Vini',
    body: "Buongiorno,\nin allegato il nostro nuovo ordine. Vi chiediamo di confermarci la ricezione e, al momento della spedizione, di indicarci il corriere e il numero di tracking.\nGrazie,\nUfficio Acquisti — Proposta Vini",
  },
  confirm_reminder: {
    label: 'Sollecito conferma',
    subject: 'Conferma ricezione ordine {ORD}',
    body: "Buongiorno,\nvi abbiamo inviato l'ordine n. {ORD} il {DATE}. Ci confermate cortesemente di averlo ricevuto e una data indicativa di spedizione?\nGrazie,\nUfficio Acquisti — Proposta Vini",
  },
  ask_ship_date: {
    label: 'Chiedi data spedizione',
    subject: 'Data di spedizione ordine {ORD}',
    body: "Buongiorno,\ngrazie per la conferma. Quando prevedete di spedire l'ordine n. {ORD}? Alla spedizione vi chiediamo di indicarci corriere e numero di tracking.\nGrazie,\nUfficio Acquisti — Proposta Vini",
  },
  ask_tracking: {
    label: 'Chiedi tracking',
    subject: 'Tracking spedizione ordine {ORD}',
    body: "Buongiorno,\nci confermate corriere e numero di tracking della spedizione dell'ordine n. {ORD}? Ci serve per seguire la consegna.\nGrazie,\nUfficio Acquisti — Proposta Vini",
  },
  delivery_reminder: {
    label: 'Sollecito consegna',
    subject: 'Sollecito — ordine {ORD}',
    body: "Buongiorno,\nla spedizione dell'ordine n. {ORD} risulta non ancora consegnata / in giacenza. Potete verificare con il corriere e aggiornarci?\nGrazie,\nUfficio Acquisti — Proposta Vini",
  },
} as const;

export type MailTemplateKey = keyof typeof MAIL_TEMPLATES;

export const MAIL_TEMPLATE_ORDER: MailTemplateKey[] = [
  'new_order',
  'confirm_reminder',
  'ask_ship_date',
  'ask_tracking',
  'delivery_reminder',
];

/** Il template giusto per lo stato; null quando il ciclo e' chiuso (ARRIVED). */
export function suggestedTemplateKey(
  state: PurchaseOrderState,
  hasAlert: boolean,
): MailTemplateKey | null {
  switch (state) {
    case 'none':
    case 'not_sent':
      return 'new_order';
    case 'sent':
      return 'confirm_reminder';
    case 'received':
      return 'ask_ship_date';
    case 'shipped':
      return hasAlert ? 'delivery_reminder' : 'ask_tracking';
    case 'arrived':
      return null;
  }
}

/**
 * Firme preimpostate. La firma di Outlook non e' leggibile da fuori
 * (nemmeno via API Microsoft): la si configura qui una volta e il backend
 * la accoda alle mail in partenza. lines: [tipo, testo] — link = mailto,
 * bold = evidenziato, plain = normale.
 */
export const SIGNATURES = {
  matteo: {
    name: 'MATTEO SARTORI',
    role: 'Responsabile Logistica',
    lines: [
      ['link', 'matteosartori@propostavini.com'],
      ['bold', 'tel: 04611755515'],
    ],
  },
  francesco: {
    name: 'FRANCESCO BAZZANELLA',
    role: 'Ufficio logistica acquisti',
    lines: [
      ['link', 'francescobazzanella@propostavini.com'],
      ['bold', 'cell: +39 348 2302688'],
      ['bold', 'tel: +39 0461 1755512'],
      ['plain', 'propostavini.com'],
    ],
  },
  none: {
    name: 'Nessuna firma',
    role: '',
    lines: [],
  },
} as const;

export type SignatureKey = keyof typeof SIGNATURES;

export const SIGNATURE_ORDER: SignatureKey[] = ['matteo', 'francesco', 'none'];

/** Testo semplice della firma, da accodare al corpo (vuoto per "none"). */
export function signatureText(key: SignatureKey): string {
  if (key === 'none') {
    return '';
  }
  const s = SIGNATURES[key];
  return [s.name, s.role, ...s.lines.map(([, text]) => text)].join('\n');
}

/** Richiesta di invio mail dal portale (parte sempre da acquisti@). */
export interface SendMailDTO {
  order_number: string;
  template_key: MailTemplateKey;
  subject: string;
  body: string;
  signature_key: SignatureKey;
}

export interface SendMailResultDTO {
  ok: boolean;
  id: number;
  sent_from: string;
}
