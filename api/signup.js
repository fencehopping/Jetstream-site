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

async function sendSignupEmails({ resendApiKey, resendFrom, notifyTo, email, source }) {
  const results = await Promise.allSettled([
    sendResendEmail({
      resendApiKey,
      from: resendFrom,
      to: notifyTo,
      subject: `New Jetstream waitlist signup: ${email}`,
      html: `<p><strong>Email:</strong> ${email}</p><p><strong>Source:</strong> ${source}</p>`,
    }),
    sendResendEmail({
      resendApiKey,
      from: resendFrom,
      to: email,
      subject: "You're on the Jetstream pre-launch list",
      html: "<p>You're on the list for Jetstream.</p><p>We'll send launch updates, previews, and early access details as they open up.</p>",
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
    if (res) return res.status(response.statusCode).set(response.headers).send(response.body);
    return response;
  }

  try {
    const { email, source = "prelaunch-site" } = await readRequestBody(req);
    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      const response = json(400, { error: "A valid email address is required." });
      if (res) return res.status(response.statusCode).set(response.headers).send(response.body);
      return response;
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = getSupabaseKey();
    const table = process.env.SUPABASE_WAITLIST_TABLE || DEFAULT_TABLE;
    const resendApiKey = process.env.RESEND_API_KEY;
    const resendFrom = process.env.RESEND_FROM_EMAIL;
    const notifyTo = process.env.WAITLIST_NOTIFY_TO_EMAIL;

    if (!supabaseUrl || !supabaseKey) {
      const response = json(500, { error: "Supabase is not configured." });
      if (res) return res.status(response.statusCode).set(response.headers).send(response.body);
      return response;
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
    });
    if (res) return res.status(response.statusCode).set(response.headers).send(response.body);
    return response;
  } catch (error) {
    const response = json(500, {
      error: "Unable to save your signup right now.",
      detail: error.message,
    });
    if (res) return res.status(response.statusCode).set(response.headers).send(response.body);
    return response;
  }
};
