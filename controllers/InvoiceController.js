const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const puppeteer = require('puppeteer');
const path = require('path');
const ExcelJS = require('exceljs');

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

    /* 1. Buscar o crear cliente ---------------------------------------- */
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

    /* 2. Procesar ítems ------------------------------------------------ */
    let totalAmount = 0;
    let totalWeight = 0;
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
          return res.status(400).send(`No hay suficientes llantas nuevas disponibles para ${tire?.brand || 'ID ' + raw.tireId}`);
        }

        itemData.unitPrice = tire.priceRetail;
        itemData.subtotal = tire.priceRetail * qty;
        itemData.newTire = { connect: { id: tireIdInt } };

        await prisma.newTire.update({
          where: { id: tireIdInt },
          data: { quantity: { decrement: qty } }
        });

      } else if (raw.tireType === 'used') {
        tire = await prisma.usedTire.findUnique({ where: { id: tireIdInt } });
        if (!tire || tire.quantity < qty) {
          return res.status(400).send(`No hay suficientes llantas usadas disponibles para ${tire?.brand || 'ID ' + raw.tireId}`);
        }

        itemData.unitPrice = tire.priceRetail;
        itemData.subtotal = tire.priceRetail * qty;
        itemData.usedTire = { connect: { id: tireIdInt } };

        await prisma.usedTire.update({
          where: { id: tireIdInt },
          data: { quantity: { decrement: qty } }
        });
      } else {
        return res.status(400).send('Tipo de llanta inválido');
      }

      totalAmount += itemData.subtotal;
      totalWeight += tire.weight * qty;
      invoiceItemsData.push(itemData);
    }

    if (invoiceItemsData.length === 0) {
      return res.status(400).send('No se añadió ningún ítem válido');
    }

    /* 3. Usuario autenticado ------------------------------------------- */
    const userId = req.session?.user?.id ?? null;

    /* 4. Crear factura ------------------------------------------------- */
    const invoice = await prisma.invoice.create({
      data: {
        invoiceCode: `INV-${Date.now()}`,
        totalAmount,
        totalWeight,
        customerId: customer.id,
        ...(userId && { userId }),
        items: {
          create: invoiceItemsData
        }
      }
    });

    console.log('✅ FACTURA CREADA:', invoice.invoiceCode);
    res.redirect(`/invoices/${invoice.id}?success=Factura creada exitosamente`);

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
        res.render('invoices/show', {
          invoice,
          isPdf: false, // 👈 Esto es lo que faltaba
          host: req.headers.host, // 👈 Por si acaso necesitas la URL absoluta del logo
          user: req.session.user, // 👈 agregar esto
        });
        }
    catch(error){
        console.error('ERROR AL MOSTRAR LA FACTURA:', error);
        res.status(500).send('ERROR AL MOSTRAR LA FACTURA');
    }
  },
  // controllers/InvoiceController.js
listInvoices: async (req, res) => {
  try {
    /* 1. Tomamos la cadena de búsqueda ------------------------------ */
    const q = (req.query.search || '').trim().toLowerCase();   // '' si viene vacía

    /* 2. Construimos el where dinámico ------------------------------ */
    const where = q
      ? {
          OR: [
            { invoiceCode: { contains: q, mode: 'insensitive' } },                // por código
            { customer:   { fullName: { contains: q, mode: 'insensitive' } } }    // por nombre
          ]
        }
      : {};   // sin filtro → trae todo

    /* 3. Traemos las facturas (ya filtradas) ------------------------ */
    const invoices = await prisma.invoice.findMany({
      where,
      orderBy: { date: 'desc' },
      include: { customer: true, items: true }
    });

    /* 4. Agrupamos por fecha (DD/MM/AAAA) --------------------------- */
    const groupedByDate = {};
    invoices.forEach(inv => {
      const key = new Date(inv.date).toLocaleDateString('es-PA');
      (groupedByDate[key] ??= []).push(inv);
    });

    /* 5. Render ------------------------------------------------------ */
    res.render('invoices/InvoicesList', {
      groupedByDate,
      search: q            // para mantener el valor en el input
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
        items: true
      }
    });

    if (!invoice) {
      return res.status(404).send('Factura no encontrada');
    }

    // Devolver cantidades al inventario
    for (const item of invoice.items) {
      const qty = item.quantity;

      if (item.tireType === 'new') {
        await prisma.newTire.update({
          where: { id: item.tireId },
          data: {
            quantity: { increment: qty }
          }
        });
      } else if (item.tireType === 'used') {
        await prisma.usedTire.update({
          where: { id: item.tireId },
          data: {
            quantity: { increment: qty }
          }
        });
      }
    }

    // Borrar los items relacionados
    await prisma.invoiceItem.deleteMany({
      where: { invoiceId }
    });

    // Borrar la factura
    await prisma.invoice.delete({
      where: { id: invoiceId }
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
};

module.exports = invoiceController;