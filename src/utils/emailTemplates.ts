interface EmailTemplateData {
  [key: string]: string;
}

const templates: { [key: string]: string } = {
  hotelBookingConfirmation: `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Confirmation de réservation</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 20px; border-radius: 8px; }
        .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
        .content { background: white; padding: 20px; }
        .booking-details { background: #f0fdf4; padding: 15px; border-left: 4px solid #10b981; margin: 20px 0; border-radius: 4px; }
        .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
        .detail-row:last-child { border-bottom: none; }
        .label { font-weight: bold; color: #059669; }
        .footer { background: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
        .btn { display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; margin-top: 20px; }
        .reference { font-size: 14px; color: #059669; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✓ Réservation Confirmée</h1>
          <p>Merci de votre confiance, {{firstName}}!</p>
        </div>
        
        <div class="content">
          <h2>Confirmation de votre réservation</h2>
          <p>Votre réservation à l'hôtel <strong>{{hotelName}}</strong> a été confirmée avec succès.</p>
          
          <div class="booking-details">
            <div class="detail-row">
              <span class="label">Référence de réservation :</span>
              <span class="reference">{{bookingReference}}</span>
            </div>
            <div class="detail-row">
              <span class="label">Check-in :</span>
              <span>{{checkIn}}</span>
            </div>
            <div class="detail-row">
              <span class="label">Check-out :</span>
              <span>{{checkOut}}</span>
            </div>
            <div class="detail-row">
              <span class="label">Montant total :</span>
              <span>{{totalPrice}} {{currency}}</span>
            </div>
          </div>
          
          <p style="color: #059669; font-weight: bold;">
            Veuillez conserver votre référence de réservation pour votre arrivée à l'hôtel.
          </p>
          
          <p style="margin-top: 20px;">
            En cas de question, consultez notre centre d'aide ou contactez notre équipe support.
          </p>
        </div>
        
        <div class="footer">
          <p>© 2026 TravEasy - Votre plateforme de voyage de confiance</p>
          <p>Email généré automatiquement - Ne pas répondre à cet email</p>
        </div>
      </div>
    </body>
    </html>
  `,

  hotelBookingCancellation: `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Annulation de réservation</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 20px; border-radius: 8px; }
        .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
        .content { background: white; padding: 20px; }
        .booking-details { background: #fef2f2; padding: 15px; border-left: 4px solid #ef4444; margin: 20px 0; border-radius: 4px; }
        .detail-row { display: flex; justify-content: space-between; padding: 10px 0; }
        .label { font-weight: bold; color: #dc2626; }
        .footer { background: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
        .reference { font-size: 14px; color: #dc2626; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Annulation de Réservation</h1>
        </div>
        
        <div class="content">
          <p>Bonjour {{firstName}},</p>
          <p>Votre réservation à l'hôtel <strong>{{hotelName}}</strong> a été annulée.</p>
          
          <div class="booking-details">
            <div class="detail-row">
              <span class="label">Référence :</span>
              <span class="reference">{{bookingReference}}</span>
            </div>
          </div>
          
          <p style="color: #dc2626; font-weight: bold;">
            Veuillez consulter les conditions d'annulation pour plus d'informations sur les remboursements.
          </p>
          
          <p>Si vous avez des questions, n'hésitez pas à nous contacter.</p>
        </div>
        
        <div class="footer">
          <p>© 2026 TravEasy</p>
        </div>
      </div>
    </body>
    </html>
  `,

  hotelBookingModification: `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Modification de réservation</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 20px; border-radius: 8px; }
        .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
        .content { background: white; padding: 20px; }
        .booking-details { background: #fffbeb; padding: 15px; border-left: 4px solid #f59e0b; margin: 20px 0; border-radius: 4px; }
        .footer { background: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
        .reference { font-size: 14px; color: #d97706; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Modification de Réservation</h1>
        </div>
        
        <div class="content">
          <p>Bonjour {{firstName}},</p>
          <p>Votre réservation à l'hôtel <strong>{{hotelName}}</strong> a été modifiée.</p>
          
          <div class="booking-details">
            <p><strong>Détails des modifications :</strong></p>
            <p>{{changeDetails}}</p>
            <p style="margin-top: 15px;"><span style="font-weight: bold;">Référence :</span> <span class="reference">{{bookingReference}}</span></p>
          </div>
          
          <p>Si vous n'avez pas demandé cette modification, veuillez nous contacter immédiatement.</p>
        </div>
        
        <div class="footer">
          <p>© 2026 TravEasy</p>
        </div>
      </div>
    </body>
    </html>
  `,

  hotelReviewRequest: `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Demande d'avis</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 20px; border-radius: 8px; }
        .header { background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
        .content { background: white; padding: 20px; }
        .stars { font-size: 24px; color: #fbbf24; margin: 15px 0; }
        .btn { display: inline-block; background: #8b5cf6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; margin-top: 20px; }
        .footer { background: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Partagez Votre Expérience</h1>
        </div>
        
        <div class="content">
          <p>Bonjour {{firstName}},</p>
          <p>Merci d'avoir séjourné à l'hôtel <strong>{{hotelName}}</strong>!</p>
          
          <p>Nous aimerions connaître votre avis sur votre expérience. Vos commentaires nous aident à améliorer nos services.</p>
          
          <div style="text-align: center;">
            <div class="stars">★★★★★</div>
            <a href="#" class="btn">Laisser un Avis</a>
          </div>
          
          <p style="margin-top: 20px; font-size: 12px; color: #6b7280;">
            Référence de réservation : <strong>{{bookingReference}}</strong>
          </p>
        </div>
        
        <div class="footer">
          <p>© 2026 TravEasy</p>
        </div>
      </div>
    </body>
    </html>
  `,
};

/**
 * Remplace les variables dans les templates
 */
export function renderTemplate(templateName: string, data: EmailTemplateData): string {
  let template = templates[templateName];

  if (!template) {
    throw new Error(`Template '${templateName}' not found`);
  }

  // Remplacer toutes les variables {{variable}}
  Object.keys(data).forEach((key) => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    template = template.replace(regex, data[key]);
  });

  return template;
}

export default {
  templates,
  renderTemplate,
};
