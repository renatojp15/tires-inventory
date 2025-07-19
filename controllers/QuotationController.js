const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

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

            res.render('quotation/View', { quotation, 
              isPdf: false, // 👈 Esto es lo que faltaba
              host: req.headers.host, // 👈 Por si acaso necesitas la URL absoluta del logo
              user: req.session.user, // 👈 agregar esto
            });
        } catch (error) {
            console.error('ERROR AL VER LA COTIZACIÓN:', error);
            res.status(500).send('ERROR AL VER LA COTIZACIÓN');
        }
        },
        acceptQuotation: async(req, res) => {
            const quotationId = parseInt(req.params.id);
            try {
              const updated = await prisma.quotation.update({
                where: { id: quotationId },
                data: { status: 'aceptada' },
              });

              req.flash('success', 'La cotización fue aceptada correctamente.');
              res.redirect(`/quotations/view/${quotationId}`);
            } catch (error) {
              console.error('Error al aceptar cotización:', error);
              req.flash('error', 'Ocurrió un error al aceptar la cotización.');
              res.redirect('/quotations/list');
            }
        },
      rejectQuotation: async(req, res) => {
        const quotationId = parseInt(req.params.id);
        try {
          await prisma.quotation.update({
            where: { id: quotationId },
            data: {
              status: 'rechazada',
            },
          });

          req.flash('success', 'La cotización ha sido rechazada correctamente.');
          res.redirect(`/quotations/view/${quotationId}`);
        } catch (error) {
          console.error('Error al rechazar cotización:', error);
          res.status(500).send('Error interno al rechazar la cotización.');
        }
      },
      exportQuotationToExcel: async(req, res) => {
        const { id } = req.params;
        try {
          const quotation = await prisma.quotation.findUnique({
            where: { id: Number(id) },
            include: {
              customer: true,
              items: {
                include: {
                  newTire: { include: { brand: true, type: true } },
                  usedTire: { include: { brand: true, type: true } }
                }
              }
            }
          });

          if (!quotation) return res.status(404).send('Cotización no encontrada');

          const workbook = new ExcelJS.Workbook();
          const worksheet = workbook.addWorksheet('Cotización');

          // LOGO
          const logoPath = path.join(__dirname, '../public/img/LOGO-SONIX-LTD.png');
          const logoId = workbook.addImage({
            filename: logoPath,
            extension: 'png'
          });

          // Agrega imagen más al centro (por ejemplo, desde la columna C)
          worksheet.addImage(logoId, {
            tl: { col: 3, row: 0 }, // col 2 = columna C
            ext: { width: 200, height: 100 }
          });

          // Salto de línea para evitar que se sobreponga
          worksheet.addRow([]);
          worksheet.addRow([]);
          worksheet.addRow([]);
          worksheet.addRow([]);

          // Código formateado como "0001-2025"
          const year = new Date().getFullYear();
          const formattedCode = `${quotation.quotationCode.padStart(4, '0')}-${year}`;

          // Título centrado con código
          worksheet.mergeCells('B6', 'G6');
          worksheet.getCell('B6').value = `COTIZACIÓN - ${formattedCode}`;
          worksheet.getCell('B6').font = { size: 20, bold: true };
          worksheet.getCell('B6').alignment = { horizontal: 'center' };

          worksheet.addRow([]);
          worksheet.addRow([`Código: ${quotation.quotationCode}`]);
          worksheet.addRow([`Cliente: ${quotation.customer.fullName}`]);
          worksheet.addRow([`Fecha de emisión: ${quotation.date.toLocaleDateString('es-PA')}`]);
          worksheet.addRow([`Fecha de vencimiento: ${quotation.expiresAt.toLocaleDateString()}`]);
          worksheet.addRow([]);

          // Encabezado tabla de productos
          const headerRow = worksheet.addRow([
            'Cantidad',
            'Referencia',
            'Marca',
            'Tipo',
            'Precio Unitario',
            'Subtotal',
            'Peso (Kg)'
          ]);

          headerRow.eachCell((cell) => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FF1F497D' } // azul oscuro
            };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' }
            };
          });

          // Items
          quotation.items.forEach(item => {
            const tire = item.newTire || item.usedTire;
            worksheet.addRow([
              item.quantity,
              tire?.size || 'N/A',
              tire?.brand?.name || 'N/A',
              tire?.type?.name || 'N/A',
              item.unitPrice,
              item.subtotal,
              tire?.weight || 'N/A'
            ]);
          });

          // Totales
          const totalLabels = [
            ['TOTAL LLANTAS:', quotation.items.reduce((sum, item) => sum + item.quantity, 0)],
            ['TOTAL PESO (KG):', quotation.totalWeight],
            ['TRASPASO:', quotation.traspaso],
            ['CBM:', quotation.cbm],
            ['SUBTOTAL:', quotation.subtotal],
            ['TOTAL FINAL:', quotation.totalAmount]
          ];

          totalLabels.forEach(([label, value]) => {
            const row = worksheet.addRow([label, '', '', '', '', '', value]);
            row.getCell(1).font = { bold: true };
            row.getCell(7).font = { bold: true };
          });

          // Ajustes de ancho de columna
          worksheet.columns.forEach(col => col.width = 15);

          // Responder archivo
          res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          );
          res.setHeader(
            'Content-Disposition',
            `attachment; filename="Cotizacion-${quotation.quotationCode}.xlsx"`
          );

          await workbook.xlsx.write(res);
          res.end();

        } catch (error) {
          console.error('Error al exportar cotización:', error);
          res.status(500).send('Error al exportar cotización');
        }
      },
      getPrintTableQuotation: async(req, res) => {
        const quotationId = parseInt(req.params.id);
        try {
          const quotation = await prisma.quotation.findUnique({
            where: { id: quotationId },
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
          const templatePath = path.join(__dirname, '../views/quotation/View.ejs');
          const html = await ejs.renderFile(templatePath, {
            quotation,
            isPdf: true,
            host: req.headers.host // útil si usas rutas relativas a imágenes
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
            'Content-Disposition': `attachment; filename="Cotizacion-${quotation.quotationCode}.pdf"`
          });

          res.send(pdfBuffer);
        } catch (error) {
          console.error('ERROR GENERANDO PDF:', error);
          res.status(500).send('ERROR GENERANDO PDF');
        }
      }
};

module.exports = quotationController;