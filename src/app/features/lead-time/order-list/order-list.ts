import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  PURCHASE_ORDER_STATES,
  PurchaseOrderDTO,
  PurchaseOrdersFilters,
  PurchaseOrderState,
  STATE_LABELS,
} from '@core/models';
import { PurchaseOrdersService } from '@core/services';
import { DatePickerModule } from 'primeng/datepicker';

/**
 * Opzioni della tendina "Stato": i 5 stati filtrabili della matrice v2,
 * NONE escluso (nessun ordine attivo non e' un valore utile da filtrare).
 * L'opzione "Nessuno" in cima alla tendina significa "nessun filtro attivo".
 * cssClass e' la stessa classe pillola (.p-none, .p-sent, ...) usata sulle
 * schede ordine: la tendina deve avere lo stesso formato e colore degli stati.
 */
const STATE_FILTER_OPTIONS: { value: PurchaseOrderState; label: string; cssClass: string }[] = (
  Object.values(PURCHASE_ORDER_STATES) as PurchaseOrderState[]
)
  .filter((state) => state !== PURCHASE_ORDER_STATES.NONE)
  .map((state) => ({
    value: state,
    label: STATE_LABELS[state].label,
    cssClass: STATE_LABELS[state].cssClass,
  }));

@Component({
  selector: 'app-order-list',
  imports: [FormsModule, DatePickerModule],
  templateUrl: './order-list.html',
  styleUrl: './order-list.scss',
})
export class OrderList {
  private readonly ordersService = inject(PurchaseOrdersService);

  readonly orders = input.required<PurchaseOrderDTO[]>();
  readonly selectedId = input<number | null>(null);
  readonly filtersChange = output<PurchaseOrdersFilters>();
  readonly selectOrder = output<number>();

  readonly STATE_LABELS = STATE_LABELS;
  readonly stateOptions = STATE_FILTER_OPTIONS;

  readonly search = signal('');
  readonly onlyAlerts = signal(false);
  readonly mode = signal<'pickup' | 'shipping' | null>(null);
  readonly state = signal<PurchaseOrderState | ''>('');
  readonly startDate = signal<Date | null>(null);
  readonly endDate = signal<Date | null>(null);

  /** Classe pillola per lo stato scelto (mostra "Nessuno" col grigio neutro di NONE). */
  readonly stateSelectClass = computed(
    () => STATE_LABELS[this.state() || PURCHASE_ORDER_STATES.NONE].cssClass,
  );

  constructor() {
    // ogni cambio di filtro riparte dal server: e' lui che filtra e ordina (contratto)
    effect(() => {
      this.filtersChange.emit({
        search: this.search() || undefined,
        onlyAlerts: this.onlyAlerts() || undefined,
        mode: this.mode() ?? undefined,
        state: this.state() || undefined,
        startDate: this.toIso(this.startDate()),
        endDate: this.toIso(this.endDate()),
      });
    });
  }

  toggleAlerts(): void {
    this.onlyAlerts.update((v) => !v);
  }

  toggleMode(mode: 'pickup' | 'shipping'): void {
    this.mode.update((current) => (current === mode ? null : mode));
  }

  clearDates(): void {
    this.startDate.set(null);
    this.endDate.set(null);
  }

  shortDate(iso: string | null): string {
    return this.ordersService.formatShortDate(iso);
  }

  carrierLine(order: PurchaseOrderDTO): string {
    if (order.is_pickup) {
      return ' · ritiro (PA)';
    }
    if (!order.carrier) {
      return '';
    }
    return ` · ${order.carrier} (PF)`;
  }

  private toIso(date: Date | null): string | undefined {
    if (!date) {
      return undefined;
    }
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
  }
}
