import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  MAIL_TEMPLATE_ORDER,
  MAIL_TEMPLATES,
  MailTemplateKey,
  PurchaseOrderDTO,
  SIGNATURE_ORDER,
  SIGNATURES,
  SignatureKey,
  signatureText,
  suggestedTemplateKey,
} from '@core/models';
import { PurchaseOrdersService } from '@core/services';

@Component({
  selector: 'app-mail-composer',
  imports: [FormsModule],
  templateUrl: './mail-composer.html',
  styleUrl: './mail-composer.scss',
})
export class MailComposer {
  private readonly ordersService = inject(PurchaseOrdersService);

  readonly order = input.required<PurchaseOrderDTO>();

  readonly MAIL_TEMPLATES = MAIL_TEMPLATES;
  readonly MAIL_TEMPLATE_ORDER = MAIL_TEMPLATE_ORDER;
  readonly SIGNATURES = SIGNATURES;
  readonly SIGNATURE_ORDER = SIGNATURE_ORDER;

  readonly pickedTemplate = signal<MailTemplateKey | null>(null);
  readonly signature = signal<SignatureKey>('matteo');
  readonly body = signal('');
  readonly sent = signal(false);

  readonly suggested = computed(() =>
    suggestedTemplateKey(this.order().state, !!this.order().alert_message),
  );

  readonly activeTemplate = computed<MailTemplateKey | null>(
    () => this.pickedTemplate() ?? this.suggested(),
  );

  readonly subject = computed(() => {
    const key = this.activeTemplate();
    return key ? this.fill(MAIL_TEMPLATES[key].subject) : '';
  });

  readonly recipient = computed(() => {
    const name = this.order().supplier_name.split('—')[0].trim();
    return `${name.toLowerCase().replace(/ /g, '')}@…`;
  });

  constructor() {
    // al cambio di ordine o di template il corpo riparte dal testo standard
    effect(() => {
      const key = this.activeTemplate();
      this.body.set(key ? this.fill(MAIL_TEMPLATES[key].body) : '');
      this.sent.set(false);
    });
    effect(() => {
      this.order();
      this.pickedTemplate.set(null);
    });
  }

  pickTemplate(key: MailTemplateKey): void {
    this.pickedTemplate.set(key);
  }

  pickSignature(key: SignatureKey): void {
    this.signature.set(key);
  }

  /** Etichetta del chip firma: "Matteo Sartori", "Francesco Bazzanella", "Nessuna firma". */
  signatureLabel(key: SignatureKey): string {
    if (key === 'none') {
      return 'Nessuna firma';
    }
    return SIGNATURES[key].name
      .split(' ')
      .map((w) => w[0] + w.slice(1).toLowerCase())
      .join(' ');
  }

  /** "Invia con Outlook": il sistema spedisce da acquisti@ (qui: POST al mock). */
  sendAuto(): void {
    const key = this.activeTemplate();
    if (!key) {
      return;
    }
    this.ordersService
      .sendMail({
        order_number: this.order().order_number,
        template_key: key,
        subject: this.subject(),
        body: this.body(),
        signature_key: this.signature(),
      })
      .subscribe({
        next: () => {
          this.sent.set(true);
          setTimeout(() => this.sent.set(false), 2200);
        },
      });
  }

  /** "Invia da Outlook": apre il client di posta con la mail pronta (firma in testo). */
  openInClient(): void {
    const signature = signatureText(this.signature());
    const body = this.body() + (signature ? `\n\n${signature}` : '');
    const url =
      `mailto:${this.recipient()}` +
      `?subject=${encodeURIComponent(this.subject())}` +
      `&body=${encodeURIComponent(body)}`;
    globalThis.location.href = url;
  }

  private fill(text: string): string {
    const o = this.order();
    return text
      .replace(/\{ORD\}/g, o.order_number || '(nuovo)')
      .replace(/\{DATE\}/g, this.ordersService.formatShortDate(o.order_date));
  }
}
