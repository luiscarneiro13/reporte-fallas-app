// Polyfill para import.meta en navegadores que no lo soportan
if (typeof import.meta === 'undefined') {
  window.import.meta = {
    url: window.location.href,
    env: {}
  };
}
