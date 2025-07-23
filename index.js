const express = require('express');
const app = express();
const port = 3000;
const methodOverride = require('method-override');
const session = require('express-session');
const flash = require('connect-flash');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

//Rutas
const newTiresRoutes = require('./routes/newTiresRoutes');
const usedTiresRoutes = require('./routes/usedTiresRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const usersRoutes = require('./routes/usersRoutes');
const loginRoutes = require('./routes/loginRoutes');
const alertsRoutes = require('./routes/alertsRoutes');
const quotationRoutes = require('./routes/quotationRoutes');
const customerRoutes = require('./routes/customerRoutes');
const tireTypeRoutes = require('./routes/tireTypeRoutes');
const packingListRoutes = require('./routes/packingListRoutes');

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

// Configurar flash
app.use(flash());

// Middleware para pasar mensajes flash a todas las vistas
app.use((req, res, next) => {
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  next();
});

/* -------- ① currentUser + alertas -------- */
app.use(async (req, res, next) => {
  res.locals.currentUser = req.session.user;

  try{
  // Cargar alertas no resueltas
  res.locals.alerts = await prisma.stockAlert.findMany({
    where: { resolved: false },
    orderBy: { createdAt: 'desc' },
    include: {
      newTire: {
        include: { brand: true, type: true }
      },
      usedTire: {
        include: { brand: true, type: true }
      }
    }
  });
} catch(error){
    console.error('Error cargando alertas:', error);
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
app.use('/alerts', alertsRoutes);
app.use('/quotations', quotationRoutes);
app.use('/customers', customerRoutes);
app.use('/tiretypes', tireTypeRoutes);
app.use('/packinglist', packingListRoutes);

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