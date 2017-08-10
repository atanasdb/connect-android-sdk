var express = require('express');
var rp = require('request-promise');
var uuid = require('node-uuid');
var app = express();

var CLIENT_SUCCESS_URI = 'telenor-connect-payment-example://transactionSuccess';
var CLIENT_CANCEL_URI = 'telenor-connect-payment-example://transactionCancel';

var SERVER_LOCATION = 'http://10.0.2.2:8081';

app.get('/createTransaction', function (req, res) {
    var requiredScope = "payment.transactions.write";

    var authHeader = req.headers.authorization;
    if (!authHeader.substring(0, 7) === "Bearer ") {
        res.set('WWW-Authenticate', 'Bearer scope="' + requiredScope + '"');
        res.status(401).end();
    }

    rp({
        method: 'GET',
        qs: {
            access_token: authHeader.slice(7)
        },
        uri: 'https://connect.staging.telenordigital.com/oauth/tokeninfo'
    }).then(function(tokenValidationResponse) {
        var responseJson = JSON.parse(tokenValidationResponse);

        // Check if the required scope is part of the scopes for this access token.
        // Node.JS does not have a native String.contains method, this is shorthand for that.
        if (''.indexOf.call(responseJson.scope, requiredScope) === -1) {
            res.set('WWW-Authenticate', 'Bearer scope="' + requiredScope + '"');
            res.status(403).send('error=insufficient_scope');
        }

        var transactionId = uuid.v4();
        rp({
            body: {
                amount: "NOK 100",
                cancelRedirect: SERVER_LOCATION + "/paymentSuccess/" + transactionId,
                orderId: transactionId,
                purchaseDescription: "An item for sale",
                successRedirect: SERVER_LOCATION + "/paymentSuccess/" + transactionId,
                vatRate: "0.25"
            },
            headers: {
                'Authorization': req.headers.authorization,
            },
            json: true,
            method: 'POST',
            resolveWithFullResponse: true,
            uri: 'https://staging-payment-payment2.comoyo.com/transactions'
        }).then(function (createTransactionResponse) {
            var paymentHref;
            createTransactionResponse.body.links.forEach(function (link) {
                if (link.rel === 'PAYMENT') {
                    paymentHref = link.href;
                }
            });
            res.send({PAYMENT_LINK: paymentHref});
        }).catch(function (createTransactionError) {
            // TODO All errors that could be generated by the transactions endpoint should be
            // handled here.
            res.sendStatus(502);
        });
    }).catch(function(accessTokenError) {
        // TODO Check the error status here to see if the backend is down for example.
        res.set('WWW-Authenticate', 'Bearer scope="' + requiredScope + '"');
        res.status(401).send('error=invalid_token');
    });
});

app.get('/paymentSuccess/:transaction', function (req, res) {
    console.log('There was a successful payment for transaction: ' + req.params.transaction);
    res.redirect(CLIENT_SUCCESS_URI);
});

app.get('/paymentCancel/:transaction', function (req, res) {
    console.log('Payment for transaction: ' + req.params.transaction + ' was cancelled');
    res.redirect(CLIENT_CANCEL_URI);
});

var server = app.listen(8081, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Connect Payment example server listening at http://%s:%s', host, port);
});
