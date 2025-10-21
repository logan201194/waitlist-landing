// app/api/subscribe/route.js   (Next.js App Router)
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

/* ─── 1  Environment -------------------------------------------------- */
const {
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  RESEND_API_KEY,
  RESEND_FROM_EMAIL = 'Discovercro <welcome@discovercro.com>',
} = process.env;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error('Missing Supabase env vars');
if (!RESEND_API_KEY)                                 throw new Error('Missing RESEND_API_KEY');

/* ─── 2  SDKs ---------------------------------------------------------- */
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const resend   = new Resend(RESEND_API_KEY);

/* ─── 3  POST /api/subscribe  — instant response, work in background ── */
export async function POST(req) {
  const { name = '', email = '' } = (await req.json()) ?? {};
  if (!email) return json({ ok: false, error: 'Email is required' }, 400);

  /* create a background task (DB + email) */
  const bgWork = (async () => {
    /* 3-a  wait-list insert */
    const { error: dbErr } = await supabase
      .from('waitlist')
      .upsert({ email, name }, { onConflict: 'email' });
    if (dbErr) console.error('[Supabase]', dbErr);

    /* 3-b  welcome email */
    const { data, error: mailErr } = await resend.emails.send({
      from: RESEND_FROM_EMAIL,
      to: [email],
      subject: 'Discovercro – wait-list confirmed!',
      html: makeHtml(name.split(' ')[0] || 'there'),
    });
    if (mailErr)  console.error('[Resend ERR]', mailErr);
    else          console.log('[Resend OK]', data);
  })();

  /* Edge runtime → keep running after response */
  if (typeof req.waitUntil === 'function') req.waitUntil(bgWork);

  /* Node runtime → detach to avoid keeping the event-loop open */
  bgWork.catch(() => {}); // swallow unhandled-rejection warnings

  /* instant (<50 ms) reply to browser */
  return json({ ok: true }, 202);
}

/* ─── 4  Helpers ------------------------------------------------------- */
function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

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
     <h1 style="color:#ffffff;margin:0;font-size:24px;">Discovercro</h1>
   </td></tr>
   <tr><td style="padding:32px; color:#111827; font-size:16px;">
     <p style="margin:0 0 16px;">Hey ${firstName},</p>
     <p style="margin:0 0 24px;">🎉 Your seat on the <strong>Discovercro</strong> wait-list is confirmed! You’ll be first to know when we launch.</p>
     <p style="margin:0 0 24px;">Follow our build-in-public journey:</p>
     <table cellpadding="0" cellspacing="0" role="presentation">
       <tr>
         <td style="padding-right:16px;"><a href="https://x.com/logan201194" target="_blank"><img width="24" height="24" alt="Twitter" style="display:block;border:0;" src="${TW}"/></a></td>
         <td style="padding-right:16px;"><a href="https://www.facebook.com/profile.php?id=61581583184801" target="_blank"><img width="24" height="24" alt="Facebook" style="display:block;border:0;" src="${FB}"/></a></td>
         <td><a href="https://www.linkedin.com/in/logan-a-b42a71383" target="_blank"><img width="24" height="24" alt="LinkedIn" style="display:block;border:0;" src="${IN}"/></a></td>
       </tr>
     </table>
   </td></tr>
  </table>
 </td></tr>
</table>`;
}