// app/api/subscribe/route.js  (Next.js App Router)
import { Resend } from 'resend';
import { google } from 'googleapis';

/* ─── 0  Next runtime -------------------------------------------------- */
// googleapis needs Node runtime (not Edge)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/* ─── 1  Environment -------------------------------------------------- */
const {
  RESEND_API_KEY= 're_MMuXgsXr_PUS1aW1MZY7gHFgJGgbcXWuK',
  RESEND_FROM_EMAIL = 'DiscoverCRO <welcome@discovercro.com>',
  GOOGLE_SHEETS_ID = '19NgWjO0dzS2cRkiC9khngNmuHg0zSdj8aptbxcZsM40',
  GOOGLE_SHEETS_TAB = 'Waitlist',
  GOOGLE_CLIENT_EMAIL = 'discovercro@discovercro.iam.gserviceaccount.com' ,
  GOOGLE_PRIVATE_KEY = '802723cac488e1b1c528b2820917c01f6daabd73',
} = process.env;

if (!RESEND_API_KEY) throw new Error('Missing RESEND_API_KEY');
if (!GOOGLE_SHEETS_ID || !GOOGLE_CLIENT_EMAIL || !GOOGLE_PRIVATE_KEY) {
  throw new Error('Missing Google Sheets env vars');
}

/* ─── 2  SDKs ---------------------------------------------------------- */
const resend = new Resend(RESEND_API_KEY);

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function googleSheetsClient() {
  const auth = new google.auth.JWT(
    GOOGLE_CLIENT_EMAIL,
    undefined,
    GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    ['https://www.googleapis.com/auth/spreadsheets']
  );
  return google.sheets({ version: 'v4', auth });
}

/* ─── 3  POST /api/subscribe ------------------------------------------ */
export async function POST(req) {
  try {
    const { name = '', email = '' } = (await req.json()) ?? {};
    if (!email || !isValidEmail(email)) {
      return json({ ok: false, error: 'Email is required' }, 400);
    }

    const ip =
      req.headers.get('x-forwarded-for') ||
      req.headers.get('x-real-ip') ||
      'n/a';
    const userAgent = req.headers.get('user-agent') || 'n/a';

    /* 3-a  wait-list row (upsert on e-mail) */
    try {
      const sheets = googleSheetsClient();

      // 1) Read the email column to see if it exists already
      //    Assumes row 1 is headers, emails live in column B.
      const existing = await sheets.spreadsheets.values.get({
        spreadsheetId: GOOGLE_SHEETS_ID,
        range: `${GOOGLE_SHEETS_TAB}!B:B`,
      });

      const rows = existing.data.values || []; // e.g. [["email"], ["a@x.com"], ...]
      const lower = email.trim().toLowerCase();

      // Find index where this email exists (case-insensitive)
      let foundRow = -1;
      for (let i = 0; i < rows.length; i++) {
        if ((rows[i][0] || '').toString().trim().toLowerCase() === lower) {
          foundRow = i + 1; // Google Sheets rows are 1-based
          break;
        }
      }

      if (foundRow >= 2) {
        // 2) Update name (col C) for the found row; keep timestamp intact
        await sheets.spreadsheets.values.update({
          spreadsheetId: GOOGLE_SHEETS_ID,
          range: `${GOOGLE_SHEETS_TAB}!C${foundRow}:E${foundRow}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            // name, ip, userAgent
            values: [[name, ip, userAgent]],
          },
        });
      } else {
        // 3) Append a new row
        await sheets.spreadsheets.values.append({
          spreadsheetId: GOOGLE_SHEETS_ID,
          range: `${GOOGLE_SHEETS_TAB}!A:F`,
          valueInputOption: 'USER_ENTERED',
          insertDataOption: 'INSERT_ROWS',
          requestBody: {
            // timestamp, email, name, ip, userAgent, notes
            values: [[new Date().toISOString(), email, name, ip, userAgent, '']],
          },
        });
      }
    } catch (dbErr) {
      console.error('[Sheets]', dbErr);
      // do not abort; still try to send the email to match your current behavior
    }

    /* 3-b  welcome e-mail (unchanged) */
    const { data, error: mailErr } = await resend.emails.send({
      from: RESEND_FROM_EMAIL,
      to: [email],
      subject: 'DiscoverCRO –Wait-List Confirmed!',
      html: makeHtml(name.split(' ')[0] || 'there'),
    });

    if (mailErr) {
      console.error('[Resend ERR]', mailErr);
      return json({ ok: false, error: mailErr }, 500);
    }

    console.log('[Resend OK]', data); // id, to, subject…
    return json({ ok: true, id: data.id }, 200);
  } catch (e) {
    console.error('[Route Error]', e);
    return json({ ok: false, error: 'Unexpected server error' }, 500);
  }
}

/* ─── 4  Helper -------------------------------------------------------- */
function makeHtml(firstName) {
  const TW = 'https://cdn-icons-png.flaticon.com/512/733/733579.png';
  const FB = 'https://cdn-icons-png.flaticon.com/512/145/145802.png';
  const IN = 'https://cdn-icons-png.flaticon.com/512/145/145807.png';

  return `
<table width="100%" cellpadding="0" cellspacing="0" role="presentation"
       style="font-family:Arial,Helvetica,sans-serif;background:#f7f8fc;padding:24px 0;">
 <tr><td align="center">
  <table width="600" cellpadding="0" cellspacing="0" role="presentation"
         style="background:#ffffff;border-radius:8px;overflow:hidden;">
   <tr><td style="background:#111827;padding:32px;text-align:center;">
     <h1 style="color:#ffffff;margin:0;font-size:24px;">DiscoverCRO</h1>
   </td></tr>

   <tr><td style="padding:32px; color:#111827; font-size:16px;">
     <p style="margin:0 0 16px;">Hey ${firstName},</p>
     <p style="margin:0 0 24px;">
       🎉 Your seat on the <strong>DiscoverCRO</strong> wait-list is confirmed!
       You’ll be first to know when we launch.
     </p>
     <p style="margin:0 0 24px;">Follow our build-in-public journey:</p>
     <table cellpadding="0" cellspacing="0" role="presentation">
       <tr>
         <td style="padding-right:16px;">
           <a href="https://x.com/logan201194" target="_blank">
             <img width="24" height="24" alt="Twitter" style="display:block;border:0;" src="${TW}"/>
           </a>
         </td>
         <td style="padding-right:16px;">
           <a href="https://www.facebook.com/profile.php?id=61581583184801" target="_blank">
             <img width="24" height="24" alt="Facebook" style="display:block;border:0;" src="${FB}"/>
           </a>
         </td>
         <td>
           <a href="https://www.linkedin.com/in/logan-a-b42a71383" target="_blank">
             <img width="24" height="24" alt="LinkedIn" style="display:block;border:0;" src="${IN}"/>
           </a>
         </td>
       </tr>
     </table>
   </td></tr>
  </table>
 </td></tr>
</table>`;
}