const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

const packingListController = {
    list: async (req, res) => {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const offset = (page - 1) * limit;
        const search = req.query.search?.trim().toLowerCase() || '';

        try {
            // Filtro de búsqueda condicional
            const searchFilter = search
                ? {
                    OR: [
                        {
                            packingCode: {
                                contains: search,
                                mode: 'insensitive',
                            },
                        },
                        {
                            invoice: {
                                invoiceCode: {
                                    contains: search,
                                    mode: 'insensitive',
                                },
                            },
                        },
                        {
                            invoice: {
                                customer: {
                                    fullName: {
                                        contains: search,
                                        mode: 'insensitive',
                                    },
                                },
                            },
                        },
                    ],
                }
                : {};

            const [totalCount, packingList] = await Promise.all([
                prisma.packingList.count({
                    where: searchFilter,
                }),
                prisma.packingList.findMany({
                    where: searchFilter,
                    skip: offset,
                    take: limit,
                    orderBy: { createdAt: 'desc' },
                    include: {
                        invoice: {
                            include: {
                                customer: true,
                            },
                        },
                        items: {
                            include: {
                                newTire: true,
                                usedTire: true,
                            },
                        },
                    },
                }),
            ]);

            const totalPages = Math.ceil(totalCount / limit);

            res.render('packingLists/List', {
                packingList,
                currentPage: page,
                totalPages,
                search: req.query.search || '',
            });

        } catch (error) {
            console.error('Error al obtener listas de empaque:', error);
            res.status(500).send('Error al cargar las listas de empaque');
        }
    },
    form: async (req, res) => {
        try {
            const invoices = await prisma.invoice.findMany({
                orderBy: { date: 'desc' }, // usamos "date" porque no existe "createdAt"
                select: {
                    id: true,
                    invoiceCode: true,
                },
            });

            const newTires = await prisma.newTire.findMany({
                orderBy: { size: 'asc' },
                include: { type: true },
            });

            const usedTires = await prisma.usedTire.findMany({
                orderBy: { size: 'asc' },
                include: { type: true },
            });

            res.render('packingLists/Form', {
                invoices,
                newTires,
                usedTires,
            });
        } catch (error) {
            console.error('Error al renderizar el formulario de lista de empaque:', error);
            res.status(500).send('Error al cargar el formulario');
        }
    },
    create: async (req, res) => {
        try {
            const { invoiceId, tires, observations } = req.body;

            // Función para generar el código tipo "PL-0001", "PL-0002", etc.
            const generatePackingCode = async () => {
            const lastList = await prisma.packingList.findFirst({
                orderBy: { id: 'desc' },
            });
            const newCodeNumber = lastList ? lastList.id + 1 : 1;
            return String(newCodeNumber).padStart(4, '0'); // genera "0001", "0002", etc.
            };

            const packingCode = await generatePackingCode();

            // Calcular totales:
            let totalQuantity = 0;
            let totalWeight = 0;
            let totalCbm = 0;

            const itemsData = tires.map(tire => {
            const quantity = parseInt(tire.quantity);
            const unitWeight = parseFloat(tire.weight);
            const cbm = parseFloat(tire.cbm);
            const subtotalWeight = quantity * unitWeight;

            totalQuantity += quantity;
            totalWeight += subtotalWeight;
            totalCbm += cbm * quantity;

            const baseData = {
                quantity,
                unitWeight,
                subtotalWeight,
                cbm,
            };

            if (tire.type === 'new') {
                return {
                ...baseData,
                newTire: { connect: { id: parseInt(tire.tireId) } },
                };
            } else {
                return {
                ...baseData,
                usedTire: { connect: { id: parseInt(tire.tireId) } },
                };
            }
            });

            // Crear la lista de empaque con totales calculados y relación invoice conectada
            const packingList = await prisma.packingList.create({
            data: {
                packingCode,
                invoice: { connect: { id: parseInt(invoiceId) } },
                totalQuantity,
                totalWeight,
                cbm: totalCbm,
                observations,
                items: {
                create: itemsData,
                },
            },
            });

            res.redirect(`/packinglist/view/${packingList.id}`);
        } catch (error) {
            console.error('Error al crear la lista de empaque:', error);
            res.status(500).send('Error al crear la lista de empaque');
        }
        },
    view: async(req, res) => {
        const { id } = req.params;
        try {
            const packingList = await prisma.packingList.findUnique({
            where: { id: parseInt(id) },
            include: {
                invoice: { include: { customer: true } },
                items: {
                include: {
                    newTire: { include: { type: true } },
                    usedTire: { include: { type: true } },
                },
                },
            },
            });

            if (!packingList) {
            return res.status(404).send('Lista de empaque no encontrada');
            }

            res.render('packingLists/View', { 
                packingList,
                isPdf: false, 
                host: req.headers.host, 
                user: req.session.user,
            });
        } catch (error) {
            console.error('Error al cargar la lista de empaque:', error);
            res.status(500).send('Error al cargar la lista de empaque');
        }
        },
        delete: async (req, res) => {
            const { id } = req.params;

            try {
                // Eliminar primero los ítems relacionados
                await prisma.packingListItem.deleteMany({
                where: {
                    packingListId: Number(id),
                },
                });

                // Luego eliminar la lista
                await prisma.packingList.delete({
                where: {
                    id: Number(id),
                },
                });

                res.redirect('/packinglist/list');
            } catch (error) {
                console.error('Error al eliminar lista de empaque:', error);
                res.status(500).send('Error al eliminar lista de empaque');
            }
            },
    exportToExcel: async (req, res) => {
        const { id } = req.params;

        try {
            const packingList = await prisma.packingList.findUnique({
                where: { id: parseInt(id) },
                include: {
                    invoice: { include: { customer: true } },
                    items: {
                        include: { newTire: true, usedTire: true }
                    }
                }
            });

            if (!packingList) return res.status(404).send('Lista de empaque no encontrada');

            const workbook = new ExcelJS.Workbook();
            const sheet = workbook.addWorksheet('Lista de Empaque');

            // 📸 Cargar imagen del logo
            const logoPath = path.join(__dirname, '../public/img/LOGO-SONIX-LTD.png');
            const logoImageId = workbook.addImage({
                filename: logoPath,
                extension: 'png',
            });

            // Insertar imagen en celda A1:C4
            sheet.addImage(logoImageId, {
                tl: { col: 0, row: 0 },
                ext: { width: 160, height: 80 }
            });

            // 🧾 Encabezado
            sheet.addRow([]);
            sheet.addRow(['Lista de Empaque:', packingList.packingCode]);
            if (packingList.invoice) {
                sheet.addRow(['Factura:', packingList.invoice.invoiceCode]);
                sheet.addRow(['Cliente:', packingList.invoice.customer?.fullName || 'N/A']);
            }
            sheet.addRow(['Fecha:', new Date(packingList.createdAt).toLocaleDateString()]);
            sheet.addRow([]);

            // 📦 Tabla de ítems
            sheet.addRow(['Llanta', 'Tipo', 'Cantidad', 'Peso x Und (kg)', 'CBM x Und (m³)']);
            packingList.items.forEach(item => {
                const tire = item.newTire || item.usedTire;
                const tipo = item.newTire ? 'Nueva' : 'Usada';
                sheet.addRow([
                    tire?.size || 'N/A',
                    tipo,
                    item.quantity,
                    item.unitWeight.toFixed(2),
                    (item.cbm ?? 0).toFixed(2)
                ]);
            });

            sheet.addRow([]);
            sheet.addRow(['Total de llantas', packingList.totalQuantity]);
            sheet.addRow(['Total de peso (kg)', packingList.totalWeight.toFixed(2)]);
            sheet.addRow(['Total CBM (m³)', packingList.cbm.toFixed(2)]);

            // 📤 Enviar archivo al cliente
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=PackingList-${packingList.packingCode}.xlsx`);

            await workbook.xlsx.write(res);
            res.end();

        } catch (error) {
            console.error('Error exportando lista de empaque:', error);
            res.status(500).send('Error al exportar lista de empaque');
        }
    }, 
};

module.exports = packingListController;