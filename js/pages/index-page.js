/* ==========================================================================
   LENS GROUP TRUJILLO — PÁGINA DE INICIO (INDEX)
   --------------------------------------------------------------------------
   Monta dinámicamente toda la interfaz del sitio público a partir
   de componentes JavaScript.
   ========================================================================== */
(function () {
  'use strict';

  const C = window.LG.components;

  window.LG.mount('#app', [
    C.TopBar,
    () => C.Header({ current: 'inicio', isHome: true }),
    C.Hero,
    C.BrandsSection,
    C.CatalogSection,
    C.KidsCatalogSection,
    C.SimulatorSection,
    C.AboutSection,
    C.TestimonialsSection,
    C.ContactSection,
    C.TrackingInlineSection,
    () => C.Footer({ isHome: true }),
    C.ProductModal,
    () => C.FloatingWidgets({ isHome: true })
  ]);
})();
