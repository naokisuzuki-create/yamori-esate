const PROPERTY_SHEET = '物件';
const IMAGE_SHEET = 'property_images';
const FEED_CACHE_KEY = 'yamori-property-feed-v1';
const FEED_CACHE_SECONDS = 300;

function doGet(e) {
  const cache = CacheService.getScriptCache();
  const forceRefresh = e && e.parameter && e.parameter.refresh === '1';

  if (!forceRefresh) {
    const cached = cache.get(FEED_CACHE_KEY);
    if (cached) {
      return ContentService
        .createTextOutput(cached)
        .setMimeType(ContentService.MimeType.JSON);
    }
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const propertySheet = ss.getSheetByName(PROPERTY_SHEET);

  if (!propertySheet) {
    return json_({ error: `Sheet not found: ${PROPERTY_SHEET}` });
  }

  const properties = sheetToObjects_(propertySheet);
  const imageSheet = ss.getSheetByName(IMAGE_SHEET);
  const images = imageSheet ? sheetToObjects_(imageSheet) : [];

  const imagesByProperty = {};

  images
    .filter(row => String(row.property_id || '').trim() !== '')
    .sort((a, b) => Number(a.sort_order || 999) - Number(b.sort_order || 999))
    .forEach(row => {
      const id = normalizePropertyId_(row.property_id);
      if (!imagesByProperty[id]) imagesByProperty[id] = [];

      if (imagesByProperty[id].length < 25) {
        imagesByProperty[id].push({
          image_url: String(row.image_url || '').trim(),
          image_type: String(row.image_type || 'photo').trim(),
          caption: String(row.caption || '').trim(),
          sort_order: String(row.sort_order || '').trim()
        });
      }
    });

  const enriched = properties.map(property => {
    const id = normalizePropertyId_(property.id);
    return Object.assign({}, property, {
      id,
      images: imagesByProperty[id] || []
    });
  });

  const payload = JSON.stringify({ properties: enriched });
  cache.put(FEED_CACHE_KEY, payload, FEED_CACHE_SECONDS);

  return ContentService
    .createTextOutput(payload)
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const body = parsePostBody_(e);

    if (body.action !== 'contact') {
      return contactResult_(false, 'Unsupported action');
    }

    const enabled = PropertiesService.getScriptProperties().getProperty('CONTACT_ENABLED') === 'true';
    if (!enabled) {
      return contactResult_(false, 'Contact endpoint is not enabled yet.');
    }

    if (String(body.website || '').trim() !== '') {
      return contactResult_(true, '');
    }

    const startedAt = Number(body.started_at || 0);
    if (!startedAt || Date.now() - startedAt < 3000) {
      return contactResult_(false, 'Submission rejected.');
    }

    const email = String(body.email || '').trim();
    const cache = CacheService.getScriptCache();

    const emailHash = Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      email.toLowerCase(),
      Utilities.Charset.UTF_8
    );

    const rateKey = `contact:${Utilities.base64EncodeWebSafe(emailHash)}`;

    if (cache.get(rateKey)) {
      return contactResult_(false, 'Please wait before sending again.');
    }

    const turnstileSecret = PropertiesService.getScriptProperties().getProperty('TURNSTILE_SECRET');
    if (!turnstileSecret) {
      return contactResult_(false, 'Turnstile is not configured.');
    }

    const token = String(body.turnstile_token || '').trim();
    if (!token || !verifyTurnstile_(turnstileSecret, token)) {
      return contactResult_(false, 'CAPTCHA verification failed.');
    }

    const to = PropertiesService.getScriptProperties().getProperty('CONTACT_TO');
    if (!to) {
      return contactResult_(false, 'Contact recipient is not configured.');
    }

    const name = String(body.name || '').trim();
    const phone = String(body.phone || '').trim();
    const type = String(body.type || '').trim();
    const message = String(body.message || '').trim();

    if (!name || !email || !message) {
      return contactResult_(false, 'Required fields are missing.');
    }

    if (
      name.length > 80 ||
      email.length > 160 ||
      phone.length > 40 ||
      type.length > 40 ||
      message.length > 3000
    ) {
      return contactResult_(false, 'Input is too long.');
    }

    MailApp.sendEmail({
      to,
      subject: `【ヤモリ不動産Web】${type || 'お問い合わせ'} - ${name}`,
      body: [
        `お名前：${name}`,
        `メール：${email}`,
        `電話番号：${phone || '未入力'}`,
        `ご相談内容：${type || '未選択'}`,
        '',
        message
      ].join('\n'),
      replyTo: email
    });

    cache.put(rateKey, '1', 60);
    return contactResult_(true, 'お問い合わせを送信しました。ありがとうございます。');
  } catch (err) {
    console.error(err);
    return contactResult_(false, 'Server error');
  }
}

function parsePostBody_(e) {
  if (e && e.parameter && Object.keys(e.parameter).length) {
    return e.parameter;
  }

  return JSON.parse((e && e.postData && e.postData.contents) || '{}');
}

function contactResult_(ok, message) {
  const payload = JSON.stringify({
    type: 'yamori-contact-result',
    ok: ok === true,
    message: String(message || '')
  });

  return HtmlService
    .createHtmlOutput(
      '<!doctype html><html><body><script>' +
      'window.parent.postMessage(' + payload + ', "*");' +
      '</script></body></html>'
    );
}

function verifyTurnstile_(secret, token) {
  const response = UrlFetchApp.fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'post',
    payload: { secret, response: token },
    muteHttpExceptions: true
  });

  if (response.getResponseCode() !== 200) return false;
  const result = JSON.parse(response.getContentText() || '{}');
  return result.success === true;
}

function sheetToObjects_(sheet) {
  const values = sheet.getDataRange().getDisplayValues();
  if (values.length < 2) return [];

  const headers = values[0].map(h => String(h).trim());

  return values
    .slice(1)
    .filter(row => row.some(cell => String(cell).trim() !== ''))
    .map(row => {
      const obj = {};
      headers.forEach((header, i) => {
        obj[header] = String(row[i] ?? '').trim();
      });
      return obj;
    });
}

function normalizePropertyId_(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return /^\d+$/.test(raw) ? String(Number(raw)) : raw;
}

function json_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
