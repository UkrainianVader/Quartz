let mysql = require('mysql2');
let bcrypt = require('bcrypt');
let dotenv = require('dotenv');
dotenv.config();

let con = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD
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
    \`returned_broken\` tinyint(1) NOT NULL DEFAULT 0,
    PRIMARY KEY (\`id\`),
    CONSTRAINT \`fk_user\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL,
    CONSTRAINT \`fk_equipment\` FOREIGN KEY (\`equipment_id\`) REFERENCES \`components\` (\`id\`) ON DELETE CASCADE
  )`, callback);
};

const ensureUsageHistoryReturnedBrokenColumn = (callback) => {
  con.query(
    `SELECT COUNT(*) AS columnCount
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = 'usage_history'
       AND COLUMN_NAME = 'returned_broken'`,
    [process.env.DB_NAME],
    (err, rows) => {
      if (err) {
        return callback(err);
      }

      if (rows[0]?.columnCount > 0) {
        return callback();
      }

      con.query(
        'ALTER TABLE `usage_history` ADD COLUMN `returned_broken` tinyint(1) NOT NULL DEFAULT 0 AFTER `date_returned`',
        callback
      );
    }
  );
};

const ensureSearchComponentsProcedure = (callback) => {
  con.query('DROP PROCEDURE IF EXISTS search_components', function(dropErr) {
    if (dropErr) {
      return callback(dropErr);
    }

    con.query(`CREATE PROCEDURE search_components(
      IN p_query VARCHAR(255),
      IN p_status VARCHAR(255),
      IN p_type VARCHAR(255),
      IN p_user_id INT,
      IN p_is_admin TINYINT
    )
    SELECT DISTINCT c.*
    FROM components c
    LEFT JOIN usage_history uh
      ON uh.equipment_id = c.id
      AND uh.date_returned IS NULL
    WHERE
      (p_is_admin = 1 OR uh.user_id = p_user_id)
      AND (
        p_query IS NULL OR p_query = ''
        OR LOWER(c.name) LIKE CONCAT('%', LOWER(p_query), '%')
        OR LOWER(c.serial) LIKE CONCAT('%', LOWER(p_query), '%')
        OR LOWER(c.type) LIKE CONCAT('%', LOWER(p_query), '%')
        OR LOWER(IFNULL(c.description, '')) LIKE CONCAT('%', LOWER(p_query), '%')
      )
      AND (p_status IS NULL OR p_status = '' OR c.status = p_status)
      AND (p_type IS NULL OR p_type = '' OR c.type = p_type)
    ORDER BY c.id DESC`, callback);
  });
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

            ensureUsageHistoryReturnedBrokenColumn(function(schemaErr) {
              if (schemaErr) throw schemaErr;

              ensureSearchComponentsProcedure(function(procErr) {
                if (procErr) throw procErr;

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
  });
});

module.exports = con;