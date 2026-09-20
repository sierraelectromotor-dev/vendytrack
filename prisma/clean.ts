import { PrismaClient, Rol } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url:
        process.env.DATABASE_URL ||
        "postgres://ee3750b8c07a9ab7c0addeea65cd693a382d9891df5328fc1ddbbe53c04c34f2:sk_fC9Rh9E0qqKvmcJdIKdMV@db.prisma.io:5432/postgres?sslmode=require",
    },
  },
});

async function main() {
  console.log("Iniciando limpieza total de datos de prueba...");

  // 1. Borrar detalles y liquidaciones
  const delDetalles = await prisma.detalleLiquidacion.deleteMany();
  console.log(`Detalles de liquidación eliminados: ${delDetalles.count}`);

  const delLiq = await prisma.liquidacion.deleteMany();
  console.log(`Liquidaciones eliminadas: ${delLiq.count}`);

  // 2. Borrar movimientos de inventario y recetas
  const delMov = await prisma.movimientoInventario.deleteMany();
  console.log(`Movimientos inventario eliminados: ${delMov.count}`);

  const delRecetas = await prisma.recetaInsumo.deleteMany();
  console.log(`Recetas eliminadas: ${delRecetas.count}`);

  // 3. Borrar insumos de bodega
  const delInsumos = await prisma.insumo.deleteMany();
  console.log(`Insumos eliminados: ${delInsumos.count}`);

  // 4. Borrar configuraciones y precios de máquinas
  const delConfig = await prisma.configBebidaMaquina.deleteMany();
  console.log(`Configuraciones de bebidas eliminadas: ${delConfig.count}`);

  const delPrecios = await prisma.precioMaquina.deleteMany();
  console.log(`Precios de máquinas eliminados: ${delPrecios.count}`);

  // 5. Borrar máquinas
  const delMaq = await prisma.maquina.deleteMany();
  console.log(`Máquinas eliminadas: ${delMaq.count}`);

  // 6. Borrar rutas
  const delRutas = await prisma.ruta.deleteMany();
  console.log(`Rutas eliminadas: ${delRutas.count}`);

  // 7. Borrar clientes
  const delClientes = await prisma.cliente.deleteMany();
  console.log(`Clientes eliminados: ${delClientes.count}`);

  // 8. Borrar todos los usuarios excepto el admin principal
  const delUsers = await prisma.user.deleteMany({
    where: {
      email: { not: "admin@vendytrack.com" },
    },
  });
  console.log(`Usuarios de prueba eliminados: ${delUsers.count}`);

  // 9. Asegurar que existe el único Administrador
  const admin = await prisma.user.upsert({
    where: { email: "admin@vendytrack.com" },
    update: {
      name: "Administrador General",
      passwordHash: "admin123",
      rol: Rol.ADMIN,
    },
    create: {
      name: "Administrador General",
      email: "admin@vendytrack.com",
      passwordHash: "admin123",
      rol: Rol.ADMIN,
    },
  });
  console.log(`Administrador único configurado: ${admin.email} (${admin.name})`);

  console.log("Limpieza completada exitosamente. El sistema está en ceros con un único administrador.");
}

main()
  .catch((e) => {
    console.error("Error en limpieza:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
