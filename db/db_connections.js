let mysql = require('mysql2');
let bcrypt = require('bcrypt');
let dotenv = require('dotenv');
dotenv.config();

let con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME, // Додай це сюди
  multipleStatements: true       // Дозволить виконувати кілька запитів
});

const ensureComponentsTable = (callback) => {
  con.query(`CREATE TABLE IF NOT EXISTS \`components\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`name\` varchar(255) DEFAULT NULL,
    \`type\` varchar(255) DEFAULT NULL,
    \`serial\` varchar(255) DEFAULT NULL,
    \`status\` varchar(255) DEFAULT NULL,
    \`description\` text,
    PRIMARY KEY (\`id\`),
    UNIQUE KEY \`serial\` (\`serial\`)
  )`, callback);
};

const ensureUsersTable = (callback) => {
  con.query(`CREATE TABLE IF NOT EXISTS \`users\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`username\` text,
    \`password\` text,
    \`role\` varchar(50) DEFAULT 'user',
    PRIMARY KEY (\`id\`)
  )`, callback);
};

const ensureUsageHistoryTable = (callback) => {
  con.query(`CREATE TABLE IF NOT EXISTS \`usage_history\` (
    \`id\` int NOT NULL AUTO_INCREMENT,
    \`user_id\` int DEFAULT NULL,
    \`username\` text,
    \`equipment_id\` int NOT NULL,
    \`date_taken\` datetime DEFAULT CURRENT_TIMESTAMP,
    \`date_returned\` datetime DEFAULT NULL,
    PRIMARY KEY (\`id\`),
    CONSTRAINT \`fk_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL,
    CONSTRAINT \`fk_equipment\` FOREIGN KEY (\`equipment_id\`) REFERENCES \`components\` (\`id\`) ON DELETE CASCADE
  )`, callback);
};

const ensureAdminUser = (callback) => {
  bcrypt.hash('admin', 10, function(hashErr, hashedPassword) {
    if (hashErr) {
      return callback(hashErr);
    }

    con.query(
      `INSERT IGNORE INTO \`users\` (id, username, password, role) VALUES (?, ?, ?, ?)`,
      [1, 'admin', hashedPassword, 'admin'],
      callback
    );
  });
};

con.connect(function(err) {
  if (err) throw err;

  con.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\``, function(dbErr) {
    if (dbErr) throw dbErr;

    con.changeUser({ database: process.env.DB_NAME }, function(changeErr) {
      if (changeErr) throw changeErr;

      ensureComponentsTable(function(componentsErr) {
        if (componentsErr) throw componentsErr;

        ensureUsersTable(function(usersErr) {
          if (usersErr) throw usersErr;

          ensureUsageHistoryTable(function(usageErr) {
            if (usageErr) throw usageErr;

            ensureAdminUser(function(adminErr) {
              if (adminErr) throw adminErr;
              console.log("Connected!");
            });
          });
        });
      });
    });
  });
});

module.exports = con;