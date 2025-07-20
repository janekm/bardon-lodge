const e = ({ base: e2 = "", routes: t = [], ...o2 } = {}) => ({ __proto__: new Proxy({}, { get: (o3, s2, r2, n2) => "handle" == s2 ? r2.fetch : (o4, ...a) => t.push([s2.toUpperCase?.(), RegExp(`^${(n2 = (e2 + o4).replace(/\/+(\/|$)/g, "$1")).replace(/(\/?\.?):(\w+)\+/g, "($1(?<$2>*))").replace(/(\/?\.?):(\w+)/g, "($1(?<$2>[^$1/]+?))").replace(/\./g, "\\.").replace(/(\/?)\*/g, "($1.*)?")}/*$`), a, n2]) && r2 }), routes: t, ...o2, async fetch(e3, ...o3) {
  let s2, r2, n2 = new URL(e3.url), a = e3.query = { __proto__: null };
  for (let [e4, t2] of n2.searchParams) a[e4] = a[e4] ? [].concat(a[e4], t2) : t2;
  for (let [a2, c, i, l] of t) if ((a2 == e3.method || "ALL" == a2) && (r2 = n2.pathname.match(c))) {
    e3.params = r2.groups || {}, e3.route = l;
    for (let t2 of i) if (null != (s2 = await t2(e3.proxy ?? e3, ...o3))) return s2;
  }
} });
const o = (e2 = "text/plain; charset=utf-8", t) => (o2, { headers: s2 = {}, ...r2 } = {}) => void 0 === o2 || "Response" === o2?.constructor.name ? o2 : new Response(t ? t(o2) : o2, { headers: { "content-type": e2, ...s2.entries ? Object.fromEntries(s2) : s2 }, ...r2 }), s = o("application/json; charset=utf-8", JSON.stringify), r = (e2) => ({ 400: "Bad Request", 401: "Unauthorized", 403: "Forbidden", 404: "Not Found", 500: "Internal Server Error" })[e2] || "Unknown Error", n = (e2 = 500, t) => {
  if (e2 instanceof Error) {
    const { message: o2, ...s2 } = e2;
    e2 = e2.status || 500, t = { error: o2 || r(e2), ...s2 };
  }
  return t = { status: e2, ..."object" == typeof t ? t : { error: t || r(e2) } }, s(t, { status: e2 });
};
function isDevelopmentMode() {
  try {
    const nodeEnv = "production";
    return nodeEnv !== "production";
  } catch {
    return true;
  }
}
async function verifyAuthorizedUser(request, env) {
  let authenticatedUserEmail = request.headers.get("Cf-Access-Authenticated-User-Email");
  const isDev = isDevelopmentMode();
  if (isDev) {
    console.log("=== AUTH DEBUG ===");
    console.log("Original header:", authenticatedUserEmail);
    console.log("Development mode:", isDev);
    console.log("DB binding available:", !!env.DB);
  }
  if (!authenticatedUserEmail && isDev) {
    if (isDev) console.log("Development mode: using mock authentication");
    authenticatedUserEmail = "dev@bardonlodge.co.uk";
    try {
      await env.DB.exec(
        `CREATE TABLE IF NOT EXISTS recipients (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE, active INTEGER NOT NULL DEFAULT 1, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`
      );
      if (isDev) console.log("Table created/verified (dev mode)");
      await env.DB.prepare(`INSERT OR IGNORE INTO recipients (email, active) VALUES (?, 1)`).bind(authenticatedUserEmail).run();
      if (isDev) console.log("Dev user ensured");
    } catch (e2) {
      if (isDev) console.log("Dev user creation failed:", e2);
    }
  }
  if (!authenticatedUserEmail) {
    if (isDev) console.log("No authenticated user email found");
    return null;
  }
  if (isDev) console.log("Checking authorization for:", authenticatedUserEmail);
  try {
    if (isDev) console.log("Executing DB query...");
    const { results } = await env.DB.prepare(
      "SELECT id FROM recipients WHERE email = ? AND active = 1"
    ).bind(authenticatedUserEmail).all();
    if (isDev) {
      console.log("DB query results:", results);
      console.log("Results length:", results?.length || 0);
    }
    if (!results || results.length === 0) {
      if (isDev) console.log("User not found or inactive");
      return null;
    }
    if (isDev) console.log("User authorized successfully");
    return authenticatedUserEmail;
  } catch (e2) {
    console.error("Authorization check failed:", e2);
    return null;
  }
}
const router = e();
const withAuth = async (request, env) => {
  const authorizedUser = await verifyAuthorizedUser(request, env);
  if (!authorizedUser) {
    return n(403, "Forbidden");
  }
  request.user = authorizedUser;
};
router.get("/api/recipients", withAuth, async (request, env) => {
  try {
    const { results } = await env.DB.prepare(
      "SELECT id, email, active FROM recipients ORDER BY email"
    ).all();
    return s(results ?? []);
  } catch (e2) {
    console.error("Failed to fetch recipients:", e2.message);
    return n(500, "Failed to fetch recipients");
  }
});
router.post("/api/recipients", withAuth, async (request, env) => {
  try {
    const body = await request.json();
    const { email } = body;
    if (!email || typeof email !== "string") {
      return n(400, "Email is required");
    }
    if (!email.includes("@") || !email.includes(".")) {
      return n(400, "Invalid email format");
    }
    const result = await env.DB.prepare(
      'INSERT INTO recipients (email, active, created_at) VALUES (?, 1, datetime("now"))'
    ).bind(email).run();
    return new Response(
      JSON.stringify({
        message: "Recipient added successfully",
        id: result.meta.last_row_id
      }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" }
      }
    );
  } catch (e2) {
    const error_message = e2.message;
    if (error_message?.includes("UNIQUE constraint failed")) {
      return n(409, "Email already exists");
    }
    console.error("Database error:", error_message);
    return n(500, "Database error");
  }
});
router.delete("/api/recipients/:id", withAuth, async (request, env) => {
  try {
    const id = request.params?.id;
    if (!id) {
      return n(400, "ID is required");
    }
    const result = await env.DB.prepare("DELETE FROM recipients WHERE id = ?").bind(id).run();
    if (result.meta.changes === 0) {
      return n(404, "Recipient not found");
    }
    return s({ message: "Recipient deleted successfully" });
  } catch (e2) {
    console.error("Database error:", e2.message);
    return n(500, "Database error");
  }
});
router.all("/api/*", () => n(404, "Not Found"));
const index = {
  async email(message, env, _ctx) {
    try {
      const { results } = await env.DB.prepare(
        "SELECT email FROM recipients WHERE active = 1"
      ).all();
      if (!results || results.length === 0) {
        console.log("No active recipients found. Bouncing email.");
        await message.setReject("No active recipients for this alias.");
        return;
      }
      const recipients = results.map((r2) => r2.email);
      console.log(`Forwarding email from ${message.from} to ${recipients.length} recipients.`);
      await Promise.all(recipients.map((recipient) => message.forward(recipient)));
    } catch (e2) {
      console.error("Email forwarding failed:", e2.message);
      await message.setReject("Failed to process email forwarding.");
    }
  },
  async fetch(request, env, _ctx) {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      return router.handle(request, env, _ctx);
    }
    return env.ASSETS.fetch(request);
  }
};
export {
  index as default
};
