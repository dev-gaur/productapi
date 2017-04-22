function handleResponse(response, resobj, code) {
    resobj = JSON.stringify(resobj);

    if(!code) code = 200;

    response.writeHead(code,{
        'Content-Length' :  Buffer.byteLength(resobj, 'utf-8'),
        'Content-Type'  :   'application/json'
    });

    response.end(resobj);

};

// Utitilty function to handle and log errors on console and perform cleanup.
function handleError(error, response, msg, code) {

    console.log(msg);
    console.log("Error Occured : " + error);

    if (!msg) msg = "Some Error Occured. Try Again after some time."
    if (!code) code = 501;

    var resobj = {
                    message : msg,
                    code : code
                };

    handleResponse(response, resobj, code);

}

// Utitilty function to handle Unauthorized request.
function handleUnauthorisedRequest(response) {

    var resobj = {
        message : "User Unauthenticated. Include your username, password and auth-token in the request header. To get an auth token : /authtoken",
        code : 401
    };

    handleResponse(response, resobj, 401);
}


module.exports.handleResponse = handleResponse;
module.exports.handleError = handleError;
module.exports.handleUnauthorisedRequest = handleUnauthorisedRequest;