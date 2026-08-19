// Roles cuya pantalla principal (drawer inicial) es "Resumen de fallas" en
// vez de "Reportar Falla". Un solo lugar para esta lista: App.js decide qué
// Drawer montar, Sidebar.js decide el orden del menú — deben coincidir.
const FAULT_SUMMARY_HOME_ROLES = ['Supervisor', 'Coordinador', 'Admin'];

export function hasFaultSummaryHome(roles = []) {
  return roles.some((r) => FAULT_SUMMARY_HOME_ROLES.includes(r));
}
