import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MailDirection, PurchaseOrderDTO, STATE_LABELS } from '@core/models';
import { PurchaseOrdersService } from '@core/services';
import { DatePickerModule } from 'primeng/datepicker';

/**
 * Quote verticali (px dal bordo alto della griglia) della freccia lead time.
 * SHIPPED e' allineato alla testata del box tracking (pannello 206 + 20 di
 * margine + meta' testata): cosi' la linea di collegamento resta orizzontale.
 */
const ARROW_Y = {
  railTop: 48,
  sent: 84,
  received: 160,
  shipped: 247,
  arrived: 320,
  railBottom: 356,
  arrival: 368,
} as const;

interface ArrowStage {
  label: string;
  top: number;
  date: string | null;
  on: boolean;
}

@Component({
  selector: 'app-order-detail',
  imports: [FormsModule, DatePickerModule],
  templateUrl: './order-detail.html',
  styleUrl: './order-detail.scss',
})
export class OrderDetail {
  private readonly ordersService = inject(PurchaseOrdersService);

  readonly order = input.required<PurchaseOrderDTO>();
  readonly orderUpdated = output<PurchaseOrderDTO>();

  readonly STATE_LABELS = STATE_LABELS;
  readonly ARROW_Y = ARROW_Y;

  readonly calendarOpen = signal(false);
  readonly saving = signal(false);

  readonly stages = computed<ArrowStage[]>(() => {
    const m = this.order().milestones;
    const reached = this.reachedIndex();
    return [
      { label: 'Inviato', top: ARROW_Y.sent, date: m.sent, on: reached >= 0 },
      { label: 'Ricevuto', top: ARROW_Y.received, date: m.received, on: reached >= 1 },
      { label: 'Spedito', top: ARROW_Y.shipped, date: m.shipped, on: reached >= 2 },
      { label: 'Arrivato', top: ARROW_Y.arrived, date: m.arrived, on: reached >= 3 },
    ];
  });

  readonly railFillBottom = computed(() => {
    const reached = this.reachedIndex();
    if (reached < 0) {
      return ARROW_Y.railTop;
    }
    return [ARROW_Y.sent, ARROW_Y.received, ARROW_Y.shipped, ARROW_Y.arrived][reached];
  });

  /** Arrivo mostrato in fondo alla freccia: stima PV se impostata, altrimenti standard. */
  readonly arrivalLabel = computed(() => {
    const lt = this.order().lead_time;
    const arrival = lt.pv_arrival ?? lt.standard_arrival;
    return arrival ? this.shortDate(arrival) : 'riordino consigliato';
  });

  shortDate(iso: string | null): string {
    return this.ordersService.formatShortDate(iso);
  }

  shortDateTime(iso: string): string {
    return this.ordersService.formatShortDateTime(iso);
  }

  mailIcon(direction: MailDirection): string {
    const icons: Record<MailDirection, string> = {
      out: 'icons/mail-out.svg',
      in: 'icons/mail-in.svg',
      carrier: 'icons/camion-blu.svg',
      nav: 'icons/nav-check.svg',
    };
    return icons[direction];
  }

  openCalendar(): void {
    this.calendarOpen.update((v) => !v);
  }

  onPvDatePicked(date: Date): void {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    this.savePvEstimate(`${date.getFullYear()}-${month}-${day}`);
    this.calendarOpen.set(false);
  }

  deletePvEstimate(): void {
    this.savePvEstimate(null);
  }

  private savePvEstimate(arrivalDate: string | null): void {
    this.saving.set(true);
    this.ordersService.updatePvEstimate(this.order().id, { arrival_date: arrivalDate }).subscribe({
      next: (updated) => {
        this.orderUpdated.emit(updated);
        this.saving.set(false);
      },
      error: () => this.saving.set(false),
    });
  }

  private reachedIndex(): number {
    switch (this.order().state) {
      case 'sent':
        return 0;
      case 'received':
        return 1;
      case 'shipped':
        return 2;
      case 'arrived':
        return 3;
      default:
        return -1;
    }
  }
}
