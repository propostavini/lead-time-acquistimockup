import { Component, computed, inject, signal } from '@angular/core';
import { PurchaseOrderDTO, PurchaseOrdersFilters } from '@core/models';
import { PurchaseOrdersService } from '@core/services';
import { MailComposer } from '../mail-composer/mail-composer';
import { OrderDetail } from '../order-detail/order-detail';
import { OrderList } from '../order-list/order-list';

@Component({
  selector: 'app-lead-time-page',
  imports: [OrderList, OrderDetail, MailComposer],
  templateUrl: './lead-time-page.html',
  styleUrl: './lead-time-page.scss',
})
export class LeadTimePage {
  private readonly ordersService = inject(PurchaseOrdersService);

  readonly orders = signal<PurchaseOrderDTO[]>([]);
  readonly selectedId = signal<number | null>(null);
  readonly refreshing = signal(false);
  readonly loadError = signal(false);

  readonly selectedOrder = computed(
    () => this.orders().find((o) => o.id === this.selectedId()) ?? null,
  );

  private filters: PurchaseOrdersFilters = {};

  onFiltersChange(filters: PurchaseOrdersFilters): void {
    this.filters = filters;
    this.load();
  }

  onSelect(orderId: number): void {
    this.selectedId.set(orderId);
  }

  onOrderUpdated(order: PurchaseOrderDTO): void {
    this.orders.update((list) => list.map((o) => (o.id === order.id ? order : o)));
  }

  refresh(): void {
    this.refreshing.set(true);
    this.load(() => this.refreshing.set(false));
  }

  private load(done?: () => void): void {
    this.ordersService.getOrders(this.filters).subscribe({
      next: (res) => {
        this.orders.set(res.data);
        this.loadError.set(false);
        const selected = this.selectedId();
        if (selected === null || !res.data.some((o) => o.id === selected)) {
          this.selectedId.set(res.data[0]?.id ?? null);
        }
        done?.();
      },
      error: () => {
        this.loadError.set(true);
        done?.();
      },
    });
  }
}
