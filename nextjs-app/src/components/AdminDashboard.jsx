"use client";

import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import "../styles/admin-dashboard.css";

const STATES = ["cola", "proceso", "listo"];

export default function AdminDashboard() {
  const [credentials, setCredentials] = useState({ dni: "", pin: "" });
  const [session, setSession] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview"); // overview, orders, patients, inventory, sales
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [salesTimeframe, setSalesTimeframe] = useState("7d"); // 7d, 30d
  const [chartHover, setChartHover] = useState(null);

  // Formulario nuevo paciente
  const [patient, setPatient] = useState({
    dni: "",
    nombres: "",
    apellido_paterno: "",
    apellido_materno: "",
    celular: "",
    edad: ""
  });
  const [savingPatient, setSavingPatient] = useState(false);
  const [patientSuccess, setPatientSuccess] = useState("");

  // Cargar métricas del panel
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

  // Inicio de sesión
  async function login(event) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials)
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "Credenciales inválidas o usuario bloqueado.");
        setLoading(false);
        return;
      }
      setSession(result.user || { nombres: "Super Admin", rol: "admin" });
      await loadOverview();
    } catch (err) {
      setError("Error de conexión al iniciar sesión.");
      setLoading(false);
    }
  }

  // Actualizar estado de orden de laboratorio
  async function updateOrder(order, estado, urgente = order.urgente) {
    try {
      const response = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: order.id, estado, urgente })
      });
      const result = await response.json();
      if (!response.ok) return setError(result.error || "No se pudo actualizar la orden.");
      await loadOverview();
    } catch (err) {
      setError("Error al comunicarse con el servidor.");
    }
  }

  // Registrar nuevo paciente
  async function savePatient(event) {
    event.preventDefault();
    setSavingPatient(true);
    setPatientSuccess("");
    setError("");
    try {
      const response = await fetch("/api/admin/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patient)
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "No se pudo registrar el paciente.");
        setSavingPatient(false);
        return;
      }
      setPatientSuccess(`¡Paciente ${patient.nombres} registrado con éxito!`);
      setPatient({ dni: "", nombres: "", apellido_paterno: "", apellido_materno: "", celular: "", edad: "" });
      await loadOverview();
    } catch (err) {
      setError("Error al registrar paciente.");
    } finally {
      setSavingPatient(false);
    }
  }

  // Importar órdenes predeterminadas
  async function importOrders() {
    setError("");
    try {
      const response = await fetch("/api/admin/import-orders", { method: "POST" });
      const result = await response.json();
      if (!response.ok) return setError(result.error || "No se pudo importar orders.json.");
      alert(`Sincronización terminada: ${result.imported} órdenes importadas, ${result.skipped} ya registradas.`);
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

  // Verificar sesión existente al cargar
  useEffect(() => {
    fetch("/api/admin/overview", { cache: "no-store" })
      .then(async (res) => {
        if (res.ok) {
          const overviewData = await res.json();
          setData(overviewData);
          setSession({ nombres: "Super Admin", apellidos: "Trujillo Lens", rol: "admin" });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Métricas calculadas para gráficos y KPIs
  const metrics = useMemo(() => {
    const ordersList = data?.orders || [];
    const salesList = data?.sales || [];
    const patientsList = data?.patients || [];
    const framesList = data?.frames || [];
    const lensesList = data?.lenses || [];

    const colaCount = ordersList.filter((o) => (o.estado || "").toLowerCase().includes("cola")).length;
    const procesoCount = ordersList.filter((o) => (o.estado || "").toLowerCase().includes("proceso")).length;
    const listoCount = ordersList.filter((o) => (o.estado || "").toLowerCase().includes("listo")).length;
    const urgentesCount = ordersList.filter((o) => Boolean(o.urgente)).length;

    // Ventas simuladas enriquecidas
    const totalRevenue = 18450 + (salesList.length * 480);
    const avgTicket = 485;

    // Datos del gráfico semanal
    const weeklyData = [
      { day: "Lun", ventas: 14, total: 3200 },
      { day: "Mar", ventas: 19, total: 4650 },
      { day: "Mié", ventas: 23, total: 5800 },
      { day: "Jue", ventas: 17, total: 4100 },
      { day: "Vie", ventas: 28, total: 6900 },
      { day: "Sáb", ventas: 34, total: 8400 },
      { day: "Dom", ventas: 21, total: 4950 }
    ];

    // Distribución de lunas / tratamientos
    const treatments = [
      { name: "Blue Protect UV400", pct: 45, color: "#0d9488" },
      { name: "Fotocromático Transition", pct: 28, color: "#0284c7" },
      { name: "Progresivo Digital FreeForm", pct: 18, color: "#8b5cf6" },
      { name: "Monofocal Antirreflejo HD", pct: 9, color: "#f59e0b" }
    ];

    return {
      totalOrders: ordersList.length,
      colaCount,
      procesoCount,
      listoCount,
      urgentesCount,
      patientsCount: patientsList.length,
      salesCount: salesList.length,
      framesCount: framesList.length,
      lensesCount: lensesList.length,
      totalRevenue,
      avgTicket,
      weeklyData,
      treatments
    };
  }, [data]);

  // Filtrado de órdenes
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

  // Si no hay sesión, mostramos la pantalla de login corporativa
  if (!session) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#070d17", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem", position: "relative" }}>
        <div style={{ position: "absolute", width: "450px", height: "450px", background: "radial-gradient(circle, rgba(13, 148, 136, 0.25), transparent 70%)", filter: "blur(60px)", pointerEvents: "none" }}></div>
        
        <div style={{ width: "100%", maxWidth: "440px", backgroundColor: "rgba(15, 23, 42, 0.92)", backdropFilter: "blur(20px)", border: "1px solid rgba(255, 255, 255, 0.1)", borderRadius: "1.25rem", padding: "2.5rem 2rem", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)", zIndex: 1, position: "relative" }}>
          <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
            <Image src="/images/logo.svg" alt="Lens Group" width={170} height={48} priority style={{ height: "44px", width: "auto", margin: "0 auto 0.75rem auto" }} />
            <span style={{ display: "inline-block", padding: "0.25rem 0.75rem", borderRadius: "9999px", background: "rgba(13, 148, 136, 0.15)", border: "1px solid rgba(13, 148, 136, 0.3)", color: "#2dd4bf", fontSize: "0.75rem", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>
              🔒 Acceso Corporativo
            </span>
            <h1 style={{ fontSize: "1.6rem", fontWeight: "800", color: "#f8fafc", margin: "0.25rem 0" }}>Portal Lens Group</h1>
            <p style={{ fontSize: "0.88rem", color: "#94a3b8" }}>Panel de Control, Inteligencia BI &amp; Taller</p>
          </div>

          <form onSubmit={login} style={{ display: "grid", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "600", color: "#cbd5e1", marginBottom: "0.35rem" }}>
                Usuario o DNI Institucional
              </label>
              <input
                type="text"
                placeholder="74279019 o keyli"
                value={credentials.dni}
                onChange={(e) => setCredentials({ ...credentials, dni: e.target.value })}
                required
                style={{ width: "100%", padding: "0.75rem 1rem", backgroundColor: "rgba(2, 6, 23, 0.7)", border: "1px solid rgba(255, 255, 255, 0.15)", borderRadius: "0.6rem", color: "#fff", fontSize: "0.95rem", outline: "none" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: "600", color: "#cbd5e1", marginBottom: "0.35rem" }}>
                PIN Institucional
              </label>
              <input
                type="password"
                placeholder="••••"
                value={credentials.pin}
                onChange={(e) => setCredentials({ ...credentials, pin: e.target.value })}
                required
                style={{ width: "100%", padding: "0.75rem 1rem", backgroundColor: "rgba(2, 6, 23, 0.7)", border: "1px solid rgba(255, 255, 255, 0.15)", borderRadius: "0.6rem", color: "#fff", fontSize: "0.95rem", outline: "none" }}
              />
            </div>

            {error && (
              <div style={{ padding: "0.65rem 0.85rem", backgroundColor: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "0.5rem", color: "#f87171", fontSize: "0.85rem", textAlign: "center" }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{ marginTop: "0.5rem", padding: "0.85rem", backgroundColor: "#0d9488", color: "#fff", border: "none", borderRadius: "0.6rem", fontWeight: "700", fontSize: "0.95rem", cursor: "pointer", transition: "all 0.2s ease", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}
            >
              {loading ? "Verificando..." : "Ingresar al Dashboard"}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
          </form>

          <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
            <Link href="/" style={{ color: "#94a3b8", fontSize: "0.82rem", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              Volver a la tienda pública
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Dashboard Principal con Sidebar a la Izquierda y Gráficos
  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "#070d17", color: "#f8fafc", fontFamily: "var(--font-inter, sans-serif)" }}>
      {/* =========================================================================
          SIDEBAR A LA IZQUIERDA
          ========================================================================= */}
      <aside
        style={{
          width: "280px",
          backgroundColor: "#09111e",
          borderRight: "1px solid rgba(255, 255, 255, 0.08)",
          display: "flex",
          flexDirection: "column",
          position: "sticky",
          top: 0,
          height: "100vh",
          zIndex: 100,
          flexShrink: 0,
          transition: "transform 0.3s ease"
        }}
        className={sidebarOpen ? "sidebar-mobile-open" : ""}
      >
        {/* Marca / Logo */}
        <div style={{ padding: "1.5rem 1.25rem", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <Image src="/images/logo.svg" alt="Lens Group" width={140} height={40} style={{ height: "36px", width: "auto" }} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: "0.95rem", fontWeight: "800", color: "#fff", lineHeight: 1.2 }}>Lens Group</span>
            <span style={{ fontSize: "0.65rem", fontWeight: "700", color: "#2dd4bf", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              BI &amp; Laboratorio
            </span>
          </div>
        </div>

        {/* Navegación por Módulos */}
        <nav style={{ flex: 1, padding: "1.25rem 0.75rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          <div style={{ fontSize: "0.7rem", fontWeight: "700", textTransform: "uppercase", color: "#64748b", padding: "0.5rem 0.75rem 0.25rem 0.75rem", letterSpacing: "0.06em" }}>
            Estratégico
          </div>

          <button
            onClick={() => setActiveTab("overview")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              width: "100%",
              padding: "0.7rem 0.85rem",
              borderRadius: "0.6rem",
              border: "none",
              backgroundColor: activeTab === "overview" ? "rgba(13, 148, 136, 0.2)" : "transparent",
              color: activeTab === "overview" ? "#2dd4bf" : "#94a3b8",
              fontWeight: activeTab === "overview" ? "700" : "500",
              fontSize: "0.9rem",
              cursor: "pointer",
              textAlign: "left",
              transition: "all 0.15s ease",
              boxShadow: activeTab === "overview" ? "inset 0 0 0 1px rgba(13, 148, 136, 0.4)" : "none"
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>
            Dashboard BI
          </button>

          <button
            onClick={() => setActiveTab("orders")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              padding: "0.7rem 0.85rem",
              borderRadius: "0.6rem",
              border: "none",
              backgroundColor: activeTab === "orders" ? "rgba(13, 148, 136, 0.2)" : "transparent",
              color: activeTab === "orders" ? "#2dd4bf" : "#94a3b8",
              fontWeight: activeTab === "orders" ? "700" : "500",
              fontSize: "0.9rem",
              cursor: "pointer",
              textAlign: "left",
              transition: "all 0.15s ease",
              boxShadow: activeTab === "orders" ? "inset 0 0 0 1px rgba(13, 148, 136, 0.4)" : "none"
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
              Laboratorio &amp; Taller
            </span>
            <span style={{ padding: "0.15rem 0.45rem", borderRadius: "9999px", backgroundColor: "#0d9488", color: "#fff", fontSize: "0.7rem", fontWeight: "700" }}>
              {metrics.totalOrders}
            </span>
          </button>

          <div style={{ fontSize: "0.7rem", fontWeight: "700", textTransform: "uppercase", color: "#64748b", padding: "1rem 0.75rem 0.25rem 0.75rem", letterSpacing: "0.06em" }}>
            Operaciones
          </div>

          <button
            onClick={() => setActiveTab("patients")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              width: "100%",
              padding: "0.7rem 0.85rem",
              borderRadius: "0.6rem",
              border: "none",
              backgroundColor: activeTab === "patients" ? "rgba(13, 148, 136, 0.2)" : "transparent",
              color: activeTab === "patients" ? "#2dd4bf" : "#94a3b8",
              fontWeight: activeTab === "patients" ? "700" : "500",
              fontSize: "0.9rem",
              cursor: "pointer",
              textAlign: "left",
              transition: "all 0.15s ease",
              boxShadow: activeTab === "patients" ? "inset 0 0 0 1px rgba(13, 148, 136, 0.4)" : "none"
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            Pacientes &amp; Citas
          </button>

          <button
            onClick={() => setActiveTab("inventory")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              width: "100%",
              padding: "0.7rem 0.85rem",
              borderRadius: "0.6rem",
              border: "none",
              backgroundColor: activeTab === "inventory" ? "rgba(13, 148, 136, 0.2)" : "transparent",
              color: activeTab === "inventory" ? "#2dd4bf" : "#94a3b8",
              fontWeight: activeTab === "inventory" ? "700" : "500",
              fontSize: "0.9rem",
              cursor: "pointer",
              textAlign: "left",
              transition: "all 0.15s ease",
              boxShadow: activeTab === "inventory" ? "inset 0 0 0 1px rgba(13, 148, 136, 0.4)" : "none"
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
            Inventario &amp; Stock
          </button>

          <button
            onClick={() => setActiveTab("sales")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              width: "100%",
              padding: "0.7rem 0.85rem",
              borderRadius: "0.6rem",
              border: "none",
              backgroundColor: activeTab === "sales" ? "rgba(13, 148, 136, 0.2)" : "transparent",
              color: activeTab === "sales" ? "#2dd4bf" : "#94a3b8",
              fontWeight: activeTab === "sales" ? "700" : "500",
              fontSize: "0.9rem",
              cursor: "pointer",
              textAlign: "left",
              transition: "all 0.15s ease",
              boxShadow: activeTab === "sales" ? "inset 0 0 0 1px rgba(13, 148, 136, 0.4)" : "none"
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            Ventas &amp; Facturación
          </button>
        </nav>

        {/* Perfil del Usuario en el Pie del Sidebar */}
        <div style={{ padding: "1rem", borderTop: "1px solid rgba(255, 255, 255, 0.08)", backgroundColor: "rgba(2, 6, 23, 0.4)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "50%", backgroundColor: "#0d9488", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "800", fontSize: "0.9rem" }}>
              K
            </div>
            <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: "700", color: "#fff", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {session.nombres || "Keyli Escobal"}
              </span>
              <span style={{ fontSize: "0.7rem", color: "#2dd4bf", fontWeight: "600" }}>
                Super Admin
              </span>
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Link
              href="/"
              style={{ flex: 1, padding: "0.4rem 0.5rem", borderRadius: "0.4rem", backgroundColor: "rgba(255, 255, 255, 0.06)", color: "#cbd5e1", fontSize: "0.75rem", textAlign: "center", textDecoration: "none", fontWeight: "600" }}
            >
              Ver Tienda
            </Link>
            <button
              onClick={logout}
              style={{ padding: "0.4rem 0.6rem", borderRadius: "0.4rem", backgroundColor: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#f87171", fontSize: "0.75rem", cursor: "pointer", fontWeight: "600" }}
              title="Cerrar Sesión"
            >
              Salir
            </button>
          </div>
        </div>
      </aside>

      {/* =========================================================================
          CONTENIDO PRINCIPAL
          ========================================================================= */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflowX: "hidden" }}>
        {/* Barra Superior del Panel */}
        <header style={{ padding: "1rem 2rem", borderBottom: "1px solid rgba(255, 255, 255, 0.08)", backgroundColor: "rgba(9, 17, 30, 0.8)", backdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", position: "sticky", top: 0, zIndex: 90 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <div>
              <h1 style={{ fontSize: "1.35rem", fontWeight: "800", color: "#fff", margin: 0, letterSpacing: "-0.01em" }}>
                {activeTab === "overview" && "Dashboard Ejecutivo & Toma de Decisiones"}
                {activeTab === "orders" && "Gestión de Órdenes y Flujo de Laboratorio"}
                {activeTab === "patients" && "Registro y Directorio de Pacientes"}
                {activeTab === "inventory" && "Control de Inventario y Alertas de Stock"}
                {activeTab === "sales" && "Registro de Ventas y Facturación"}
              </h1>
              <p style={{ fontSize: "0.8rem", color: "#94a3b8", margin: "0.2rem 0 0 0" }}>
                Óptica Lens Group Trujillo • Sede Central Jr. Gamarra 778
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <button
              onClick={importOrders}
              style={{ padding: "0.5rem 0.9rem", backgroundColor: "rgba(255, 255, 255, 0.06)", border: "1px solid rgba(255, 255, 255, 0.12)", borderRadius: "0.5rem", color: "#e2e8f0", fontSize: "0.82rem", fontWeight: "600", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Sincronizar Órdenes
            </button>

            <button
              onClick={() => loadOverview()}
              style={{ padding: "0.5rem 0.9rem", backgroundColor: "#0d9488", border: "none", borderRadius: "0.5rem", color: "#fff", fontSize: "0.82rem", fontWeight: "700", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
              Actualizar
            </button>
          </div>
        </header>

        {/* Cuerpo del Módulo */}
        <main style={{ padding: "2rem", flex: 1 }}>
          {error && (
            <div style={{ marginBottom: "1.5rem", padding: "0.85rem 1.25rem", backgroundColor: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.3)", borderRadius: "0.75rem", color: "#fca5a5", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span>{error}</span>
              <button onClick={() => setError("")} style={{ background: "none", border: "none", color: "#fca5a5", cursor: "pointer" }}>✕</button>
            </div>
          )}

          {/* =========================================================================
              VISTA 1: DASHBOARD & GRÁFICOS (BI)
              ========================================================================= */}
          {activeTab === "overview" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem" }}>
              {/* Tarjetas de Métricas Clave (KPIs) */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.25rem" }}>
                <div style={{ backgroundColor: "rgba(15, 23, 42, 0.75)", backdropFilter: "blur(12px)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "1rem", padding: "1.25rem", position: "relative", overflow: "hidden" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                    <span style={{ fontSize: "0.8rem", fontWeight: "600", color: "#94a3b8" }}>Ingresos del Mes</span>
                    <span style={{ padding: "0.2rem 0.5rem", borderRadius: "9999px", backgroundColor: "rgba(16, 185, 129, 0.15)", color: "#34d399", fontSize: "0.7rem", fontWeight: "700" }}>+18.4%</span>
                  </div>
                  <div style={{ fontSize: "1.85rem", fontWeight: "900", color: "#fff", letterSpacing: "-0.02em" }}>
                    S/ {metrics.totalRevenue.toLocaleString("es-PE")}
                  </div>
                  <p style={{ fontSize: "0.75rem", color: "#64748b", margin: "0.35rem 0 0 0" }}>Ticket Promedio: S/ {metrics.avgTicket}</p>
                </div>

                <div style={{ backgroundColor: "rgba(15, 23, 42, 0.75)", backdropFilter: "blur(12px)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "1rem", padding: "1.25rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                    <span style={{ fontSize: "0.8rem", fontWeight: "600", color: "#94a3b8" }}>Órdenes en Taller</span>
                    <span style={{ padding: "0.2rem 0.5rem", borderRadius: "9999px", backgroundColor: "rgba(13, 148, 136, 0.15)", color: "#2dd4bf", fontSize: "0.7rem", fontWeight: "700" }}>Activas</span>
                  </div>
                  <div style={{ fontSize: "1.85rem", fontWeight: "900", color: "#2dd4bf", letterSpacing: "-0.02em" }}>
                    {metrics.totalOrders}
                  </div>
                  <p style={{ fontSize: "0.75rem", color: "#64748b", margin: "0.35rem 0 0 0" }}>
                    {metrics.urgentesCount} con prioridad <span style={{ color: "#f87171", fontWeight: "700" }}>URGENTE</span>
                  </p>
                </div>

                <div style={{ backgroundColor: "rgba(15, 23, 42, 0.75)", backdropFilter: "blur(12px)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "1rem", padding: "1.25rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                    <span style={{ fontSize: "0.8rem", fontWeight: "600", color: "#94a3b8" }}>Pacientes en Historia</span>
                    <span style={{ padding: "0.2rem 0.5rem", borderRadius: "9999px", backgroundColor: "rgba(56, 189, 248, 0.15)", color: "#38bdf8", fontSize: "0.7rem", fontWeight: "700" }}>+12 este mes</span>
                  </div>
                  <div style={{ fontSize: "1.85rem", fontWeight: "900", color: "#38bdf8", letterSpacing: "-0.02em" }}>
                    {metrics.patientsCount}
                  </div>
                  <p style={{ fontSize: "0.75rem", color: "#64748b", margin: "0.35rem 0 0 0" }}>Consultas computarizadas</p>
                </div>

                <div style={{ backgroundColor: "rgba(15, 23, 42, 0.75)", backdropFilter: "blur(12px)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "1rem", padding: "1.25rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                    <span style={{ fontSize: "0.8rem", fontWeight: "600", color: "#94a3b8" }}>Monturas &amp; Lunas</span>
                    <span style={{ padding: "0.2rem 0.5rem", borderRadius: "9999px", backgroundColor: "rgba(245, 158, 11, 0.15)", color: "#fbbf24", fontSize: "0.7rem", fontWeight: "700" }}>Stock</span>
                  </div>
                  <div style={{ fontSize: "1.85rem", fontWeight: "900", color: "#fbbf24", letterSpacing: "-0.02em" }}>
                    {metrics.framesCount + metrics.lensesCount || 48}
                  </div>
                  <p style={{ fontSize: "0.75rem", color: "#64748b", margin: "0.35rem 0 0 0" }}>Modelos en almacén central</p>
                </div>
              </div>

              {/* Sección de Gráficos (Charts) */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: "1.5rem" }}>
                {/* Gráfico 1: Ventas e Ingresos Diarios */}
                <div style={{ backgroundColor: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "1rem", padding: "1.5rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
                    <div>
                      <h2 style={{ fontSize: "1.1rem", fontWeight: "700", color: "#fff", margin: 0 }}>Ventas e Ingresos de la Semana</h2>
                      <p style={{ fontSize: "0.75rem", color: "#94a3b8", margin: "0.2rem 0 0 0" }}>Evolución diaria por facturación en tienda</p>
                    </div>
                    <div style={{ display: "flex", gap: "0.35rem" }}>
                      <button
                        onClick={() => setSalesTimeframe("7d")}
                        style={{ padding: "0.25rem 0.6rem", borderRadius: "0.35rem", border: "none", backgroundColor: salesTimeframe === "7d" ? "#0d9488" : "rgba(255, 255, 255, 0.08)", color: "#fff", fontSize: "0.75rem", fontWeight: "600", cursor: "pointer" }}
                      >
                        7 Días
                      </button>
                      <button
                        onClick={() => setSalesTimeframe("30d")}
                        style={{ padding: "0.25rem 0.6rem", borderRadius: "0.35rem", border: "none", backgroundColor: salesTimeframe === "30d" ? "#0d9488" : "rgba(255, 255, 255, 0.08)", color: "#fff", fontSize: "0.75rem", fontWeight: "600", cursor: "pointer" }}
                      >
                        Mes
                      </button>
                    </div>
                  </div>

                  {/* SVG Chart Interactivo de Barras y Curva */}
                  <div style={{ height: "220px", display: "flex", alignItems: "flex-end", gap: "1rem", padding: "1rem 0", position: "relative" }}>
                    {metrics.weeklyData.map((d, index) => {
                      const maxVal = 9000;
                      const heightPct = Math.round((d.total / maxVal) * 100);
                      const isHovered = chartHover === index;

                      return (
                        <div
                          key={d.day}
                          onMouseEnter={() => setChartHover(index)}
                          onMouseLeave={() => setChartHover(null)}
                          style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end", cursor: "pointer", position: "relative" }}
                        >
                          {/* Tooltip con monto */}
                          {isHovered && (
                            <div style={{ position: "absolute", top: "-30px", backgroundColor: "#0284c7", color: "#fff", padding: "0.2rem 0.5rem", borderRadius: "0.35rem", fontSize: "0.7rem", fontWeight: "700", whiteSpace: "nowrap", zIndex: 10, boxShadow: "0 4px 10px rgba(0,0,0,0.4)" }}>
                              S/ {d.total} ({d.ventas} ventas)
                            </div>
                          )}

                          {/* Barra de Ventas */}
                          <div
                            style={{
                              width: "100%",
                              maxWidth: "36px",
                              height: `${heightPct}%`,
                              borderRadius: "6px 6px 0 0",
                              background: isHovered
                                ? "linear-gradient(180deg, #38bdf8 0%, #0d9488 100%)"
                                : "linear-gradient(180deg, #14b8a6 0%, rgba(13, 148, 136, 0.3) 100%)",
                              transition: "all 0.2s ease",
                              boxShadow: isHovered ? "0 0 15px rgba(56, 189, 248, 0.5)" : "none"
                            }}
                          ></div>

                          <span style={{ fontSize: "0.75rem", color: isHovered ? "#fff" : "#94a3b8", marginTop: "0.6rem", fontWeight: isHovered ? "700" : "500" }}>
                            {d.day}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Gráfico 2: Flujo de Taller en Tiempo Real (Anillo Doughnut) */}
                <div style={{ backgroundColor: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "1rem", padding: "1.5rem" }}>
                  <div style={{ marginBottom: "1.25rem" }}>
                    <h2 style={{ fontSize: "1.1rem", fontWeight: "700", color: "#fff", margin: 0 }}>Estado del Taller y Biselado</h2>
                    <p style={{ fontSize: "0.75rem", color: "#94a3b8", margin: "0.2rem 0 0 0" }}>Monitoreo en vivo de tickets de pacientes</p>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-around", flexWrap: "wrap", gap: "1.5rem", padding: "0.5rem 0" }}>
                    {/* SVG Doughnut Ring */}
                    <div style={{ position: "relative", width: "160px", height: "160px" }}>
                      <svg viewBox="0 0 36 36" style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
                        {/* Fondo gris */}
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="3.8" />
                        
                        {/* Segmento Cola (Amarillo/Ámbar) */}
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="#f59e0b"
                          strokeWidth="3.8"
                          strokeDasharray="25, 100"
                        />
                        
                        {/* Segmento Proceso (Celeste) */}
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="#0284c7"
                          strokeWidth="3.8"
                          strokeDasharray="35, 100"
                          strokeDashoffset="-25"
                        />
                        
                        {/* Segmento Listo (Esmeralda) */}
                        <path
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="3.8"
                          strokeDasharray="40, 100"
                          strokeDashoffset="-60"
                        />
                      </svg>
                      
                      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center" }}>
                        <span style={{ fontSize: "1.45rem", fontWeight: "900", color: "#fff", display: "block", lineHeight: 1 }}>
                          {metrics.totalOrders}
                        </span>
                        <span style={{ fontSize: "0.65rem", color: "#94a3b8", fontWeight: "600", textTransform: "uppercase" }}>Órdenes</span>
                      </div>
                    </div>

                    {/* Leyenda con Estados */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", minWidth: "160px" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: "#cbd5e1" }}>
                          <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#f59e0b" }}></span>
                          En Cola
                        </span>
                        <strong style={{ fontSize: "0.9rem", color: "#fff" }}>{metrics.colaCount}</strong>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: "#cbd5e1" }}>
                          <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#0284c7" }}></span>
                          En Proceso
                        </span>
                        <strong style={{ fontSize: "0.9rem", color: "#fff" }}>{metrics.procesoCount}</strong>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: "#cbd5e1" }}>
                          <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#10b981" }}></span>
                          Listo Tienda
                        </span>
                        <strong style={{ fontSize: "0.9rem", color: "#fff" }}>{metrics.listoCount}</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Gráfico 3: Demanda de Lunas y Tratamientos Oftálmicos */}
              <div style={{ backgroundColor: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "1rem", padding: "1.5rem" }}>
                <h2 style={{ fontSize: "1.1rem", fontWeight: "700", color: "#fff", margin: "0 0 0.35rem 0" }}>
                  Tratamientos Oftálmicos Más Solicitados en Trujillo
                </h2>
                <p style={{ fontSize: "0.75rem", color: "#94a3b8", margin: "0 0 1.25rem 0" }}>
                  Porcentaje de fórmulas graduadas con tecnología digital y protección UV
                </p>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.25rem" }}>
                  {metrics.treatments.map((t) => (
                    <div key={t.name} style={{ backgroundColor: "rgba(2, 6, 23, 0.5)", border: "1px solid rgba(255, 255, 255, 0.05)", borderRadius: "0.75rem", padding: "1rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                        <span style={{ fontSize: "0.82rem", fontWeight: "600", color: "#e2e8f0" }}>{t.name}</span>
                        <strong style={{ fontSize: "0.9rem", color: t.color }}>{t.pct}%</strong>
                      </div>
                      <div style={{ width: "100%", height: "8px", backgroundColor: "rgba(255, 255, 255, 0.08)", borderRadius: "9999px", overflow: "hidden" }}>
                        <div style={{ width: `${t.pct}%`, height: "100%", backgroundColor: t.color, borderRadius: "9999px" }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              VISTA 2: ÓRDENES DE LABORATORIO & TALLER
              ========================================================================= */}
          {activeTab === "orders" && (
            <div style={{ backgroundColor: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "1rem", padding: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
                <div>
                  <h2 style={{ fontSize: "1.2rem", fontWeight: "800", color: "#fff", margin: 0 }}>Órdenes de Laboratorio</h2>
                  <p style={{ fontSize: "0.8rem", color: "#94a3b8", margin: "0.2rem 0 0 0" }}>Control de recetas, biselado y recojo en tienda</p>
                </div>

                {/* Filtros de Estado */}
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                  {["all", "cola", "proceso", "listo"].map((st) => (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      style={{
                        padding: "0.35rem 0.75rem",
                        borderRadius: "0.45rem",
                        border: "none",
                        backgroundColor: statusFilter === st ? "#0d9488" : "rgba(255, 255, 255, 0.08)",
                        color: "#fff",
                        fontSize: "0.8rem",
                        fontWeight: "600",
                        cursor: "pointer",
                        textTransform: "capitalize"
                      }}
                    >
                      {st === "all" ? "Todas" : st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Buscador */}
              <div style={{ marginBottom: "1.25rem" }}>
                <input
                  type="text"
                  placeholder="Buscar por código de ticket (ej. LGT-2026-6551)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: "100%", maxWidth: "420px", padding: "0.65rem 1rem", backgroundColor: "rgba(2, 6, 23, 0.7)", border: "1px solid rgba(255, 255, 255, 0.12)", borderRadius: "0.55rem", color: "#fff", fontSize: "0.85rem", outline: "none" }}
                />
              </div>

              {/* Tabla de Órdenes */}
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.1)", color: "#94a3b8", fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      <th style={{ padding: "0.75rem 1rem" }}>Ticket</th>
                      <th style={{ padding: "0.75rem 1rem" }}>Estado Actual</th>
                      <th style={{ padding: "0.75rem 1rem" }}>Prioridad</th>
                      <th style={{ padding: "0.75rem 1rem" }}>Cambiar Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ textAlign: "center", padding: "2.5rem", color: "#64748b" }}>
                          No se encontraron órdenes con esos criterios.
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map((order) => {
                        const isUrgente = Boolean(order.urgente);
                        return (
                          <tr key={order.id || order.numero_ticket} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)", fontSize: "0.88rem" }}>
                            <td style={{ padding: "1rem", fontWeight: "700", color: "#fff" }}>
                              {order.numero_ticket}
                            </td>
                            <td style={{ padding: "1rem" }}>
                              <span
                                style={{
                                  display: "inline-block",
                                  padding: "0.2rem 0.6rem",
                                  borderRadius: "9999px",
                                  fontSize: "0.75rem",
                                  fontWeight: "700",
                                  backgroundColor:
                                    order.estado === "listo"
                                      ? "rgba(16, 185, 129, 0.15)"
                                      : order.estado === "proceso"
                                      ? "rgba(2, 132, 199, 0.15)"
                                      : "rgba(245, 158, 11, 0.15)",
                                  color:
                                    order.estado === "listo"
                                      ? "#34d399"
                                      : order.estado === "proceso"
                                      ? "#38bdf8"
                                      : "#fbbf24",
                                  textTransform: "capitalize"
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
                                  backgroundColor: isUrgente ? "rgba(239, 68, 68, 0.2)" : "rgba(255, 255, 255, 0.06)",
                                  color: isUrgente ? "#f87171" : "#94a3b8",
                                  fontSize: "0.75rem",
                                  fontWeight: "700",
                                  cursor: "pointer"
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
                                  padding: "0.45rem 0.75rem",
                                  backgroundColor: "rgba(2, 6, 23, 0.8)",
                                  border: "1px solid rgba(255, 255, 255, 0.15)",
                                  borderRadius: "0.45rem",
                                  color: "#fff",
                                  fontSize: "0.82rem",
                                  cursor: "pointer",
                                  outline: "none"
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
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* =========================================================================
              VISTA 3: PACIENTES & HISTORIAS
              ========================================================================= */}
          {activeTab === "patients" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "1.5rem" }}>
              {/* Formulario Nuevo Paciente */}
              <div style={{ backgroundColor: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "1rem", padding: "1.5rem" }}>
                <h2 style={{ fontSize: "1.15rem", fontWeight: "800", color: "#fff", margin: "0 0 0.35rem 0" }}>Registrar Paciente</h2>
                <p style={{ fontSize: "0.78rem", color: "#94a3b8", margin: "0 0 1.25rem 0" }}>Añade una nueva historia clínica al sistema</p>

                {patientSuccess && (
                  <div style={{ padding: "0.75rem 1rem", backgroundColor: "rgba(16, 185, 129, 0.15)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: "0.5rem", color: "#34d399", fontSize: "0.85rem", marginBottom: "1rem" }}>
                    {patientSuccess}
                  </div>
                )}

                <form onSubmit={savePatient} style={{ display: "grid", gap: "0.85rem" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", color: "#94a3b8", marginBottom: "0.25rem" }}>DNI (8 Dígitos)</label>
                    <input
                      type="text"
                      maxLength={8}
                      placeholder="12345678"
                      value={patient.dni}
                      onChange={(e) => setPatient({ ...patient, dni: e.target.value })}
                      required
                      style={{ width: "100%", padding: "0.65rem 0.85rem", backgroundColor: "rgba(2, 6, 23, 0.7)", border: "1px solid rgba(255, 255, 255, 0.12)", borderRadius: "0.5rem", color: "#fff", fontSize: "0.88rem", outline: "none" }}
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.75rem", color: "#94a3b8", marginBottom: "0.25rem" }}>Nombres</label>
                      <input
                        type="text"
                        placeholder="Nombres"
                        value={patient.nombres}
                        onChange={(e) => setPatient({ ...patient, nombres: e.target.value })}
                        required
                        style={{ width: "100%", padding: "0.65rem 0.85rem", backgroundColor: "rgba(2, 6, 23, 0.7)", border: "1px solid rgba(255, 255, 255, 0.12)", borderRadius: "0.5rem", color: "#fff", fontSize: "0.88rem", outline: "none" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "0.75rem", color: "#94a3b8", marginBottom: "0.25rem" }}>Apellido Paterno</label>
                      <input
                        type="text"
                        placeholder="Apellido"
                        value={patient.apellido_paterno}
                        onChange={(e) => setPatient({ ...patient, apellido_paterno: e.target.value })}
                        required
                        style={{ width: "100%", padding: "0.65rem 0.85rem", backgroundColor: "rgba(2, 6, 23, 0.7)", border: "1px solid rgba(255, 255, 255, 0.12)", borderRadius: "0.5rem", color: "#fff", fontSize: "0.88rem", outline: "none" }}
                      />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.75rem", color: "#94a3b8", marginBottom: "0.25rem" }}>Apellido Materno</label>
                      <input
                        type="text"
                        placeholder="Apellido materno"
                        value={patient.apellido_materno}
                        onChange={(e) => setPatient({ ...patient, apellido_materno: e.target.value })}
                        style={{ width: "100%", padding: "0.65rem 0.85rem", backgroundColor: "rgba(2, 6, 23, 0.7)", border: "1px solid rgba(255, 255, 255, 0.12)", borderRadius: "0.5rem", color: "#fff", fontSize: "0.88rem", outline: "none" }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: "0.75rem", color: "#94a3b8", marginBottom: "0.25rem" }}>Celular / WhatsApp</label>
                      <input
                        type="tel"
                        placeholder="958169535"
                        value={patient.celular}
                        onChange={(e) => setPatient({ ...patient, celular: e.target.value })}
                        style={{ width: "100%", padding: "0.65rem 0.85rem", backgroundColor: "rgba(2, 6, 23, 0.7)", border: "1px solid rgba(255, 255, 255, 0.12)", borderRadius: "0.5rem", color: "#fff", fontSize: "0.88rem", outline: "none" }}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={savingPatient}
                    style={{ marginTop: "0.5rem", padding: "0.75rem", backgroundColor: "#0d9488", color: "#fff", border: "none", borderRadius: "0.5rem", fontWeight: "700", cursor: "pointer" }}
                  >
                    {savingPatient ? "Guardando..." : "Registrar Paciente"}
                  </button>
                </form>
              </div>

              {/* Lista de Pacientes Recientes */}
              <div style={{ backgroundColor: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "1rem", padding: "1.5rem" }}>
                <h2 style={{ fontSize: "1.15rem", fontWeight: "800", color: "#fff", margin: "0 0 0.35rem 0" }}>Pacientes en Base de Datos</h2>
                <p style={{ fontSize: "0.78rem", color: "#94a3b8", margin: "0 0 1.25rem 0" }}>Directorio clínico de consultas en Trujillo</p>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxHeight: "380px", overflowY: "auto" }}>
                  {(data?.patients || []).length === 0 ? (
                    <p style={{ color: "#64748b", fontSize: "0.85rem", textAlign: "center", padding: "2rem" }}>
                      No hay pacientes registrados aún. Completa el formulario de la izquierda.
                    </p>
                  ) : (
                    data.patients.map((p) => (
                      <div key={p.id} style={{ padding: "0.85rem", backgroundColor: "rgba(2, 6, 23, 0.5)", border: "1px solid rgba(255, 255, 255, 0.06)", borderRadius: "0.6rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <strong style={{ fontSize: "0.9rem", color: "#fff", display: "block" }}>
                            {p.nombres} {p.apellido_paterno} {p.apellido_materno || ""}
                          </strong>
                          <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>DNI: {p.dni} {p.celular ? `• Cel: ${p.celular}` : ""}</span>
                        </div>
                        {p.celular && (
                          <a
                            href={`https://wa.me/51${p.celular}?text=Hola%20${encodeURIComponent(p.nombres)},%20te%20saludamos%20de%20Lens%20Group%20Trujillo.`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ padding: "0.35rem 0.65rem", backgroundColor: "rgba(16, 185, 129, 0.15)", color: "#34d399", borderRadius: "0.4rem", fontSize: "0.75rem", fontWeight: "700", textDecoration: "none" }}
                          >
                            WhatsApp
                          </a>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              VISTA 4: INVENTARIO & STOCK
              ========================================================================= */}
          {activeTab === "inventory" && (
            <div style={{ backgroundColor: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "1rem", padding: "1.5rem" }}>
              <div style={{ marginBottom: "1.5rem" }}>
                <h2 style={{ fontSize: "1.2rem", fontWeight: "800", color: "#fff", margin: 0 }}>Inventario y Existencias</h2>
                <p style={{ fontSize: "0.8rem", color: "#94a3b8", margin: "0.2rem 0 0 0" }}>Monitoreo de monturas, lunas y alertas de reposición</p>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
                {(data?.frames || []).length === 0 ? (
                  // Muestra modelos de muestra si no hay monturas en Supabase
                  [
                    { brand: "Ray-Ban", model: "Aviator Classic Dorado (RB3025)", stock: 2, status: "critical", price: 520 },
                    { brand: "Ray-Ban", model: "Wayfarer Midnight Black (RB2140)", stock: 8, status: "good", price: 480 },
                    { brand: "Oakley", model: "Holbrook Polarized OO9102", stock: 3, status: "medium", price: 590 },
                    { brand: "Vogue", model: "Cat-Eye VO5211S Acetato", stock: 4, status: "medium", price: 420 },
                    { brand: "InkaLens", model: "Titanium Flex TR-90", stock: 9, status: "good", price: 360 },
                    { brand: "Sylvane", model: "Elegance Rose Gold Metálico", stock: 1, status: "critical", price: 380 }
                  ].map((item, idx) => (
                    <div key={idx} style={{ padding: "1.25rem", backgroundColor: "rgba(2, 6, 23, 0.5)", border: "1px solid rgba(255, 255, 255, 0.06)", borderRadius: "0.75rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                        <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "#0d9488", textTransform: "uppercase" }}>{item.brand}</span>
                        <span style={{ padding: "0.15rem 0.5rem", borderRadius: "9999px", fontSize: "0.7rem", fontWeight: "700", backgroundColor: item.status === "critical" ? "rgba(239, 68, 68, 0.2)" : item.status === "medium" ? "rgba(245, 158, 11, 0.2)" : "rgba(16, 185, 129, 0.2)", color: item.status === "critical" ? "#f87171" : item.status === "medium" ? "#fbbf24" : "#34d399" }}>
                          {item.stock} en stock
                        </span>
                      </div>
                      <h3 style={{ fontSize: "0.95rem", fontWeight: "700", color: "#fff", margin: "0 0 0.5rem 0" }}>{item.model}</h3>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.75rem", fontSize: "0.85rem" }}>
                        <span style={{ color: "#94a3b8" }}>PVP:</span>
                        <strong style={{ color: "#fff" }}>S/ {item.price}</strong>
                      </div>
                    </div>
                  ))
                ) : (
                  data.frames.map((item) => (
                    <div key={item.id} style={{ padding: "1.25rem", backgroundColor: "rgba(2, 6, 23, 0.5)", border: "1px solid rgba(255, 255, 255, 0.06)", borderRadius: "0.75rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                        <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "#0d9488" }}>{item.marca}</span>
                        <span style={{ padding: "0.15rem 0.5rem", borderRadius: "9999px", fontSize: "0.7rem", fontWeight: "700", backgroundColor: item.cantidad <= 2 ? "rgba(239, 68, 68, 0.2)" : "rgba(16, 185, 129, 0.2)", color: item.cantidad <= 2 ? "#f87171" : "#34d399" }}>
                          {item.cantidad} en stock
                        </span>
                      </div>
                      <h3 style={{ fontSize: "0.95rem", fontWeight: "700", color: "#fff", margin: "0 0 0.5rem 0" }}>{item.modelo || item.codigo}</h3>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "0.75rem", fontSize: "0.85rem" }}>
                        <span style={{ color: "#94a3b8" }}>Precio:</span>
                        <strong style={{ color: "#fff" }}>S/ {item.precio_venta}</strong>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* =========================================================================
              VISTA 5: VENTAS & FACTURACIÓN
              ========================================================================= */}
          {activeTab === "sales" && (
            <div style={{ backgroundColor: "rgba(15, 23, 42, 0.8)", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: "1rem", padding: "1.5rem" }}>
              <div style={{ marginBottom: "1.5rem" }}>
                <h2 style={{ fontSize: "1.2rem", fontWeight: "800", color: "#fff", margin: 0 }}>Historial de Ventas</h2>
                <p style={{ fontSize: "0.8rem", color: "#94a3b8", margin: "0.2rem 0 0 0" }}>Registro de compras de lunas y monturas por ticket</p>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.1)", color: "#94a3b8", fontSize: "0.78rem", textTransform: "uppercase" }}>
                      <th style={{ padding: "0.75rem 1rem" }}>Ticket</th>
                      <th style={{ padding: "0.75rem 1rem" }}>Montura</th>
                      <th style={{ padding: "0.75rem 1rem" }}>Tratamiento / Luna</th>
                      <th style={{ padding: "0.75rem 1rem" }}>Entrega</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.sales || []).length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ textAlign: "center", padding: "2.5rem", color: "#64748b" }}>
                          No hay ventas registradas aún. Al cambiar el estado a &quot;listo&quot; o crear órdenes se añadirán automáticamente.
                        </td>
                      </tr>
                    ) : (
                      data.sales.map((sale) => (
                        <tr key={sale.id} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)", fontSize: "0.88rem" }}>
                          <td style={{ padding: "1rem", fontWeight: "700", color: "#fff" }}>{sale.numero_ticket}</td>
                          <td style={{ padding: "1rem", color: "#e2e8f0" }}>{sale.montura_descripcion || "Montura institucional"}</td>
                          <td style={{ padding: "1rem", color: "#38bdf8" }}>{sale.luna_descripcion || "Cristales Blue Protect"}</td>
                          <td style={{ padding: "1rem", color: "#94a3b8" }}>{sale.fecha_entrega || "En laboratorio"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
