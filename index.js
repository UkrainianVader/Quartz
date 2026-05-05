const express = require('express');
const session = require('express-session');
const dotenv = require('dotenv');
<<<<<<< HEAD
const authRoutes = require('./api/authRoutes');
const mainRoutes = require('./api/mainRoutes');
const componentsRoutes = require('./api/componentsRoutes');
const assignmentsRoutes = require('./api/assignmentsRoutes');
const usersRoutes = require('./api/usersRoutes');
const reportRoutes = require('./api/reportRoutes');
=======
const authRoutes = require('./authRoutes');
const mainRoutes = require('./mainRoutes');
const componentsRoutes = require('./componentsRoutes');
const assignmentsRoutes = require('./assignmentsRoutes');
const usersRoutes = require('./usersRoutes');
const reportRoutes = require('./reportRoutes');
>>>>>>> 705ca22d3c926000b4c195410cf1d0a028bf83c1
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

<<<<<<< HEAD
=======
// removed EJS view engine and legacy public assets — server now exposes API only
>>>>>>> 705ca22d3c926000b4c195410cf1d0a028bf83c1
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'verysecretkey',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: false,
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
}));

app.use('/', authRoutes);
app.use('/', mainRoutes);
app.use('/', componentsRoutes);
app.use('/', assignmentsRoutes);
app.use('/', usersRoutes);
app.use('/', reportRoutes);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})