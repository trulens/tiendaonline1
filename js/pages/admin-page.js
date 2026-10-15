/* ==========================================================================
   LENS GROUP TRUJILLO — PÁGINA DEL PANEL ADMINISTRATIVO (ADMIN)
   --------------------------------------------------------------------------
   Monta la interfaz del login, dashboard, vistas y modales desde JS.
   ========================================================================== */
(function () {
  'use strict';

  const C = window.LG.components;

  window.LG.mount('#app', [
    C.AdminLoginScreen,
    C.AdminDashboardLayout
  ]);
})();
