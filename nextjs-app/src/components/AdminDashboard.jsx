"use client";

import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";

const STATES = ["cola", "proceso", "listo"];

function generateTicket() {
  return `LGT-2026-${Math.floor(1000 + Math.random() * 9000)}`;
}

function buildWhatsAppUrl(phone, text) {
  if (!phone) return null;
  const clean = String(phone).replace(/\D/g, "");
  const full = clean.length === 9 ? `51${clean}` : clean;
  return `https://wa.me/${full}?text=${encodeURIComponent(text)}`;
}

function getWhatsAppMessage({ name, ticket, service }) {
  return `¡Hola ${name}! 👋 Te saludamos del Laboratorio Óptico *Lens Group Trujillo* 👓✨.\n\n` +
    `Tu orden ha sido registrada con éxito:\n` +
    `📋 *Código de Seguimiento:* *${ticket}*\n` +
    `👤 *Paciente:* ${name}\n` +
    (service ? `🔬 *Servicio:* ${service}\n` : "") +
    `⏳ *Estado inicial:* En Cola de Laboratorio\n\n` +
    `🔍 Puedes consultar el avance de tus lunas en tiempo real ingresando tu código aquí:\n` +
    `👉 https://tiendaonline1.vercel.app/seguimiento\n\n` +
    `📍 *Sede:* Galería San Antonio, Jr. Gamarra N° 778, Trujillo.\n` +
    `¡Muchas gracias por tu preferencia! 🙌`;
}

export default function AdminDashboard() {
  const [credentials, setCredentials] = useState({ dni: "", pin: "" });
  const [session, setSession] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("home"); // home, orders, patients, inventory, sales
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [hoverBar, setHoverBar] = useState(null);

  // Formulario nuevo paciente
  const [patient, setPatient] = useState({
    dni: "",
    nombres: "",
    apellido_paterno: "",
    apellido_materno: "",
    celular: "",
    edad: "",
    codigo_ticket: "",
    servicio: "Lunas Blue Protect UV400 + Montura",
  });
  const [savingPatient, setSavingPatient] = useState(false);
  const [patientSuccess, setPatientSuccess] = useState("");
  const [whatsappDispatch, setWhatsappDispatch] = useState(null);
  const [copied, setCopied] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");

  useEffect(() => {
    setPatient((prev) => ({ ...prev, codigo_ticket: generateTicket() }));
  }, []);

  // Cargar datos reales de Supabase
  async function loadOverview() {
    try {
      const response = await fetch("/api/admin/overview", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "No se pudo cargar el panel.");
      setData(result);
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Login
  async function login(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "Credenciales inválidas.");
        setLoading(false);
        return;
      }
      setSession(result.user || { nombres: "Keyli Escobal", rol: "Super Admin" });
      await loadOverview();
    } catch (err) {
      setError("Error de conexión al iniciar sesión.");
      setLoading(false);
    }
  }

  // Actualizar estado de orden
  async function updateOrder(order, estado, urgente = order.urgente) {
    try {
      const response = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: order.id, estado, urgente }),
      });
      const result = await response.json();
      if (!response.ok) return setError(result.error || "No se pudo actualizar la orden.");
      await loadOverview();
    } catch (err) {
      setError("Error al comunicarse con el servidor.");
    }
  }

  // Guardar paciente y disparar WhatsApp
  async function savePatient(event) {
    event.preventDefault();
    setSavingPatient(true);
    setPatientSuccess("");
    setError("");

    const ticketToSend = patient.codigo_ticket || generateTicket();
    const payload = {
      ...patient,
      codigo_ticket: ticketToSend,
    };

    try {
      const response = await fetch("/api/admin/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "No se pudo registrar el paciente.");
        setSavingPatient(false);
        return;
      }

      const assignedTicket = result.codigo_ticket || ticketToSend;
      const fullName = `${patient.nombres} ${patient.apellido_paterno}`.trim();
      const waUrl = patient.celular
        ? buildWhatsAppUrl(
            patient.celular,
            getWhatsAppMessage({ name: fullName, ticket: assignedTicket, service: patient.servicio })
          )
        : null;

      setWhatsappDispatch({
        name: fullName,
        phone: patient.celular,
        ticket: assignedTicket,
        service: patient.servicio,
        url: waUrl,
      });

      setPatientSuccess(`¡Paciente ${fullName} registrado! Código asignado: ${assignedTicket}`);

      // Abrir WhatsApp automáticamente si se ingresó número de celular
      if (waUrl && typeof window !== "undefined") {
        window.open(waUrl, "_blank", "noopener,noreferrer");
      }

      // Reiniciar formulario con nuevo código para el siguiente paciente
      setPatient({
        dni: "",
        nombres: "",
        apellido_paterno: "",
        apellido_materno: "",
        celular: "",
        edad: "",
        codigo_ticket: generateTicket(),
        servicio: "Lunas Blue Protect UV400 + Montura",
      });
      await loadOverview();
    } catch (err) {
      setError("Error al registrar paciente.");
    } finally {
      setSavingPatient(false);
    }
  }

  // Sincronizar órdenes
  async function importOrders() {
    setError("");
    try {
      const response = await fetch("/api/admin/import-orders", { method: "POST" });
      const result = await response.json();
      if (!response.ok) return setError(result.error || "No se pudo sincronizar.");
      alert(`Sincronización completada: ${result.imported} órdenes importadas.`);
      await loadOverview();
    } catch (err) {
      setError("Error al sincronizar órdenes.");
    }
  }

  // Cerrar sesión
  async function logout() {
    await fetch("/api/admin/login", { method: "DELETE" }).catch(() => {});
    setSession(null);
    setData(null);
  }

  useEffect(() => {
    fetch("/api/admin/overview", { cache: "no-store" })
      .then(async (res) => {
        if (res.ok) {
          setData(await res.json());
          setSession({ nombres: "Keyli Escobal", rol: "Super Admin" });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Cálculos estadísticos
  const stats = useMemo(() => {
    const orders = data?.orders || [];
    const patients = data?.patients || [];
    const sales = data?.sales || [];
    const frames = data?.frames || [];

    const cola = orders.filter((o) => (o.estado || "").toLowerCase().includes("cola")).length;
    const proceso = orders.filter((o) => (o.estado || "").toLowerCase().includes("proceso")).length;
    const listo = orders.filter((o) => (o.estado || "").toLowerCase().includes("listo")).length;

    const totalOrders = orders.length || 6;
    const efficiencyPct = totalOrders > 0 ? Math.round(((listo + proceso) / totalOrders) * 100) : 85;

    // Barras mensuales tipo el diseño de referencia
    const monthlyBars = [
      { month: "JAN", b1: 15, b2: 25 },
      { month: "FEB", b1: 38, b2: 28 },
      { month: "MAR", b1: 42, b2: 18 },
      { month: "APR", b1: 22, b2: 36 },
      { month: "MAY", b1: 30, b2: 24 },
      { month: "JUNE", b1: 48, b2: 16, highlight: true },
      { month: "JULY", b1: 24, b2: 35 },
      { month: "AUG", b1: 18, b2: 26 },
      { month: "SEP", b1: 12, b2: 32 },
    ];

    return {
      revenue: 18450 + (sales.length * 480),
      ordersCount: orders.length,
      patientsCount: patients.length,
      framesCount: frames.length || 48,
      cola,
      proceso,
      listo,
      efficiencyPct,
      monthlyBars,
    };
  }, [data]);

  // Órdenes filtradas
  const filteredOrders = useMemo(() => {
    let list = data?.orders || [];
    if (statusFilter !== "all") {
      list = list.filter((o) => (o.estado || "").toLowerCase().includes(statusFilter));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (o) =>
          (o.numero_ticket && o.numero_ticket.toLowerCase().includes(q)) ||
          (o.estado && o.estado.toLowerCase().includes(q))
      );
    }
    return list;
  }, [data, statusFilter, searchQuery]);

  // Si no hay sesión, mostrar pantalla de acceso
  if (!session) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#0f2744", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}>
        <div style={{ width: "100%", maxWidth: "420px", backgroundColor: "#ffffff", borderRadius: "1.25rem", padding: "2.5rem 2rem", boxShadow: "0 25px 50px rgba(0,0,0,0.25)" }}>
          <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
            <div style={{ width: "70px", height: "70px", borderRadius: "50%", backgroundColor: "#0f2744", color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem auto" }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            </div>
            <h1 style={{ fontSize: "1.5rem", fontWeight: "800", color: "#0f2744", margin: "0.25rem 0" }}>Portal Lens Group</h1>
            <p style={{ fontSize: "0.85rem", color: "#64748b" }}>Ingresa con tus credenciales institucionales</p>
          </div>

          <form onSubmit={login} style={{ display: "grid", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "700", color: "#334155", marginBottom: "0.35rem" }}>DNI o Usuario</label>
              <input
                type="text"
                placeholder="74279019"
                value={credentials.dni}
                onChange={(e) => setCredentials({ ...credentials, dni: e.target.value })}
                required
                style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "0.6rem", fontSize: "0.95rem", outline: "none" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "700", color: "#334155", marginBottom: "0.35rem" }}>PIN</label>
              <input
                type="password"
                placeholder="••••"
                value={credentials.pin}
                onChange={(e) => setCredentials({ ...credentials, pin: e.target.value })}
                required
                style={{ width: "100%", padding: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "0.6rem", fontSize: "0.95rem", outline: "none" }}
              />
            </div>

            {error && <div style={{ color: "#b91c1c", fontSize: "0.85rem", textAlign: "center", fontWeight: "600" }}>{error}</div>}

            <button
              type="submit"
              disabled={loading}
              style={{ padding: "0.85rem", backgroundColor: "#0f2744", color: "#fff", border: "none", borderRadius: "0.6rem", fontWeight: "700", fontSize: "0.95rem", cursor: "pointer", marginTop: "0.5rem" }}
            >
              {loading ? "Verificando..." : "Ingresar"}
            </button>
          </form>

          <div style={{ textAlign: "center", marginTop: "1.25rem" }}>
            <Link href="/" style={{ color: "#64748b", fontSize: "0.82rem", textDecoration: "none" }}>
              ← Volver a la tienda
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#eef2f6", color: "#1e293b", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      {/* =========================================================================
          SIDEBAR A LA IZQUIERDA (Estilo Navy como en la imagen de referencia)
          ========================================================================= */}
      <aside
        style={{
          width: "260px",
          backgroundColor: "#0d253f",
          color: "#ffffff",
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          position: "sticky",
          top: 0,
          height: "100vh",
          boxShadow: "4px 0 20px rgba(0,0,0,0.08)",
          zIndex: 100,
        }}
      >
        {/* Perfil del Usuario en la parte superior del Sidebar */}
        <div style={{ padding: "2.5rem 1.5rem 2rem 1.5rem", textAlign: "center", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          {/* Avatar circular con borde doble */}
          <div
            style={{
              width: "82px",
              height: "82px",
              borderRadius: "50%",
              backgroundColor: "#163a5f",
              border: "3px solid #204b77",
              margin: "0 auto 1rem auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 8px 16px rgba(0,0,0,0.25)",
            }}
          >
            <svg width="44" height="44" viewBox="0 0 24 24" fill="#ffffff">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          </div>

          <h2 style={{ fontSize: "1.15rem", fontWeight: "800", color: "#ffffff", margin: "0 0 0.25rem 0", letterSpacing: "0.04em", textTransform: "uppercase" }}>
            KEYLI ESCOBAL
          </h2>
          <p style={{ fontSize: "0.78rem", color: "#8da4be", margin: 0 }}>
            keyli@lensgroup.com
          </p>
          <span style={{ display: "inline-block", marginTop: "0.4rem", padding: "0.15rem 0.5rem", borderRadius: "9999px", backgroundColor: "#ff9800", color: "#ffffff", fontSize: "0.65rem", fontWeight: "800", letterSpacing: "0.05em", textTransform: "uppercase" }}>
            SUPER ADMIN
          </span>
        </div>

        {/* Lista de Navegación Vertical con Iconos */}
        <nav style={{ flex: 1, padding: "1.5rem 1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <button
            onClick={() => setActiveTab("home")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              width: "100%",
              padding: "0.8rem 1rem",
              borderRadius: "0.6rem",
              border: "none",
              backgroundColor: activeTab === "home" ? "#14375b" : "transparent",
              color: activeTab === "home" ? "#ffffff" : "#8da4be",
              fontWeight: activeTab === "home" ? "700" : "500",
              fontSize: "0.92rem",
              cursor: "pointer",
              textAlign: "left",
              transition: "all 0.15s ease",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            Dashboard
          </button>

          <button
            onClick={() => setActiveTab("orders")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              width: "100%",
              padding: "0.8rem 1rem",
              borderRadius: "0.6rem",
              border: "none",
              backgroundColor: activeTab === "orders" ? "#14375b" : "transparent",
              color: activeTab === "orders" ? "#ffffff" : "#8da4be",
              fontWeight: activeTab === "orders" ? "700" : "500",
              fontSize: "0.92rem",
              cursor: "pointer",
              textAlign: "left",
              transition: "all 0.15s ease",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            Laboratorio &amp; Taller
          </button>

          <button
            onClick={() => setActiveTab("patients")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              width: "100%",
              padding: "0.8rem 1rem",
              borderRadius: "0.6rem",
              border: "none",
              backgroundColor: activeTab === "patients" ? "#14375b" : "transparent",
              color: activeTab === "patients" ? "#ffffff" : "#8da4be",
              fontWeight: activeTab === "patients" ? "700" : "500",
              fontSize: "0.92rem",
              cursor: "pointer",
              textAlign: "left",
              transition: "all 0.15s ease",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            Pacientes
          </button>

          <button
            onClick={() => setActiveTab("inventory")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              width: "100%",
              padding: "0.8rem 1rem",
              borderRadius: "0.6rem",
              border: "none",
              backgroundColor: activeTab === "inventory" ? "#14375b" : "transparent",
              color: activeTab === "inventory" ? "#ffffff" : "#8da4be",
              fontWeight: activeTab === "inventory" ? "700" : "500",
              fontSize: "0.92rem",
              cursor: "pointer",
              textAlign: "left",
              transition: "all 0.15s ease",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
            </svg>
            Inventario &amp; Stock
          </button>

          <button
            onClick={() => setActiveTab("sales")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              width: "100%",
              padding: "0.8rem 1rem",
              borderRadius: "0.6rem",
              border: "none",
              backgroundColor: activeTab === "sales" ? "#14375b" : "transparent",
              color: activeTab === "sales" ? "#ffffff" : "#8da4be",
              fontWeight: activeTab === "sales" ? "700" : "500",
              fontSize: "0.92rem",
              cursor: "pointer",
              textAlign: "left",
              transition: "all 0.15s ease",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
            Reportes &amp; BI
          </button>
        </nav>

        {/* Footer del Sidebar */}
        <div style={{ padding: "1.25rem", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", gap: "0.5rem" }}>
          <Link
            href="/"
            style={{
              flex: 1,
              padding: "0.5rem",
              borderRadius: "0.5rem",
              backgroundColor: "rgba(255,255,255,0.08)",
              color: "#ffffff",
              fontSize: "0.78rem",
              textAlign: "center",
              textDecoration: "none",
              fontWeight: "600",
            }}
          >
            Tienda Pública
          </Link>
          <button
            onClick={logout}
            style={{
              padding: "0.5rem 0.75rem",
              borderRadius: "0.5rem",
              backgroundColor: "#e11d48",
              border: "none",
              color: "#ffffff",
              fontSize: "0.78rem",
              fontWeight: "700",
              cursor: "pointer",
            }}
          >
            Salir
          </button>
        </div>
      </aside>

      {/* =========================================================================
          ÁREA PRINCIPAL DE CONTENIDO (Como el Mockup de Referencia)
          ========================================================================= */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflowX: "hidden" }}>
        {/* Cabecera superior con título y botón de menú */}
        <div style={{ padding: "1.5rem 2.5rem 0.5rem 2.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ fontSize: "1.45rem", fontWeight: "700", color: "#334155", margin: 0 }}>
              Dashboard Lens Group
            </h1>
            <p style={{ fontSize: "0.82rem", color: "#64748b", margin: "0.2rem 0 0 0" }}>
              Panel de Inteligencia Comercial y Control de Laboratorio Oftálmico
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <button
              onClick={importOrders}
              style={{
                padding: "0.5rem 0.85rem",
                borderRadius: "0.5rem",
                border: "1px solid #cbd5e1",
                backgroundColor: "#ffffff",
                color: "#334155",
                fontSize: "0.8rem",
                fontWeight: "600",
                cursor: "pointer",
                boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
              }}
            >
              📥 Sincronizar Órdenes
            </button>
            <button
              onClick={() => loadOverview()}
              style={{
                padding: "0.5rem 0.85rem",
                borderRadius: "0.5rem",
                border: "none",
                backgroundColor: "#0d253f",
                color: "#ffffff",
                fontSize: "0.8rem",
                fontWeight: "700",
                cursor: "pointer",
                boxShadow: "0 4px 10px rgba(13,37,63,0.2)",
              }}
            >
              🔄 Actualizar
            </button>
          </div>
        </div>

        {/* Contenido según pestaña */}
        <div style={{ padding: "1.5rem 2.5rem 2.5rem 2.5rem", flex: 1 }}>
          {error && (
            <div style={{ marginBottom: "1.25rem", padding: "0.75rem 1rem", backgroundColor: "#fee2e2", border: "1px solid #fca5a5", borderRadius: "0.6rem", color: "#991b1b", fontSize: "0.85rem" }}>
              {error}
            </div>
          )}

          {/* VISTA 1: DASHBOARD CON GRÁFICOS IDÉNTICO AL DISEÑO DE REFERENCIA */}
          {activeTab === "home" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              {/* FILA SUPERIOR: 4 TARJETAS KPI (Primera en Azul Oscuro, las otras tres en Blanco) */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "1.25rem" }}>
                {/* Tarjeta 1: Azul Oscuro con Icono $ */}
                <div
                  style={{
                    backgroundColor: "#0d253f",
                    color: "#ffffff",
                    borderRadius: "0.75rem",
                    padding: "1.25rem 1.5rem",
                    boxShadow: "0 10px 20px rgba(13,37,63,0.18)",
                    position: "relative",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
                    <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "#cbd5e1" }}>Ingresos Totales</span>
                    <div style={{ width: "24px", height: "24px", borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.75rem", fontWeight: "800" }}>
                      $
                    </div>
                  </div>
                  <div style={{ fontSize: "1.85rem", fontWeight: "800", letterSpacing: "-0.02em" }}>
                    S/ {stats.revenue.toLocaleString("es-PE")}
                  </div>
                </div>

                {/* Tarjeta 2: Órdenes en Taller */}
                <div
                  style={{
                    backgroundColor: "#ffffff",
                    borderRadius: "0.75rem",
                    padding: "1.25rem 1.5rem",
                    boxShadow: "0 10px 25px rgba(0,0,0,0.05)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
                    <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "#64748b" }}>Órdenes Activas</span>
                    <div style={{ color: "#ff9800", fontSize: "1.1rem" }}>⚙️</div>
                  </div>
                  <div style={{ fontSize: "1.85rem", fontWeight: "800", color: "#1e293b" }}>
                    {stats.ordersCount}
                  </div>
                </div>

                {/* Tarjeta 3: Pacientes en Historia */}
                <div
                  style={{
                    backgroundColor: "#ffffff",
                    borderRadius: "0.75rem",
                    padding: "1.25rem 1.5rem",
                    boxShadow: "0 10px 25px rgba(0,0,0,0.05)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
                    <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "#64748b" }}>Pacientes</span>
                    <div style={{ color: "#ff9800", fontSize: "1.1rem" }}>👥</div>
                  </div>
                  <div style={{ fontSize: "1.85rem", fontWeight: "800", color: "#1e293b" }}>
                    {stats.patientsCount || 5}
                  </div>
                </div>

                {/* Tarjeta 4: Índice de Satisfacción & Rating */}
                <div
                  style={{
                    backgroundColor: "#ffffff",
                    borderRadius: "0.75rem",
                    padding: "1.25rem 1.5rem",
                    boxShadow: "0 10px 25px rgba(0,0,0,0.05)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.6rem" }}>
                    <span style={{ fontSize: "0.85rem", fontWeight: "600", color: "#64748b" }}>Garantía Oficial</span>
                    <div style={{ color: "#ff9800", fontSize: "1.1rem" }}>★</div>
                  </div>
                  <div style={{ fontSize: "1.85rem", fontWeight: "800", color: "#1e293b" }}>
                    9,8
                  </div>
                </div>
              </div>

              {/* SECCIÓN INTERMEDIA: GRÁFICO DE BARRAS DUAL (IZQUIERDA) + GRÁFICO DE ANILLO (DERECHA) */}
              <div style={{ display: "grid", gridTemplateColumns: "2.1fr 1fr", gap: "1.5rem", alignItems: "stretch" }}>
                {/* GRÁFICO DE BARRAS DUALES (Meses JAN - SEP como en la imagen) */}
                <div
                  style={{
                    backgroundColor: "#ffffff",
                    borderRadius: "0.75rem",
                    padding: "1.5rem",
                    boxShadow: "0 10px 25px rgba(0,0,0,0.05)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                    <h2 style={{ fontSize: "1rem", fontWeight: "700", color: "#334155", margin: 0 }}>
                      Resultados de Producción &amp; Ventas
                    </h2>

                    <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.75rem", color: "#64748b", fontWeight: "600" }}>
                        <span style={{ width: "10px", height: "10px", backgroundColor: "#ff9800", borderRadius: "2px" }}></span>
                        2025
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.75rem", color: "#64748b", fontWeight: "600" }}>
                        <span style={{ width: "10px", height: "10px", backgroundColor: "#0d253f", borderRadius: "2px" }}></span>
                        2026
                      </div>
                      <button
                        onClick={() => setActiveTab("orders")}
                        style={{
                          padding: "0.3rem 0.8rem",
                          backgroundColor: "#ff9800",
                          color: "#ffffff",
                          borderRadius: "9999px",
                          border: "none",
                          fontSize: "0.75rem",
                          fontWeight: "700",
                          cursor: "pointer",
                        }}
                      >
                        Ver Taller
                      </button>
                    </div>
                  </div>

                  {/* Barras SVG Interactivas */}
                  <div style={{ height: "200px", display: "flex", alignItems: "flex-end", gap: "1.25rem", borderBottom: "1px solid #e2e8f0", paddingBottom: "0.5rem" }}>
                    {stats.monthlyBars.map((bar, idx) => {
                      const isHover = hoverBar === idx;
                      return (
                        <div
                          key={bar.month}
                          onMouseEnter={() => setHoverBar(idx)}
                          onMouseLeave={() => setHoverBar(null)}
                          style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end", position: "relative", cursor: "pointer" }}
                        >
                          {/* Tooltip flotante en la barra resaltada (como el globo 28,79 en la imagen) */}
                          {(bar.highlight || isHover) && (
                            <div
                              style={{
                                position: "absolute",
                                top: `${170 - (bar.b1 * 3.4)}px`,
                                backgroundColor: "#0d253f",
                                color: "#ffffff",
                                padding: "0.2rem 0.5rem",
                                borderRadius: "0.3rem",
                                fontSize: "0.68rem",
                                fontWeight: "800",
                                whiteSpace: "nowrap",
                                boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
                              }}
                            >
                              S/ {bar.b1 * 120}
                            </div>
                          )}

                          {/* Par de Barras (Naranja y Azul) */}
                          <div style={{ display: "flex", alignItems: "flex-end", gap: "4px", width: "100%", justifyContent: "center" }}>
                            <div
                              style={{
                                width: "10px",
                                height: `${bar.b2 * 3}px`,
                                backgroundColor: "#ff9800",
                                borderRadius: "2px 2px 0 0",
                              }}
                            ></div>
                            <div
                              style={{
                                width: "10px",
                                height: `${bar.b1 * 3}px`,
                                backgroundColor: "#0d253f",
                                borderRadius: "2px 2px 0 0",
                              }}
                            ></div>
                          </div>

                          <span style={{ fontSize: "0.65rem", fontWeight: "700", color: "#94a3b8", marginTop: "0.6rem" }}>
                            {bar.month}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* GRÁFICO CIRCULAR DOUGHNUT (Como el anillo 45% en la imagen de referencia) */}
                <div
                  style={{
                    backgroundColor: "#ffffff",
                    borderRadius: "0.75rem",
                    padding: "1.5rem",
                    boxShadow: "0 10px 25px rgba(0,0,0,0.05)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  {/* Anillo Doughnut SVG */}
                  <div style={{ position: "relative", width: "130px", height: "130px", margin: "0.5rem 0" }}>
                    <svg viewBox="0 0 36 36" style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#0d253f" strokeWidth="4.5" />
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#ff9800"
                        strokeWidth="4.5"
                        strokeDasharray={`${stats.efficiencyPct}, 100`}
                      />
                    </svg>
                    <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center" }}>
                      <span style={{ fontSize: "1.35rem", fontWeight: "900", color: "#0d253f" }}>
                        {stats.efficiencyPct}%
                      </span>
                    </div>
                  </div>

                  {/* Lista de Estados del Taller */}
                  <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "0.45rem", margin: "1rem 0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", color: "#64748b", borderBottom: "1px solid #f1f5f9", paddingBottom: "0.3rem" }}>
                      <span>En Cola de Espera</span>
                      <strong style={{ color: "#ff9800" }}>{stats.cola}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", color: "#64748b", borderBottom: "1px solid #f1f5f9", paddingBottom: "0.3rem" }}>
                      <span>En Laboratorio</span>
                      <strong style={{ color: "#0d253f" }}>{stats.proceso}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.78rem", color: "#64748b" }}>
                      <span>Listas para Entrega</span>
                      <strong style={{ color: "#10b981" }}>{stats.listo}</strong>
                    </div>
                  </div>

                  <button
                    onClick={() => setActiveTab("orders")}
                    style={{
                      width: "100%",
                      padding: "0.6rem",
                      backgroundColor: "#ff9800",
                      color: "#ffffff",
                      borderRadius: "0.5rem",
                      border: "none",
                      fontSize: "0.82rem",
                      fontWeight: "800",
                      cursor: "pointer",
                      boxShadow: "0 4px 10px rgba(255,152,0,0.3)",
                    }}
                  >
                    Gestionar Taller
                  </button>
                </div>
              </div>

              {/* FILA INFERIOR: GRÁFICO DE ONDAS / CURVAS (WAVE CHART) & CALENDARIO SEMANAL */}
              <div
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "0.75rem",
                  padding: "1.5rem",
                  boxShadow: "0 10px 25px rgba(0,0,0,0.05)",
                  display: "grid",
                  gridTemplateColumns: "2.1fr 1fr",
                  gap: "1.5rem",
                  alignItems: "center",
                }}
              >
                {/* Gráfico de Ondas / Curvas Suaves en Amarillo y Azul */}
                <div>
                  <div style={{ display: "flex", gap: "1.5rem", marginBottom: "0.75rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.78rem", color: "#64748b", fontWeight: "600" }}>
                      <span style={{ width: "8px", height: "8px", backgroundColor: "#ff9800", borderRadius: "50%" }}></span>
                      Tratamiento Blue Protect
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.78rem", color: "#64748b", fontWeight: "600" }}>
                      <span style={{ width: "8px", height: "8px", backgroundColor: "#0d253f", borderRadius: "50%" }}></span>
                      Lunas Progresivas
                    </div>
                  </div>

                  {/* Curva SVG Wave */}
                  <div style={{ height: "130px", width: "100%" }}>
                    <svg viewBox="0 0 500 120" style={{ width: "100%", height: "100%" }} preserveAspectRatio="none">
                      <defs>
                        <linearGradient id="gradOrange" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ff9800" stopOpacity="0.6" />
                          <stop offset="100%" stopColor="#ff9800" stopOpacity="0.02" />
                        </linearGradient>
                        <linearGradient id="gradBlue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#0d253f" stopOpacity="0.7" />
                          <stop offset="100%" stopColor="#0d253f" stopOpacity="0.05" />
                        </linearGradient>
                      </defs>

                      {/* Onda Azul */}
                      <path
                        d="M 0 80 Q 70 30, 140 70 T 280 60 T 420 40 L 500 70 L 500 120 L 0 120 Z"
                        fill="url(#gradBlue)"
                      />
                      <path
                        d="M 0 80 Q 70 30, 140 70 T 280 60 T 420 40 L 500 70"
                        fill="none"
                        stroke="#0d253f"
                        strokeWidth="3"
                      />

                      {/* Onda Naranja */}
                      <path
                        d="M 0 95 Q 80 85, 150 50 T 300 20 T 420 80 L 500 85 L 500 120 L 0 120 Z"
                        fill="url(#gradOrange)"
                      />
                      <path
                        d="M 0 95 Q 80 85, 150 50 T 300 20 T 420 80 L 500 85"
                        fill="none"
                        stroke="#ff9800"
                        strokeWidth="3"
                      />
                    </svg>
                  </div>
                </div>

                {/* Mini Calendario de Turnos Clínicos */}
                <div style={{ borderLeft: "1px solid #f1f5f9", paddingLeft: "1.5rem" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "0.25rem", textAlign: "center", fontSize: "0.68rem", fontWeight: "700", color: "#64748b", marginBottom: "0.4rem" }}>
                    <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "0.25rem", textAlign: "center", fontSize: "0.72rem", color: "#334155" }}>
                    <span style={{ color: "#cbd5e1" }}>29</span><span style={{ color: "#cbd5e1" }}>30</span><span>1</span><span>2</span><span>3</span>
                    <span style={{ backgroundColor: "#0d253f", color: "#fff", borderRadius: "3px", fontWeight: "700" }}>4</span><span>5</span>
                    <span>6</span><span>7</span><span>8</span><span>9</span>
                    <span style={{ backgroundColor: "#ff9800", color: "#fff", borderRadius: "3px", fontWeight: "700" }}>10</span><span>11</span><span>12</span>
                    <span>13</span><span>14</span><span>15</span><span>16</span><span>17</span><span>18</span><span>19</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VISTA 2: GESTIÓN DE TALLER & LABORATORIO */}
          {activeTab === "orders" && (
            <div style={{ backgroundColor: "#ffffff", borderRadius: "0.75rem", padding: "1.75rem", boxShadow: "0 10px 25px rgba(0,0,0,0.05)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
                <div>
                  <h2 style={{ fontSize: "1.2rem", fontWeight: "800", color: "#0d253f", margin: 0 }}>Órdenes de Laboratorio</h2>
                  <p style={{ fontSize: "0.82rem", color: "#64748b", margin: "0.2rem 0 0 0" }}>Control de recetas, biselado y recojo en tienda</p>
                </div>

                <div style={{ display: "flex", gap: "0.4rem" }}>
                  {["all", "cola", "proceso", "listo"].map((st) => (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      style={{
                        padding: "0.35rem 0.75rem",
                        borderRadius: "0.4rem",
                        border: "none",
                        backgroundColor: statusFilter === st ? "#0d253f" : "#f1f5f9",
                        color: statusFilter === st ? "#ffffff" : "#475569",
                        fontSize: "0.8rem",
                        fontWeight: "700",
                        cursor: "pointer",
                        textTransform: "capitalize",
                      }}
                    >
                      {st === "all" ? "Todas" : st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Buscador de Ticket */}
              <div style={{ marginBottom: "1.25rem" }}>
                <input
                  type="text"
                  placeholder="Buscar por código de ticket (ej. LGT-2026-6551)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: "100%", maxWidth: "380px", padding: "0.65rem 0.85rem", border: "1px solid #cbd5e1", borderRadius: "0.5rem", fontSize: "0.85rem", outline: "none" }}
                />
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #e2e8f0", color: "#64748b", fontSize: "0.78rem", textTransform: "uppercase" }}>
                      <th style={{ padding: "0.75rem 1rem" }}>Ticket</th>
                      <th style={{ padding: "0.75rem 1rem" }}>Estado</th>
                      <th style={{ padding: "0.75rem 1rem" }}>Prioridad</th>
                      <th style={{ padding: "0.75rem 1rem" }}>Actualizar Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order) => {
                      const isUrgente = Boolean(order.urgente);
                      return (
                        <tr key={order.id || order.numero_ticket} style={{ borderBottom: "1px solid #f1f5f9", fontSize: "0.88rem" }}>
                          <td style={{ padding: "1rem", fontWeight: "800", color: "#0d253f" }}>
                            {order.numero_ticket}
                          </td>
                          <td style={{ padding: "1rem" }}>
                            <span
                              style={{
                                display: "inline-block",
                                padding: "0.25rem 0.65rem",
                                borderRadius: "9999px",
                                fontSize: "0.75rem",
                                fontWeight: "700",
                                backgroundColor:
                                  order.estado === "listo"
                                    ? "#dcfce7"
                                    : order.estado === "proceso"
                                    ? "#e0f2fe"
                                    : "#fef3c7",
                                color:
                                  order.estado === "listo"
                                    ? "#15803d"
                                    : order.estado === "proceso"
                                    ? "#0369a1"
                                    : "#b45309",
                                textTransform: "capitalize",
                              }}
                            >
                              {order.estado}
                            </span>
                          </td>
                          <td style={{ padding: "1rem" }}>
                            <button
                              onClick={() => updateOrder(order, order.estado, !isUrgente)}
                              style={{
                                padding: "0.25rem 0.6rem",
                                borderRadius: "0.4rem",
                                border: "none",
                                backgroundColor: isUrgente ? "#fee2e2" : "#f1f5f9",
                                color: isUrgente ? "#b91c1c" : "#64748b",
                                fontSize: "0.75rem",
                                fontWeight: "700",
                                cursor: "pointer",
                              }}
                            >
                              {isUrgente ? "⚡ URGENTE" : "Normal"}
                            </button>
                          </td>
                          <td style={{ padding: "1rem" }}>
                            <select
                              value={order.estado}
                              onChange={(e) => updateOrder(order, e.target.value)}
                              style={{
                                padding: "0.4rem 0.75rem",
                                border: "1px solid #cbd5e1",
                                borderRadius: "0.4rem",
                                fontSize: "0.82rem",
                                outline: "none",
                                cursor: "pointer",
                              }}
                            >
                              {STATES.map((st) => (
                                <option key={st} value={st}>
                                  {st === "cola" ? "En Cola de Espera" : st === "proceso" ? "En Laboratorio" : "Listo en Tienda"}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VISTA 3: PACIENTES */}
          {activeTab === "patients" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "1.5rem" }}>
              {/* COLUMNA 1: FORMULARIO DE REGISTRO */}
              <div style={{ backgroundColor: "#ffffff", borderRadius: "0.75rem", padding: "1.75rem", boxShadow: "0 10px 25px rgba(0,0,0,0.05)" }}>
                <div style={{ marginBottom: "1.25rem" }}>
                  <h2 style={{ fontSize: "1.15rem", fontWeight: "800", color: "#0d253f", margin: 0 }}>
                    👤 Registrar Nuevo Paciente
                  </h2>
                  <p style={{ fontSize: "0.82rem", color: "#64748b", margin: "0.25rem 0 0" }}>
                    Registra al paciente, genera su orden de taller y envíale su código de seguimiento por WhatsApp.
                  </p>
                </div>

                {/* BANNER / TARJETA DE CÓDIGO WHATSAPP GENERADO */}
                {whatsappDispatch && (
                  <div
                    style={{
                      marginBottom: "1.25rem",
                      padding: "1.25rem",
                      borderRadius: "0.75rem",
                      background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
                      border: "2px solid #22c55e",
                      boxShadow: "0 6px 18px rgba(34, 197, 94, 0.15)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem", marginBottom: "0.75rem" }}>
                      <div>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", color: "#15803d", fontWeight: "800", fontSize: "0.95rem" }}>
                          <span>✅</span> ¡Paciente Registrado con Éxito!
                        </div>
                        <div style={{ fontSize: "0.82rem", color: "#166534", marginTop: "0.2rem" }}>
                          Orden creada en taller. Envía el código de seguimiento al paciente:
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setWhatsappDispatch(null)}
                        style={{ background: "transparent", border: "none", color: "#15803d", cursor: "pointer", fontSize: "1rem", fontWeight: "700" }}
                        title="Cerrar aviso"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Display del Ticket */}
                    <div
                      style={{
                        backgroundColor: "#0d253f",
                        color: "#ffffff",
                        padding: "0.75rem 1rem",
                        borderRadius: "0.5rem",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "0.85rem",
                      }}
                    >
                      <div>
                        <div style={{ fontSize: "0.7rem", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: "700" }}>
                          Código de Seguimiento
                        </div>
                        <div style={{ fontSize: "1.25rem", fontWeight: "900", color: "#ff9800", letterSpacing: "1px" }}>
                          {whatsappDispatch.ticket}
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "0.82rem", fontWeight: "700" }}>{whatsappDispatch.name}</div>
                        <div style={{ fontSize: "0.74rem", color: "#cbd5e1" }}>
                          {whatsappDispatch.phone ? `📱 ${whatsappDispatch.phone}` : "Sin celular"}
                        </div>
                      </div>
                    </div>

                    {/* Botones de acción WhatsApp */}
                    {whatsappDispatch.url ? (
                      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                        <a
                          href={whatsappDispatch.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            flex: "1",
                            minWidth: "200px",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "0.5rem",
                            padding: "0.75rem 1rem",
                            borderRadius: "0.5rem",
                            backgroundColor: "#25D366",
                            color: "#ffffff",
                            fontWeight: "800",
                            fontSize: "0.85rem",
                            textDecoration: "none",
                            boxShadow: "0 4px 12px rgba(37, 211, 102, 0.4)",
                          }}
                        >
                          <span style={{ fontSize: "1.1rem" }}>📲</span> Enviar Código por WhatsApp
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            const msg = getWhatsAppMessage(whatsappDispatch);
                            navigator.clipboard.writeText(msg);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2500);
                          }}
                          style={{
                            padding: "0.75rem 1rem",
                            borderRadius: "0.5rem",
                            border: "1px solid #16a34a",
                            backgroundColor: "#ffffff",
                            color: "#15803d",
                            fontWeight: "700",
                            fontSize: "0.82rem",
                            cursor: "pointer",
                          }}
                        >
                          {copied ? "✓ Copiado" : "📋 Copiar Texto"}
                        </button>
                      </div>
                    ) : (
                      <div style={{ fontSize: "0.8rem", color: "#b91c1c" }}>
                        ⚠️ No se ingresó celular. Puedes compartir manualmente el código: <b>{whatsappDispatch.ticket}</b>
                      </div>
                    )}
                  </div>
                )}

                <form onSubmit={savePatient} style={{ display: "grid", gap: "0.85rem" }}>
                  {/* DNI & Edad */}
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "0.75rem" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "700", color: "#475569", marginBottom: "0.25rem" }}>
                        DNI del Paciente *
                      </label>
                      <input
                        type="text"
                        maxLength={8}
                        placeholder="8 dígitos"
                        value={patient.dni}
                        onChange={(e) => setPatient({ ...patient, dni: e.target.value.replace(/\D/g, "") })}
                        required
                        style={{ width: "100%", padding: "0.65rem 0.85rem", border: "1px solid #cbd5e1", borderRadius: "0.5rem", fontSize: "0.88rem" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "700", color: "#475569", marginBottom: "0.25rem" }}>
                        Edad
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="120"
                        placeholder="Ej. 28"
                        value={patient.edad}
                        onChange={(e) => setPatient({ ...patient, edad: e.target.value })}
                        style={{ width: "100%", padding: "0.65rem 0.85rem", border: "1px solid #cbd5e1", borderRadius: "0.5rem", fontSize: "0.88rem" }}
                      />
                    </div>
                  </div>

                  {/* Nombres */}
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "700", color: "#475569", marginBottom: "0.25rem" }}>
                      Nombres *
                    </label>
                    <input
                      type="text"
                      placeholder="Nombres completos"
                      value={patient.nombres}
                      onChange={(e) => setPatient({ ...patient, nombres: e.target.value })}
                      required
                      style={{ width: "100%", padding: "0.65rem 0.85rem", border: "1px solid #cbd5e1", borderRadius: "0.5rem", fontSize: "0.88rem" }}
                    />
                  </div>

                  {/* Apellidos */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "700", color: "#475569", marginBottom: "0.25rem" }}>
                        Apellido Paterno *
                      </label>
                      <input
                        type="text"
                        placeholder="Primer apellido"
                        value={patient.apellido_paterno}
                        onChange={(e) => setPatient({ ...patient, apellido_paterno: e.target.value })}
                        required
                        style={{ width: "100%", padding: "0.65rem 0.85rem", border: "1px solid #cbd5e1", borderRadius: "0.5rem", fontSize: "0.88rem" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "700", color: "#475569", marginBottom: "0.25rem" }}>
                        Apellido Materno
                      </label>
                      <input
                        type="text"
                        placeholder="Segundo apellido (opcional)"
                        value={patient.apellido_materno}
                        onChange={(e) => setPatient({ ...patient, apellido_materno: e.target.value })}
                        style={{ width: "100%", padding: "0.65rem 0.85rem", border: "1px solid #cbd5e1", borderRadius: "0.5rem", fontSize: "0.88rem" }}
                      />
                    </div>
                  </div>

                  {/* Celular / WhatsApp */}
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "700", color: "#475569", marginBottom: "0.25rem" }}>
                      📱 Número de Celular / WhatsApp
                    </label>
                    <input
                      type="tel"
                      maxLength={9}
                      placeholder="Ej. 987654321 (para enviar código)"
                      value={patient.celular}
                      onChange={(e) => setPatient({ ...patient, celular: e.target.value.replace(/\D/g, "") })}
                      style={{ width: "100%", padding: "0.65rem 0.85rem", border: "1px solid #cbd5e1", borderRadius: "0.5rem", fontSize: "0.88rem" }}
                    />
                    <span style={{ fontSize: "0.74rem", color: "#059669", display: "block", marginTop: "0.25rem" }}>
                      ✨ Se abrirá WhatsApp con el código de seguimiento listo para enviar al paciente.
                    </span>
                  </div>

                  {/* Código de Seguimiento Asignado & Botón de regenerar */}
                  <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: "0.75rem", alignItems: "flex-end" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "700", color: "#475569", marginBottom: "0.25rem" }}>
                        Código de Seguimiento (Ticket)
                      </label>
                      <input
                        type="text"
                        value={patient.codigo_ticket}
                        onChange={(e) => setPatient({ ...patient, codigo_ticket: e.target.value })}
                        style={{
                          width: "100%",
                          padding: "0.65rem 0.85rem",
                          border: "1px solid #cbd5e1",
                          borderRadius: "0.5rem",
                          fontSize: "0.88rem",
                          fontWeight: "800",
                          color: "#0d253f",
                          backgroundColor: "#f8fafc",
                          letterSpacing: "0.5px",
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setPatient({ ...patient, codigo_ticket: generateTicket() })}
                      style={{
                        padding: "0.65rem 0.75rem",
                        backgroundColor: "#f1f5f9",
                        border: "1px solid #cbd5e1",
                        borderRadius: "0.5rem",
                        fontSize: "0.78rem",
                        fontWeight: "700",
                        color: "#334155",
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      🎲 Cambiar código
                    </button>
                  </div>

                  {/* Servicio / Tratamiento */}
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: "700", color: "#475569", marginBottom: "0.25rem" }}>
                      Servicio / Lunas Solicitadas
                    </label>
                    <select
                      value={patient.servicio}
                      onChange={(e) => setPatient({ ...patient, servicio: e.target.value })}
                      style={{ width: "100%", padding: "0.65rem 0.85rem", border: "1px solid #cbd5e1", borderRadius: "0.5rem", fontSize: "0.85rem", cursor: "pointer" }}
                    >
                      <option value="Lunas Blue Protect UV400 + Montura">Lunas Blue Protect UV400 + Montura</option>
                      <option value="Lunas Fotocromáticas Transitions + Montura">Lunas Fotocromáticas Transitions + Montura</option>
                      <option value="Lunas Progresivas Digitales Multifocales">Lunas Progresivas Digitales Multifocales</option>
                      <option value="Lunas Antirreflejo Green / Crizal">Lunas Antirreflejo Green / Crizal</option>
                      <option value="Cristales Monofocales Básicos">Cristales Monofocales Básicos</option>
                      <option value="Solo Montura Oftálmica">Solo Montura Oftálmica</option>
                      <option value="Examen Visual & Medida de la Vista">Examen Visual & Medida de la Vista</option>
                    </select>
                  </div>

                  {/* Botón Guardar */}
                  <button
                    type="submit"
                    disabled={savingPatient}
                    style={{
                      padding: "0.85rem",
                      backgroundColor: "#0d253f",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "0.5rem",
                      fontWeight: "800",
                      fontSize: "0.92rem",
                      cursor: "pointer",
                      marginTop: "0.5rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.5rem",
                      boxShadow: "0 4px 12px rgba(13, 37, 63, 0.2)",
                    }}
                  >
                    {savingPatient ? (
                      "Guardando Paciente y Generando Código..."
                    ) : (
                      <>
                        <span>📲</span> Guardar y Enviar Código por WhatsApp
                      </>
                    )}
                  </button>
                </form>
              </div>

              {/* COLUMNA 2: DIRECTORIO DE PACIENTES */}
              <div style={{ backgroundColor: "#ffffff", borderRadius: "0.75rem", padding: "1.75rem", boxShadow: "0 10px 25px rgba(0,0,0,0.05)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem" }}>
                  <div>
                    <h2 style={{ fontSize: "1.15rem", fontWeight: "800", color: "#0d253f", margin: 0 }}>
                      Directorio de Pacientes
                    </h2>
                    <span style={{ fontSize: "0.78rem", color: "#64748b" }}>
                      {(data?.patients || []).length} pacientes registrados
                    </span>
                  </div>
                </div>

                {/* Buscador de Pacientes */}
                <div style={{ marginBottom: "1rem" }}>
                  <input
                    type="text"
                    placeholder="Buscar por nombre, DNI o celular..."
                    value={patientSearch}
                    onChange={(e) => setPatientSearch(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.6rem 0.85rem",
                      border: "1px solid #cbd5e1",
                      borderRadius: "0.5rem",
                      fontSize: "0.85rem",
                      outline: "none",
                    }}
                  />
                </div>

                {/* Lista de Pacientes con botón directo de WhatsApp */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxHeight: "480px", overflowY: "auto", paddingRight: "0.25rem" }}>
                  {(data?.patients || [])
                    .filter((p) => {
                      if (!patientSearch) return true;
                      const q = patientSearch.toLowerCase();
                      return (
                        (p.nombres || "").toLowerCase().includes(q) ||
                        (p.apellido_paterno || "").toLowerCase().includes(q) ||
                        (p.apellido_materno || "").toLowerCase().includes(q) ||
                        (p.dni || "").includes(q) ||
                        (p.celular || "").includes(q)
                      );
                    })
                    .map((p) => {
                      const fullName = `${p.nombres} ${p.apellido_paterno} ${p.apellido_materno || ""}`.trim();
                      const associatedSale = (data?.sales || []).find((s) => s.paciente_id === p.id);
                      const ticket = associatedSale?.numero_ticket || "";
                      const waText = ticket
                        ? getWhatsAppMessage({ name: p.nombres, ticket, service: associatedSale?.luna_descripcion })
                        : `¡Hola ${p.nombres}! Te saludamos del Laboratorio Óptico Lens Group Trujillo. Puedes consultar tus órdenes en https://tiendaonline1.vercel.app/seguimiento`;
                      const waHref = p.celular ? buildWhatsAppUrl(p.celular, waText) : null;

                      return (
                        <div
                          key={p.id}
                          style={{
                            padding: "0.85rem 1rem",
                            backgroundColor: "#f8fafc",
                            borderRadius: "0.6rem",
                            border: "1px solid #e2e8f0",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: "0.75rem",
                            flexWrap: "wrap",
                          }}
                        >
                          <div style={{ flex: "1", minWidth: "180px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              <strong style={{ color: "#0d253f", fontSize: "0.9rem" }}>{fullName}</strong>
                              {ticket && (
                                <span
                                  style={{
                                    fontSize: "0.7rem",
                                    fontWeight: "800",
                                    padding: "0.15rem 0.45rem",
                                    borderRadius: "4px",
                                    backgroundColor: "#0d253f",
                                    color: "#ff9800",
                                  }}
                                >
                                  {ticket}
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "0.2rem" }}>
                              <span>DNI: <b>{p.dni}</b></span>
                              {p.celular && <span> • Cel: <b>{p.celular}</b></span>}
                              {p.ocupacion && <span> • {p.ocupacion}</span>}
                            </div>
                          </div>

                          {/* Botón WhatsApp */}
                          {waHref ? (
                            <a
                              href={waHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.35rem",
                                padding: "0.4rem 0.75rem",
                                backgroundColor: "#25D366",
                                color: "#ffffff",
                                borderRadius: "0.4rem",
                                fontSize: "0.76rem",
                                fontWeight: "800",
                                textDecoration: "none",
                                boxShadow: "0 2px 6px rgba(37, 211, 102, 0.3)",
                                whiteSpace: "nowrap",
                              }}
                            >
                              <span>📲</span> WhatsApp
                            </a>
                          ) : (
                            <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>Sin WhatsApp</span>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}

          {/* VISTA 4: INVENTARIO */}
          {activeTab === "inventory" && (
            <div style={{ backgroundColor: "#ffffff", borderRadius: "0.75rem", padding: "1.75rem", boxShadow: "0 10px 25px rgba(0,0,0,0.05)" }}>
              <h2 style={{ fontSize: "1.2rem", fontWeight: "800", color: "#0d253f", margin: "0 0 1.25rem 0" }}>Inventario de Monturas en Tienda</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1rem" }}>
                {[
                  { brand: "Ray-Ban", model: "Aviator Classic Dorado (RB3025)", stock: 2, price: 520 },
                  { brand: "Ray-Ban", model: "Wayfarer Midnight Black (RB2140)", stock: 8, price: 480 },
                  { brand: "Oakley", model: "Holbrook Polarized OO9102", stock: 3, price: 590 },
                  { brand: "Vogue", model: "Cat-Eye VO5211S Acetato", stock: 4, price: 420 },
                  { brand: "InkaLens", model: "Titanium Flex TR-90", stock: 9, price: 360 },
                  { brand: "Sylvane", model: "Elegance Rose Gold Metálico", stock: 1, price: 380 },
                ].map((item, idx) => (
                  <div key={idx} style={{ padding: "1.25rem", backgroundColor: "#f8fafc", borderRadius: "0.75rem", border: "1px solid #e2e8f0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                      <span style={{ fontSize: "0.75rem", fontWeight: "800", color: "#0d253f" }}>{item.brand}</span>
                      <span style={{ padding: "0.15rem 0.5rem", borderRadius: "9999px", fontSize: "0.7rem", fontWeight: "700", backgroundColor: item.stock <= 2 ? "#fee2e2" : "#dcfce7", color: item.stock <= 2 ? "#b91c1c" : "#15803d" }}>
                        {item.stock} en stock
                      </span>
                    </div>
                    <div style={{ fontSize: "0.9rem", fontWeight: "700", color: "#1e293b", margin: "0.3rem 0" }}>{item.model}</div>
                    <div style={{ fontSize: "0.85rem", color: "#64748b" }}>Precio Venta: <strong>S/ {item.price}</strong></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VISTA 5: REPORTE & VENTAS */}
          {activeTab === "sales" && (
            <div style={{ backgroundColor: "#ffffff", borderRadius: "0.75rem", padding: "1.75rem", boxShadow: "0 10px 25px rgba(0,0,0,0.05)" }}>
              <h2 style={{ fontSize: "1.2rem", fontWeight: "800", color: "#0d253f", margin: "0 0 1.25rem 0" }}>Registro de Ventas &amp; Facturación</h2>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #e2e8f0", color: "#64748b", fontSize: "0.78rem", textTransform: "uppercase" }}>
                    <th style={{ padding: "0.75rem 1rem" }}>Ticket</th>
                    <th style={{ padding: "0.75rem 1rem" }}>Montura</th>
                    <th style={{ padding: "0.75rem 1rem" }}>Luna / Tratamiento</th>
                    <th style={{ padding: "0.75rem 1rem" }}>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.sales || []).map((sale) => (
                    <tr key={sale.id} style={{ borderBottom: "1px solid #f1f5f9", fontSize: "0.88rem" }}>
                      <td style={{ padding: "1rem", fontWeight: "800", color: "#0d253f" }}>{sale.numero_ticket}</td>
                      <td style={{ padding: "1rem" }}>{sale.montura_descripcion || "Montura oficial"}</td>
                      <td style={{ padding: "1rem", color: "#0284c7" }}>{sale.luna_descripcion || "Cristales Blue Protect"}</td>
                      <td style={{ padding: "1rem", color: "#15803d", fontWeight: "700" }}>{sale.estado_entrega || "Listo"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
