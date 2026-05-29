/**
 * NOTIFICATION QUEUE SERVICE
 * Utilise BullMQ pour traiter notifications async
 * Envoie emails, SMS, notifications app
 */

const Queue = require('bullmq');
const nodemailer = require('nodemailer');
const twilio = require('twilio');

// Initialiser Redis connection
const connection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined
};

// Créer queue
const notificationQueue = new Queue('notifications', { connection });

// Transporter email
const mailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Client Twilio
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

/**
 * EVENT: payment.confirmed
 * Envoyer confirmation paiement par email
 */
notificationQueue.process('payment.confirmed', async (job) => {
  try {
    const { userId, bookingId, amount, type } = job.data;

    // TODO: Récupérer email utilisateur
    const userEmail = 'user@example.com';

    await mailTransporter.sendMail({
      from: process.env.EMAIL_USER,
      to: userEmail,
      subject: 'Confirmation de paiement - Plateforme Tourisme',
      html: `
        <h2>Paiement confirmé</h2>
        <p>Votre paiement de ${amount} MAD a été traité avec succès.</p>
        <p>Réservation: ${bookingId}</p>
        <p>Type: ${type}</p>
      `
    });

    return { success: true };
  } catch (error) {
    console.error('Payment confirmation email error:', error);
    throw error;
  }
});

/**
 * EVENT: refund.requested
 * Notifier admin de demande remboursement
 */
notificationQueue.process('refund.requested', async (job) => {
  try {
    const { userId, paymentId, reason } = job.data;

    // Notifier admins
    await mailTransporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.ADMIN_EMAIL,
      subject: 'Nouvelle demande de remboursement',
      html: `
        <h2>Demande de remboursement</h2>
        <p>Utilisateur: ${userId}</p>
        <p>Paiement: ${paymentId}</p>
        <p>Raison: ${reason}</p>
      `
    });

    return { success: true };
  } catch (error) {
    console.error('Refund notification error:', error);
    throw error;
  }
});

/**
 * EVENT: booking.confirmation
 * Envoyer confirmation réservation
 */
notificationQueue.process('booking.confirmation', async (job) => {
  try {
    const { userId, bookingId, type, details } = job.data;

    // Email confirmation
    await mailTransporter.sendMail({
      from: process.env.EMAIL_USER,
      to: details.email,
      subject: 'Confirmation de réservation',
      html: `
        <h2>Réservation confirmée</h2>
        <p>Numéro: ${bookingId}</p>
        <p>Type: ${type}</p>
        <p>Date: ${new Date(details.date).toLocaleDateString('fr-FR')}</p>
      `
    });

    // SMS reminder (24h avant)
    if (details.phone) {
      await twilioClient.messages.create({
        body: `Rappel: Votre réservation ${bookingId} demain à ${details.time}`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: details.phone
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Booking confirmation error:', error);
    throw error;
  }
});

/**
 * EVENT: review.submitted
 * Notifier utilisateur qu'on a reçu son avis
 */
notificationQueue.process('review.submitted', async (job) => {
  try {
    const { userId, itemId, rating } = job.data;

    // Email remerciement
    await mailTransporter.sendMail({
      from: process.env.EMAIL_USER,
      to: 'user@example.com',
      subject: 'Merci pour votre avis',
      html: `
        <h2>Avis reçu</h2>
        <p>Merci d'avoir évalué cette réservation avec ${rating} étoiles.</p>
      `
    });

    return { success: true };
  } catch (error) {
    console.error('Review notification error:', error);
    throw error;
  }
});

/**
 * EVENT: support.ticket.created
 * Notifier utilisateur ticket créé
 */
notificationQueue.process('support.ticket.created', async (job) => {
  try {
    const { userId, ticketId, subject } = job.data;

    await mailTransporter.sendMail({
      from: process.env.EMAIL_USER,
      to: 'user@example.com',
      subject: `Support: Ticket #${ticketId}`,
      html: `
        <h2>Ticket de support créé</h2>
        <p>Numéro: ${ticketId}</p>
        <p>Sujet: ${subject}</p>
        <p>Notre équipe traitera votre demande sous 24h.</p>
      `
    });

    return { success: true };
  } catch (error) {
    console.error('Support ticket notification error:', error);
    throw error;
  }
});

/**
 * EVENT: support.ticket.resolved
 * Notifier utilisateur ticket résolu
 */
notificationQueue.process('support.ticket.resolved', async (job) => {
  try {
    const { userId, ticketId, response } = job.data;

    await mailTransporter.sendMail({
      from: process.env.EMAIL_USER,
      to: 'user@example.com',
      subject: `Support: Ticket #${ticketId} résolu`,
      html: `
        <h2>Ticket de support résolu</h2>
        <p>Numéro: ${ticketId}</p>
        <p>Réponse: ${response}</p>
      `
    });

    return { success: true };
  } catch (error) {
    console.error('Ticket resolved notification error:', error);
    throw error;
  }
});

/**
 * Ajouter job à queue
 */
async function addToQueue(eventName, data, options = {}) {
  try {
    const defaultOptions = {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      },
      removeOnComplete: true
    };

    await notificationQueue.add(eventName, data, { ...defaultOptions, ...options });
  } catch (error) {
    console.error('Error adding to queue:', error);
    throw error;
  }
}

/**
 * Obtenir statistiques queue
 */
async function getQueueStats() {
  try {
    const counts = await notificationQueue.getJobCounts();
    return {
      active: counts.active,
      completed: counts.completed,
      failed: counts.failed,
      delayed: counts.delayed,
      waiting: counts.waiting
    };
  } catch (error) {
    console.error('Error getting queue stats:', error);
    return null;
  }
}

module.exports = {
  queue: notificationQueue,
  addToQueue,
  getQueueStats
};
