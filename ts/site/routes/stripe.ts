import * as express from 'express';

import Stripe = require('stripe');

import config = require('@config');


// const stripe = new Stripe(config.stripe.publishable_key);

function errorHandler(error: any) {
	switch (error.type) {
		case 'StripeCardError':
			// A declined card error
			error.message; // => e.g. "Your card's expiration year is invalid."
			break;
		case 'RateLimitError':
			// Too many requests made to the API too quickly
			break;
		case 'StripeInvalidRequestError':
			// Invalid parameters were supplied to Stripe's API
			break;
		case 'StripeAPIError':
			// An error occurred internally with Stripe's API
			break;
		case 'StripeConnectionError':
			// Some kind of error occurred during the HTTPS communication
			break;
		case 'StripeAuthenticationError':
			// You probably used an incorrect API key
			break;
		default:
			// Handle any other types of unexpected errors
			break;
	}
}


/**
 * Possible Plans
 * 	- Need plan names
 * 	- Need actual features that will go into the plans.
 *
 * Basic
 * 	- $5/1M
 * 	- $25/6M
 * 	- $50/1Y
 * Features:
 * 	-
 *
 * Advanced
 * 	- $8/1M
 * 	- $40/6M
 * 	- $80/1Y
 * Features:
 * 	- Full Analytics
 *
 * Premium
 * 	- $15/1M
 * 	- $75/6M
 * 	- $150/1Y
 * Features:
 * 	-
 */


export = (app: express.Application) => {
	app.post('/stripe/webhook', (req, res) => {
		// var stripeResponse: Stripe.events.IEvent = req.body;
		console.log(req.body);

		res.sendStatus(200);
	});
};