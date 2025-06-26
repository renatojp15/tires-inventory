const express = require('express');
const app = express();
const port = 3000;
const methodOverride = require('method-override');
const session = require('express-session');
const path = require('path');

app.use(methodOverride('_method'));

//Rutas
const newTiresRoutes = require('./routes/newTiresRoutes');
const usedTiresRoutes = require('./routes/usedTiresRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const usersRoutes = require('./routes/usersRoutes');
const loginRoutes = require('./routes/loginRoutes');

app.set('view engine', 'ejs');
app.set('views', './views');

//Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Configuración de la sesión
app.use(session({
  secret: '010203090807', // cámbiala por una clave segura real
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 2 // 2 horas de sesión
  }
}));

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