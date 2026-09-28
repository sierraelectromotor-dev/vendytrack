require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      resolve(`${salt}:${derivedKey.toString("hex")}`);
    });
  });
}

async function main() {
  console.log('Iniciando seed de SUPERADMIN y Empresa Matrix...');
  
  // 1. Crear Empresa
  const empresa = await prisma.empresa.create({
    data: {
      nombre: 'VendyTrack (Matriz)',
      nit: '900123456-7',
    }
  });
  console.log('Empresa creada:', empresa.id);

  // 2. Crear Superadmin
  const passwordHash = await hashPassword('123456');
  
  const superadmin = await prisma.user.create({
    data: {
      name: 'Super Administrador',
      email: 'admin@vendytrack.com',
      passwordHash: passwordHash,
      rol: 'SUPERADMIN',
      empresaId: empresa.id
    }
  });
  console.log('Superadmin creado:', superadmin.email);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(() => {
  prisma.$disconnect();
});
