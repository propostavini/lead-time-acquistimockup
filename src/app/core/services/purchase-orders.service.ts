import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  PurchaseOrderDTO,
  PurchaseOrdersFilters,
  PurchaseOrdersResponseDTO,
  PvEstimateUpdateDTO,
  SendMailDTO,
  SendMailResultDTO,
} from '@core/models';
import { environment } from '@environments/environment';
import { Observable } from 'rxjs';

const API_BASE = environment.apiBase;

@Injectable({ providedIn: 'root' })
export class PurchaseOrdersService {
  private readonly http = inject(HttpClient);

  /**
   * Ordini a fornitore, dal piu' recente al meno recente (ordina il server).
   * I filtri si combinano liberamente: testo, solo allerte, PA/PF, intervallo date.
   * Regola concordata: start_date <= end_date quando entrambe presenti.
   * Contratto: GET /purchase_orders
   */
  getOrders(filters: PurchaseOrdersFilters = {}): Observable<PurchaseOrdersResponseDTO> {
    if (filters.startDate && filters.endDate && filters.startDate > filters.endDate) {
      throw new Error('PurchaseOrdersFilters: startDate must be <= endDate');
    }

    let params = new HttpParams();
    if (filters.search?.trim()) {
      params = params.set('search', filters.search.trim());
    }
    if (filters.onlyAlerts) {
      params = params.set('only_alerts', 'true');
    }
    if (filters.mode) {
      params = params.set('mode', filters.mode);
    }
    if (filters.startDate) {
      params = params.set('start_date', filters.startDate);
    }
    if (filters.endDate) {
      params = params.set('end_date', filters.endDate);
    }

    return this.http.get<PurchaseOrdersResponseDTO>(`${API_BASE}/purchase_orders`, { params });
  }

  /**
   * Imposta o elimina la stima PV (arrival_date null = elimina, torna la standard).
   * Contratto: PATCH /purchase_orders/{id}/pv_estimate
   */
  updatePvEstimate(orderId: number, update: PvEstimateUpdateDTO): Observable<PurchaseOrderDTO> {
    return this.http.patch<PurchaseOrderDTO>(
      `${API_BASE}/purchase_orders/${orderId}/pv_estimate`,
      update,
    );
  }

  /**
   * Invio della mail standard dal portale: il backend compone, accoda la firma
   * scelta e spedisce da acquisti@; la risposta la rilegge il sistema.
   * Contratto: POST /mails
   */
  sendMail(mail: SendMailDTO): Observable<SendMailResultDTO> {
    return this.http.post<SendMailResultDTO>(`${API_BASE}/mails`, mail);
  }

  /** Data ISO "2026-07-11" (o con orario) -> "11/07" per l'interfaccia. */
  formatShortDate(iso: string | null): string {
    if (!iso) {
      return '—';
    }
    const [, month, day] = iso.slice(0, 10).split('-');
    return `${day}/${month}`;
  }

  /** Data e ora ISO "2026-07-11T16:05" -> "11/07 16:05". */
  formatShortDateTime(iso: string): string {
    const time = iso.length > 10 ? ` ${iso.slice(11, 16)}` : '';
    return `${this.formatShortDate(iso)}${time}`;
  }
}
