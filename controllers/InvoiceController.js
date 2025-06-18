const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const puppeteer = require('puppeteer');
const path = require('path');

const invoiceController = {
    showInvoiceForm: async (req, res) => {
        try{
            const newTires = await prisma.newTire.findMany();
            const usedTires = await prisma.usedTire.findMany();

            res.render('invoices/New', {newTires, usedTires,});
        } 
        catch(error){
            console.error('ERROR AL CARGAR EL FORMULARIO DE FACTURA:', error);
            res.status(500).send('ERROR AL CARGAR EL FORMULARIO DE FACTURA');
        }
  },
    createInvoice: async (req, res) => {
  try {
    const { fullName, idNumber, phone, address, items } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).send('Debe seleccionar al menos una llanta');
    }

    // 1. Buscar o crear cliente por cédula (idNumber)
    let customer = await prisma.customer.findUnique({ where: { idNumber } });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          fullName,
          idNumber,
          phone: phone || null,
          address: address || null
        }
      });
    }

    // 2. Preparar ítems y calcular total
    let totalAmount = 0;
    const invoiceItemsData = [];

    for (const item of items) {
      if (!item.selected) continue;

      const { tireId, tireType, quantity } = item;
      const qty = parseInt(quantity);
      if (isNaN(qty) || qty <= 0) continue;

      let tire;

      if (tireType === 'new') {
        tire = await prisma.newTire.findUnique({ where: { id: parseInt(tireId) } });
      } else if (tireType === 'used') {
        tire = await prisma.usedTire.findUnique({ where: { id: parseInt(tireId) } });
      }

      if (!tire) continue;

      const unitPrice = tire.priceRetail;
      const subtotal = unitPrice * qty;
      totalAmount += subtotal;

      invoiceItemsData.push({
        tireType,
        tireId: parseInt(tireId),
        quantity: qty,
        unitPrice,
        subtotal
      });
    }

    if (invoiceItemsData.length === 0) {
      return res.status(400).send('No se seleccionó ninguna llanta válida');
    }

    // 3. Crear factura y asociar ítems
    const invoice = await prisma.invoice.create({
      data: {
        invoiceCode: `INV-${Date.now()}`,
        totalAmount,
        customer: { connect: { id: customer.id } },
        // user: { connect: { id: 1 } }, // Placeholder temporal
        items: {
          create: invoiceItemsData
        }
      }
    });

    res.redirect(`/invoices/${invoice.id}`);
  } catch (error) {
    console.error('ERROR AL CREAR FACTURA:', error);
    res.status(500).send('ERROR AL CREAR FACTURA');
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
    customer: true,
    items: {
      include: {
        newTire: true,
        usedTire: true
      }
    }
  }
});

if (!invoice) {
  return res.status(404).send('Factura no encontrada');
}
        res.render('invoices/Show', { invoice });
        }
    catch(error){
        console.error('ERROR AL MOSTRAR LA FACTURA:', error);
        res.status(500).send('ERROR AL MOSTRAR LA FACTURA');
    }
  },
  listInvoices: async (req, res) => {
  try {
    const invoices = await prisma.invoice.findMany({
      orderBy: { date: 'desc' }, // Ordenar por fecha descendente
      include: {
        customer: true,
        items: true
      }
    });

    res.render('invoices/InvoicesList', { invoices });
  } catch (error) {
    console.error('ERROR AL LISTAR LAS FACTURAS:', error);
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
    const html = await ejs.renderFile(templatePath, { invoice });

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });

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
  }
};

module.exports = invoiceController;