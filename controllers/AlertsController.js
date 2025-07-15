const {PrismaClient} = require('@prisma/client');
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
        },
      },
    });

    res.render('alerts/list', { alerts });
  } catch (error) {
    console.error('❌ ERROR AL LISTAR ALERTAS:', error);
    res.status(500).send('Error al cargar alertas.');
  }
}
};

module.exports = alertsController;