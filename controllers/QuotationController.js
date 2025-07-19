const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const quotationController = {
    quotationForm: async (req, res) => {
        try{
            const customers = await prisma.customer.findMany({ orderBy: { fullName: 'asc' } });
            const newTires = await prisma.newTire.findMany({
                where: { quantity: { gt: 0 } },
                include: { brand: true, type: true, location: true },
        });
            const usedTires = await prisma.usedTire.findMany({
                where: { quantity: { gt: 0 } },
                include: { brand: true, type: true, location: true },
        });

        res.render('quotation/form', {
            customers,
            newTires,
            usedTires,
        });
        }
        catch(error){
            console.error('ERROR AL CARGAR EL FORMULARIO DE COTIZACIÓN:', error);
            res.status(500).send('ERROR AL CARGAR EL FORMULARIO DE COTIZACIÓN');
        }
    },
    createQuotation: async (req, res) => {
  try {
    const {
      customer,
      expirationDate,
      status,
      traspaso,
      cbm,
      observations,
      items
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).send('Debe agregar al menos una llanta a la cotización.');
    }

    // Calcular totales
    let subtotal = 0;
    let totalWeight = 0;

    const parsedItems = items.map(item => {
      const quantity = parseInt(item.quantity);
      const unitPrice = parseFloat(item.unitPrice);
      const weight = parseFloat(item.weight || 0); // Opcional

      const itemSubtotal = quantity * unitPrice;
      subtotal += itemSubtotal;
      totalWeight += quantity * weight;

      return {
        quantity,
        unitPrice,
        subtotal: itemSubtotal,
        newTireId: item.tireType === 'new' ? parseInt(item.tireId) : null,
        usedTireId: item.tireType === 'used' ? parseInt(item.tireId) : null
      };
    });

    const parsedTraspaso = parseFloat(traspaso || 0);
    const parsedCbm = parseFloat(cbm || 0);
    const totalAmount = subtotal + parsedTraspaso + parsedCbm;

    // Generar código de cotización
    const lastQuotation = await prisma.quotation.findFirst({
      orderBy: { id: 'desc' }
    });

    const nextId = lastQuotation ? lastQuotation.id + 1 : 1;
    const quotationCode = `COT-${String(nextId).padStart(4, '0')}`;

    // Crear cotización
    const quotation = await prisma.quotation.create({
      data: {
        customerId: parseInt(customer),
        userId: req.session.user?.id || 1,
        expiresAt: new Date(expirationDate),
        status,
        traspaso: parsedTraspaso,
        cbm: parsedCbm,
        subtotal,
        totalAmount,
        totalWeight,
        quotationCode,
        observations: observations || null,
        items: {
          create: parsedItems
        }
      },
      include: {
        items: true
      }
    });

    res.redirect(`/quotations/view/${quotation.id}`);
  } catch (error) {
    console.error('ERROR AL CREAR LA COTIZACIÓN:', error);
    res.status(500).send('ERROR AL CREAR LA COTIZACIÓN');
  }
},
  listQuotations: async (req, res) => {
    try {
        const quotations = await prisma.quotation.findMany({
        orderBy: { date: 'desc' },
        include: {
            customer: true,
            items: true,
        },
        });

        res.render('quotation/List', { quotations });
    } catch (error) {
        console.error('ERROR AL LISTAR LAS COTIZACIONES:', error);
        res.status(500).send('ERROR AL LISTAR LAS COTIZACIONES');
    }
    },
    viewQuotation: async (req, res) => {
        try {
            const { id } = req.params;

            const quotation = await prisma.quotation.findUnique({
            where: { id: parseInt(id) },
            include: {
                customer: true,
                items: {
                include: {
                    newTire: {
                    include: { brand: true, type: true, location: true }
                    },
                    usedTire: {
                    include: { brand: true, type: true, location: true }
                    }
                }
                }
            }
            });

            if (!quotation) {
            return res.status(404).send('Cotización no encontrada');
            }

            res.render('quotation/View', { quotation });
        } catch (error) {
            console.error('ERROR AL VER LA COTIZACIÓN:', error);
            res.status(500).send('ERROR AL VER LA COTIZACIÓN');
        }
        },
};

module.exports = quotationController;