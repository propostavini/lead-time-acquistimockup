export const environment = {
  production: false,
  // stesso host della pagina: così un altro device sulla stessa rete trova il mock
  apiBase: `http://${globalThis.location?.hostname ?? 'localhost'}:3000`,
};
