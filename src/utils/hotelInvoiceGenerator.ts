import PDFDocument from 'pdfkit';
import fs from 'fs/promises';
import path from 'path';

interface InvoiceData {
  bookingId: number;
  hotelName: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  totalPrice: string;
  currency: string;
  nightsCount?: number;
  roomType?: string;
  mealPlan?: string;
  amadeusRef?: string;
}

/**
 * Génère une facture PDF pour une réservation d'hôtel
 */
export async function generateInvoicePDF(data: InvoiceData): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      // Créer le dossier des factures s'il n'existe pas
      const invoicesDir = path.join(process.cwd(), 'public', 'invoices', 'hotels');
      await fs.mkdir(invoicesDir, { recursive: true });

      // Chemin du fichier PDF
      const fileName = `hotel_invoice_${data.bookingId}_${Date.now()}.pdf`;
      const filePath = path.join(invoicesDir, fileName);

      // Créer un nouveau document PDF
      const doc = new PDFDocument({
        margin: 50,
        size: 'A4',
      });

      // Pipe vers le fichier
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      // En-tête
      doc.fontSize(24).font('Helvetica-Bold').text('FACTURE', { align: 'center' });
      doc.fontSize(12).font('Helvetica').text('TravEasy - Plateforme de Voyage', { align: 'center' });

      // Ligne de séparation
      doc.moveTo(50, doc.y + 10).lineTo(550, doc.y + 10).stroke();
      doc.moveDown();

      // Informations de la facture
      doc.fontSize(10).font('Helvetica-Bold').text('INFORMATIONS DE FACTURE', { underline: true });
      doc.fontSize(9).font('Helvetica');
      doc.text(`Numéro de réservation : ${data.bookingId}`);
      doc.text(`Date : ${new Date().toLocaleDateString('fr-FR')}`);
      doc.text(`Référence Amadeus : ${data.amadeusRef || 'N/A'}`);
      doc.moveDown();

      // Informations client
      doc.fontSize(10).font('Helvetica-Bold').text('CLIENT', { underline: true });
      doc.fontSize(9).font('Helvetica');
      doc.text(`Nom : ${data.guestName}`);
      doc.moveDown();

      // Détails de l'hôtel
      doc.fontSize(10).font('Helvetica-Bold').text('DÉTAILS DE LA RÉSERVATION', { underline: true });
      doc.fontSize(9).font('Helvetica');
      doc.text(`Hôtel : ${data.hotelName}`);
      doc.text(`Check-in : ${data.checkIn}`);
      doc.text(`Check-out : ${data.checkOut}`);

      if (data.nightsCount) {
        doc.text(`Nombre de nuits : ${data.nightsCount}`);
      }
      if (data.roomType) {
        doc.text(`Type de chambre : ${data.roomType}`);
      }
      if (data.mealPlan) {
        doc.text(`Plan de repas : ${data.mealPlan}`);
      }
      doc.moveDown();

      // Tableau des tarifs
      doc.fontSize(10).font('Helvetica-Bold').text('RÉSUMÉ DES TARIFS', { underline: true });
      doc.moveDown(5);

      // En-têtes du tableau
      const tableTop = doc.y;
      const col1 = 50;
      const col2 = 350;
      const col3 = 450;

      doc.fontSize(9).font('Helvetica-Bold');
      doc.text('Description', col1, tableTop);
      doc.text('Montant', col2, tableTop);
      doc.text('Total', col3, tableTop);

      // Ligne de séparation
      doc.moveTo(50, doc.y + 5).lineTo(550, doc.y + 5).stroke();

      // Détails du tarif
      doc.fontSize(9).font('Helvetica').moveDown();
      doc.text('Frais de réservation d\'hôtel', col1);
      doc.text(`${data.totalPrice} ${data.currency}`, col2);
      doc.text(`${data.totalPrice} ${data.currency}`, col3);

      doc.moveDown();
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();

      // Total
      doc.moveDown();
      doc.fontSize(12).font('Helvetica-Bold');
      doc.text('MONTANT TOTAL : ', col1);
      doc.fontSize(12).text(`${data.totalPrice} ${data.currency}`, col3, doc.y - 15, { align: 'right' });

      doc.moveDown(10);

      // Conditions et notes
      doc.fontSize(9).font('Helvetica');
      doc.text(
        'Cette facture confirme votre réservation d\'hôtel via la plateforme TravEasy. ' +
        'Veuillez présenter votre référence de réservation à l\'enregistrement de l\'hôtel.',
        { width: 500, align: 'left' },
      );

      doc.moveDown(15);

      // Pied de page
      doc.fontSize(8).font('Helvetica').fillColor('#888888');
      doc.text('© 2026 TravEasy - Tous droits réservés', { align: 'center' });
      doc.text('Pour toute question, contactez : support@travelesy.com', { align: 'center' });

      // Fin du document
      doc.end();

      // Attendre que le fichier soit écrit
      stream.on('finish', () => {
        console.log(`Facture générée : ${filePath}`);
        resolve(`/invoices/hotels/${fileName}`);
      });

      stream.on('error', (err) => {
        reject(err);
      });
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error);
      reject(error);
    }
  });
}

/**
 * Génère une facture groupée pour plusieurs réservations
 */
export async function generateGroupInvoicePDF(
  bookings: InvoiceData[],
  guestEmail: string,
): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      // Créer le dossier des factures
      const invoicesDir = path.join(process.cwd(), 'public', 'invoices', 'hotels');
      await fs.mkdir(invoicesDir, { recursive: true });

      // Chemin du fichier PDF
      const fileName = `hotel_invoices_${Date.now()}.pdf`;
      const filePath = path.join(invoicesDir, fileName);

      const doc = new PDFDocument();
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      let totalAmount = 0;

      // Ajouter chaque facture
      bookings.forEach((booking, index) => {
        if (index > 0) {
          doc.addPage();
        }

        // En-tête
        doc.fontSize(20).font('Helvetica-Bold').text('FACTURE', { align: 'center' });
        doc.fontSize(11).font('Helvetica').text('TravEasy - Plateforme de Voyage', { align: 'center' });
        doc.moveDown();

        // Contenu similaire à generateInvoicePDF
        doc.fontSize(9).font('Helvetica-Bold').text('Hôtel : ').text(booking.hotelName, { continued: false });
        doc.text('Check-in : ').text(booking.checkIn, { continued: false });
        doc.text('Check-out : ').text(booking.checkOut, { continued: false });
        doc.text('Montant : ').text(`${booking.totalPrice} ${booking.currency}`, { continued: false });
        doc.moveDown();

        // Additionner les montants
        totalAmount += parseFloat(booking.totalPrice);
      });

      // Page de résumé
      doc.addPage();
      doc.fontSize(20).font('Helvetica-Bold').text('RÉSUMÉ DE FACTURE', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Nombre de réservations : ${bookings.length}`);
      doc.text(`Montant total : ${totalAmount.toFixed(2)} ${bookings[0].currency}`);

      doc.end();

      stream.on('finish', () => {
        resolve(`/invoices/hotels/${fileName}`);
      });

      stream.on('error', reject);
    } catch (error) {
      reject(error);
    }
  });
}

export default {
  generateInvoicePDF,
  generateGroupInvoicePDF,
};
