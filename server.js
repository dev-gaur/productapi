const http = require('http');
const url = require('url');
const qsutil = require('query-string');
const events = require('events');
const crypto = require('crypto');
const mysql = require('mysql');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const operationsEnum = require('./operationsEnum');
const HANDLERS = require('./handlers');
const UTIL = require('./utilities');

// In case things go south.
const cleanUp = require('./cleanup.js');

const TOKEN_DURATION_IN_SEC = 24*60*60; // Every Auth token lives for 24 hours strictly.
const TOKEN_DURATION_IN_MILISEC = TOKEN_DURATION_IN_SEC * 1000;

// REGULAR EXPRESSIONS TO CATCH REQUEST URLs

const PRODUCT_CODE_REGEX = new RegExp('[A-Za-z]{2,7}[0-9]{2,4}');
const PRODUCT_SEARCH_REGEX = new RegExp('^/api/products/search/?$');
const PRODUCTS_REGEX = new RegExp('^/api/products/?$');
const BRANDS_REGEX = new RegExp('^/api/brands/?$');
const AUTH_TOKEN_REGEX = new RegExp('^/authtoken/?$');
const USER_REGISTRATION_REGEX = new RegExp('^/register/?$');

// The product code must contain a String of Alphabets of range (2,6) followed by
// a String a digits of range (2,4) without any whitespace or special character.
const PRODUCT_URL_REGEX = new RegExp('^/api/product/[A-Za-z]{2,7}[0-9]{2,4}/?$');

// String in length b/w 4 and 70 are allowed
const NAME_REGEX = new RegExp('[A-Za-z0-9\s]{4,70}');

const API_REQ_REGEX = new RegExp('^/api/.+');
const AUTH_REQ_REGEX = new RegExp('^/(register|authtoken)/?$');
// Adding a function in String prototype to check for AlphaNumeric Values.
String.prototype.isAlphaNumeric = function() {
  var regExp = /^[A-Za-z0-9]+$/;
  return (this.match(regExp));
};

var DB = process.env.NODE_ENV == 'test' ? process.env.TESTDBDATABASE : process.env.DBDATABASE;

var connection = mysql.createConnection({
        host     : process.env.DBHOST,
        user     : process.env.DBUSER,
        password : process.env.DBPASS,
        database : DB
    });

connection.connect();

// GLOBAL USER OBJECT
var USER =  {
        userid : null,
        username : null,
        password : null,
        passwordMD5 : null,
        token : null,
        tokenauthenticated : false,
        accountverified : false
    };


// This will handle all the clean up work when a Ctrl+C, Unhandled exception or a normal exit occurs.
// See the code in cleanup.js
cleanUp(function (dbconn) {
        console.log("Terminating Database connections");
        if(dbconn) dbconn.end();
        console.log("Exiting...");
    }, connection);


/**** CREATING SERVER *****/

var server = http.createServer(function(request, response) {

    // USER iS RESET FOR EVERY REQUEST. ReST is STATELESS.
    USER =  {
        userid : null,
        username : null,
        password : null,
        passwordMD5 : null,
        token : null,
        tokenauthenticated : false,
        accountverified : false
    };

    USER.username = request.headers.username || "";
    USER.password = request.headers.password || "";
    USER.token = request.headers.authtoken || "";

    USER.passwordMD5 = UTIL.getMD5Hash(USER.password);

    // Enabling Cross site request
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    response.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,contenttype'); // If needed
    response.setHeader('Access-Control-Allow-Credentials', true); // If needed

    var reqbody = '';

    request.on('data', function (data){
        reqbody += data;

        if (reqbody.length > 1e6) {
            HANDLERS.handleError(null, response, "Too much POST data to handle", 403);
            request.connection.destroy();
        }

    });

    request.on('end', function () {

        var parsedurl = url.parse(request.url);
        var method = request.method;
        var pathstring = parsedurl.pathname;

        if (method == 'GET' && pathstring == "/") {
            var fs = require('fs');
            fs.readFile('index.html', function (err, data) {
                if (err) {
                    response.writeHead(501);
                    var resobj = {
                        message : "Some Error Occured. Try Again after some time.",
                        code : 501
                    };

                    response.end(JSON.stringify(resobj));
                    return;
                }

                response.writeHead(200,{
                    'Content-Length' :  Buffer.byteLength(data),
                    'Content-Type'  :   'text/html'
                });

                response.end(data.toString());
            });

            return;
        }

        reqbody = qsutil.parse(reqbody);

        if (AUTH_REQ_REGEX.test(pathstring)) {
            handleAuthRequest (request, response, reqbody);
            return;
        }

        if (API_REQ_REGEX.test(pathstring)) {
            verifyAuthToken(request, response, reqbody);
            return;
        }

        var resobj = {
                message : "Bad Request. No Action available for your request URL",
                code : 400
            };

        HANDLERS.handleResponse(response, resobj, 400);

    });

});

var port = process.env.POST || 3000;

server.listen(port, function () {
    console.log("Server running on port :" + port);
});

module.exports = server;


/** FUNCTIONS BEGIN **/

// Look at Line 161 and 220.
var eureka = new events.EventEmitter;


// Function to verify user Auth token
function verifyAuthToken(request, response, reqbody) {
    if (process.env.NODE_ENV == 'test') {
        USER.id = 1;
        USER.accountverified = true;
        eureka.emit('tommyshoo', request, response, reqbody);
        return true;
    }

    try {

        var decoded = jwt.verify(USER.token, USER.passwordMD5);

        if (decoded.user == USER.username){
            USER.tokenauthenticated = true;

            verifyUserAccount(request, response, reqbody);
            return true;
        }

        HANDLERS.handleUnauthorisedRequest(response);
        return false;

    } catch (ex) {
        HANDLERS.handleUnauthorisedRequest(response);
        return false;
    }
}

function verifyUserAccount (request, response, reqbody) {

    var sql = "SELECT * FROM user WHERE username = ? AND password = ?";

    connection.query({
        sql     : sql,
        values  : [USER.username, USER.passwordMD5]
    },
    function(error , rows){

        if(error) {
            HANDLERS.handleError(error, response);
        } else if (rows.length == 0) {
            HANDLERS.handleUnauthorisedRequest(response);
        } else if (rows.length == 1) {

            USER.accountverified = true;
            USER.userid = rows[0].id;

            eureka.emit('tommyshoo', request, response, reqbody);
        } else {
            HANDLERS.handleError(null, response);
        }

    });
}

// GAME CHANGER! REFER TO 161
eureka.on('tommyshoo', function(request, response, reqbody) {
    handleProductRequest(request, response, reqbody);
});


/* FUNCTION TO HANDLE SIGNUP and AUTH TOKEN REQUESTS!
 *
 *  the return true/false statements are there to help make the code elegant and verbose. Nothing else.
 *
 *  request : server request object
 *  response : server response object
 *  reqbody : Request body from a POST/PUT request.
 */
function handleAuthRequest (request, response, reqbody) {

    var parsedurl = url.parse(request.url);
    var method = request.method;
    var querystring = parsedurl.query;
    var pathstring = parsedurl.pathname;

    /*
     *  REGISTRATION
     *  Registering User account with username and password as headers
     *
     *  Header arguments :
     *  user : Username ; 8 to 14 alphanum characters strictly
     *  pass : Password ; MD5 hash is stored in the database ; Min 8 characters
     */
    if (method == 'POST' && USER_REGISTRATION_REGEX.test(pathstring))
    {
        var resobj = {};

        if (USER.username.length > 16 || USER.username.length < 6 || USER.password.length < 8 || !USER.username.isAlphaNumeric()) {

            resobj = {  message : "username or password or both too small or large. Username must be alphanumeric in range 6-16 characters. Password must be 8 or more characters.",
                        code : 400
                    };

            HANDLERS.handleResponse(response, resobj, 400)
            return false;
        }

        // Check if User already exists
        var sql = "SELECT COUNT(*) as count FROM user WHERE username = '" + username + "'";

        connection.query(sql, function (error, rows, fields) {

            if (error){
                HANDLERS.handleError(error, response);
                return false;
            }

            if(rows['count'] > 0) {

                    resobj = { message : "username already exists!", code : 422};
                    HANDLERS.handleResponse(response, resobj, 422)
                    return false;
            }

            // User is new. Eligible for new account.
            sql = "INSERT INTO user ( username, password ) VALUES ('" + username + "' , '" + UTIL.getMD5Hash(password) +"' )";

            connection.query(sql, function (error, rows, fields) {

                if (error){
                    handleError(error, response);
                    return false;
                }

                resobj= {
                    message : "new user successfully created.",
                    username : USER.username,
                    password : USER.password,
                        code : 200
                };

                HANDLERS.handleResponse(response, resobj, 200)

                return false;
            });
        });

    }


    /*
     *  GET AUTH TOKEN
     *  Generating Auth Token
     *
     *  Header arguments :
     *  user : Username ; 8 to 14 alphanum characters strictly
     *  pass : Password ; MD5 hash is stored in the database ; Min 8 characters
     */
    else if (method == 'POST' && AUTH_TOKEN_REGEX.test(pathstring))
    {
        var resobj = {};

        // Check if User exists
        var sql = "SELECT * FROM user WHERE username = '" + USER.username + "' AND password = '" + USER.passwordMD5 + "'";

        connection.query(sql, function (error, rows) {

            if (error) {
                HANDLERS.handleError(error, response, "Error occured while fetching user record from database");
                return false;
            }

            var user = rows[0];
            var tokendetectedmsg = "No existing token found. Enjoy your first token. :) Make a note of token somewhere. Token valid for 24 hours.";

            if (user.token)
                tokendetectedmsg = "Existing Token Detected. Deleted the existing token and generating a fresh token just for you. :) Make a note of token somewhere. Token valid for 24 hours.";

            // GENERATING AUTHTOKEN
            jwt.sign({ user : user.username },
                user.password,
                {
                    expiresIn : TOKEN_DURATION_IN_SEC // 68400 seconds => 24 hours
                },
                function(err, token) {

                    if (err){
                        HANDLERS.handleError(err, response, "Error occured during token generation...");
                        return false;
                    }

                    var tokenexpirytimestamp = Date.now() + TOKEN_DURATION_IN_MILISEC
                    sql = "UPDATE user SET token = '" + token.toString() + "', tokenexpiry = '" + tokenexpirytimestamp + "' WHERE username = '" + user.username + "'";

                    connection.query(sql, function (error, result){

                        if (error){
                            HANDLERS.handleError(error, response, "Oops! something wrong occured. Try again later.");
                            return false;
                        }

                        resobj = {
                                message : tokendetectedmsg,
                                user : USER.username,
                                pass : USER.password,
                                authtoken : token
                            };
                        USER.token = token;
                        HANDLERS.handleResponse(response, resobj, 200);
                        return true;
                    });
            });

        });

    }
}


/* FUNCTION TO HANDLE ALL THE PRODUCT and BRAND RELATED REQUESTS!
 *
 *  the return true/false statements are there to help make the code elegant and verbose. Nothing else.
 *
 *  request : server request object
 *  response : server response object
 *  reqbody : Request body from a POST/PUT request.
 */
function handleProductRequest (request, response, reqbody) {

    var parsedurl = url.parse(request.url);
    var method = request.method;
    var querystring = parsedurl.query;
    var pathstring = parsedurl.pathname;

    /*
     *  LIST ALL PRODUCTS
     *  Return all products with paging assistance
     *
     *  query parameters :
     *      startpage : page to start
     *      pagesize : size of the page
     */
    if (method == 'GET' && PRODUCTS_REGEX.test(pathstring))
    {
        var resobj = {};

        if (USER.accountverified) {
            var startpage = qsutil.parse(querystring)['startpage'] || 0;
            var pagesize = qsutil.parse(querystring)['pagesize'] || 10;
            var sql = 'SELECT productcode, product.name, brand.name AS brandname FROM product JOIN brand WHERE product.brand = brand.id';
                     + ' ORDER BY timecreated DESC';

            var results = [];

            connection.query(sql, function (error, rows, fields) {

                if (error){
                    HANDLERS.handleError(error, response);
                    return false;
                }

                if(rows[startpage]) {

                    if (rows.length == 0) {
                        resobj = {
                            message : "Not a single product present in the catalog.", code : 404
                        };

                        HANDLERS.handleResponse(response, resobj, 404);
                        // LOG THIS TRANSACTION
                        UTIL.logTransaction(connection, USER.id, productcode, operationsEnum.LISTALLPRODUCTS, 404);
                    }

                    var start = startpage * pagesize;
                    var i = start;

                    while (i < (start + pagesize)) {
                        if (rows[i])
                            results.push(rows[i]);

                            i++;
                    }

                    resobj = {
                        products : results, count : results.length, code : 200
                    };

                    HANDLERS.handleResponse(response, resobj, 200);
                    // LOG THIS TRANSACTION
                    UTIL.logTransaction(connection, USER.id, productcode, operationsEnum.LISTALLPRODUCTS, 200);
                    return true;
                }

                HANDLERS.handleError(null, response, "Oops! Something went wrong. Try again later.", 501);
                return false;

            });
        }

        return;
    }

    /*
     *  LIST ALL BRANDS
     *  Return all Brand Names with paging assistance
     *
     *  query parameters :
     *      startpage : page to start
     *      pagesize : size of the page
     */
    else if (method == 'GET' && BRANDS_REGEX.test(pathstring))
    {
        var resobj = {};

        if (USER.accountverified) {

            var startpage = qsutil.parse(querystring)['startpage'] || 0;
            var pagesize = qsutil.parse(querystring)['pagesize'] || 10;
            var sql = 'SELECT brand.name AS brandname FROM brand ORDER BY timecreated DESC';
            var results = [];

            connection.query(sql, function (error, rows, fields) {
                if (error) {
                    HANDLERS.handleError(error, response);
                    return false;
                }

                if(rows[startpage]) {

                    if (rows.length == 0) {
                        resobj = {
                            message : "Not a single brand record present in the catalog.", code : 404
                        };

                        HANDLERS.handleResponse(response, resobj, 404);
                        // LOG THIS TRANSACTION
                        UTIL.logTransaction(connection, USER.id, productcode, operationsEnum.LISTALLBRANDS, 404);
                        return false;
                    }

                    var start = startpage * pagesize;
                    var i = start;

                    while (i < (start + pagesize)) {
                        if (rows[i])
                            results.push(rows[i]);

                        i++;
                    }

                    resobj = {
                        products : results, count : results.length, code : 200
                    };

                    HANDLERS.handleResponse(response, resobj, 200);
                    // LOG THIS TRANSACTION
                    UTIL.logTransaction(connection, USER.id, productcode, operationsEnum.LISTALLBRANDS, 200);
                    return true;
                }

                handleError(null, response, "Oops! Something bad occured. Try again later.", 501);

                return false;
            });

        }
        return;
    }

    /*
     *  SEARCH PRODUCT
     *  Search for products with paging assistance
     *
     *  query parameters :
     *      q : search string
     *      startpage : page to start
     *      pagesize : size of the page
     */
    else if (method == 'GET' && PRODUCT_SEARCH_REGEX.test(pathstring))
    {
        var resobj = {};

        if (USER.accountverified) {

            var q = qsutil.parse(querystring)['q'] || "";

            q = q.toLowerCase();

            var startpage = qsutil.parse(querystring)['startpage'] || 0;
            var pagesize = qsutil.parse(querystring)['pagesize'] || 10;
            var sql = "SELECT productcode, product.name, brand.name AS brandname FROM product JOIN brand WHERE product.brand = brand.id AND lower(product.name) LIKE '" +q + "%'";

            var results = [];

            if (!q || q.length == 0) {

                resobj = { message : "q parameter absent or illegal", code : 400};
                HANDLERS.handleResponse(response, resobj, 400);

                return false;
            }

            connection.query(sql, function (error, rows, fields) {


                if(rows.length && rows[startpage]) {

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

                    HANDLERS.handleResponse(response, resobj, 200)
                    // LOG THIS TRANSACTION
                    UTIL.logTransaction(connection, USER.id, productcode, operationsEnum.SEARCHPRODUCT, 200);
                    return true;
                }

                if (rows.length == 0) {

                    resobj = { message : "No product matched your search.", code: 404};
                    HANDLERS.handleResponse(response, resobj, 404)
                    // LOG THIS TRANSACTION
                    UTIL.logTransaction(connection, USER.id, productcode, operationsEnum.SEARCHPRODUCT, 404);

                    return false;
                }

                HANDLERS.handleError(error, response);
                return false;

            });

        }
        return;
    }

    /*
     *  GET PRODUCT
     *  Returns a single product

     *
     *  query parameters :
     *      code : product code
     */
    else if (method == 'GET' && PRODUCT_URL_REGEX.test(pathstring))
    {
        var resobj = {};

        if (USER.accountverified) {

            var productcode = PRODUCT_CODE_REGEX.exec(pathstring)[0];
            var sql = "SELECT productcode, product.name, brand.name AS brandname, product.stock FROM product JOIN brand WHERE product.brand = brand.id AND product.productcode = '" + productcode + "'";

            connection.query(sql, function (error, rows, fields) {

                if (error) {
                    HANDLERS.handleError(error, response);
                    return false;
                }

                if (rows.length == 0) {
                    resobj = { message : "No Product found for this productcode", code : 404}

                    HANDLERS.handleResponse(response, resobj, 404)

                    // LOG THIS TRANSACTION
                    UTIL.logTransaction(connection, USER.id, productcode, operationsEnum.GETPRODUCT, 404, resobj.message);

                    return false;
                } else {

                    resobj = { product : rows[0], code : 200 };

                    HANDLERS.handleResponse(response, resobj, 200)
                    // LOG THIS TRANSACTION
                    UTIL.logTransaction(connection, USER.id, productcode, operationsEnum.GETPRODUCT, 200);
                    return true;
                }

            });

        }
        return;
    }

    /*
     *  ADD PRODUCT
     *  Adds up a new product record in the catalog.
     *
     *  query parameters :
     *      code : product code (string)
     *      name : product name (string alphanum + whitespace + hyphen(-) allowed)
     *      brand : brand name of your product ( GET /api/brands/  will fetch a list of brands for you. )
     *      stock : product stock (int)
     */
    else if (method == 'POST' && PRODUCTS_REGEX.test(pathstring))
    {
        var resobj = {};

        if (USER.accountverified) {

            var productcode = reqbody.code;
            var productname = reqbody.name;
            var productbrand = reqbody.brand;
            var productstock = parseInt(reqbody.stock, 10);

            var isRequestBodyValid = !productcode || !PRODUCT_CODE_REGEX.test(productcode) || !productname || !NAME_REGEX.test(productname)
                || !productbrand || !NAME_REGEX.test(productbrand) || !productstock;

            if (isRequestBodyValid) {

                resobj = {
                    message : "Bad Request: one or more invalid request header parameter values detected.",
                    code : 400
                };

                HANDLERS.handleResponse(response, resobj, 400)
                return false;
            }

            var sql = "SELECT id FROM brand WHERE name = '" + productbrand + "'";

            connection.query(sql, function (error, rows, fields){
                if (error) {
                    HANDLERS.handleError(error, response, "Bad Request: No such brand exists in the catalog.", 400)
                    return false;
                }

                if(rows[0]) {
                    var brandid = rows[0].id;

                    sql = "INSERT INTO product (productcode, name, brand, stock) VALUES ( '" + productcode + "', '" + productname + "', '" + brandid + "', " + productstock + ")";

                    connection.query(sql, function(err, result) {
                        if(err) {
                            resobj = {
                                    message : "Bad Request. A product with this code already exists.",
                                    code : 400
                                };

                            HANDLERS.handleResponse(response, resobj, 400)
                            UTIL.logTransaction(connection, USER.id, productcode, operationsEnum.ADDPRODUCT, 200, "Product code already exists");

                            return false;
                        }

                        resobj = {
                                message : "Product added successfully.",
                                code : 200,
                                product : {
                                    code : productcode,
                                    name : productname,
                                    brand : productbrand,
                                    stock : productstock
                                }
                            };

                        HANDLERS.handleResponse(response, resobj, 200)
                        // LOG THIS TRANSACTION
                        UTIL.logTransaction(connection, USER.id, productcode, operationsEnum.ADDPRODUCT, 200);

                        return true;
                    });

                    return;
                }

                HANDLERS.handleError(error, response, "Internal Server Error.", 501);
                return false;
            });
        }
        return;
    }

    /*
     *  ADD PRODUCT STOCK
     *  Adds up stocks of a product
     *
     *  query parameters :
     *      stock : product stock (int)
     */
    else if (method == 'POST' && PRODUCT_URL_REGEX.test(pathstring))
    {
        var resobj = {};

        if (USER.accountverified) {

            var productcode = PRODUCT_CODE_REGEX.exec(pathstring)[0];
            var stock = reqbody.stock;

            if (stock != parseInt(stock, 10) ||stock <= 0) {

                resobj = {message : "Illegal stock query parameter value. Please specify a positive natural Integer.", code : 400};

                HANDLERS.handleResponse(response, resobj, 400);
                return false;
            }

            var sql = "SELECT id as ProdID FROM product WHERE product.productcode = '" + productcode + "'";

            connection.query(sql, function (error, rows, fields) {

                if (error) {
                    HANDLERS.handleError(error, response);
                    return false;
                }

                if (rows.length == 0) {

                    resobj = { message : "No Product found for this productcode", code : 404}
                    HANDLERS.handleResponse(response, resobj, 404);
                    // Logging the transaction
                    UTIL.logTransaction(connection, USER.id, productcode, operationsEnum.ADDPRODUCTSTOCK, 404, resobj.message);

                    return false;
                }


                var updatesql = "UPDATE product SET stock = stock + " + stock + " WHERE id = " + rows[0].ProdID + "";

                connection.query(updatesql, function (err, updateedrows) {

                    if (err) {
                        HANDLERS.handleError(err, response, "Error while executing db query", 501);
                        return false;
                    }

                    resobj = { message: "product stock add successfully", product : updateedrows[0], code : 200 };

                    HANDLERS.handleResponse(response, resobj, 200);
                    // LOGGING THIS TRANSACTION
                    UTIL.logTransaction(connection, USER.id, productcode, operationsEnum.ADDPRODUCTSTOCK, 200);

                    return true;
                });
            });

        }
        return;
    }

    /*
     *  EDIT PRODUCT
     *  Editing details of an existing product.
     *
     *  header parameters :
     *      name : product name (string alphanum + whitespace + hyphen(-) allowed)
     *      brand : brand name of your product ( GET /api/brands/  will fetch a list of brands for you.)
     *      stock : product stock (int)
     */
    else if (method == 'PUT' && PRODUCT_URL_REGEX.test(pathstring))
    {
        var resobj = {};

        if (USER.accountverified) {

            var productcode = PRODUCT_CODE_REGEX.exec(pathstring)[0];

            var productname = reqbody.name || null;
            var productbrand = reqbody.brand || null ;
            var productstock = reqbody.stock ? parseInt(reqbody.stock, 10) : null;


            var params = {};
            if(productname)
                params['name'] = productname;

            if(productbrand)
                params['brand'] = productbrand;

            if(productstock)
                params['stock'] = productstock;

            if (!productcode && !PRODUCT_CODE_REGEX.test(productcode) && !productname && !NAME_REGEX.test(productname)
                && !productbrand && !NAME_REGEX.test(productbrand) && !productstoack && productstock.length <= 0)
            {
                resobj = {
                    message : "Bad Request: one or more invalid request header parameter values detected.",
                    code : 400
                };

                HANDLERS.handleResponse(response, resobj, 400);
                return false;
            }

            if(!productbrand){

                editProduct();

            } else {

                var sql = "SELECT * FROM brand WHERE lower(name) = '" + productbrand.toLowerCase() + "'";

                connection.query(sql, function (error, rows, fields){

                    if (error) {
                        HANDLERS.handleError(error, response, "Bad Request: No such brand exists in the catalog.", 400)
                        return false;
                    }

                    if(rows[0]) {
                        var brandid = rows[0].id;
                        editProduct(brandid);
                        return true;
                    }

                    HANDLERS.handleError(error, response, "Internal Server Error", 501);
                    return false;
                });
            }

            // THIS function is declared inside the PUT condition. Consuming a lot of outer scope variables.
            function editProduct (brandid) {
                if (params['brand'] && brandid) {
                    params['brand'] = brandid;
                } else if (params['brand']) {
                    delete params['brand'];
                }

                var sql = "UPDATE product";

                var flag = 0;
                var argstr = "";
                for (var index in params) {
                    if (params[index]) {
                        argstr += index + " = '" + params[index] + "',";
                        flag = 1;
                    }
                }

                if (!flag) {
                    HANDLERS.handleError(null, response, "Not a single valid parameter to change.", 400);
                    return false;
                }

                argstr = argstr.slice(0, -1);
                sql += " SET ";
                sql += argstr;

                sql += " WHERE lower(productcode) = '" + productcode.toLowerCase() + "'";

                connection.query(sql, function(error, result) {
                    if(error) {
                        HANDLERS.handleError(error, response);
                        return false;
                    }

                    resobj = {
                        message : "Product edited successfully.",
                        code : 200,
                        product : {
                                code : productcode,
                            }
                        };

                    if (productname) resobj.product.name = productname;
                    if (brandid && productbrand) resobj.product.brand = productbrand;
                    if (productstock) resobj.product.stock = productstock;

                    HANDLERS.handleResponse(response, resobj, 200);
                    // LOGGING THIS TRANSACTION
                    UTIL.logTransaction(connection, USER.id, productcode, operationsEnum.EDITPRODUCT, 200);
                    return true;
                });
            }

        }
        return;
    }

    /*
     *  DELETE PRODUCT
     *  Deleting a product
     *
     *  DELETE PRODUCT STOCK
     *  Deleting a product's stock.
     *
     *  Request Body params ( Only for DELETE PRODUCT STOCK) :
     *      stock : product stock (int)  IF stock parameter is absent, then operationsEnum.DELECTPRODUCT is performed.
     *
     */
    else if (method = 'DELETE' && PRODUCT_URL_REGEX.test(pathstring))
    {
        var resobj = {};

        var stock = reqbody.stock || 0;
        stock = parseInt(stock, 10);


        if (USER.accountverified) {

            var productcode = PRODUCT_CODE_REGEX.exec(pathstring)[0];
            var sql;

            if (!stock) {
                sql = "DELETE FROM product WHERE lower(productcode) = '" + productcode + "'";

                connection.query(sql, function(error, result, fields){

                    if (error) {
                        HANDLERS.handleError(response);
                        return false;
                    }

                    if (result.affectedRows) {
                        resobj = {
                                message : "Product deleted successfully.",
                                code : 200
                        };

                        HANDLERS.handleResponse(response, resobj, 200);
                        UTIL.logTransaction(connection, USER.id, productcode, operationsEnum.DELETEPRODUCT, 200);
                        return true;
                    }

                    resobj = {
                            message : "No product present with this productcode.",
                            code : 404
                        };

                    HANDLERS.handleResponse(response, resobj, 404);
                    UTIL.logTransaction(connection, USER.id, productcode, operationsEnum.DELETEPRODUCT, 200);

                    return false;
                });

                return;
            }

            sql = "SELECT stock FROM product WHERE lower(productcode) = '" + productcode + "'";

            connection.query(sql, function(error, rows, fields){

                if (error) {
                    resobj = {
                        message : "Couldn't DELETE the product stock. There no product in the catalog with the provided productcode.",
                        code : 404
                    };

                    HANDLERS.handleResponse(response, resobj, 404);
                    UTIL.logTransaction(connection, USER.id, productcode, operationsEnum.DELETEPRODUCTSTOCK, 404);
                    return false;
                }

                var currentstock = rows[0].stock;
                var remainstock = (currentstock - stock) > 0 ? (currentstock - stock) : 0;

                sql = "UPDATE product SET stock = " + remainstock + " WHERE productcode = '" + productcode + "'";

                connection.query(sql, function(error, rows, fields){

                    if (error) {

                        HANDLERS.handleError(error, response, "Error occured. Couldn't delete product stock.", 500);
                        return false;
                    }

                    resobj = {
                            message : "Product stock deleted successfully.",
                            code : 200,
                            stock_remaining : remainstock
                        };

                    HANDLERS.handleResponse(response, resobj, 200);

                    UTIL.logTransaction(connection, USER.id, productcode, operationsEnum.DELETEPRODUCTSTOCK, 200);

                    return true;
                });

            });

        }
        return;
    }

    // Couldn't match any operation to url path.

    var resobj = {
                    message : "Bad Request. No Action available for your request URL",
                    code : 400
                };

    HANDLERS.handleResponse(response, resobj, 400);


}