const express = require('express');
const session = require('express-session');
const dotenv = require('dotenv');
const authRoutes = require('./api/authRoutes');
const mainRoutes = require('./api/mainRoutes');
const systemRoutes = require('./api/systemRoutes');
const componentsRoutes = require('./api/componentsRoutes');
const assignmentsRoutes = require('./api/assignmentsRoutes');
const usersRoutes = require('./api/usersRoutes');
const reportRoutes = require('./api/reportRoutes');
const dbRoutes = require('./api/dbRoutes');
const { getServerAccessInfo } = require('./utils/networkInfo');
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.set('port', port);

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
app.use('/', systemRoutes);
app.use('/', componentsRoutes);
app.use('/', assignmentsRoutes);
app.use('/', usersRoutes);
app.use('/', reportRoutes);
app.use('/', dbRoutes);

app.listen(port, () => {
  const serverInfo = getServerAccessInfo(port);

  console.log(`Server listening on port ${port}`);
  console.log(`Local access: ${serverInfo.localUrls.join(', ') || serverInfo.localhostUrl}`);
})