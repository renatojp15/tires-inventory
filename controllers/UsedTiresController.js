const {PrismaClient} = require('@prisma/client');
const prisma = new PrismaClient();
const ExcelJS = require('exceljs');
const alertsController = require('../controllers/AlertsController');

const usedTiresController = {
    UsedTiresForm: async (req, res) => {
        try {
            const brands = await prisma.brand.findMany();
            const types = await prisma.tireType.findMany();
            const locations = await prisma.location.findMany();

            res.render('usedTires/UsedTiresForm', {
            brands,
            types,
            locations
            });
        } catch (error) {
            console.error('ERROR AL CARGAR EL FORMULARIO: ', error);
            res.status(500).send('ERROR AL CARGAR EL FORMULARIO');
        }
},
    createUsedTires: async (req, res) => {
  try {
    const {
      brand,        // ID de la marca (entero)
      size,         // Tamaño o referencia (string)
      type,         // ID del tipo de llanta (entero)
      weight,       // Peso individual (float)
      quantity,     // Cantidad en inventario (int)
      priceUnit,    // Precio unitario (float)
      priceWholesale,
      priceRetail,
      location,     // ID de la ubicación (entero)
      minStock = 5  // Valor opcional (por defecto 5)
    } = req.body;

    // Conversión segura
    const data = {
      brandId:        parseInt(brand),
      typeId:         parseInt(type),
      locationId:     parseInt(location),
      size:           size.trim(),
      weight:         parseFloat(weight),
      quantity:       parseInt(quantity),
      minStock:       parseInt(minStock),
      priceUnit:      parseFloat(priceUnit),
      priceWholesale: parseFloat(priceWholesale),
      priceRetail:    parseFloat(priceRetail)
    };

    // Validar que no haya NaN
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'number' && isNaN(value)) {
        return res.status(400).send(`Valor inválido para: ${key}`);
      }
    }

    // Crear llanta usada
    const usedTire = await prisma.usedTire.create({ data });

    // Verificar alerta de stock bajo
    await alertsController.createAlertIfNeeded('used', usedTire);

    res.redirect('/usedtires/list');
  } catch (error) {
    console.error('❌ ERROR AL REGISTRAR LLANTA USADA:', error);
    res.status(500).send('ERROR INTERNO DEL SERVIDOR');
  }
},
    usedTiresList: async (req, res) => {
    try {
      const search = (req.query.search || '').trim().toLowerCase();
      const page = parseInt(req.query.page) || 1;
      const limit = 15;
      const skip = (page - 1) * limit;

      // Filtro dinámico
      const where = search
        ? {
            OR: [
              { size: { contains: search, mode: 'insensitive' } },                 // referencia/tamaño
              { brand: { name: { contains: search, mode: 'insensitive' } } },     // marca
              { type:  { name: { contains: search, mode: 'insensitive' } } },     // tipo
            ],
          }
        : {};

        // 🔢 Total para calcular páginas
      const totalItems = await prisma.usedTire.count({ where });

      const tires = await prisma.usedTire.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          brand: true,
          type: true,
          location: true,
        }
      });

      // 🔔 Alertas activas
      const alerts = await prisma.stockAlert.findMany({
        where: { resolved: false },
        orderBy: { createdAt: 'desc' }
      });

      // Agrupamiento por fecha
      const tiresGrouped = {};
      tires.forEach(tire => {
        const dateKey = new Date(tire.createdAt).toLocaleDateString("es-PA");
        (tiresGrouped[dateKey] ??= []).push(tire);
      });

      const totalPages = Math.ceil(totalItems / limit);

      res.render('usedTires/UsedTiresList', {
        tiresGrouped,
        search,
        currentPage: page,
        totalPages,
        alertSound: true
      });
    } catch (error) {
      console.error('❌ ERROR AL OBTENER LAS LLANTAS USADAS:', error);
      res.status(500).send('ERROR AL CARGAR LAS LLANTAS USADAS');
    }
},
    editUsedTiresForm: async(req, res) => {
        const { id } = req.params;
        try {
            const tire = await prisma.usedTire.findUnique({
            where: { id: parseInt(id) },
            include: {
                brand: true,
                type: true,
                location: true,
            }
            });

            const brands = await prisma.brand.findMany();
            const types = await prisma.tireType.findMany();
            const locations = await prisma.location.findMany();

            res.render('usedTires/EditUsedTiresForm', {
            tire,
            brands,
            types,
            locations
            });

        } catch (error) {
            console.error('ERROR AL CARGAR EL FORMULARIO DE EDICIÓN:', error);
            res.status(500).send('ERROR AL CARGAR EL FORMULARIO DE EDICIÓN');
        }
    },
    updateUsedTires: async (req, res) => {
      const { id } = req.params;
      const {
        brand, // id
        size,
        type,  // id
        quantity,
        weight,
        priceUnit,
        priceWholesale,
        priceRetail,
        location, // id
        minStock
      } = req.body;

      try {
        // 1. Actualiza la llanta
        const updated = await prisma.usedTire.update({
          where: { id: parseInt(id) },
          data: {
            brandId: parseInt(brand),
            typeId: parseInt(type),
            locationId: parseInt(location),
            size,
            weight: parseFloat(weight),
            quantity: parseInt(quantity),
            priceUnit: parseFloat(priceUnit),
            priceWholesale: parseFloat(priceWholesale),
            priceRetail: parseFloat(priceRetail),
            ...(minStock ? { minStock: parseInt(minStock) } : {})
          },
        });

        // Verificar alerta de stock bajo
    await alertsController.createAlertIfNeeded('used', updated);

    res.redirect('/usedtires/list');
  } catch (error) {
    console.error('❌ ERROR AL ACTUALIZAR LA LLANTA:', error);
    res.status(500).send('ERROR AL ACTUALIZAR LA LLANTA');
  }
},
    deleteUsedTires: async (req, res) => {
  try {
    const { id } = req.params;
    const tireId = parseInt(id);

    // 1. Eliminar alerta de stock asociada (si existe)
    await prisma.stockAlert.deleteMany({
      where: {
        usedTireId: tireId
      },
    });

    // 2. Eliminar la llanta
    await prisma.usedTire.delete({
      where: { id: tireId },
    });

    res.redirect('/usedtires/list');
  } catch (error) {
    console.error('ERROR AL ELIMINAR LA LLANTA:', error);
    res.status(500).send('ERROR AL ELIMINAR LA LLANTA');
  }
},
    exportExcel: async(req, res) => {
            try {
                /* 1 - Parsear y validar fechas */
                const from = new Date(req.query.from);
                const to = new Date(req.query.to);
            
                if (isNaN(from) || isNaN(to) || from > to) {
                  return res.status(400).send('❌ Fechas inválidas');
                }
            
                const diffDays = Math.floor((to - from) / (1000 * 60 * 60 * 24));
                const isAdmin = req.session.user?.role === 'admin';
                const MAX_DAYS = isAdmin ? 90 : 30;
            
                if (diffDays > MAX_DAYS) {
                  return res
                    .status(400)
                    .send(`❌ El rango no puede exceder ${MAX_DAYS} días.`);
                }
            
                /* 2 - Consultar inventario incluyendo relaciones */
                const tires = await prisma.usedTire.findMany({
                  where: {
                    createdAt: {
                      gte: from,
                      lte: to
                    }
                  },
                  include: {
                    brand: true,
                    type: true,
                    location: true
                  },
                  orderBy: { createdAt: 'asc' }
                });
            
                /* 3 - Generar archivo Excel */
                const wb = new ExcelJS.Workbook();
                const ws = wb.addWorksheet('Inventario');
            
                ws.addRow([
                  'Fecha',
                  'Marca',
                  'Referencia',
                  'Tipo',
                  'Peso (kg)',
                  'Cantidad',
                  'P. Unitario (USD)',
                  'P. Mayorista (USD)',
                  'P. Detal (USD)',
                  'Ubicación'
                ]);
            
                tires.forEach(t => {
                  ws.addRow([
                    t.createdAt.toISOString().split('T')[0],
                    t.brand.name,
                    t.size,
                    t.type.name,
                    t.weight,
                    t.quantity,
                    t.priceUnit,
                    t.priceWholesale,
                    t.priceRetail,
                    t.location.name
                  ]);
                });
            
                /* 4 - Enviar archivo al cliente */
                res.setHeader(
                  'Content-Disposition',
                  `attachment; filename="inventario_llantas_usadas${req.query.from}_${req.query.to}.xlsx"`
                );
                res.setHeader(
                  'Content-Type',
                  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                );
            
                await wb.xlsx.write(res);
                res.end();
            
              } catch (err) {
                console.error('💥 ERROR exportando inventario:', err);
                res.status(500).send('Error al exportar inventario');
              }
        },
};

module.exports = usedTiresController;