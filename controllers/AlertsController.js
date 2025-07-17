const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const alertsController = {
  listAlerts: async (req, res) => {
    try {
      const alerts = await prisma.stockAlert.findMany({
        where: { resolved: false },
        orderBy: { createdAt: 'desc' },
        include: {
          newTire: {
            include: {
              brand: true,
              type: true,
              location: true
            }
          },
          usedTire: {
            include: {
              brand: true,
              type: true,
              location: true
            }
          }
        }
      });

      res.render('alerts/list', { alerts });
    } catch (error) {
      console.error('❌ ERROR AL LISTAR ALERTAS:', error);
      res.status(500).send('Error al cargar alertas.');
    }
  },

  // 🔁 NUEVO MÉTODO para crear alerta de forma reutilizable
  createAlertIfNeeded: async (tireType, tire) => {
  if (!tire) return;

  const isStockLow = tire.quantity <= tire.minStock;

  try {
    const where = tireType === 'new'
      ? { newTireId: tire.id, resolved: false }
      : { usedTireId: tire.id, resolved: false };

    const existingAlert = await prisma.stockAlert.findFirst({ where });

    if (isStockLow) {
      // 🔔 Crear o actualizar alerta
      if (existingAlert) {
        await prisma.stockAlert.update({
          where: { id: existingAlert.id },
          data: { quantity: tire.quantity }
        });
      } else {
        await prisma.stockAlert.create({
          data: {
            tireType,
            quantity: tire.quantity,
            ...(tireType === 'new'
              ? { newTireId: tire.id }
              : { usedTireId: tire.id })
          }
        });
      }
    } else if (existingAlert) {
      // ✅ Stock se recuperó → marcar como resuelta
      await prisma.stockAlert.update({
        where: { id: existingAlert.id },
        data: { resolved: true }
      });
    }
  } catch (error) {
    console.error(`⚠️ ERROR manejando alerta para llanta ${tire.id} (${tireType})`, error);
  }
}
};

module.exports = alertsController;