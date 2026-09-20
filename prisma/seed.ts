import { PrismaClient, Rol, TipoBebida, UnidadMedida } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando Seed para VendyTrack...");

  // 1. Crear Insumos del Catálogo
  const insumoCafe = await prisma.insumo.upsert({
    where: { codigo: "INS-CAFE-SOLUBLE" },
    update: {},
    create: {
      codigo: "INS-CAFE-SOLUBLE",
      nombre: "Café Soluble Liofilizado (kg)",
      unidadMedida: UnidadMedida.KG,
      stockActual: 50.0,
      stockMinimo: 10.0,
      costoPromedio: 42000,
    },
  });

  const insumoLeche = await prisma.insumo.upsert({
    where: { codigo: "INS-LECHE-POLVO" },
    update: {},
    create: {
      codigo: "INS-LECHE-POLVO",
      nombre: "Leche en Polvo Vending (kg)",
      unidadMedida: UnidadMedida.KG,
      stockActual: 80.0,
      stockMinimo: 15.0,
      costoPromedio: 28000,
    },
  });

  const insumoCocoa = await prisma.insumo.upsert({
    where: { codigo: "INS-COCOA" },
    update: {},
    create: {
      codigo: "INS-COCOA",
      nombre: "Cocoa Chocolatada Vending (kg)",
      unidadMedida: UnidadMedida.KG,
      stockActual: 40.0,
      stockMinimo: 8.0,
      costoPromedio: 24000,
    },
  });

  const insumoVasos = await prisma.insumo.upsert({
    where: { codigo: "INS-VASOS-7OZ" },
    update: {},
    create: {
      codigo: "INS-VASOS-7OZ",
      nombre: "Vasos Térmicos 7oz (unidades)",
      unidadMedida: UnidadMedida.UNIDADES,
      stockActual: 5000,
      stockMinimo: 1000,
      costoPromedio: 120,
    },
  });

  const insumoMezcladores = await prisma.insumo.upsert({
    where: { codigo: "INS-MEZCLADORES" },
    update: {},
    create: {
      codigo: "INS-MEZCLADORES",
      nombre: "Mezcladores de Café (unidades)",
      unidadMedida: UnidadMedida.UNIDADES,
      stockActual: 5000,
      stockMinimo: 1000,
      costoPromedio: 30,
    },
  });

  // 2. Configurar Recetas de Insumos por Bebida (descuento teórico)
  const recetasConfig = [
    // Capuchino Vainilla: 1.8g café, 12g leche, 1 vaso, 1 mezclador
    { bebida: TipoBebida.CAPUCHINO_VAINILLA, insumoId: insumoCafe.id, cantidad: 0.0018 },
    { bebida: TipoBebida.CAPUCHINO_VAINILLA, insumoId: insumoLeche.id, cantidad: 0.012 },
    { bebida: TipoBebida.CAPUCHINO_VAINILLA, insumoId: insumoVasos.id, cantidad: 1 },
    { bebida: TipoBebida.CAPUCHINO_VAINILLA, insumoId: insumoMezcladores.id, cantidad: 1 },

    // Capuchino Tradicional: 2g café, 12g leche, 1 vaso, 1 mezclador
    { bebida: TipoBebida.CAPUCHINO_TRADICIONAL, insumoId: insumoCafe.id, cantidad: 0.002 },
    { bebida: TipoBebida.CAPUCHINO_TRADICIONAL, insumoId: insumoLeche.id, cantidad: 0.012 },
    { bebida: TipoBebida.CAPUCHINO_TRADICIONAL, insumoId: insumoVasos.id, cantidad: 1 },
    { bebida: TipoBebida.CAPUCHINO_TRADICIONAL, insumoId: insumoMezcladores.id, cantidad: 1 },

    // Mocaccino: 1.8g café, 8g leche, 10g cocoa, 1 vaso, 1 mezclador
    { bebida: TipoBebida.MOCACCINO, insumoId: insumoCafe.id, cantidad: 0.0018 },
    { bebida: TipoBebida.MOCACCINO, insumoId: insumoLeche.id, cantidad: 0.008 },
    { bebida: TipoBebida.MOCACCINO, insumoId: insumoCocoa.id, cantidad: 0.01 },
    { bebida: TipoBebida.MOCACCINO, insumoId: insumoVasos.id, cantidad: 1 },
    { bebida: TipoBebida.MOCACCINO, insumoId: insumoMezcladores.id, cantidad: 1 },

    // Café Corto / Expreso: 2g café, 1 vaso, 1 mezclador
    { bebida: TipoBebida.CAFE_CORTO_EXPRESO, insumoId: insumoCafe.id, cantidad: 0.002 },
    { bebida: TipoBebida.CAFE_CORTO_EXPRESO, insumoId: insumoVasos.id, cantidad: 1 },
    { bebida: TipoBebida.CAFE_CORTO_EXPRESO, insumoId: insumoMezcladores.id, cantidad: 1 },

    // Café Largo / Tinto: 2.2g café, 1 vaso, 1 mezclador
    { bebida: TipoBebida.CAFE_LARGO_TINTO, insumoId: insumoCafe.id, cantidad: 0.0022 },
    { bebida: TipoBebida.CAFE_LARGO_TINTO, insumoId: insumoVasos.id, cantidad: 1 },
    { bebida: TipoBebida.CAFE_LARGO_TINTO, insumoId: insumoMezcladores.id, cantidad: 1 },

    // Latte: 1.5g café, 15g leche, 1 vaso, 1 mezclador
    { bebida: TipoBebida.LATTE, insumoId: insumoCafe.id, cantidad: 0.0015 },
    { bebida: TipoBebida.LATTE, insumoId: insumoLeche.id, cantidad: 0.015 },
    { bebida: TipoBebida.LATTE, insumoId: insumoVasos.id, cantidad: 1 },
    { bebida: TipoBebida.LATTE, insumoId: insumoMezcladores.id, cantidad: 1 },

    // Chocolate / Chocomilk: 16g cocoa, 6g leche, 1 vaso, 1 mezclador
    { bebida: TipoBebida.CHOCOLATE_CHOCOMILK, insumoId: insumoCocoa.id, cantidad: 0.016 },
    { bebida: TipoBebida.CHOCOLATE_CHOCOMILK, insumoId: insumoLeche.id, cantidad: 0.006 },
    { bebida: TipoBebida.CHOCOLATE_CHOCOMILK, insumoId: insumoVasos.id, cantidad: 1 },
    { bebida: TipoBebida.CHOCOLATE_CHOCOMILK, insumoId: insumoMezcladores.id, cantidad: 1 },
  ];

  for (const r of recetasConfig) {
    await prisma.recetaInsumo.upsert({
      where: {
        bebida_insumoId: {
          bebida: r.bebida,
          insumoId: r.insumoId,
        },
      },
      update: { cantidadPorTaza: r.cantidad },
      create: {
        bebida: r.bebida,
        insumoId: r.insumoId,
        cantidadPorTaza: r.cantidad,
      },
    });
  }

  // 3. Crear Cliente de Demostración
  const cliente = await prisma.cliente.upsert({
    where: { id: "cli-demo-01" },
    update: {},
    create: {
      id: "cli-demo-01",
      razonSocial: "Hospital Universitario San José",
      sede: "Sede Centro",
      direccion: "Calle 10 # 5-22",
      contacto: "Dra. Claudia Pérez",
      whatsapp: "+573005559876",
    },
  });

  // 4. Crear Máquina
  const maquina = await prisma.maquina.upsert({
    where: { codigoSerial: "MAQ-COL-2024-089" },
    update: {},
    create: {
      id: "maq-demo-01",
      codigoSerial: "MAQ-COL-2024-089",
      ubicacion: "Cafetería Principal Piso 2",
      modelo: "Bianchi Soluble 4 Tolvas",
      numeroProductos: 4,
      clienteId: cliente.id,
    },
  });

  // 5. Configurar Calibración de Gramajes y Bebidas Activas
  const calibraciones = [
    { bebida: TipoBebida.CAFE_LARGO_TINTO, cafe: 2.2, leche: 0, cocoa: 0, precio: 1800, activa: true },
    { bebida: TipoBebida.CAFE_CORTO_EXPRESO, cafe: 2.0, leche: 0, cocoa: 0, precio: 1800, activa: true },
    { bebida: TipoBebida.CAPUCHINO_TRADICIONAL, cafe: 2.0, leche: 12.0, cocoa: 0, precio: 2500, activa: true },
    { bebida: TipoBebida.CHOCOLATE_CHOCOMILK, cafe: 0, leche: 6.0, cocoa: 16.0, precio: 2400, activa: true },
    { bebida: TipoBebida.CAPUCHINO_VAINILLA, cafe: 1.8, leche: 12.0, cocoa: 0, precio: 2500, activa: false },
    { bebida: TipoBebida.MOCACCINO, cafe: 1.8, leche: 8.0, cocoa: 10.0, precio: 2800, activa: false },
    { bebida: TipoBebida.LATTE, cafe: 1.5, leche: 15.0, cocoa: 0, precio: 2600, activa: false },
  ];

  for (const c of calibraciones) {
    await prisma.configBebidaMaquina.upsert({
      where: {
        maquinaId_bebida: {
          maquinaId: maquina.id,
          bebida: c.bebida,
        },
      },
      update: {
        activa: c.activa,
        gramosCafe: c.cafe,
        gramosLeche: c.leche,
        gramosCocoa: c.cocoa,
        precio: c.precio,
      },
      create: {
        maquinaId: maquina.id,
        bebida: c.bebida,
        activa: c.activa,
        gramosCafe: c.cafe,
        gramosLeche: c.leche,
        gramosCocoa: c.cocoa,
        precio: c.precio,
      },
    });
  }

  // 6. Configurar Precios Personalizados para esta Máquina (compatibilidad)
  const preciosPersonalizados = [
    { bebida: TipoBebida.CAPUCHINO_VAINILLA, precio: 2500 },
    { bebida: TipoBebida.CAPUCHINO_TRADICIONAL, precio: 2500 },
    { bebida: TipoBebida.MOCACCINO, precio: 2800 },
    { bebida: TipoBebida.CAFE_CORTO_EXPRESO, precio: 1800 },
    { bebida: TipoBebida.CAFE_LARGO_TINTO, precio: 1800 },
    { bebida: TipoBebida.LATTE, precio: 2600 },
    { bebida: TipoBebida.CHOCOLATE_CHOCOMILK, precio: 2400 },
  ];

  for (const p of preciosPersonalizados) {
    await prisma.precioMaquina.upsert({
      where: {
        maquinaId_bebida: {
          maquinaId: maquina.id,
          bebida: p.bebida,
        },
      },
      update: { precioUnitario: p.precio },
      create: {
        maquinaId: maquina.id,
        bebida: p.bebida,
        precioUnitario: p.precio,
      },
    });
  }

  // 6. Crear Usuario Operador de Ruta
  await prisma.user.upsert({
    where: { email: "carlos.operador@vendytrack.com" },
    update: {},
    create: {
      id: "operador-default-1",
      name: "Carlos Mendoza",
      email: "carlos.operador@vendytrack.com",
      passwordHash: "hash_demo_12345",
      rol: Rol.OPERADOR_RUTA,
    },
  });

  console.log("Seed completado exitosamente con clientes, máquina, precios e insumos.");
}

main()
  .catch((e) => {
    console.error("Error en seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
