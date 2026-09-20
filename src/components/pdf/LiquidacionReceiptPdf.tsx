import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import { TipoBebidaEnum } from "@/types/liquidacion";

export interface DetallePdfItem {
  bebida: TipoBebidaEnum;
  nombreBebida: string;
  contadorAnterior: number;
  contadorActual: number;
  bebidasDanadas: number;
  tazasNetas: number;
  precioUnitario: number;
  subtotal: number;
}

export interface LiquidacionPdfData {
  consecutivo: number | string;
  fecha: string;
  cliente: {
    razonSocial: string;
    sede: string;
    direccion: string;
    contacto: string;
    whatsapp: string;
  };
  maquina: {
    codigoSerial: string;
    modelo: string;
    ubicacion: string;
  };
  operadorNombre: string;
  metodoPago: "EFECTIVO" | "TRANSFERENCIA";
  detalles: DetallePdfItem[];
  totales: {
    totalTazasNetas: number;
    totalFacturado: number;
  };
  firmaClienteUrl?: string; // Data URL o URL de Vercel Blob
  fotoContadorUrl?: string;
  notas?: string;
}

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#292524",
    backgroundColor: "#ffffff",
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderBottomWidth: 2,
    borderBottomColor: "#78350f",
    paddingBottom: 12,
    marginBottom: 14,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#78350f",
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: 8,
    color: "#78716c",
    marginTop: 2,
  },
  consecutivoBox: {
    alignItems: "flex-end",
  },
  consecutivoText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#991b1b",
  },
  dateText: {
    fontSize: 8,
    color: "#57534e",
    marginTop: 2,
  },
  sectionBox: {
    backgroundColor: "#f5f5f4",
    borderRadius: 4,
    padding: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#44403c",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  infoCol: {
    flex: 1,
  },
  label: {
    color: "#78716c",
    fontSize: 8,
  },
  value: {
    fontWeight: "bold",
    color: "#1c1917",
  },
  table: {
    width: "100%",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e7e5e4",
    borderRadius: 4,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#44403c",
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 8,
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f4",
    paddingVertical: 4,
    paddingHorizontal: 4,
    fontSize: 8,
  },
  tableRowAlt: {
    backgroundColor: "#fafaf9",
  },
  colBebida: { width: "26%" },
  colCF: { width: "12%", textAlign: "right" },
  colCA: { width: "12%", textAlign: "right" },
  colBD: { width: "10%", textAlign: "right" },
  colNetas: { width: "12%", textAlign: "right", fontWeight: "bold" },
  colUnit: { width: "13%", textAlign: "right" },
  colSubtotal: { width: "15%", textAlign: "right", fontWeight: "bold" },
  summaryContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
    marginBottom: 14,
  },
  paymentBox: {
    width: "48%",
    padding: 8,
    backgroundColor: "#fef3c7",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#fde68a",
  },
  totalsBox: {
    width: "48%",
    padding: 8,
    backgroundColor: "#f5f5f4",
    borderRadius: 4,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  totalRowFinal: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1.5,
    borderTopColor: "#78350f",
    paddingTop: 4,
    marginTop: 4,
  },
  signatureSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 15,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#e7e5e4",
  },
  signatureBox: {
    width: "48%",
    alignItems: "center",
  },
  signatureImage: {
    width: 140,
    height: 55,
    objectFit: "contain",
    marginBottom: 4,
  },
  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: "#44403c",
    width: "90%",
    paddingTop: 4,
    textAlign: "center",
    fontSize: 8,
    color: "#57534e",
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 30,
    right: 30,
    textAlign: "center",
    fontSize: 7,
    color: "#a8a29e",
    borderTopWidth: 1,
    borderTopColor: "#e7e5e4",
    paddingTop: 6,
  },
});

const formatMoney = (amount: number) => {
  return `$ ${amount.toLocaleString("es-CO", { maximumFractionDigits: 0 })}`;
};

export const LiquidacionReceiptPdf: React.FC<{ data: LiquidacionPdfData }> = ({ data }) => {
  const consecutivoFormatted = typeof data.consecutivo === "number"
    ? `LIQ-${data.consecutivo.toString().padStart(4, "0")}`
    : data.consecutivo;

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Encabezado */}
        <View style={styles.headerContainer}>
          <View>
            <Text style={styles.brandTitle}>VendyTrack</Text>
            <Text style={styles.brandSubtitle}>
              Soluciones de Café Vending Institucional | Comprobante Oficial de Visita
            </Text>
          </View>
          <View style={styles.consecutivoBox}>
            <Text style={styles.consecutivoText}>{consecutivoFormatted}</Text>
            <Text style={styles.dateText}>Fecha: {data.fecha}</Text>
          </View>
        </View>

        {/* Información de Cliente y Máquina */}
        <View style={styles.sectionBox}>
          <View style={styles.infoRow}>
            <View style={styles.infoCol}>
              <Text style={styles.label}>Cliente / Razón Social:</Text>
              <Text style={styles.value}>{data.cliente.razonSocial}</Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.label}>Sede / Ubicación Local:</Text>
              <Text style={styles.value}>{data.cliente.sede} - {data.maquina.ubicacion}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.infoCol}>
              <Text style={styles.label}>Dirección & Contacto:</Text>
              <Text style={styles.value}>{data.cliente.direccion} | Tel: {data.cliente.whatsapp}</Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.label}>Máquina (Serial & Modelo):</Text>
              <Text style={styles.value}>{data.maquina.codigoSerial} ({data.maquina.modelo})</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.infoCol}>
              <Text style={styles.label}>Operador de Ruta:</Text>
              <Text style={styles.value}>{data.operadorNombre}</Text>
            </View>
            <View style={styles.infoCol}>
              <Text style={styles.label}>Método de Pago:</Text>
              <Text style={styles.value}>{data.metodoPago}</Text>
            </View>
          </View>
        </View>

        {/* Tabla de Detalle de Bebidas y Contadores */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.colBebida}>Bebida</Text>
            <Text style={styles.colCF}>C. Anterior</Text>
            <Text style={styles.colCA}>C. Actual</Text>
            <Text style={styles.colBD}>Dañadas</Text>
            <Text style={styles.colNetas}>Tazas Netas</Text>
            <Text style={styles.colUnit}>Vr. Unit</Text>
            <Text style={styles.colSubtotal}>Subtotal</Text>
          </View>

          {data.detalles.map((d, index) => (
            <View
              key={d.bebida}
              style={[styles.tableRow, index % 2 === 1 ? styles.tableRowAlt : {}]}
            >
              <Text style={styles.colBebida}>{d.nombreBebida}</Text>
              <Text style={styles.colCF}>{d.contadorAnterior}</Text>
              <Text style={styles.colCA}>{d.contadorActual}</Text>
              <Text style={styles.colBD}>{d.bebidasDanadas}</Text>
              <Text style={styles.colNetas}>{d.tazasNetas}</Text>
              <Text style={styles.colUnit}>{formatMoney(d.precioUnitario)}</Text>
              <Text style={styles.colSubtotal}>{formatMoney(d.subtotal)}</Text>
            </View>
          ))}
        </View>

        {/* Resumen Financiero y Forma de Pago */}
        <View style={styles.summaryContainer}>
          <View style={styles.paymentBox}>
            <Text style={[styles.sectionTitle, { color: "#92400e" }]}>
              Condiciones de Pago
            </Text>
            <Text style={{ fontSize: 8, color: "#78350f", marginBottom: 3 }}>
              Forma de Cancelación: <Text style={{ fontWeight: "bold" }}>{data.metodoPago}</Text>
            </Text>
            {data.notas ? (
              <Text style={{ fontSize: 7, color: "#92400e", marginTop: 4 }}>
                Observaciones: {data.notas}
              </Text>
            ) : null}
          </View>

          <View style={styles.totalsBox}>
            <Text style={styles.sectionTitle}>Consolidado de Liquidación</Text>
            <View style={styles.totalRow}>
              <Text style={styles.label}>Total Tazas Netas:</Text>
              <Text style={styles.value}>{data.totales.totalTazasNetas}</Text>
            </View>
            <View style={styles.totalRowFinal}>
              <Text style={[styles.value, { fontSize: 10, color: "#78350f" }]}>
                TOTAL FACTURADO:
              </Text>
              <Text style={[styles.value, { fontSize: 10, color: "#78350f" }]}>
                {formatMoney(data.totales.totalFacturado)}
              </Text>
            </View>
          </View>
        </View>

        {/* Firmas de Conformidad */}
        <View style={styles.signatureSection}>
          <View style={styles.signatureBox}>
            <Text style={[styles.label, { marginBottom: 30 }]}>Firma del Operador de Ruta</Text>
            <View style={styles.signatureLine}>
              <Text>{data.operadorNombre}</Text>
              <Text style={{ fontSize: 6, color: "#78716c" }}>Operador VendyTrack</Text>
            </View>
          </View>

          <View style={styles.signatureBox}>
            {data.firmaClienteUrl ? (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image src={data.firmaClienteUrl} style={styles.signatureImage} />
            ) : (
              <View style={{ height: 55, justifyContent: "center" }}>
                <Text style={{ fontSize: 8, color: "#a8a29e" }}>Firma Digital en Campo</Text>
              </View>
            )}
            <View style={styles.signatureLine}>
              <Text>Firma de Recibido a Conformidad</Text>
              <Text style={{ fontSize: 6, color: "#78716c" }}>{data.cliente.contacto}</Text>
            </View>
          </View>
        </View>

        {/* Pie de página legal */}
        <Text style={styles.footer}>
          Documento digital generado automáticamente por VendyTrack PWA en Vercel. Este comprobante valida el conteo de bebidas servidas según los contadores mecánicos/digitales verificados en sitio.
        </Text>
      </Page>
    </Document>
  );
};
