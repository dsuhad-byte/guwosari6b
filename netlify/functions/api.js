exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({
        ok: false,
        message: "Method tidak diizinkan."
      })
    };
  }

  const gasUrl = process.env.GAS_WEB_APP_URL;
  const secret = process.env.APP_SECRET;

  if (!gasUrl || !secret) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        ok: false,
        message: "Konfigurasi server belum lengkap."
      })
    };
  }

  try {
    const payload = JSON.parse(event.body || "{}");

    const response = await fetch(gasUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify({
        ...payload,
        secret
      })
    });

    const result = await response.text();

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store"
      },
      body: result
    };

  } catch (err) {
    return {
      statusCode: 502,
      body: JSON.stringify({
        ok: false,
        message: "Tidak dapat menghubungi backend.",
        detail: String(err)
      })
    };
  }
};
