const http = require('http');
const url = require('url');
const qsutil = require('query-string');
const config = require('./config.json');
const crypto = require('crypto');
const mysql = require('mysql');
const jwt = require('jsonwebtoken');
const operationsEnum = require('./operationsEnum');

// The product code must contain a String of Alphabets of range (2,6) followed by
// a String a digits of range (2,4) without any whitespace or special character.
const PRODUCT_URL_REGEX = new RegExp('^/api/product/[A-Za-z]{2,6}[0-9]{2,4}/?$');
const PRODUCT_CODE_REGEX = new RegExp('[A-Za-z]{2,6}[0-9]{2,4}');

const TOKEN_DURATION_IN_SEC = 24*60*60; // Every Auth token lives for 24 hours strictly.
const TOKEN_DURATION_IN_MILISEC = TOKEN_DURATION_IN_SEC * 1000;

var cleanup = require('./cleanup.js');

// Utitilty function to handle and log errors on console and perform cleanup.
function handleError(error, connection, msg) {
    console.log(error);
    if (msg) console.log(msg);
    cleanup(null, connection);
}

function getMD5Hash(str) {
    return crypto.createHash('md5').update(str).digest('hex');
}

// Adding a function in String prototype to check for AlphaNumeric Values.
String.prototype.isAlphaNumeric = function() {
  var regExp = /^[A-Za-z0-9]+$/;
  return (this.match(regExp));
};

// Function to verify user Auth token
function verifyAuthToken(username, password, token, connection) {
    try {
        var decoded = jwt.verify(token, password);
        var sql = "SELECT username, password, token, tokenexpiry FROM user WHERE username = '" + decoded.user + "'";

        return connection.query(sql, function (error, rows, fields) {
            if (error){
                console.log("Error occured while accessing user token.");
            } else {
                return rows[0];
            }
        });

    } catch (ex) {
        console.log("Invalid token");
        return false;
    }

}

var connection = mysql.createConnection({
  host     : config["dbhost"],
  user     : config["dbuser"],
  password : config["dbpass"],
  database : config["dbdatabase"]
});

connection.connect();


// This will handle all the clean up work when a Ctrl+C, Unhandled exception or a normal exit occurs.
// See the code in cleanup.js
cleanup(function (dbconn) {
    console.log("Terminating Database connections");
    if(dbconn) dbconn.end();
    console.log("Exiting...");
}, connection);




var server = http.createServer(function(request, response) {

    var parsedurl = url.parse(request.url);
    var method = request.method;
    var querystring = parsedurl.query;
    var pathstring = parsedurl.pathname;

    var username = request.headers.username || "";
    var password = request.headers.password || "";
    var token = request.headers.authtoken || "";

    // Enabling Cross site request
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    response.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,contenttype'); // If needed
    response.setHeader('Access-Control-Allow-Credentials', true); // If needed




    /*  Registering User account with username and password as headers
     *
     *  Header arguments :
     *  user : Username ; 8 to 14 alphanum characters strictly
     *  pass : Password ; MD5 hash is stored in the database ; Min 8 characters
     */
    if (method == 'POST' && pathstring == "/register" )

    {
        console.log(username, password);

        var resobj = {};

        if (username.length > 16 || username.length < 6 || password.length < 8 || !username.isAlphaNumeric()) {

            resobj = { message : "username or password or both too small or large. Username must be alphanumeric in range 6-16 characters. Password must be 8 or more characters." };
            response.end(JSON.stringify(resobj));

        } else {

            // Check if User already exists
            var sql = "SELECT COUNT(*) as count FROM user WHERE username = '" + username + "'";

            connection.query(sql, function (error, rows, fields) {

                if (error) handleError(error, connection);

                console.log(rows);
                if(rows['count'] > 0) {
                    resobj = { message : "username already exists!", code : 422};
                    response.end(JSON.stringify(resobj));
                } else {

                    // User is new. Eligible for new account.
                    sql = "INSERT INTO user ( username, password, token, tokenexpiry ) VALUES ('" + username + "' , '" + getMD5Hash(password) +"' )";

                    connection.query(sql, function (error, rows, fields) {

                        if (error) handleError(error, connection);

                        resobj= {   message : "new user successfully created.",
                                    username : username,
                                    password : password,
                                    code : 200
                                };

                        response.end(JSON.stringify(resobj));
                    });
                }

                connection.end();
            });

        }
    }


    /*  Generating Auth Token
     *  operationsEnum.GETAUTHTOKEN
     *
     *  Header arguments :
     *  user : Username ; 8 to 14 alphanum characters strictly
     *  pass : Password ; MD5 hash is stored in the database ; Min 8 characters
     */
    else if (method == 'POST' && pathstring == "/authtoken")

    {
        var resobj = {};

        // Check if User already exists
        var sql = "SELECT * FROM user WHERE username = '" + username + "' AND password = '" + getMD5Hash(password) + "'";
        console.log(sql);
        connection.query(sql, function (error, rows, fields) {


            if (!error) {
                var user = rows[0];
                var tokendetectedmsg = "";

                if (user.token) {
                    tokendetectedmsg = "Existing Token Detected. Deleted the existing token and created fresh token just for you. :) Copy the token in localstorge. Token valid for 24 hours.";
                } else {
                    tokendetectedmsg = "No existing token found. Enjoy your first token. :) Copy the token in localstorge. Token valid for 24 hours.";
                }

                // GENERATING AUTHTOKEN
                jwt.sign({ user : user.username },
                    user.password,
                    {
                        expiresIn : TOKEN_DURATION_IN_SEC // 68400 seconds => 24 hours
                    },
                    function(err, token) {

                        if (err) handleError(err, connection, "Error occured during token generation...");


                        var tokenexpirytimestamp = Date.now() + TOKEN_DURATION_IN_MILISEC
                        sql = "UPDATE user SET token = '" + token.toString() + "', tokenexpiry = '" + tokenexpirytimestamp + "' WHERE username = '" + username + "'";
                        console.log(sql);

                        connection.query(sql, function (error, result){

                            if (error){
                                console.log(error);
                                handleError(error, connection, "Error occured while Storing token in database...");
                                response.end({ message : "error occured" })
                            } else {

                                resobj = {
                                    message : tokendetectedmsg,
                                    user : username,
                                    pass : password,
                                    authtoken : token
                                };

                                response.end(JSON.stringify(resobj));
                            }
                        });
                });

            }
            else {
                handleError(error, connection, "Error occured while fetching user record from database");
            }

        });

    }

    /*
     *  Return all products with paging assistance
     *  operationsEnum.LISTALLPRODUCTS
     *
     *  query parameters :
     *      startpage : page to start
     *      pagesize : size of the page
     */
    else if (method == 'GET' && pathstring == "/api/products/")

    {
        var resobj = {};

        var user = verifyAuthToken(username, password, token, connection)
        if (!user) {
            resobj = {
                message : "Request Forbidden. Illegal User token combo.",
                code : 401
            };
            response.end(JSON.stringify(resobj));
            cleanup(null, connection);
        }


        var startpage = qsutil.parse(querystring)['startpage'] || 0;
        var pagesize = qsutil.parse(querystring)['pagesize'] || 10;
        var sql = 'SELECT productcode, product.name, brand.name AS brandname FROM product JOIN brand WHERE product.brand = brand.id';
        var results = [];


        connection.query(sql, function (error, rows, fields) {
            if (error) handleError(error, connection);
            console.log(rows);
            if(rows[startpage]) {

                console.log(typeof(pagesize));
                console.log(typeof(startpage * pagesize));
                var start = startpage * pagesize;
                var i = start;
                while (i < (start + pagesize)) {

                    if (rows[i]) {
                        console.log(rows[i]);
                        results.push(rows[i]);
                    }

                    i++;
                }

                resobj = {
                    results : results, count : results.length, code : 200
                };

            }

            response.end(JSON.stringify(resobj));

            connection.end();

        });
    }

    /*
     *  Return all Brand Names with paging assistance
     *  operationsEnum.GETBRANDSLIST
     *  query parameters :
     *      startpage : page to start
     *      pagesize : size of the page
     */
    else if (method == 'GET' && pathstring == "/api/brands/")

    {

        var resobj = {};

        var user = verifyAuthToken(username, password, token, connection)
        if (!user) {
            resobj = {
                message : "Request Forbidden. Illegal User token combo.",
                code : 401
            };
            response.end(JSON.stringify(resobj));
            cleanup(null, connection);
        }

        var startpage = qsutil.parse(querystring)['startpage'] || 0;
        var pagesize = qsutil.parse(querystring)['pagesize'] || 10;
        var sql = 'SELECT brand.name AS brandname FROM brand';
        var results = [];

        connection.query(sql, function (error, rows, fields) {
            if (error) handleError(error, connection);

            if(rows[startpage]) {

                var start = startpage * pagesize;
                var i = start;
                while (i < (start + pagesize)) {

                    if (rows[i]) {
                        results.push(rows[i]);
                    }

                    i++;
                }

                resobj = {
                    results : results, count : results.length, code : 200
                };

            }

            response.end(JSON.stringify(resobj));

            connection.end();

        });
    }

    /*
     *  Search for products with paging assistance
     *  operationsEnum.SEARCHPRODUCT
     *
     *  query parameters :
     *      q : search string
     *      startpage : page to start
     *      pagesize : size of the page
     */
    else if (method == 'GET' && pathstring == "/api/products/search")

    {
        var resobj = {};

        var user = verifyAuthToken(username, password, token, connection)
        if (!user) {
            resobj = {
                message : "Request Forbidden. Illegal User token combo.",
                code : 401
            };
            response.end(JSON.stringify(resobj));
            cleanup(null, connection);
        }


        var q = qsutil.parse(querystring)['q'] || "";
        var startpage = qsutil.parse(querystring)['startpage'] || 0;
        var pagesize = qsutil.parse(querystring)['pagesize'] || 10;
        var sql = "SELECT productcode, product.name, brand.name AS brandname FROM product JOIN brand WHERE product.brand = brand.id AND product.name LIKE 'q%'";
        var results = [];

        if (!q || q.length == 0) {

            resobj = { message : "q parameter absent or illegal", code : 400};
            response.end(JSON.stringify(resobj));

        } else {

            connection.query(sql, function (error, rows, fields) {

                if (error) handleError(error, connection);

                if(rows.length && rows[startpage]) {

                    var start = startpage * pagesize;
                    var i = start;

                    while (i < (start + pagesize)) {

                        if (rows[i]) {
                            console.log(rows[i]);
                            results.push(rows[i]);
                        }

                        i++;

                    }

                    resobj = {
                        results : results, count : results.length, code : 200
                    };

                } else {

                    resobj = { meessage : "No product matched your search.", code: 404};
                }


                response.end(JSON.stringify(resobj));

                connection.end();
            });

        }

    }

    /*
     *  Returns a single product
     *  operationsEnum.GETPRODUCT
     *
     *  query parameters :
     *      code : product code
     */
    else if (method == 'GET' && pathstring == "/api/product/code" ) // Ideally it should be /api/product/code

    {

        var resobj = {};

        var user = verifyAuthToken(username, password, token, connection)
        if (!user) {
            resobj = {
                message : "Request Forbidden. Illegal User token combo.",
                code : 401
            };
            response.end(JSON.stringify(resobj));
            cleanup(null, connection);
        }


        var productcode = qsutil.parse(querystring)['code'] || "";
        var sql = "SELECT productcode, product.name, brand.name AS brandname FROM product JOIN brand WHERE product.brand = brand.id AND product.productcode = '" + productcode + "'";


        if (!productcode || productcode.length == 0) {

            resobj = { message : "CODE parameter absent or illegal", code : 400};

        } else {

            connection.query(sql, function (error, rows, fields) {

                if (error) handleError(error, connection);

                if (rows.length == 0) {
                    resobj = { message : "No Product found for this productcode", code : 204}
                } else {
                    resobj = { product : rows[0], code : 200 };
                }

                response.end(JSON.stringify(resobj));
            });
        }

    }

    /*
     *  Adds up a new product in the catalog.
     *  operationsEnum.ADDPRODUCT
     *
     *  query parameters :
     *      code : product code (string)
     *      name : product name (string alphanum + whitespace + hyphen(-) allowed)
     *      brand : brand name of your product ( GET /api/brands/  will fetch a list of brands for you. )
     *      stock : product stock (int)
     */
    else if (method == 'POST' && pathstring == "/api/products/")

    {

        var resobj = {};

        var user = verifyAuthToken(username, password, token, connection)
        if (!user) {
            resobj = {
                message : "Request Forbidden. Illegal User token combo.",
                code : 401
            };
            response.end(JSON.stringify(resobj));
            cleanup(null, connection);
        }

        response.end();
    }

    /*
     *  Adds up stocks of a product
     *  operationsEnum.ADDPRODUCTSTOCK
     *
     *  query parameters :
     *      code : product code (string)
     *      stock : product stock (int)
     */
    else if (method == 'POST' && pathstring == "/api/product")

    {
        console.log(request.headers);
        console.log(request);
        var productcode = request.headers.productcode || "";
        var stock = request.headers.stock || 0;
        var resobj = {};

        if (stock != parseInt(stock, 10) ||stock <= 0) {
            resobj = {message : "Illegal stock query parameter value. Please specify a positive natural Integer.", code : 400};
        } else if(productcode.length == 0){
            resobj = {message : "Illegal productcode query parameter value. Please specify a positive natural Integer.", code : 400};
        } else {

            var sql = "SELECT id as ProdID FROM product WHERE product.productcode = '" + productcode + "'";

            connection.query(sql, function (error, rows, fields) {

                if (error) handleError(error, connection);

                if (rows.length == 0) {
                    resobj = { message : "No Product found for this productcode", code : 204}
                } else {

                    var updatesql = "UPDATE product SET stock = stock + " + stock + " WHERE id = " + rows[0].ProdID + "";

                    connection.query(updatesql, function (err, updateedrows) {

                        if (err) throw err;

                        resobj = { message: "product stock add successfully", product : updateedrows[0], code : 200 };

                        response.end(JSON.stringify(resobj));
                    });

                }

            });

        }


    }

    /*
     *  Editing details of an existing product.
     *  operationsEnum.EDITPRODUCT
     *
     *  header parameters :
     *      name : product name (string alphanum + whitespace + hyphen(-) allowed)
     *      brand : brand name of your product ( GET /api/brands/  will fetch a list of brands for you. )
     *      stock : product stock (int)
     */
    else if (method == 'PUT' && pathstring == "/api/product/code")

    {

    }

    /*
     *  Deleting a product.
     *  operationsEnum.DELECTPRODUCT
     */
    else if (method = 'DELETE' && PRODUCT_URL_REGEX.test(pathstring))

    {
        var resobj = {};

        var productcode = PRODUCT_CODE_REGEX.exec(pathstring)[0];

        var sql = "DELETE FROM product WHERE productcode = '" + productcode + "'";

        connection.query(sql, function(error, rows, fields){
            if (error){

                handleError(error, connection, "Couldn't DELETE the product. There no product in the catalog with the provided productcode.");
                resobj = {
                    message : "Couldn't DELETE the product. There no product in the catalog with the provided productcode.",
                    code : 404
                };

                response.end(JSON.stringify(resobj));
            } else {

                resobj = {
                    message : "Successfully DELETED the product from the catalog.",
                    code : 200
                }

                response.end(JSON.stringify(resobj));
            }
        });
    }

    /*
     *  Deleting a product's stock.
     *  operationsEnum.DELECTPRODUCTSTOCK
     *
     *  stock : product stock (int)

     */
    else if (method = 'DELETE' && PRODUCT_URL_REGEX.test(pathstring))

    {
        var resobj = {};

        var productcode = PRODUCT_CODE_REGEX.exec(pathstring)[0];

        var sql = "SELECT stock WHERE productcode = '" + productcode + "'";

        connection.query(sql, function(error, rows, fields){
            if (error) {
                handleError(error, connection, "Couldn't DELETE the product. There no product in the catalog with the provided productcode.");

                resobj = {
                    message : "Couldn't DELETE the product stock. There no product in the catalog with the provided productcode.",
                    code : 404
                };

                response.end(JSON.stringify(resobj));
            } else {
                var currentstock = rows[0].stock;

                var stock = request.headers.stock || 0;
                stock = parseInt(stock);
                console.log(stock);
                console.log(typeof(stock));

                var remainstock = (currentstock - stock) > 0 ? (currentstock - stock) : 0;

                sql = "UPDATE product SET stock = " + remainstock + "WHERE productcode = '" + productcode + "'";

                connection.query(sql, function(error, rows, fields){
                    if (error) {
                        handleError(error, connection, "Error occured. Couldn't UPDATE product stock.");
                        resobj = {
                            message : "Couldn't perform the requested action. Try again.",
                            code : 500
                        }

                        response.end(JSON.stringify(resobj));
                    } else {
                        console.log(rows);

                        resobj = {
                            message : "Product stock updated successfully.",
                            code : 200
                        };

                        response.end(JSON.stringify(resobj));
                    }

                });

            }

        });

    }

    // Couldn't match any operation to url path.
    else {
        response.writeHead(400);
        response.end(JSON.stringify({ message : "Bad Request. No Action available for your request URL" , code : 400}));
    }

});

server.on('error', function (err){
    if (error) handleError(error, connection);
})

server.listen(3000);