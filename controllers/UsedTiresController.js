const {PrismaClient} = require('@prisma/client');
const prisma = new PrismaClient();

const usedTiresController = {
    UsedTiresForm: (req, res) => {
        try{
            res.render('usedTires/UsedTiresForm')
        }
        catch(error){
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
    }
};

module.exports = usedTiresController;