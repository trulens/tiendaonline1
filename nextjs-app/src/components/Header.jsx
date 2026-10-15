"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleMenu = () => {
    setIsMenuOpen((prev) => !prev);
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  return (
    <>
      <header className={`site-header ${isScrolled ? "scrolled" : ""}`} id="siteHeader">
        <div className="container navbar">
          {/* Brand Logo */}
          <Link href="/#inicio" className="nav-brand" title="Lens Group Trujillo" onClick={closeMenu}>
            <Image
              src="/images/logo.svg"
              alt="Lens Group Trujillo - Distribuidor Autorizado"
              width={160}
              height={44}
              priority
              className="brand-logo-img"
            />
          </Link>

          {/* Navigation Links */}
          <nav className={`nav-menu ${isMenuOpen ? "active" : ""}`} id="navMenu">
            <button
              className="mobile-close-btn"
              id="mobileCloseBtn"
              aria-label="Cerrar menú"
              onClick={closeMenu}
            >
              ✕
            </button>

            <div className="nav-menu-divider"></div>
            <Link href="/#inicio" className="nav-link" onClick={closeMenu}>
              Inicio
            </Link>
            <Link href="/#simulador" className="nav-link" onClick={closeMenu}>
              Simulador de Lunas
            </Link>
            <Link href="/#nosotros" className="nav-link" onClick={closeMenu}>
              Nosotros
            </Link>
            <Link href="/#testimonios" className="nav-link" onClick={closeMenu}>
              Testimonios
            </Link>
            <Link href="/#contacto" className="nav-link" onClick={closeMenu}>
              Contacto
            </Link>
            <Link href="/seguimiento" className="nav-link" title="Seguimiento de Pedido" onClick={closeMenu}>
              Seguimiento
            </Link>

            {/* Mobile Drawer CTA */}
            <div className="nav-menu-divider"></div>
            <Link href="/#contacto" className="btn btn-primary drawer-contact-btn" onClick={closeMenu}>
              Agendar Cita en Trujillo
            </Link>
          </nav>

          {/* Nav Actions */}
          <div className="nav-actions">
            <Link href="/#contacto" className="btn btn-navy btn-sm btn-contact">
              Agendar Cita
            </Link>
          </div>
        </div>
      </header>

      {/* Overlay para menú mobile */}
      <div
        className={`nav-menu-overlay ${isMenuOpen ? "active" : ""}`}
        id="navMenuOverlay"
        onClick={closeMenu}
      ></div>
    </>
  );
}
