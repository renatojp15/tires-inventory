const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcrypt');
const saltRounds = 10;

const userRegister = {
    userRegisterForm: (req, res) => {
        try{
            res.render('forms/UserRegisterForm');
        }
        catch(error){
            console.error('ERROR AL CARGAR EL FORMULARIO: ', error);
            res.status(500).send('ERROR AL CARGAR EL FORMULARIO');
        }
    },
    createUser: async(req, res) => {
        const { username, fullName, role, password } = req.body;

        try {
            const hashedPassword = await bcrypt.hash(password, saltRounds);

            const user = await prisma.user.create({
                data: {
                    username,
                    fullName,
                    role,
                    password: hashedPassword
                }
            });
            res.redirect('/login')
        } 
        catch(error){
            console.error('ERROR AL REGISTRAR USUARIO:', error);
            res.status(500).send('ERROR AL REGISTRAR USUARIO');
        }
    },
};

module.exports = userRegister;