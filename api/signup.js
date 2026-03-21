const DEFAULT_TABLE = "waitlist_signups";

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
    body: JSON.stringify(body),
  };
}

function sendJson(res, response) {
  if (!res) {
    return response;
  }

  res.statusCode = response.statusCode;
  for (const [key, value] of Object.entries(response.headers)) {
    res.setHeader(key, value);
  }
  res.end(response.body);
  return;
}

async function readRequestBody(req) {
  if (!req) return {};
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }
  return req.body || {};
}

function getSupabaseKey() {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_PUB_API_KEY ||
    process.env.SUPABASE_LEGACY_API_KEY
  );
}

function getSupabaseKeySource() {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) return "SUPABASE_SERVICE_ROLE_KEY";
  if (process.env.SUPABASE_PUB_API_KEY) return "SUPABASE_PUB_API_KEY";
  if (process.env.SUPABASE_LEGACY_API_KEY) return "SUPABASE_LEGACY_API_KEY";
  return null;
}

function shouldExposeDebug(req) {
  const debugFlag = String(process.env.DEBUG_SIGNUP_PIPELINE || "").toLowerCase();
  const queryDebug = req?.query?.debug;
  return debugFlag === "true" || queryDebug === "1" || queryDebug === "true";
}

async function insertSignup({ supabaseUrl, supabaseKey, table, email, source }) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Prefer: "return=minimal",
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({
      email,
      source,
      created_at: new Date().toISOString(),
    }),
  });

  if (response.status === 409) {
    return { alreadySignedUp: true };
  }

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Supabase insert failed: ${detail}`);
  }

  return { alreadySignedUp: false };
}

async function sendResendEmail({ resendApiKey, from, to, subject, html }) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Resend failed: ${detail}`);
  }
}

function buildNotificationEmail(email, source) {
  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#0b1524;background:#f4f7fb;padding:24px;">
      <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:20px;padding:28px;border:1px solid #dde7f2;">
        <p style="margin:0 0 18px;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#6f86a3;">New Jetstream waitlist signup</p>
        <h1 style="margin:0 0 18px;font-size:28px;line-height:1.05;color:#0b1524;">Someone joined the pre-launch list.</h1>
        <div style="padding:18px 20px;background:#f8fbff;border:1px solid #e2ebf5;border-radius:16px;">
          <p style="margin:0 0 10px;font-size:14px;color:#4e617a;"><strong style="color:#0b1524;">Email:</strong> ${email}</p>
          <p style="margin:0;font-size:14px;color:#4e617a;"><strong style="color:#0b1524;">Source:</strong> ${source}</p>
        </div>
      </div>
    </div>
  `;
}

function buildConfirmationEmail() {
  return `
    <div style="margin:0;padding:32px 16px;background:#eef3f9;">
      <div style="max-width:620px;margin:0 auto;border-radius:28px;overflow:hidden;background:#071321;border:1px solid #183149;">
        <div style="padding:18px 24px;background:linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0));border-bottom:1px solid rgba(255,255,255,0.08);">
          <div style="display:inline-flex;align-items:center;gap:10px;">
            <div style="width:12px;height:12px;border-radius:999px;background:linear-gradient(135deg,#8be8ff,#2a78ff);box-shadow:0 0 20px rgba(139,232,255,0.4);"></div>
            <span style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:14px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#dff6ff;">Jetstream</span>
          </div>
        </div>
        <div style="padding:44px 24px 36px;background:
          radial-gradient(circle at top right, rgba(125,200,255,0.2), transparent 30%),
          linear-gradient(180deg,#0b1a2d 0%,#071321 100%);
          color:#f5fbff;">
          <p style="margin:0 0 16px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#9fb9d6;">
            Pre-launch waitlist
          </p>
          <h1 style="margin:0 0 18px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:40px;line-height:0.98;letter-spacing:-0.04em;color:#ffffff;">
            You’re in.
          </h1>
          <p style="margin:0 0 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:17px;line-height:1.7;color:#c9d9ea;">
            You’re officially on the Jetstream pre-launch list. We’ll send product updates, previews, and early-access details as the app gets ready to launch.
          </p>
          <div style="padding:20px 22px;border-radius:22px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.09);backdrop-filter:blur(10px);">
            <p style="margin:0 0 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#8be8ff;">
              What to expect
            </p>
            <ul style="margin:0;padding-left:18px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;line-height:1.8;color:#d9e7f5;">
              <li>Early looks at the product as it sharpens</li>
              <li>Launch updates as invite access gets closer</li>
              <li>First notice when Jetstream starts letting people in</li>
            </ul>
          </div>
        </div>
        <div style="padding:22px 24px;background:#06101c;border-top:1px solid rgba(255,255,255,0.06);">
          <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:13px;line-height:1.7;color:#8ea4bc;">
            Jetstream helps travelers know when a flight is actually worth booking.
          </p>
        </div>
      </div>
    </div>
  `;
}

async function sendSignupEmails({ resendApiKey, resendFrom, notifyTo, email, source }) {
  const results = await Promise.allSettled([
    sendResendEmail({
      resendApiKey,
      from: resendFrom,
      to: notifyTo,
      subject: `New Jetstream waitlist signup: ${email}`,
      html: buildNotificationEmail(email, source),
    }),
    sendResendEmail({
      resendApiKey,
      from: resendFrom,
      to: email,
      subject: "You're on the Jetstream pre-launch list",
      html: buildConfirmationEmail(),
    }),
  ]);

  const failures = results
    .filter((result) => result.status === "rejected")
    .map((result) => result.reason?.message || "Unknown email delivery error");

  return {
    ok: failures.length === 0,
    failures,
  };
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    const response = json(405, { error: "Method not allowed" });
    return sendJson(res, response);
  }

  try {
    const { email, source = "prelaunch-site" } = await readRequestBody(req);
    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      const response = json(400, { error: "A valid email address is required." });
      return sendJson(res, response);
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = getSupabaseKey();
    const supabaseKeySource = getSupabaseKeySource();
    const table = process.env.SUPABASE_WAITLIST_TABLE || DEFAULT_TABLE;
    const resendApiKey = process.env.RESEND_API_KEY;
    const resendFrom = process.env.RESEND_FROM_EMAIL;
    const notifyTo = process.env.WAITLIST_NOTIFY_TO_EMAIL;
    const exposeDebug = shouldExposeDebug(req);

    if (!supabaseUrl || !supabaseKey) {
      const response = json(500, { error: "Supabase is not configured." });
      return sendJson(res, response);
    }

    const { alreadySignedUp } = await insertSignup({
      supabaseUrl,
      supabaseKey,
      table,
      email: normalizedEmail,
      source,
    });

    let emailDelivery = {
      ok: false,
      skipped: true,
      failures: [],
    };

    if (!alreadySignedUp && resendApiKey && resendFrom && notifyTo) {
      const result = await sendSignupEmails({
        resendApiKey,
        resendFrom,
        notifyTo,
        email: normalizedEmail,
        source,
      });
      emailDelivery = {
        ok: result.ok,
        skipped: false,
        failures: result.failures,
      };
    } else if (!alreadySignedUp) {
      emailDelivery = {
        ok: false,
        skipped: true,
        failures: ["Resend is not fully configured."],
      };
    }

    const response = json(200, {
      ok: true,
      alreadySignedUp,
      emailDelivery,
      message: alreadySignedUp
        ? "You're already on the waitlist. We'll be in touch."
        : "You're on the waitlist. Check your inbox for confirmation.",
      ...(exposeDebug
        ? {
            debug: {
              supabaseUrl,
              supabaseKeySource,
              table,
              hasResendApiKey: Boolean(resendApiKey),
              resendFrom,
              notifyTo,
              alreadySignedUp,
              emailDelivery,
            },
          }
        : {}),
    });
    return sendJson(res, response);
  } catch (error) {
    const exposeDebug = shouldExposeDebug(req);
    const response = json(500, {
      error: "Unable to save your signup right now.",
      detail: error.message,
      ...(exposeDebug
        ? {
            debug: {
              supabaseUrl: process.env.SUPABASE_URL || null,
              supabaseKeySource: getSupabaseKeySource(),
              table: process.env.SUPABASE_WAITLIST_TABLE || DEFAULT_TABLE,
              hasResendApiKey: Boolean(process.env.RESEND_API_KEY),
              resendFrom: process.env.RESEND_FROM_EMAIL || null,
              notifyTo: process.env.WAITLIST_NOTIFY_TO_EMAIL || null,
            },
          }
        : {}),
    });
    return sendJson(res, response);
  }
};
