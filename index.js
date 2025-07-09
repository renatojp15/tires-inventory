const express = require('express');
const app = express();
const port = 3000;
const methodOverride = require('method-override');
const session = require('express-session');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

//Rutas
const newTiresRoutes = require('./routes/newTiresRoutes');
const usedTiresRoutes = require('./routes/usedTiresRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const usersRoutes = require('./routes/usersRoutes');
const loginRoutes = require('./routes/loginRoutes');

app.set('view engine', 'ejs');
app.set('views', './views');

//Middlewares de Terceros
app.use(methodOverride('_method'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Configuración de la sesión
app.use(session({
  secret: '010203090807', // Clave super secreta
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 2 // 2 horas de sesión
  }
}));

/* -------- ① currentUser + alertas -------- */
app.use(async (req, res, next) => {
  if (req.session.user) {
    // Disponible en EJS: <%= currentUser.name %>
    res.locals.currentUser = req.session.user;

    // Alertas de stock sin resolver
    res.locals.alerts = await prisma.stockAlert.findMany({
      where: { resolved: false },
      orderBy: { createdAt: 'desc' },
      include: { NewTire: true, UsedTire: true },
    });
  } else {
    res.locals.currentUser = null;
    res.locals.alerts = [];
  }
  next();
});

//Ruta de prueba
app.get('/', (req, res) => {
    res.send('Servidor corriendo')
});

//Rutas de llantas
app.use('/newtires', newTiresRoutes);
app.use('/usedtires', usedTiresRoutes);
app.use('/invoices', invoiceRoutes);
app.use('/users', usersRoutes);
app.use('/login', loginRoutes);

//Middleware para asegurar que cualquier vaya a consola
process.on('unhandledRejection', (reason) => {
  console.error('↯  Unhandled Rejection:\n', reason);
});
process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:\n', err);
});

//Iniciar servidor
app.listen(port, '0.0.0.0', () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});