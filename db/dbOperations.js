let db = require("./db_connections.js")

const dbOperations = {
    insert: (tableName, columns, data, callback) => {
        const colMatch = columns.match(/\((.*?)\)/);
        const columnNames = colMatch ? colMatch[1].split(',').map(c => c.trim()) : [];
        const values = columnNames.map(col => data[col]);
        
        const hasValues = columns.includes('VALUES');
        let sql_query = hasValues 
            ? `INSERT INTO ${tableName} ${columns}`
            : `INSERT INTO ${tableName} ${columns} VALUES (${columnNames.map(() => '?').join(', ')})`;

        db.query(sql_query, values, function (err, result) {
            if (callback) {
                return callback(err, result);
            }
            if (err) throw err;
            console.log("1 record inserted");
        });
    },
    remove: (tableName, column, data, callback) => {
        let sql_query = `DELETE FROM ${tableName} WHERE ${column} = ${data.id}`;
        db.query(sql_query, function (err, result) {
            if (callback) {
                return callback(err, result);
            }
            if (err) throw err;
            console.log("1 record deleted");
        });
    },
    update: (tableName, data, callback) => {
        const columns = Object.keys(data).filter(key => key !== 'id');
        const setClause = columns.map(col => `${col} = ?`).join(', ');
        const values = columns.map(col => data[col]);
        values.push(data.id);
        
        let sql_query = `UPDATE ${tableName} SET ${setClause} WHERE id = ?`;

        db.query(sql_query, values, function (err, result) {
            if (callback) {
                return callback(err, result);
            }
            if (err) throw err;
            console.log("1 record updated");
        });
    },
    read: (tableName, column, callback) => {
        let sql_query = `SELECT ${column} FROM ${tableName}`;
        db.query(sql_query, function (err, result) {
            if (callback) {
                return callback(err, result);
            }
            if (err) throw err;
            return result;
        });
    },
    reset: (callback) => {
        // Delete all data from tables (in correct order to respect foreign key constraints)
        const resetSequence = [
            'DELETE FROM usage_history',
            'DELETE FROM components',
            'DELETE FROM users',
            'ALTER TABLE usage_history AUTO_INCREMENT = 1',
            'ALTER TABLE components AUTO_INCREMENT = 1',
            'ALTER TABLE users AUTO_INCREMENT = 1',
            // Create default admin user
            "INSERT INTO users (username, password, role) VALUES ('admin', '$2b$10$gSvqqUNYjJlG2j.pT8R7zu8zO2xzVGfR9QdUGK3x0f4R2H2K8aEOe', 'admin')"
        ];

        let completed = 0;
        let hasError = false;

        const executeNext = () => {
            if (completed >= resetSequence.length || hasError) {
                if (callback) {
                    return callback(hasError ? new Error('Reset failed') : null);
                }
                return;
            }

            const sql = resetSequence[completed];
            completed++;

            db.query(sql, function (err) {
                if (err) {
                    hasError = true;
                    if (callback) {
                        return callback(err);
                    }
                    return;
                }
                executeNext();
            });
        };

        executeNext();
    }
}

module.exports = dbOperations;