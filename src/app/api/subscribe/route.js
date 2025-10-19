import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

/* ─── 1.  Initialise SDKs ───────────────────────────────────────────── */
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY      // keep on server only
);
const resend = new Resend(process.env.RESEND_API_KEY);

/* ─── 2.  POST /api/subscribe  (instant response) ───────────────────── */
export async function POST(req) {
  const { name = '', email = '' } = await req.json();
  const firstName = name.split(' ')[0] || 'there';

  /* respond to the browser right away (< 50 ms) */
  const fastResponse = new Response(JSON.stringify({ ok: true }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' }
  });

  /* run DB insert + e-mail in the background */
  (async () => {
    try {
      await supabase.from('waitlist').insert({ name, email });
    } catch (dbErr) {
      console.error('[Supabase]', dbErr);
    }

    try {
      await resend.emails.send({
        from: 'Logan <welcome@discovercro.com>',              // ↙ use your domain
        to: email,
        subject: 'Discovercro Wait-List Confirmation',
        html: makeHtml(firstName)
      });
    } catch (mailErr) {
      console.error('[Resend]', mailErr);
    }
  })();                                                      // << no await

  return fastResponse;
}

/* ─── 3.  Helper generates branded HTML ─────────────────────────────── */
function makeHtml(firstName) {
  /* 24 × 24-px PNG icons (public HTTPS links) */
  const TW = 'https://cdn-icons-png.flaticon.com/512/733/733579.png';
  const FB = 'https://cdn-icons-png.flaticon.com/512/145/145802.png';
  const IN = 'https://cdn-icons-png.flaticon.com/512/145/145807.png';

  return `
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
         style="font-family:Arial,Helvetica,sans-serif;background:#f7f8fc;padding:24px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" role="presentation"
             style="background:#ffffff;border-radius:8px;overflow:hidden;">
        <!-- header -->
        <tr><td style="background:#111827;padding:32px;text-align:center;">
          <h1 style="color:#ffffff;margin:0;font-size:24px;letter-spacing:0.5px;">Discovercro</h1>
        </td></tr>

        <!-- body copy -->
        <tr><td style="padding:32px;">
          <p style="font-size:16px;color:#111827;margin:0 0 16px;">
            Hey ${firstName},
          </p>

          <p style="font-size:16px;color:#111827;margin:0 0 24px;">
            🎉 Great news—your seat on the <strong>Discovercro </strong> wait-list is confirmed!
          </p>

          <p style="font-size:16px;color:#111827;margin:0 0 24px;">
            You’ll be one of the first to know the moment we launch (just a few weeks away).  
            Expect early-bird perks and behind-the-scenes updates landing in your inbox soon.
          </p>

          <p style="font-size:16px;color:#111827;margin:0 0 24px;">
            In the meantime, follow our build-in-public journey:
          </p>

          <!-- social icons -->
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
        <!-- no unsubscribe footer per your request -->
      </table>
    </td></tr>
  </table>`;
}