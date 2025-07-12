const {PrismaClient} = require('@prisma/client');
const prisma = new PrismaClient();
const ExcelJS = require('exceljs');

const newTiresController = {
    newTiresForm: async (req, res) => {
        try {
            const brands = await prisma.brand.findMany();
            const types = await prisma.tireType.findMany();
            const locations = await prisma.location.findMany();

            res.render('newTires/NewTiresForm', {
            brands,
            types,
            locations
            });
        } catch (error) {
            console.error('ERROR AL CARGAR EL FORMULARIO: ', error);
            res.status(500).send('ERROR AL CARGAR EL FORMULARIO');
        }
},
    createNewTires: async (req, res) => {
        try {
            const {
            brand, size, type, weight,
            quantity, priceUnit, priceWholesale,
            priceRetail, location, minStock = 5    // permite setear el mínimo
            } = req.body;

            // 1. Crear la llanta
            const newTire = await prisma.newTire.create({
            data: {
                brand,
                size,
                type,
                weight: parseFloat(weight),
                quantity: parseInt(quantity),
                minStock: parseInt(minStock),
                priceUnit: parseFloat(priceUnit),
                priceWholesale: parseFloat(priceWholesale),
                priceRetail: parseFloat(priceRetail),
                location,
            },
            });

            // 2. Verificar si quedó en stock bajo
            if (newTire.quantity <= newTire.minStock) {
            await prisma.stockAlert.upsert({
                where: {
                tireType_tireId: { tireType: 'new', tireId: newTire.id },
                },
                update: { quantity: newTire.quantity, resolved: false },
                create: {
                tireType: 'new',
                tireId: newTire.id,
                quantity: newTire.quantity,
                },
            });
            }
            res.redirect('/newtires/list'); //Redirigiendo a la lista de llantas nuevas registradas
        } catch (error) {
            console.error('ERROR AL REGISTRAR LLANTA NUEVA:', error);
            res.status(500).send('ERROR INTERNO DEL SERVIDOR');
        }
        },
   newTiresList: async (req, res) => {
  try {
    const { search } = req.query;

    const tires = await prisma.newTire.findMany({
      where: search
        ? {
            OR: [
              { brand: { contains: search, mode: 'insensitive' } },
              { size: { contains: search, mode: 'insensitive' } },
              { type: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {},
      orderBy: { createdAt: 'desc' },
    });

    // Agrupar por fecha
    const tiresGrouped = {};
    tires.forEach(tire => {
      const dateKey = new Date(tire.createdAt).toLocaleDateString("es-PA");
      if (!tiresGrouped[dateKey]) {
        tiresGrouped[dateKey] = [];
      }
      tiresGrouped[dateKey].push(tire);
    });

    res.render('newTires/NewTiresList', { tiresGrouped, search });
  } catch (error) {
    console.error('ERROR AL OBTENER LAS LLANTAS NUEVAS: ', error);
    res.status(500).send('ERROR AL CARGAR LAS LLANTAS NUEVAS');
  }
},
    editNewTiresForm: async(req, res) => {
        const { id } = req.params;
        try{
            const tire = await prisma.newTire.findUnique({
                where: { id: parseInt(id) },
            });
            res.render('newTires/EditNewTiresForm', {tire});
        }
        catch(error){
            console.error('ERROR AL CARGAR EL FORMULARIO DE EDICIÓN:', error);
            res.status(500).send('ERROR AL CARGAR EL FORMULARIO DE EDICIÓN');
        }
    },
    updateNewTires: async (req, res) => {
    const { id } = req.params;
    const {
        brand, size, type, quantity, weight,
        priceUnit, priceWholesale, priceRetail,
        location, minStock  // ← incluye si quieres permitir editarlo
    } = req.body;

    try {
        // 1. Actualiza la llanta y guarda el resultado
        const updated = await prisma.newTire.update({
        where: { id: parseInt(id) },
        data: {
            brand,
            size,
            type,
            weight: parseFloat(weight),
            quantity: parseInt(quantity),
            priceUnit: parseFloat(priceUnit),
            priceWholesale: parseFloat(priceWholesale),
            priceRetail: parseFloat(priceRetail),
            location,
            ...(minStock ? { minStock: parseInt(minStock) } : {}) // opcional
        },
        });

        // 2. Verifica stock bajo y maneja alertas
        if (updated.quantity <= updated.minStock) {
        // Crear o reactivar alerta
        await prisma.stockAlert.upsert({
            where: {
            tireType_tireId: { tireType: 'new', tireId: updated.id },
            },
            update: { quantity: updated.quantity, resolved: false },
            create: {
            tireType: 'new',
            tireId: updated.id,
            quantity: updated.quantity,
            },
        });
        } else {
        // Marcar alerta como resuelta (si la hubiera)
        await prisma.stockAlert.updateMany({
            where: {
            tireType: 'new',
            tireId: updated.id,
            resolved: false,
            },
            data: { resolved: true },
        });
        }

        res.redirect('/newtires/list');
    } catch (error) {
        console.error('ERROR AL ACTUALIZAR LA LLANTA:', error);
        res.status(500).send('ERROR AL ACTUALIZAR LA LLANTA');
    }
},
    deleteNewTires: async(req, res) => {
        try {
            const { id } = req.params;
            await prisma.newTire.delete({ where: { id: Number(id) } });
            res.redirect('/newtires/list');
        } 
        catch(error){
            console.error('ERROR AL ELIMINAR LA LLANTA:', error);
            res.status(500).send('ERROR AL ELIMINAR LA LLANTA');
        }
    },
    exportExcel: async(req, res) => {
        try {
        /* 1 - Parsear y validar fechas */
        const from = new Date(req.query.from);
        const to   = new Date(req.query.to);

        if (isNaN(from) || isNaN(to) || from > to) {
        return res.status(400).send('❌ Fechas inválidas');
        }

        const diffDays = Math.floor((to - from) / (1000*60*60*24));

        const isAdmin  = req.session.user?.role === 'admin';
        const MAX_DAYS = isAdmin ? 90 : 30;          // ← ajusta a gusto

        if (diffDays > MAX_DAYS) {
        return res
            .status(400)
            .send(`❌ El rango no puede exceder ${MAX_DAYS} días.`);
        }

        /* 2 - Consultar inventario dentro del rango */
        const tires = await prisma.newTire.findMany({
        where: {
            createdAt: {
            gte: from,
            lte: to
            }
        },
        orderBy: { createdAt: 'asc' }
        });

        /* 3 - Generar archivo Excel (mínimo viable) */
        const wb  = new ExcelJS.Workbook();
        const ws  = wb.addWorksheet('Inventario');

        ws.addRow([
        'Fecha', 'Marca', 'Referencia', 'Tipo', 'Peso', 'Cantidad',
        'P.Unit', 'P.Mayor', 'P.Detal', 'Ubicación'
        ]);

        tires.forEach(t => {
        ws.addRow([
            t.createdAt.toISOString().split('T')[0],
            t.brand, t.size, t.type, t.weight, t.quantity,
            t.priceUnit, t.priceWholesale, t.priceRetail, t.location
        ]);
        });

        /* 4 - Enviar al cliente */
        res.setHeader(
        'Content-Disposition',
        `attachment; filename="inventario_${req.query.from}_${req.query.to}.xlsx"`
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

module.exports = newTiresController;