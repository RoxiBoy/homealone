const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const webhookController = require('../controllers/webhookController');
const authMiddleware = require('../middleware/auth');

router.post('/webhook', webhookController.handleWebhook);

router.use(authMiddleware);

router.post('/create-checkout-session', paymentController.createCheckoutSession);
router.get('/status', paymentController.getSubscriptionStatus);
router.post('/cancel', paymentController.cancelSubscription);
router.post('/reactivate', paymentController.reactivateSubscription);

module.exports = router;
