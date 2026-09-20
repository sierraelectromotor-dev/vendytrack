"use client";

import React, { useState, useMemo } from "react";
import { formatCOP, formatFechaColombia } from "@/lib/utils";
import { BEBIDAS_CATALOGO } from "@/types/liquidacion";
import {
  DollarSign,
  Coffee,
  TrendingUp,
  Calendar,
  Filter,
  Search,
  Download,
  FileText,
  CreditCard,
  Banknote,
  Truck,
  Building2,
  Eye,
  X,
  FileSpreadsheet,
  Activity,
  Sparkles,
  Inbox,
  CheckCircle2,
  Clock,
} from "lucide-react";

export interface DetalleItem {
  id: string;
  bebida: string;
  contadorAnterior: number;
  contadorActual: number;
  bebidasDanadas: number;
  tazasNetas: number;
  precioUnitario: number;
  subtotal: number;
}

export interface LiquidacionItem {
  id: string;
  consecutivo: number;
  fecha: string;
  clienteId: string;
  clienteNombre: string;
  sede: string;
  maquinaId: string;
  maquinaSerial: string;
  maquinaModelo: string;
  ubicacion: string;
  operadorId: string;
  operadorNombre: string;
  metodoPago: "EFECTIVO" | "TRANSFERENCIA";
  totalFacturado: number;
  fotoContadorUrl: string;
  firmaClienteUrl: string;
  reciboPdfUrl: string;
  notas?: string | null;
  totalTazas: number;
  detalles: DetalleItem[];
}

interface DashboardRecaudosProps {
  initialData: {
    liquidaciones: LiquidacionItem[];
    clientes: Array<{ id: string; nombre: string }>;
  };
}

export const DashboardRecaudos: React.FC<DashboardRecaudosProps> = ({ initialData }) => {
  const { liquidaciones, clientes } = initialData;

  // Estados de filtros
  const [filtroPeriodo, setFiltroPeriodo] = useState<string>("este_mes");
  const [fechaDesde, setFechaDesde] = useState<string>("");
  const [fechaHasta, setFechaHasta] = useState<string>("");
  const [filtroCliente, setFiltroCliente] = useState<string>("all");
  const [filtroMetodoPago, setFiltroMetodoPago] = useState<string>("all");
  const [busqueda, setBusqueda] = useState<string>("");

  // Estado de modal para ver evidencias de liquidación
  const [selectedLiquidacion, setSelectedLiquidacion] = useState<LiquidacionItem | null>(null);

  // Mapeo amigable de nombres de bebidas
  const nombreBebidasMap = useMemo(() => {
    return Object.fromEntries(BEBIDAS_CATALOGO.map((b) => [b.id, b.nombre]));
  }, []);

  // Filtrado reactivo de recaudos
  const liquidacionesFiltradas = useMemo(() => {
    const ahora = new Date();
    const añoActual = ahora.getFullYear();
    const mesActual = ahora.getMonth();

    return liquidaciones.filter((item) => {
      const fechaItem = new Date(item.fecha);

      // 1. Filtro por Periodo de Fecha
      if (filtroPeriodo === "este_mes") {
        if (
          fechaItem.getFullYear() !== añoActual ||
          fechaItem.getMonth() !== mesActual
        ) {
          return false;
        }
      } else if (filtroPeriodo === "mes_anterior") {
        const mesAnterior = mesActual === 0 ? 11 : mesActual - 1;
        const añoMesAnterior = mesActual === 0 ? añoActual - 1 : añoActual;
        if (
          fechaItem.getFullYear() !== añoMesAnterior ||
          fechaItem.getMonth() !== mesAnterior
        ) {
          return false;
        }
      } else if (filtroPeriodo === "ultimos_7") {
        const hace7Dias = new Date();
        hace7Dias.setDate(ahora.getDate() - 7);
        if (fechaItem < hace7Dias) return false;
      } else if (filtroPeriodo === "este_ano") {
        if (fechaItem.getFullYear() !== añoActual) return false;
      } else if (filtroPeriodo === "personalizado") {
        if (fechaDesde) {
          const dDesde = new Date(fechaDesde + "T00:00:00");
          if (fechaItem < dDesde) return false;
        }
        if (fechaHasta) {
          const dHasta = new Date(fechaHasta + "T23:59:59");
          if (fechaItem > dHasta) return false;
        }
      }

      // 2. Filtro por Cliente
      if (filtroCliente !== "all" && item.clienteId !== filtroCliente) {
        return false;
      }

      // 3. Filtro por Método de Pago
      if (filtroMetodoPago !== "all" && item.metodoPago !== filtroMetodoPago) {
        return false;
      }

      // 4. Búsqueda por texto libre
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase().trim();
        const coincideConsecutivo = `liq-${item.consecutivo}`.toLowerCase().includes(q) || item.consecutivo.toString().includes(q);
        const coincideCliente = item.clienteNombre.toLowerCase().includes(q) || item.sede.toLowerCase().includes(q);
        const coincideMaquina = item.maquinaSerial.toLowerCase().includes(q) || item.maquinaModelo.toLowerCase().includes(q);
        const coincideOperador = item.operadorNombre.toLowerCase().includes(q);

        if (!coincideConsecutivo && !coincideCliente && !coincideMaquina && !coincideOperador) {
          return false;
        }
      }

      return true;
    });
  }, [
    liquidaciones,
    filtroPeriodo,
    fechaDesde,
    fechaHasta,
    filtroCliente,
    filtroMetodoPago,
    busqueda,
  ]);

  // Cálculos de métricas globales del mes calendario actual
  const metricasMesActual = useMemo(() => {
    const ahora = new Date();
    const añoActual = ahora.getFullYear();
    const mesActual = ahora.getMonth();

    const deEsteMes = liquidaciones.filter((l) => {
      const f = new Date(l.fecha);
      return f.getFullYear() === añoActual && f.getMonth() === mesActual;
    });

    const totalVentas = deEsteMes.reduce((acc, l) => acc + l.totalFacturado, 0);
    const totalTazas = deEsteMes.reduce((acc, l) => acc + l.totalTazas, 0);
    const efectivo = deEsteMes.filter((l) => l.metodoPago === "EFECTIVO").reduce((acc, l) => acc + l.totalFacturado, 0);
    const transferencia = deEsteMes.filter((l) => l.metodoPago === "TRANSFERENCIA").reduce((acc, l) => acc + l.totalFacturado, 0);

    return {
      totalVentas,
      totalTazas,
      cantidadLiquidaciones: deEsteMes.length,
      efectivo,
      transferencia,
    };
  }, [liquidaciones]);

  // Cálculos para el conjunto filtrado en pantalla
  const metricasFiltradas = useMemo(() => {
    const totalVentas = liquidacionesFiltradas.reduce((acc, l) => acc + l.totalFacturado, 0);
    const totalTazas = liquidacionesFiltradas.reduce((acc, l) => acc + l.totalTazas, 0);
    const efectivo = liquidacionesFiltradas.filter((l) => l.metodoPago === "EFECTIVO").reduce((acc, l) => acc + l.totalFacturado, 0);
    const transferencia = liquidacionesFiltradas.filter((l) => l.metodoPago === "TRANSFERENCIA").reduce((acc, l) => acc + l.totalFacturado, 0);
    const ticketPromedio = liquidacionesFiltradas.length > 0 ? totalVentas / liquidacionesFiltradas.length : 0;

    return {
      totalVentas,
      totalTazas,
      cantidad: liquidacionesFiltradas.length,
      efectivo,
      transferencia,
      ticketPromedio,
    };
  }, [liquidacionesFiltradas]);

  // Función para exportar a CSV
  const handleExportarCSV = () => {
    if (liquidacionesFiltradas.length === 0) return;

    const encabezados = [
      "Consecutivo",
      "Fecha",
      "Cliente",
      "Sede",
      "Maquina Serial",
      "Modelo",
      "Operador",
      "Metodo Pago",
      "Tazas Netas",
      "Total Facturado (COP)",
      "Recibo PDF",
    ];

    const filas = liquidacionesFiltradas.map((l) => [
      `LIQ-${l.consecutivo}`,
      formatFechaColombia(l.fecha),
      `"${l.clienteNombre.replace(/"/g, '""')}"`,
      `"${l.sede.replace(/"/g, '""')}"`,
      `"${l.maquinaSerial}"`,
      `"${l.maquinaModelo}"`,
      `"${l.operadorNombre.replace(/"/g, '""')}"`,
      l.metodoPago,
      l.totalTazas,
      l.totalFacturado,
      `"${l.reciboPdfUrl}"`,
    ]);

    const csvContent = "\uFEFF" + [encabezados.join(";"), ...filas.map((f) => f.join(";"))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `recaudos_vendytrack_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Cabecera del Dashboard */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black tracking-tight text-stone-900 dark:text-white flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-coffee-700 dark:text-amber-400" />
            Dashboard de Recaudos y Ventas
          </h2>
          <p className="text-xs text-stone-500">
            Control de ingresos, tazas consumidas y comprobantes de liquidación en tiempo real
          </p>
        </div>

        {/* Botón de Exportar a CSV */}
        <button
          type="button"
          onClick={handleExportarCSV}
          disabled={liquidacionesFiltradas.length === 0}
          className="px-3.5 py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-2 self-start sm:self-auto disabled:opacity-50"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          <span>Exportar a Excel / CSV ({liquidacionesFiltradas.length})</span>
        </button>
      </div>

      {/* Tarjetas de Métricas Clave (KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Ventas del Mes en Curso */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm space-y-2 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500">Ventas del Mes en Curso</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-0.5">
            <span className="text-2xl font-black text-stone-900 dark:text-white tracking-tight block">
              {formatCOP(metricasMesActual.totalVentas)}
            </span>
            <span className="text-[11px] text-stone-400 flex items-center gap-1">
              <Activity className="w-3 h-3 text-emerald-500" />
              {metricasMesActual.cantidadLiquidaciones} liquidaciones este mes
            </span>
          </div>
        </div>

        {/* KPI 2: Total Tazas Servidas este Mes */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm space-y-2 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500">Tazas Servidas este Mes</span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center">
              <Coffee className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-0.5">
            <span className="text-2xl font-black text-coffee-800 dark:text-amber-400 tracking-tight block">
              {metricasMesActual.totalTazas.toLocaleString("es-CO")}
            </span>
            <span className="text-[11px] text-stone-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              Conteo oficial por contadores
            </span>
          </div>
        </div>

        {/* KPI 3: Recaudo Efectivo vs Transferencia (Mes Actual) */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm space-y-2 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500">Métodos de Pago (Mes)</span>
            <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1 pt-0.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-stone-500 flex items-center gap-1 text-[11px]">
                <Banknote className="w-3 h-3 text-emerald-600" /> Efectivo:
              </span>
              <span className="font-bold text-stone-800 dark:text-stone-200 text-xs">
                {formatCOP(metricasMesActual.efectivo)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-stone-500 flex items-center gap-1 text-[11px]">
                <CreditCard className="w-3 h-3 text-blue-600" /> Transferencia:
              </span>
              <span className="font-bold text-stone-800 dark:text-stone-200 text-xs">
                {formatCOP(metricasMesActual.transferencia)}
              </span>
            </div>
          </div>
        </div>

        {/* KPI 4: Ticket Promedio por Visita */}
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm space-y-2 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500">Ticket Promedio (Filtro)</span>
            <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-0.5">
            <span className="text-2xl font-black text-stone-900 dark:text-white tracking-tight block">
              {formatCOP(metricasFiltradas.ticketPromedio)}
            </span>
            <span className="text-[11px] text-stone-400">
              Total en vista: {formatCOP(metricasFiltradas.totalVentas)}
            </span>
          </div>
        </div>
      </div>

      {/* Panel de Filtros Interactivos */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-stone-100 dark:border-stone-800 pb-3">
          <div className="flex items-center gap-2 text-xs font-bold text-stone-800 dark:text-stone-200">
            <Filter className="w-4 h-4 text-coffee-600 dark:text-amber-400" />
            <span>Filtros de Búsqueda y Periodo</span>
          </div>

          {/* Botones de Periodo Rápido */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {[
              { id: "este_mes", label: "Este Mes" },
              { id: "mes_anterior", label: "Mes Anterior" },
              { id: "ultimos_7", label: "Últimos 7 Días" },
              { id: "este_ano", label: "Este Año" },
              { id: "historico", label: "Histórico Total" },
              { id: "personalizado", label: "Personalizado" },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setFiltroPeriodo(p.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filtroPeriodo === p.id
                    ? "bg-coffee-800 text-white shadow-sm"
                    : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Inputs de Filtros */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* 1. Selector de Cliente */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-stone-600 dark:text-stone-400 flex items-center gap-1">
              <Building2 className="w-3 h-3 text-stone-400" />
              Filtrar por Cliente
            </label>
            <select
              value={filtroCliente}
              onChange={(e) => setFiltroCliente(e.target.value)}
              className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-900 dark:text-white outline-none focus:border-coffee-600 focus:ring-1 focus:ring-coffee-600 transition-all"
            >
              <option value="all">Todos los clientes</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Selector de Método de Pago */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-stone-600 dark:text-stone-400 flex items-center gap-1">
              <CreditCard className="w-3 h-3 text-stone-400" />
              Método de Pago
            </label>
            <select
              value={filtroMetodoPago}
              onChange={(e) => setFiltroMetodoPago(e.target.value)}
              className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-900 dark:text-white outline-none focus:border-coffee-600 focus:ring-1 focus:ring-coffee-600 transition-all"
            >
              <option value="all">Todos los métodos</option>
              <option value="EFECTIVO">Efectivo</option>
              <option value="TRANSFERENCIA">Transferencia</option>
            </select>
          </div>

          {/* 3. Buscador libre */}
          <div className="space-y-1 lg:col-span-2">
            <label className="text-[11px] font-bold text-stone-600 dark:text-stone-400 flex items-center gap-1">
              <Search className="w-3 h-3 text-stone-400" />
              Buscar por Consecutivo, Máquina o Rutero
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Ej. LIQ-1001, Bianchi, Carlos Mendoza, Sanitas..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl pl-8 pr-3 py-2 text-xs text-stone-900 dark:text-white outline-none focus:border-coffee-600 focus:ring-1 focus:ring-coffee-600 transition-all"
              />
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2.5" />
              {busqueda && (
                <button
                  type="button"
                  onClick={() => setBusqueda("")}
                  className="absolute right-2.5 top-2.5 text-stone-400 hover:text-stone-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Inputs de Fecha Manual si el Periodo es "Personalizado" */}
        {filtroPeriodo === "personalizado" && (
          <div className="pt-2 border-t border-stone-100 dark:border-stone-800 grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-stone-500">Fecha Desde:</label>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-900 dark:text-white outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-stone-500">Fecha Hasta:</label>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-900 dark:text-white outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* Tabla de Registro de Recaudos */}
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-sm overflow-hidden space-y-0">
        <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-coffee-600 dark:text-amber-400" />
            <h3 className="text-sm font-bold text-stone-900 dark:text-white">
              Historial de Recaudos ({liquidacionesFiltradas.length})
            </h3>
          </div>
          <span className="text-xs text-stone-500 font-semibold">
            Total filtrado: <strong className="text-emerald-700 dark:text-emerald-400">{formatCOP(metricasFiltradas.totalVentas)}</strong>
          </span>
        </div>

        {liquidacionesFiltradas.length === 0 ? (
          <div className="text-center py-12 px-4 space-y-2">
            <Inbox className="w-10 h-10 text-stone-300 dark:text-stone-700 mx-auto" />
            <p className="text-xs font-bold text-stone-600 dark:text-stone-400">
              No se encontraron recaudos con los filtros seleccionados
            </p>
            <p className="text-[11px] text-stone-400 max-w-sm mx-auto">
              Prueba cambiando el rango de fechas, seleccionando otro cliente o borrando el texto del buscador.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-stone-50 dark:bg-stone-800/60 border-b border-stone-200 dark:border-stone-800 text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Consecutivo</th>
                  <th className="py-3 px-4">Fecha / Hora</th>
                  <th className="py-3 px-4">Cliente / Sede</th>
                  <th className="py-3 px-4">Máquina</th>
                  <th className="py-3 px-4">Rutero</th>
                  <th className="py-3 px-4 text-center">Tazas</th>
                  <th className="py-3 px-4 text-right">Total Facturado</th>
                  <th className="py-3 px-4 text-center">Pago</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {liquidacionesFiltradas.map((l) => (
                  <tr
                    key={l.id}
                    className="hover:bg-stone-50/80 dark:hover:bg-stone-800/40 transition-colors group"
                  >
                    {/* Consecutivo */}
                    <td className="py-3 px-4 font-bold text-stone-900 dark:text-white whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 font-mono text-[11px]">
                        LIQ-{l.consecutivo}
                      </span>
                    </td>

                    {/* Fecha y Hora */}
                    <td className="py-3 px-4 whitespace-nowrap text-stone-600 dark:text-stone-400">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-stone-400" />
                        <span>{formatFechaColombia(l.fecha)}</span>
                      </div>
                    </td>

                    {/* Cliente y Sede */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-stone-900 dark:text-white">
                        {l.clienteNombre}
                      </div>
                      <div className="text-[11px] text-stone-400 truncate max-w-[180px]">
                        {l.sede}
                      </div>
                    </td>

                    {/* Máquina */}
                    <td className="py-3 px-4">
                      <div className="font-mono text-[11px] text-stone-800 dark:text-stone-200">
                        {l.maquinaSerial}
                      </div>
                      <div className="text-[10px] text-stone-400 truncate max-w-[150px]">
                        {l.maquinaModelo}
                      </div>
                    </td>

                    {/* Rutero */}
                    <td className="py-3 px-4 text-stone-600 dark:text-stone-300 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Truck className="w-3 h-3 text-stone-400" />
                        <span>{l.operadorNombre}</span>
                      </div>
                    </td>

                    {/* Tazas Netas */}
                    <td className="py-3 px-4 text-center font-bold text-coffee-800 dark:text-amber-400 whitespace-nowrap">
                      {l.totalTazas}
                    </td>

                    {/* Total Facturado */}
                    <td className="py-3 px-4 text-right font-black text-stone-900 dark:text-white whitespace-nowrap">
                      {formatCOP(l.totalFacturado)}
                    </td>

                    {/* Método de Pago */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      {l.metodoPago === "EFECTIVO" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                          <Banknote className="w-2.5 h-2.5" /> Efectivo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                          <CreditCard className="w-2.5 h-2.5" /> Transferencia
                        </span>
                      )}
                    </td>

                    {/* Acciones */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Ver Evidencias y Desglose */}
                        <button
                          type="button"
                          onClick={() => setSelectedLiquidacion(l)}
                          title="Ver detalle de consumo y firmas"
                          className="p-1.5 text-stone-500 hover:text-coffee-700 dark:hover:text-amber-300 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Descargar PDF oficial */}
                        <a
                          href={l.reciboPdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Descargar Recibo PDF"
                          className="p-1.5 text-stone-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Detalle de Liquidación y Evidencias */}
      {selectedLiquidacion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl space-y-5 animate-in zoom-in-95">
            {/* Cabecera del Modal */}
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <div>
                <span className="text-xs font-mono font-bold text-coffee-700 dark:text-amber-400">
                  LIQUIDACIÓN #{selectedLiquidacion.consecutivo}
                </span>
                <h3 className="text-base font-black text-stone-900 dark:text-white">
                  {selectedLiquidacion.clienteNombre}
                </h3>
                <span className="text-xs text-stone-400">
                  {selectedLiquidacion.sede} • {formatFechaColombia(selectedLiquidacion.fecha)}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setSelectedLiquidacion(null)}
                className="p-1.5 rounded-full text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Datos de Máquina y Operador */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-stone-50 dark:bg-stone-800/40 p-3.5 rounded-2xl border border-stone-100 dark:border-stone-800">
              <div>
                <span className="text-[10px] text-stone-400 block font-semibold">Máquina Serial:</span>
                <span className="font-bold text-stone-800 dark:text-stone-200">{selectedLiquidacion.maquinaSerial}</span>
              </div>
              <div>
                <span className="text-[10px] text-stone-400 block font-semibold">Ubicación:</span>
                <span className="font-bold text-stone-800 dark:text-stone-200">{selectedLiquidacion.ubicacion}</span>
              </div>
              <div>
                <span className="text-[10px] text-stone-400 block font-semibold">Operador de Ruta:</span>
                <span className="font-bold text-stone-800 dark:text-stone-200">{selectedLiquidacion.operadorNombre}</span>
              </div>
              <div>
                <span className="text-[10px] text-stone-400 block font-semibold">Método de Pago:</span>
                <span className="font-bold text-stone-800 dark:text-stone-200">{selectedLiquidacion.metodoPago}</span>
              </div>
              <div>
                <span className="text-[10px] text-stone-400 block font-semibold">Total Tazas:</span>
                <span className="font-black text-coffee-700 dark:text-amber-400">{selectedLiquidacion.totalTazas} tazas</span>
              </div>
              <div>
                <span className="text-[10px] text-stone-400 block font-semibold">Total Facturado:</span>
                <span className="font-black text-emerald-700 dark:text-emerald-400">{formatCOP(selectedLiquidacion.totalFacturado)}</span>
              </div>
            </div>

            {/* Desglose de Bebidas */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                <Coffee className="w-3.5 h-3.5 text-coffee-600 dark:text-amber-400" />
                Desglose de Bebidas y Contadores
              </h4>
              <div className="border border-stone-200 dark:border-stone-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 dark:bg-stone-800 text-[10px] uppercase font-bold text-stone-500">
                    <tr>
                      <th className="py-2 px-3">Bebida</th>
                      <th className="py-2 px-3 text-center">C. Anterior</th>
                      <th className="py-2 px-3 text-center">C. Actual</th>
                      <th className="py-2 px-3 text-center">Dañadas</th>
                      <th className="py-2 px-3 text-center">Netas</th>
                      <th className="py-2 px-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                    {selectedLiquidacion.detalles.map((d) => (
                      <tr key={d.id}>
                        <td className="py-2 px-3 font-semibold text-stone-800 dark:text-stone-200">
                          {nombreBebidasMap[d.bebida] || d.bebida}
                        </td>
                        <td className="py-2 px-3 text-center text-stone-500">{d.contadorAnterior}</td>
                        <td className="py-2 px-3 text-center font-mono font-bold text-stone-700 dark:text-stone-300">{d.contadorActual}</td>
                        <td className="py-2 px-3 text-center text-rose-500">{d.bebidasDanadas}</td>
                        <td className="py-2 px-3 text-center font-bold text-coffee-700 dark:text-amber-400">{d.tazasNetas}</td>
                        <td className="py-2 px-3 text-right font-black">{formatCOP(d.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Evidencias: Firma Táctil y Foto Contador */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {/* Firma Digital */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-stone-700 dark:text-stone-300 block">
                  Firma Digital del Cliente:
                </span>
                <div className="border border-stone-200 dark:border-stone-800 rounded-xl p-2 bg-stone-50 dark:bg-stone-950 flex items-center justify-center min-h-[110px]">
                  {selectedLiquidacion.firmaClienteUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selectedLiquidacion.firmaClienteUrl}
                      alt="Firma del Cliente"
                      className="max-h-24 object-contain filter dark:invert"
                    />
                  ) : (
                    <span className="text-[11px] text-stone-400">Sin firma registrada</span>
                  )}
                </div>
              </div>

              {/* Foto de Contador */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-stone-700 dark:text-stone-300 block">
                  Foto de Contador (Evidencia):
                </span>
                <div className="border border-stone-200 dark:border-stone-800 rounded-xl p-2 bg-stone-50 dark:bg-stone-950 flex items-center justify-center min-h-[110px]">
                  {selectedLiquidacion.fotoContadorUrl && selectedLiquidacion.fotoContadorUrl.length > 20 ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selectedLiquidacion.fotoContadorUrl}
                      alt="Foto de contador"
                      className="max-h-28 object-contain rounded-lg"
                    />
                  ) : (
                    <span className="text-[11px] text-stone-400">Foto no adjuntada (opcional)</span>
                  )}
                </div>
              </div>
            </div>

            {/* Botón de Descarga de Recibo PDF */}
            <div className="pt-2 flex justify-end gap-2">
              <a
                href={selectedLiquidacion.reciboPdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 px-4 bg-coffee-800 hover:bg-coffee-900 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Descargar Recibo Oficial (PDF)</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
