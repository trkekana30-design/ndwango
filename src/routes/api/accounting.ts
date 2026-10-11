export type AccountSyncResult = {
  source: "akaunting" | "invoice-ninja";
  ok: boolean;
  count: number;
  message: string;
};

export async function syncAkaunting(): Promise<AccountSyncResult> {
  const url = process.env.AKAUNTING_URL;
  const token = process.env.AKAUNTING_TOKEN;

  if (!url || !token) {
    return {
      source: "akaunting",
      ok: false,
      count: 0,
      message: "Akaunting is not configured. Add AKAUNTING_URL and AKAUNTING_TOKEN.",
    };
  }

  try {
    const response = await fetch(`${url.replace(/\/$/, "")}/api/v1/invoices`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return {
        source: "akaunting",
        ok: false,
        count: 0,
        message: `Akaunting returned ${response.status}`,
      };
    }

    const payload = await response.json();
    const rows = Array.isArray(payload) ? payload : payload?.data ?? [];

    return {
      source: "akaunting",
      ok: true,
      count: rows.length,
      message: `Synced ${rows.length} Akaunting invoice rows.`,
    };
  } catch (error) {
    return {
      source: "akaunting",
      ok: false,
      count: 0,
      message: error instanceof Error ? error.message : "Unknown Akaunting sync error.",
    };
  }
}

export async function syncInvoiceNinja(): Promise<AccountSyncResult> {
  const url = process.env.INVOICE_NINJA_URL;
  const token = process.env.INVOICE_NINJA_TOKEN;

  if (!url || !token) {
    return {
      source: "invoice-ninja",
      ok: false,
      count: 0,
      message: "Invoice Ninja is not configured. Add INVOICE_NINJA_URL and INVOICE_NINJA_TOKEN.",
    };
  }

  try {
    const response = await fetch(`${url.replace(/\/$/, "")}/api/v1/invoices`, {
      headers: {
        X-API-Token: token,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return {
        source: "invoice-ninja",
        ok: false,
        count: 0,
        message: `Invoice Ninja returned ${response.status}`,
      };
    }

    const payload = await response.json();
    const rows = Array.isArray(payload) ? payload : payload?.data ?? [];

    return {
      source: "invoice-ninja",
      ok: true,
      count: rows.length,
      message: `Synced ${rows.length} Invoice Ninja invoice rows.`,
    };
  } catch (error) {
    return {
      source: "invoice-ninja",
      ok: false,
      count: 0,
      message: error instanceof Error ? error.message : "Unknown Invoice Ninja sync error.",
    };
  }
}

export async function syncAccountingProviders() {
  const results = await Promise.all([syncAkaunting(), syncInvoiceNinja()]);
  return {
    ok: results.some((item) => item.ok),
    results,
  };
}
