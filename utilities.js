var crypto = require('crypto');
var operations = require('./operationsEnum');

module.exports.getMD5Hash = function (str) {
    return crypto.createHash('md5').update(str).digest('hex');
};

module.exports.logTransaction = function (connection, userid, productcode, operationtype, httpcode, comment) {

    if (!productcode) productcode = null;
    if (!comment) comment = null;

    var sql = "INSERT INTO transaction (userid, productcode, operation, responsecode, comments ) VALUES (?, ?, ?, ?, ?)";
    connection.query({
        sql : sql,
        values : [userid, productcode, operationtype, httpcode, comment]
    },
    function (error, result) {
        if (error) {
            console.log(error);
        } else if (process.env.NODE_ENV == 'production') {
           console.log("TRANSACTION : "+ userid + "\t" + productcode + "\t" + operationtype + "\t" + httpcode + "\t" + new Date() + "\t" + comment);
        }
    });
};

