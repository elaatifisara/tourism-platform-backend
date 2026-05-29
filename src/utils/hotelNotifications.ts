import nodemailer from 'nodemailer';
import { renderTemplate } from './emailTemplates';

interface BookingEmailData {
  email: string;
  firstName: string;
  hotelName: string;
  checkIn: string;
  checkOut: string;
  totalPrice: string;
  currency: string;
  bookingReference: string;
}

// Configurer le transporteur email
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.mailtrap.io',
  port: parseInt(process.env.EMAIL_PORT || '2525'),
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

/**
 * Envoie un email de confirmation de réservation d'hôtel
 */
export async function sendBookingEmail(data: BookingEmailData) {
  try {
    const htmlTemplate = renderTemplate('hotelBookingConfirmation', {
      firstName: data.firstName,
      hotelName: data.hotelName,
      checkIn: data.checkIn,
      checkOut: data.checkOut,
      totalPrice: data.totalPrice,
      currency: data.currency,
      bookingReference: data.bookingReference,
    });

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@travelesy.com',
      to: data.email,
      subject: `Confirmation de réservation - ${data.hotelName}`,
      html: htmlTemplate,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email envoyé:', info.messageId);
    return info;
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email:', error);
    throw error;
  }
}

/**
 * Envoie un email d'annulation de réservation
 */
export async function sendCancellationEmail(
  email: string,
  firstName: string,
  hotelName: string,
  bookingReference: string,
) {
  try {
    const htmlTemplate = renderTemplate('hotelBookingCancellation', {
      firstName,
      hotelName,
      bookingReference,
    });

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@travelesy.com',
      to: email,
      subject: `Annulation de réservation - ${hotelName}`,
      html: htmlTemplate,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email d\'annulation envoyé:', info.messageId);
    return info;
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email d\'annulation:', error);
    throw error;
  }
}

/**
 * Envoie une notification de modification de réservation
 */
export async function sendModificationEmail(
  email: string,
  firstName: string,
  hotelName: string,
  bookingReference: string,
  changeDetails: string,
) {
  try {
    const htmlTemplate = renderTemplate('hotelBookingModification', {
      firstName,
      hotelName,
      bookingReference,
      changeDetails,
    });

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@travelesy.com',
      to: email,
      subject: `Modification de réservation - ${hotelName}`,
      html: htmlTemplate,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email de modification envoyé:', info.messageId);
    return info;
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email de modification:', error);
    throw error;
  }
}

/**
 * Envoie une notification d'évaluation de réservation
 */
export async function sendReviewRequestEmail(
  email: string,
  firstName: string,
  hotelName: string,
  bookingReference: string,
) {
  try {
    const htmlTemplate = renderTemplate('hotelReviewRequest', {
      firstName,
      hotelName,
      bookingReference,
    });

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@travelesy.com',
      to: email,
      subject: `Votre avis nous intéresse - ${hotelName}`,
      html: htmlTemplate,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email de demande d\'avis envoyé:', info.messageId);
    return info;
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email de demande d\'avis:', error);
    throw error;
  }
}

export default {
  sendBookingEmail,
  sendCancellationEmail,
  sendModificationEmail,
  sendReviewRequestEmail,
};
