// SMTP and DNS logic
// this file basically goes out to the internet
// to talk to other mail servers and check if an email address is valid or not.

import dns from 'node:dns/promises';
import SMTPConnection from 'nodemailer/lib/smtp-connection/index.js';

export interface MXRecord {
  exchange: string;
  priority: number;
}

// performs a DNS lookup to retrieve MX records for a domain.
export const getMxRecords = async (domain: string): Promise<string[]> => {
  try {
    const records = await dns.resolveMx(domain);
    if (!records || records.length === 0) return [];
    
    return records
    // sorting by priority (lowest number first which is the most important)
      .sort((a, b) => a.priority - b.priority)
      .map((r) => r.exchange);
  } catch (err) {
    return [];
  }
};


// connects to an SMTP server and checks if the mailbox exists.
// performs the HELO, MAIL FROM, and RCPT TO sequence.
export const checkMailbox = async (
  email: string,
  mxHost: string
): Promise<{ exists: boolean; subresult: string; error?: string }> => {
  return new Promise((resolve) => {
    const connection = new SMTPConnection({
      host: mxHost,
      port: 25,
      socketTimeout: 5000, // 5 second timeout for responsiveness
      connectionTimeout: 5000,
      tls: {
        rejectUnauthorized: false,
      },
    });

    let resolved = false;

    connection.on('error', (err) => {
      if (!resolved) {
        resolved = true;
        resolve({ exists: false, subresult: 'connection_error', error: err.message });
      }
    });

    connection.connect((err) => {
      if (err && !resolved) {
        resolved = true;
        resolve({ exists: false, subresult: 'connection_error', error: err.message });
        return;
      }

      const sender = process.env.SENDER_EMAIL || 'verify@example.com';
      const message = 'Subject: mailbox verification\r\n\r\n';

      connection.send({ from: sender, to: email }, message, (err) => {
        resolved = true;
        if (!err) {
          resolve({ exists: true, subresult: 'mailbox_exists' });
        } else {
          // Check for specific SMTP error codes
          const msg = err.message || '';
          if (msg.includes('550')) {
            resolve({ exists: false, subresult: 'mailbox_does_not_exist' });
          } else if (msg.includes('450') || msg.includes('451')) {
            resolve({ exists: false, subresult: 'greylisted' });
          } else {
            resolve({ exists: false, subresult: 'smtp_rejected', error: msg });
          }
        }
        connection.quit();
        connection.close();
      });
    });
  });
};

export const smtpService = {
  getMxRecords,
  checkMailbox
};