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
    query: (sql_query, callback) => {
        db.query(sql_query, function (err, result) {
            if (callback) {
                return callback(err, result);
            }
            if (err) throw err;
            return result;
        });
    }
}

module.exports = dbOperations;