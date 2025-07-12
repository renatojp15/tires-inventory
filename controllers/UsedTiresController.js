const {PrismaClient} = require('@prisma/client');
const prisma = new PrismaClient();
const ExcelJS = require('exceljs');

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
    createUsedTires: async(req, res) => {
        try{
            const {brand, size, type, weight, quantity, priceUnit, priceWholesale, priceRetail, location} = req.body;

        await prisma.usedTire.create({
            data: {
            brand,
            size,
            type,
            weight: parseFloat(weight),
            quantity: parseInt(quantity),
            priceUnit: parseFloat(priceUnit),
            priceWholesale: parseFloat(priceWholesale),
            priceRetail: parseFloat(priceRetail),
            location
        }
        });
        res.redirect('/usedtires/list');
    }
        catch(error){
            console.error('ERROR AL REGISTRAR LLANTA USADAS:', error);
            res.status(500).send('ERROR INTERNO DEL SERVIDOR');
        }
    },
    usedTiresList: async (req, res) => {
  try {
    const { search } = req.query;
    const tires = await prisma.usedTire.findMany({
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

    const tiresGrouped = {};
    tires.forEach(tire => {
      const dateKey = new Date(tire.createdAt).toLocaleDateString("es-PA");
      if (!tiresGrouped[dateKey]) {
        tiresGrouped[dateKey] = [];
      }
      tiresGrouped[dateKey].push(tire);
    });

    res.render('usedTires/UsedTiresList', { tiresGrouped });
  } catch (error) {
    console.error('ERROR AL OBTENER LAS LLANTAS USADAS:', error);
    res.status(500).send('ERROR AL CARGAR LAS LLANTAS USADAS');
  }
},
    editUsedTiresForm: async(req, res) => {
        const { id } = req.params;
        try{
            const tire = await prisma.usedTire.findUnique({
                where: { id: parseInt(id) },
            });
            res.render('usedTires/EditUsedTiresForm', {tire});
        }
        catch(error){
            console.error('ERROR AL CARGAR EL FORMULARIO DE EDICIÓN:', error);
            res.status(500).send('ERROR AL CARGAR EL FORMULARIO DE EDICIÓN');
        }
    },
    updateUsedTires: async (req, res) => {
        const { id } = req.params;
        const { brand, size, type, weight, quantity, priceUnit, priceWholesale, priceRetail, location } = req.body;
        try {
            await prisma.usedTire.update({
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
                },
            });
            res.redirect('/usedtires/list');
        } 
        catch(error){
            console.error('ERROR AL ACTUALIZAR LA LLANTA:', error);
            res.status(500).send('ERROR AL ACTUALIZAR LA LLANTA');
        }
    },
    deleteUsedTires: async(req, res) => {
        try {
            const { id } = req.params;
            await prisma.usedTire.delete({ where: { id: Number(id) } });
            res.redirect('/usedtires/list');
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
            const tires = await prisma.usedTire.findMany({
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

module.exports = usedTiresController;