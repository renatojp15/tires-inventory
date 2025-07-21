const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const ITEMS_PER_PAGE = 10;

const customerController = {
    customerForm: async(req, res) => {
        try{
            res.render('customers/Form', {
            title: 'Registrar Cliente',
            customer: null, // Para diferenciar entre "crear" y "editar"
            action: '/customers/create', // Ruta que manejará el POST del formulario
            method: 'POST'
        });
        }
        catch(error){
            console.error('ERROR AL CARGAR EL FORMULARIO DE CLIENTE:', error);
            res.status(500).send('ERROR AL CARGAR EL FORMULARIO DE CLIENTE');
        }
    },
    createCustomer: async (req, res) => {
        try {
            const { fullName, idNumber, phone, address } = req.body;

            await prisma.customer.create({
            data: {
                fullName,
                idNumber,
                phone,
                address,
            },
            });
            res.redirect('/quotations/form');
        } catch (error) {
            console.error('ERROR AL REGISTRAR CLIENTE:', error);
            res.status(500).send('ERROR AL REGISTRAR CLIENTE');
        }
        },
    editCustomerForm: async(req, res) => {
        try {
            const { id } = req.params;
            const customer = await prisma.customer.findUnique({
            where: { id: Number(id) }
            });

            if (!customer) {
            return res.status(404).send('Cliente no encontrado');
            }

            res.render('customers/Form', {
            title: 'Editar Cliente',
            customer,
            action: `/customers/edit/${id}`,
            method: 'POST'
            });
        } catch (error) {
            console.error('ERROR AL CARGAR FORMULARIO DE EDICIÓN DE CLIENTE:', error);
            res.status(500).send('ERROR AL CARGAR FORMULARIO DE EDICIÓN');
        }
        },
        updateCustomer: async (req, res) => {
        try {
            const { id } = req.params;
            const { name, phone, address, idNumber } = req.body;

            await prisma.customer.update({
            where: { id: Number(id) },
            data: {
                name,
                phone,
                address,
                idNumber
            }
            });

            res.redirect('/customers/list');
        } catch (error) {
            console.error('ERROR AL ACTUALIZAR CLIENTE:', error);
            res.status(500).send('ERROR AL ACTUALIZAR CLIENTE');
        }
        },
        listCustomers: async (req, res) => {
            try {
            const page = parseInt(req.query.page) || 1;
            const search = req.query.search || '';

            const where = {
                OR: [
                { fullName: { contains: search, mode: 'insensitive' } },
                { idNumber: { contains: search, mode: 'insensitive' } },
                ],
            };

            const totalCustomers = await prisma.customer.count({ where });

            const customers = await prisma.customer.findMany({
                where,
                skip: (page - 1) * ITEMS_PER_PAGE,
                take: ITEMS_PER_PAGE,
                orderBy: { fullName: 'asc' },
            });

            const totalPages = Math.ceil(totalCustomers / ITEMS_PER_PAGE);

            res.render('customers/List', {
                title: 'Lista de Clientes',
                customers,
                currentPage: page,
                totalPages,
                search,
            });
            } catch (error) {
            console.error('ERROR AL CARGAR LA LISTA DE CLIENTES:', error);
            res.status(500).send('Error al cargar la lista de clientes');
            }
        },
        deleteCustomer: async (req, res) => {
            const { id } = req.params;
            try {
                // Verifica si existe
                const customer = await prisma.customer.findUnique({ where: { id: parseInt(id) } });

                if (!customer) {
                return res.status(404).send('Cliente no encontrado');
                }

                // Elimina el cliente
                await prisma.customer.delete({
                where: { id: parseInt(id) }
                });

                res.redirect('/customers/list');
            } catch (error) {
                console.error('Error al eliminar cliente:', error);
                res.status(500).send('Error interno al eliminar el cliente');
            }
            }
};

module.exports = customerController;