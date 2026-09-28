require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando migración Fase 1...');
  // 1. Bodega principal
  const bodegaP = await prisma.bodega.create({ data: { nombre: 'Bodega Principal', tipo: 'PRINCIPAL' }});
  
  // 2. Bodegas de máquinas
  const maquinas = await prisma.maquina.findMany();
  for(const m of maquinas) {
    await prisma.bodega.create({ data: { nombre: 'Máquina ' + m.codigoSerial, tipo: 'MAQUINA', maquinaId: m.id }});
  }
  
  // 3. Lotes y existencias
  const insumos = await prisma.insumo.findMany();
  for(const ins of insumos) {
    const lote = await prisma.lote.create({
      data: {
        numeroLote: 'LOTE-MIGRACION-2026',
        fechaVencimiento: new Date(Date.now() + 365*24*60*60*1000),
        insumoId: ins.id
      }
    });
    if(ins.stockActual > 0) {
      await prisma.existencia.create({
        data: {
          bodegaId: bodegaP.id,
          loteId: lote.id,
          insumoId: ins.id,
          cantidad: Number(ins.stockActual)
        }
      });
    }
  }
  console.log('Migración completada con éxito.');
}
main().catch(console.error).finally(()=>prisma.$disconnect());
