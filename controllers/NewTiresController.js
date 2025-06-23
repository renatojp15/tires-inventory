const {PrismaClient} = require('@prisma/client');
const prisma = new PrismaClient();

const newTiresController = {
    newTiresForm: (req, res) => {
        try{
            res.render('newTires/NewTiresForm')
        }
        catch(error){
            console.error('ERROR AL CARGAR EL FORMULARIO: ', error);
            res.status(500).send('ERROR AL CARGAR EL FORMULARIO');
        }
    },
    createNewTires: async(req, res) => {
        try{
            const {brand, size, type, weight, quantity, priceUnit, priceWholesale, priceRetail, location} = req.body;

        await prisma.newTire.create({
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
        res.redirect('/newtires/list');
    }
        catch(error){
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
        const { brand, size, type, quantity, weight, priceUnit, priceWholesale, priceRetail, location } = req.body;
        try {
            await prisma.newTire.update({
                where: { id: parseInt(id) },
                data: {
                    brand,
                    size,
                    type,
                    weight:parseFloat(weight),
                    quantity: parseInt(quantity),
                    priceUnit: parseFloat(priceUnit),
                    priceWholesale: parseFloat(priceWholesale),
                    priceRetail: parseFloat(priceRetail),
                    location,
                },
            });
            res.redirect('/newtires/list');
        } 
        catch(error){
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
    }
};

module.exports = newTiresController;