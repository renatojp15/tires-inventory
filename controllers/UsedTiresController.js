const {PrismaClient} = require('@prisma/client');
const prisma = new PrismaClient();

const usedTiresController = {
    UsedTiresForm: (req, res) => {
        try{
            res.render('UsedTiresForm')
        }
        catch(error){
            console.error('ERROR AL CARGAR EL FORMULARIO: ', error);
            res.status(500).send('ERROR AL CARGAR EL FORMULARIO');
        }
    },
    createUsedTires: async(req, res) => {
        try{
            const {brand, size, type, quantity, priceUnit, priceWholesale, priceRetail, location} = req.body;

        await prisma.usedTire.create({
            data: {
            brand,
            size,
            type,
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
    usedTiresList: async(req, res) => {
        try{
            const tires = await prisma.usedTire.findMany({
                orderBy: {
                createdAt: 'desc'
            }
        });
            res.render('UsedTiresList', {tires})
        }
        catch(error){
            console.error('ERROR AL OBTENER LAS LLANTAS NUEVAS: ', error);
            res.status(500).send('ERROR AL CARGAR LAS LLANTAS NUEVAS');
        }
    },
    editUsedTiresForm: async(req, res) => {
        const { id } = req.params;
        try{
            const tire = await prisma.usedTire.findUnique({
                where: { id: parseInt(id) },
            });
            res.render('EditUsedTiresForm', {tire});
        }
        catch(error){
            console.error('ERROR AL CARGAR EL FORMULARIO DE EDICIÓN:', error);
            res.status(500).send('ERROR AL CARGAR EL FORMULARIO DE EDICIÓN');
        }
    },
    updateUsedTires: async (req, res) => {
        const { id } = req.params;
        const { brand, size, type, quantity, priceUnit, priceWholesale, priceRetail, location } = req.body;
        try {
            await prisma.usedTire.update({
                where: { id: parseInt(id) },
                data: {
                    brand,
                    size,
                    type,
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