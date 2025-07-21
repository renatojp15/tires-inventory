const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const vehicleTypeController = {
    form: async (req, res) => {
        try {
            res.render('tireTypes/Form', {
            title: 'Registrar Tipo de Vehículo',
            tireType: null,
            action: '/tiretypes/create',
            method: 'POST'
            });
        } catch (error) {
            console.error('ERROR AL MOSTRAR EL FORMULARIO DE TIPO DE VEHÍCULO:', error);
            res.status(500).send('ERROR AL MOSTRAR EL FORMULARIO DE TIPO DE VEHÍCULO');
        }
        },
    create: async (req, res) => {
        try {
            const { name } = req.body;
            await prisma.tireType.create({
            data: { name }
            });
            res.redirect('/tiretypes/list');
        } catch (error) {
            console.error('Error al crear tipo de vehículo:', error);
            res.status(500).send('Error al crear tipo de vehículo');
        }
        },
    list: async (req, res) => {
        try {
        const search = req.query.search || '';
        const types = await prisma.tireType.findMany({
            where: {
            name: {
                contains: search,
                mode: 'insensitive',
            },
            },
            orderBy: {
            name: 'asc',
            },
        });

        res.render('tireTypes/list', {
            title: 'Lista de Tipos de Vehículo',
            tireTypes: types,
            search,
        });
        } catch (error) {
        console.error('Error al listar tipos de vehículos:', error);
        res.status(500).send('Error al listar tipos');
        }
    },
    editForm: async (req, res) => {
        try {
        const { id } = req.params;
        const tireType = await prisma.tireType.findUnique({ where: { id: parseInt(id) } });

        if (!tireType) return res.status(404).send('Tipo de vehículo no encontrado');

        res.render('tireTypes/Form', {
            title: 'Editar Tipo de Vehículo',
            tireType,
            action: `/tiretypes/edit/${id}`,
            method: 'POST'
        });
        } catch (error) {
        console.error('Error al mostrar formulario de edición:', error);
        res.status(500).send('Error al mostrar formulario');
        }
    },
    update: async (req, res) => {
        try {
        const { id } = req.params;
        const { name } = req.body;

        await prisma.tireType.update({
            where: { id: parseInt(id) },
            data: { name },
        });

        res.redirect('/tiretypes/list');
        } catch (error) {
        console.error('Error al actualizar tipo de vehículo:', error);
        res.status(500).send('Error al actualizar tipo');
        }
    },
    delete: async (req, res) => {
        try {
        const { id } = req.params;

        await prisma.tireType.delete({
            where: { id: parseInt(id) },
        });

        res.redirect('/tiretypes/list');
        } catch (error) {
        console.error('Error al eliminar tipo de vehículo:', error);
        res.status(500).send('Error al eliminar tipo');
        }
    }
};

module.exports = vehicleTypeController;