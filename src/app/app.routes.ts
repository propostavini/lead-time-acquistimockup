import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/lead-time/lead-time-page/lead-time-page').then((m) => m.LeadTimePage),
  },
  { path: '**', redirectTo: '' },
];
