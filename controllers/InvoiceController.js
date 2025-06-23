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

    // 🔍 Buscar o crear cliente
    let customer;
    try {
      const searchCondition = idNumber?.trim()
        ? { idNumber: idNumber.trim() }
        : { fullName: fullName.toLowerCase() };

      customer = await prisma.customer.findFirst({ where: searchCondition });

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
    } catch (error) {
      console.error('❌ ERROR al buscar/crear cliente:', error);
      return res.status(500).send('Error al procesar cliente');
    }

    // 🧮 Calcular totales y armar ítems
    let totalAmount = 0;
    let totalWeight = 0;
    const invoiceItemsData = [];

    for (const item of items) {
      if (!item.selected) continue;

      const { tireId, tireType, quantity } = item;
      const qty = parseInt(quantity);
      if (isNaN(qty) || qty <= 0) continue;

      let tire;
      const tireIdInt = parseInt(tireId);

      try {
        tire = await (tireType === 'new'
          ? prisma.newTire.findUnique({ where: { id: tireIdInt } })
          : prisma.usedTire.findUnique({ where: { id: tireIdInt } }));

        if (!tire || tire.quantity < qty) {
          return res.status(400).send(`❌ No hay suficientes llantas disponibles para ${tire?.brand || 'ID ' + tireId}`);
        }

        const unitPrice = tire.priceRetail;
        const subtotal = unitPrice * qty;
        const weight = tire.weight * qty;

        totalAmount += subtotal;
        totalWeight += weight;

        // ✅ Relación explícita para evitar conflicto de claves foráneas
        invoiceItemsData.push({
          tireType,
          tireId: tireIdInt,
          quantity: qty,
          unitPrice,
          subtotal,
          ...(tireType === 'new'
            ? { newTire: { connect: { id: tireIdInt } } }
            : { usedTire: { connect: { id: tireIdInt } } })
        });

        // 🔄 Actualizar inventario
        await (tireType === 'new'
          ? prisma.newTire.update({ where: { id: tireIdInt }, data: { quantity: tire.quantity - qty } })
          : prisma.usedTire.update({ where: { id: tireIdInt }, data: { quantity: tire.quantity - qty } }));
      } catch (err) {
        console.error(`❌ Error al procesar llanta ID ${tireId}:`, err);
        return res.status(500).send(`Error al procesar llanta ID ${tireId}`);
      }
    }

    if (invoiceItemsData.length === 0) {
      return res.status(400).send('❌ No se seleccionó ninguna llanta válida');
    }

    // 👤 Verificar usuario logueado
    let userId = null;
    const loggedUser = req.session?.user;

    if (loggedUser?.id) {
      const user = await prisma.user.findUnique({ where: { id: loggedUser.id } });
      if (user) {
        userId = user.id;
      } else {
        console.warn(`⚠️ Usuario en sesión con ID ${loggedUser.id} no existe en la base de datos`);
      }
    }

    // 🧾 Crear factura
    const invoiceData = {
      invoiceCode: `INV-${Date.now()}`,
      totalAmount,
      totalWeight,
      customerId: customer.id,
      items: { create: invoiceItemsData },
      ...(userId && { userId })
    };

    const invoice = await prisma.invoice.create({ data: invoiceData });

    console.log('✅ FACTURA CREADA:', invoice.invoiceCode);
    res.redirect(`/invoices/${invoice.id}`);
  } catch (error) {
    console.error('❌ ERROR AL CREAR FACTURA:', error);
    res.status(500).send('❌ ERROR AL CREAR FACTURA');
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
  listInvoices: async (req, res) => {
  try {
    const search = req.query.search?.toLowerCase().trim() || "";

    const invoices = await prisma.invoice.findMany({
      orderBy: { date: 'desc' },
      include: {
        customer: true,
        items: true
      }
    });

    // Filtro por nombre de cliente si hay búsqueda
    const filtered = search
      ? invoices.filter(inv =>
          inv.customer.fullName.toLowerCase().includes(search)
        )
      : invoices;

    // Agrupar por fecha
    const groupedByDate = {};

    filtered.forEach(invoice => {
      const dateKey = new Date(invoice.date).toLocaleDateString('es-PA');
      if (!groupedByDate[dateKey]) {
        groupedByDate[dateKey] = [];
      }
      groupedByDate[dateKey].push(invoice);
    });

    res.render('invoices/InvoicesList', {
      groupedByDate,
      search // 👈 pasamos el valor para mostrarlo en el input
    });
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
      const tire = item.tireType === 'new' ? item.newTire : item.usedTire;
      const peso = tire.weight;
      const subtotal = item.quantity * item.unitPrice;

      sheet.addRow([
        tire.condition,
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
    sheet.addRow(['Peso total', invoice.totalWeight]);

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