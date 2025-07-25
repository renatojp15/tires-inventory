const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const puppeteer = require('puppeteer');
const path = require('path');
const ExcelJS = require('exceljs');
const alertsController = require('../controllers/AlertsController');

const invoiceController = {
   showInvoiceForm: async (req, res) => {
  try {
    const newTires = await prisma.newTire.findMany({
      include: {
        brand: true,
        type: true,
        location: true
      }
    });

    const usedTires = await prisma.usedTire.findMany({
      include: {
        brand: true,
        type: true,
        location: true
      }
    });

    res.render('invoices/New', { newTires, usedTires });
  } 
  catch (error) {
    console.error('ERROR AL CARGAR EL FORMULARIO DE FACTURA:', error);
    res.status(500).send('ERROR AL CARGAR EL FORMULARIO DE FACTURA');
  }
},
    createInvoice: async (req, res) => {
  try {
    const {
      fullName, idNumber, phone, address,
      items, traspaso = 0, cbm = 0
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).send('Debe seleccionar al menos una llanta');
    }

    // 1. Buscar o crear cliente
    const searchCondition = idNumber?.trim()
      ? { idNumber: idNumber.trim() }
      : { fullName: fullName.toLowerCase() };

    let customer = await prisma.customer.findFirst({ where: searchCondition });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          fullName: fullName.toLowerCase(),
          idNumber: idNumber?.trim() || null,
          phone: phone || null,
          address: address || null
        }
      });
    }

    // 2. Procesar ítems
    let subtotal = 0;
    let totalWeight = 0;
    let totalQuantity = 0;
    const invoiceItemsData = [];

    for (const raw of items) {
      if (!raw.selected) continue;

      const qty = parseInt(raw.quantity);
      if (isNaN(qty) || qty <= 0) continue;

      const tireIdInt = parseInt(raw.tireId);
      let tire = null;

      let itemData = {
        quantity: qty,
        unitPrice: 0,
        subtotal: 0
      };

      if (raw.tireType === 'new') {
        tire = await prisma.newTire.findUnique({ where: { id: tireIdInt } });
        if (!tire || tire.quantity < qty) {
          return res.status(400).send(`No hay suficientes llantas nuevas disponibles`);
        }

        itemData.unitPrice = tire.priceRetail;
        itemData.subtotal = tire.priceRetail * qty;
        itemData.newTire = { connect: { id: tireIdInt } };

        // 🔻 Actualizamos stock
        const updatedTire = await prisma.newTire.update({
          where: { id: tireIdInt },
          data: { quantity: { decrement: qty } }
        });

         // ✅ Verificar si se necesita alerta
        await alertsController.createAlertIfNeeded('new', updatedTire);

      } else if (raw.tireType === 'used') {
        tire = await prisma.usedTire.findUnique({ where: { id: tireIdInt } });
        if (!tire || tire.quantity < qty) {
          return res.status(400).send(`No hay suficientes llantas usadas disponibles`);
        }

        itemData.unitPrice = tire.priceRetail;
        itemData.subtotal = tire.priceRetail * qty;
        itemData.usedTire = { connect: { id: tireIdInt } };

        // 🔻 Actualizamos stock
        const updatedTire = await prisma.usedTire.update({
          where: { id: tireIdInt },
          data: { quantity: { decrement: qty } }
        });

        // ✅ Verificar si se necesita alerta
        await alertsController.createAlertIfNeeded('used', updatedTire);

      } else {
        return res.status(400).send('Tipo de llanta inválido');
      }

      subtotal += itemData.subtotal;
      totalWeight += tire.weight * qty;
      totalQuantity += qty;
      invoiceItemsData.push(itemData);
    }

    if (invoiceItemsData.length === 0) {
      return res.status(400).send('No se añadió ningún ítem válido');
    }

    // 3. Obtener usuario (si hay sesión)
    const userId = req.session?.user?.id ?? null;

    // 4. Parsear traspaso y cbm
    const shippingCost = parseFloat(traspaso) || 0;
    const cbmFloat = parseFloat(cbm) || 0;
    const totalAmount = subtotal + shippingCost + cbmFloat;

    // 5. Crear factura con código temporal
    const created = await prisma.invoice.create({
      data: {
        invoiceCode: 'TEMP', // se actualizará luego
        subtotal,
        totalAmount,
        shippingCost,
        cbm: cbmFloat,
        totalWeight,
        totalQuantity,
        customerId: customer.id,
        ...(userId && { userId }),
        items: {
          create: invoiceItemsData
        }
      }
    });

    // 6. Generar código incremental sin prefijo
    const invoiceCode = created.id.toString().padStart(5, '0');
    await prisma.invoice.update({
      where: { id: created.id },
      data: { invoiceCode }
    });

    console.log('✅ FACTURA CREADA:', invoiceCode);
    res.redirect(`/invoices/${created.id}?success=Factura creada exitosamente`);

  } catch (err) {
    console.error('💥 ERROR AL CREAR FACTURA:\n', err);
    res.status(500).send('Error interno al crear factura');
  }
},
  showInvoice: async(req, res) => {
    try{
        const invoiceId = parseInt(req.params.id);

if (isNaN(invoiceId)) {
  return res.status(400).send('ID de factura no válido');
}

const invoice = await prisma.invoice.findUnique({
  where: { id: invoiceId },
  include: {
  items: {
    include: {
      newTire: {
        include: { brand: true }
      },
      usedTire: {
        include: { brand: true }
      }
    }
  },
  customer: true,
  user: true
}
});

    // 🔔 Alertas activas
    const alerts = await prisma.stockAlert.findMany({
      where: { resolved: false },
      orderBy: { createdAt: 'desc' }
    });

if (!invoice) {
  return res.status(404).send('Factura no encontrada');
}
        res.render('invoices/show', {
          alertSound:true,
          invoice,
          isPdf: false,
          host: req.headers.host,
          user: req.session.user, 
        });
        }
    catch(error){
        console.error('ERROR AL MOSTRAR LA FACTURA:', error);
        res.status(500).send('ERROR AL MOSTRAR LA FACTURA');
    }
  },

listInvoices: async (req, res) => {
  try {
    /* 1. Tomamos la cadena de búsqueda ------------------------------ */
    const q = (req.query.search || '').trim().toLowerCase();   // '' si viene vacía
    const page = parseInt(req.query.page) || 1;
    const limit = 15;
    const skip = (page - 1) * limit;

    /* 2. Construimos el where dinámico ------------------------------ */
    const where = q
      ? {
          OR: [
            { invoiceCode: { contains: q, mode: 'insensitive' } },                // por código
            { customer:   { fullName: { contains: q, mode: 'insensitive' } } }    // por nombre
          ]
        }
      : {};   // sin filtro → trae todo

      // 🔢 Total para calcular páginas
      const totalItems = await prisma.invoice.count({ where });

    /* 3. Traemos las facturas (ya filtradas) ------------------------ */
    const invoices = await prisma.invoice.findMany({
      where,
      skip,
      take: limit,
      orderBy: { date: 'desc' },
      include: { customer: true, items: true }
    });

    /* 4. Agrupamos por fecha (DD/MM/AAAA) --------------------------- */
    const groupedByDate = {};
    invoices.forEach(inv => {
      const key = new Date(inv.date).toLocaleDateString('es-PA');
      (groupedByDate[key] ??= []).push(inv);
    });

    const totalPages = Math.ceil(totalItems / limit);

    /* 5. Render ------------------------------------------------------ */
    res.render('invoices/InvoicesList', {
      groupedByDate,
      search: q,
      currentPage: page,
      totalPages,
    });

  } catch (err) {
    console.error('⚠️ ERROR AL LISTAR FACTURAS:', err);
    res.status(500).send('ERROR AL LISTAR LAS FACTURAS');
  }
},
  exportInvoicePdf: async(req, res) => {
    const invoiceId = parseInt(req.params.id);

  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        customer: true,
        items: {
          include: {
            newTire: true,
            usedTire: true,
          }
        }
      }
    });

    const ejs = require('ejs');
    const fs = require('fs');
    const templatePath = path.join(__dirname, '../views/invoices/show.ejs'); // Ajusta el path si está en otra carpeta
    const html = await ejs.renderFile(templatePath, {
      invoice,
      isPdf: true,
      host: req.headers.host // Pasamos el host para construir URLs absolutas
    });

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });
    await page.emulateMediaType('print');

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true
    });

    await browser.close();

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="Factura-${invoice.invoiceCode}.pdf"`
    });

    res.send(pdfBuffer);
  } catch (error) {
    console.error('ERROR GENERANDO PDF:', error);
    res.status(500).send('ERROR GENERANDO PDF');
  }
  },
  deleteInvoice: async (req, res) => {
  const invoiceId = parseInt(req.params.id);

  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        items: true,
      },
    });

    if (!invoice) {
      return res.status(404).send('Factura no encontrada');
    }

   // Devolver cantidades al inventario y resolver alertas si hay stock bajo
    for (const item of invoice.items) {
      const qty = item.quantity;

      if (item.newTireId) {
        const updatedTire = await prisma.newTire.update({
          where: { id: item.newTireId },
          data: { quantity: { increment: qty } },
        });

        await alertsController.createAlertIfNeeded('new', updatedTire);
      } else if (item.usedTireId) {
        const updatedTire = await prisma.usedTire.update({
          where: { id: item.usedTireId },
          data: { quantity: { increment: qty } },
        });

        await alertsController.createAlertIfNeeded('used', updatedTire);
      }
    }

    // Borrar los items relacionados
    await prisma.invoiceItem.deleteMany({
      where: { invoiceId },
    });

    // Borrar la factura
    await prisma.invoice.delete({
      where: { id: invoiceId },
    });

    res.redirect('/invoices/list');
  } catch (error) {
    console.error('ERROR AL ELIMINAR FACTURA:', error);
    res.status(500).send('Error al eliminar la factura');
  }
},
exportInvoiceToExcel: async (req, res) => {
  try {
    const invoiceId = parseInt(req.params.id);

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        customer: true,
        items: {
          include: {
            newTire: true,
            usedTire: true,
          },
        },
        user: true,
      },
    });

    if (!invoice) {
      return res.status(404).send('Factura no encontrada');
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Factura');

    // Encabezado
    sheet.addRow(['FACTURA']).font = { size: 16, bold: true };
    sheet.addRow([]);

    // Datos generales
    sheet.addRow(['Código de Factura', invoice.invoiceCode]);
    sheet.addRow(['Fecha', invoice.date.toLocaleDateString()]);
    sheet.addRow(['Vendedor', invoice.user?.fullName || '']);
    sheet.addRow(['Cliente', invoice.customer.fullName]);
    sheet.addRow(['Cédula', invoice.customer.idNumber || '']);
    sheet.addRow(['Teléfono', invoice.customer.phone || '']);
    sheet.addRow(['Dirección', invoice.customer.address || '']);
    sheet.addRow([]);

    // Encabezado de la tabla
    sheet.addRow([
      'Condición',
      'Marca',
      'Referencia',
      'Cantidad',
      'Peso (kg)',
      'Precio Detal',
      'Subtotal',
    ]).font = { bold: true };

    // Cuerpo de la tabla
    invoice.items.forEach((item) => {

      // ✔️ Detectar la llanta realmente vinculada
      const tire      = item.newTire ?? item.usedTire;        // nunca serán ambas
      if (!tire) return;                                      // por si acaso

      const condition = item.newTire ? 'Nueva' : 'Usada';     // para la columna
      const peso      = tire.weight ?? 0;
      const subtotal  = item.quantity * item.unitPrice;

      sheet.addRow([
        condition,
        tire.brand,
        tire.size,
        item.quantity,
        peso,
        item.unitPrice,
        subtotal,
      ]);
    });

    // Totales
    sheet.addRow([]);
    sheet.addRow(['Total a pagar', invoice.totalAmount]);
    sheet.addRow(['Peso total',   invoice.totalWeight]);

    // Enviar archivo al navegador
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=factura-${invoice.invoiceCode}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('ERROR AL EXPORTAR EXCEL:', error);
    res.status(500).send('Error al exportar factura a Excel');
  }
},
    createFromQuotation: async (req, res) => {
      const quotationId = parseInt(req.params.id, 10);

      if (isNaN(quotationId)) {
        return res.status(400).json({ error: 'ID de cotización inválido' });
      }

      try {
        // 1. Buscar la cotización y sus items
        const quotation = await prisma.quotation.findUnique({
          where: { id: quotationId },
          include: {
            items: true,
            customer: true,
          },
        });

        if (!quotation) {
          return res.status(404).json({ error: 'Cotización no encontrada' });
        }

        // 2. Obtener el siguiente invoiceCode
        const lastInvoice = await prisma.invoice.findFirst({
          orderBy: { id: 'desc' },
        });

        const nextId = lastInvoice ? lastInvoice.id + 1 : 1;
        const invoiceCode = nextId.toString().padStart(5, '0');

        // 3. Crear la factura
        const createdInvoice = await prisma.invoice.create({
          data: {
            invoiceCode,
            customerId: quotation.customerId,
            shippingCost: quotation.traspaso || 0,
            cbm: quotation.cbm || 0,
            subtotal: quotation.subtotal,
            totalAmount: quotation.totalAmount,
            totalWeight: quotation.totalWeight || 0,
            totalQuantity: quotation.totalQuantity || 0,
            userId: req.user?.id || null,
            items: {
              create: quotation.items.map(item => ({
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                subtotal: item.subtotal,
                newTireId: item.newTireId || null,
                usedTireId: item.usedTireId || null,
              })),
            },
          },
          include: {
            items: true,
            customer: true,
          },
        });

      // 4. Actualizar el stock y verificar alertas
      for (const item of quotation.items) {
        if (item.newTireId) {
          const updatedTire = await prisma.newTire.update({
            where: { id: item.newTireId },
            data: {
              quantity: { decrement: item.quantity }
            }
          });
          await alertsController.createAlertIfNeeded('new', updatedTire);
        }

        if (item.usedTireId) {
          const updatedTire = await prisma.usedTire.update({
            where: { id: item.usedTireId },
            data: {
              quantity: { decrement: item.quantity }
            }
          });
          await alertsController.createAlertIfNeeded('used', updatedTire);
        }
      }
        console.log('✅ FACTURA CREADA DESDE COTIZACIÓN Y STOCK ACTUALIZADO');
        res.redirect(`/invoices/${createdInvoice.id}?success=Factura creada exitosamente`);
      } catch (error) {
        console.error('ERROR AL CREAR FACTURA DESDE COTIZACIÓN:', error);
        res.status(500).send('ERROR INTERNO AL CREAR FACTURA DESDE COTIZACIÓN');
      }
    },
    cancelInvoice: async (req, res) => {
      try {
        const invoiceId = parseInt(req.params.id);

        if (isNaN(invoiceId)) {
          return res.status(400).send('ID de factura no válido');
        }

        const invoice = await prisma.invoice.findUnique({
          where: { id: invoiceId },
          include: {
            items: true
          }
        });

        if (!invoice) {
          return res.status(404).send('Factura no encontrada');
        }

        // Si ya está anulada, no hacer nada
        if (invoice.status === 'anulada') {
          return res.redirect(`/invoices/${invoice.id}?info=Factura ya está anulada`);
        }

        // 🔄 Devolver llantas al stock
        for (const item of invoice.items) {
          if (item.newTireId) {
            await prisma.newTire.update({
              where: { id: item.newTireId },
              data: {
                quantity: {
                  increment: item.quantity
                }
              }
            });
          } else if (item.usedTireId) {
            await prisma.usedTire.update({
              where: { id: item.usedTireId },
              data: {
                quantity: {
                  increment: item.quantity
                }
              }
            });
          }
        }

        // 🚫 Marcar la factura como "anulada"
        await prisma.invoice.update({
          where: { id: invoiceId },
          data: {
            status: 'anulada'
          }
        });

        console.log(`✅ Factura anulada correctamente (ID ${invoiceId})`);
        res.redirect(`/invoices/${invoiceId}?success=Factura anulada`);

      } catch (error) {
        console.error('💥 Error al anular factura:\n', error);
        res.status(500).send('Error interno al anular la factura');
      }
    },
};

module.exports = invoiceController;