import { z } from "zod";

export const BEBIDAS_CATALOGO = [
  { id: "CAPUCHINO_VAINILLA", nombre: "Capuchino Vainilla", icono: "☕✨" },
  { id: "CAPUCHINO_TRADICIONAL", nombre: "Capuchino Tradicional", icono: "☕🥛" },
  { id: "MOCACCINO", nombre: "Mocaccino", icono: "🍫☕" },
  { id: "CAFE_CORTO_EXPRESO", nombre: "Café Corto / Expreso", icono: "☕" },
  { id: "CAFE_LARGO_TINTO", nombre: "Café Largo / Tinto", icono: "☕💧" },
  { id: "LATTE", nombre: "Latte", icono: "🥛☕" },
  { id: "CHOCOLATE_CHOCOMILK", nombre: "Chocolate / Chocomilk", icono: "🍫🥛" },
] as const;

export type TipoBebidaEnum = typeof BEBIDAS_CATALOGO[number]["id"];

export const detalleBebidaSchema = z.object({
  bebida: z.enum([
    "CAPUCHINO_VAINILLA",
    "CAPUCHINO_TRADICIONAL",
    "MOCACCINO",
    "CAFE_CORTO_EXPRESO",
    "CAFE_LARGO_TINTO",
    "LATTE",
    "CHOCOLATE_CHOCOMILK",
  ]),
  contadorAnterior: z.number().int().min(0, "Debe ser mayor o igual a 0"),
  contadorActual: z.number().int().min(0, "Debe ser mayor o igual a 0"),
  bebidasDanadas: z.number().int().min(0, "Debe ser mayor o igual a 0").default(0),
  precioUnitario: z.number().min(0, "El precio unitario no puede ser negativo"),
}).refine(
  (data) => data.contadorActual >= data.contadorAnterior,
  {
    message: "El contador actual no puede ser menor al contador anterior",
    path: ["contadorActual"],
  }
).refine(
  (data) => {
    const subtotal = data.contadorActual - data.contadorAnterior;
    return data.bebidasDanadas <= subtotal;
  },
  {
    message: "Las bebidas dañadas no pueden superar las tazas despachadas",
    path: ["bebidasDanadas"],
  }
);

export const liquidacionFormSchema = z.object({
  clienteId: z.string().min(1, "Debe seleccionar un cliente"),
  maquinaId: z.string().min(1, "Debe seleccionar una máquina"),
  metodoPago: z.enum(["EFECTIVO", "TRANSFERENCIA"], {
    required_error: "Debe seleccionar el método de pago",
  }),
  detalles: z.array(detalleBebidaSchema).min(1, "Debe registrar al menos una bebida"),
  fotoContadorBase64: z.string().min(10, "Debe capturar la foto de los contadores"),
  firmaClienteBase64: z.string().min(10, "La firma del encargado es obligatoria"),
  notas: z.string().optional(),
});

export type DetalleBebidaForm = z.infer<typeof detalleBebidaSchema>;
export type LiquidacionFormData = z.infer<typeof liquidacionFormSchema>;

export interface CalculosBebida {
  subtotalContador: number; // C.A - C.F
  tazasNetas: number;       // (C.A - C.F) - B.D
  valorLinea: number;       // Tazas Netas * Precio Unitario
}

export interface ResumenLiquidacion {
  totalTazasNetas: number;
  totalFacturado: number;
}
