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

async function findExistingSignup({ supabaseUrl, supabaseKey, table, email }) {
  const url = new URL(`${supabaseUrl}/rest/v1/${table}`);
  url.searchParams.set("select", "id,email");
  url.searchParams.set("email", `eq.${email}`);
  url.searchParams.set("limit", "1");

  const response = await fetch(url, {
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    },
  });

  if (!response.ok) {
    throw new Error("Supabase lookup failed");
  }

  const rows = await response.json();
  return Array.isArray(rows) && rows.length > 0;
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

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Supabase insert failed: ${detail}`);
  }
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
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const table = process.env.SUPABASE_WAITLIST_TABLE || DEFAULT_TABLE;
    const resendApiKey = process.env.RESEND_API_KEY;
    const resendFrom = process.env.RESEND_FROM_EMAIL;
    const notifyTo = process.env.WAITLIST_NOTIFY_TO_EMAIL;

    if (!supabaseUrl || !supabaseKey) {
      const response = json(500, { error: "Supabase is not configured." });
      if (res) return res.status(response.statusCode).set(response.headers).send(response.body);
      return response;
    }

    if (!resendApiKey || !resendFrom || !notifyTo) {
      const response = json(500, { error: "Resend is not configured." });
      if (res) return res.status(response.statusCode).set(response.headers).send(response.body);
      return response;
    }

    const alreadySignedUp = await findExistingSignup({
      supabaseUrl,
      supabaseKey,
      table,
      email: normalizedEmail,
    });

    if (!alreadySignedUp) {
      await insertSignup({
        supabaseUrl,
        supabaseKey,
        table,
        email: normalizedEmail,
        source,
      });

      await Promise.all([
        sendResendEmail({
          resendApiKey,
          from: resendFrom,
          to: notifyTo,
          subject: `New Jetstream waitlist signup: ${normalizedEmail}`,
          html: `<p><strong>Email:</strong> ${normalizedEmail}</p><p><strong>Source:</strong> ${source}</p>`,
        }),
        sendResendEmail({
          resendApiKey,
          from: resendFrom,
          to: normalizedEmail,
          subject: "You're on the Jetstream pre-launch list",
          html: "<p>You're on the list for Jetstream.</p><p>We'll send launch updates, previews, and early access details as they open up.</p>",
        }),
      ]);
    }

    const response = json(200, {
      ok: true,
      alreadySignedUp,
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
