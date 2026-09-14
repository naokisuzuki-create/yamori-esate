const SHEET_NAME = 'properties';
const IMAGE_SHEET_NAME = 'property_images';

function doGet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    return json_({ error: `Sheet not found: ${SHEET_NAME}` });
  }

  const properties = sheetToObjects_(sheet);
  const imageSheet = ss.getSheetByName(IMAGE_SHEET_NAME);
  const images = imageSheet ? sheetToObjects_(imageSheet) : [];

  const imagesByProperty = {};
  images
    .filter(row => row.property_id && truthy_(row.published === '' ? true : row.published))
    .sort((a, b) => Number(a.sort_order || 999) - Number(b.sort_order || 999))
    .forEach(row => {
      const id = String(row.property_id).trim();
      if (!imagesByProperty[id]) imagesByProperty[id] = [];
      if (imagesByProperty[id].length < 25) {
        imagesByProperty[id].push({
          image_url: row.image_url || '',
          image_type: row.image_type || 'photo',
          caption: row.caption || '',
          sort_order: row.sort_order || ''
        });
      }
    });

  const enriched = properties.map(property => {
    const id = String(property.id || '').trim();
    return Object.assign({}, property, {
      images: imagesByProperty[id] || []
    });
  });

  return json_({ properties: enriched });
}

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');

    if (body.action !== 'contact') {
      return json_({ ok: false, error: 'Unsupported action' });
    }

    const enabled = PropertiesService.getScriptProperties().getProperty('CONTACT_ENABLED') === 'true';
    if (!enabled) {
      return json_({ ok: false, error: 'Contact endpoint is not enabled yet.' });
    }

    if (String(body.website || '').trim() !== '') {
      return json_({ ok: true });
    }

    const startedAt = Number(body.started_at || 0);
    if (!startedAt || Date.now() - startedAt < 3000) {
      return json_({ ok: false, error: 'Submission rejected.' });
    }

    const email = String(body.email || '').trim();
    const cache = CacheService.getScriptCache();
    const rateKey = `contact:${Utilities.base64EncodeWebSafe(email.toLowerCase())}`;
    if (cache.get(rateKey)) {
      return json_({ ok: false, error: 'Please wait before sending again.' });
    }

    const turnstileSecret = PropertiesService.getScriptProperties().getProperty('TURNSTILE_SECRET');
    if (!turnstileSecret) {
      return json_({ ok: false, error: 'Turnstile is not configured.' });
    }

    const token = String(body.turnstile_token || '').trim();
    if (!token || !verifyTurnstile_(turnstileSecret, token)) {
      return json_({ ok: false, error: 'CAPTCHA verification failed.' });
    }

    const to = PropertiesService.getScriptProperties().getProperty('CONTACT_TO');
    if (!to) {
      return json_({ ok: false, error: 'Contact recipient is not configured.' });
    }

    const name = String(body.name || '').trim();
    const phone = String(body.phone || '').trim();
    const type = String(body.type || '').trim();
    const message = String(body.message || '').trim();

    if (!name || !email || !message) {
      return json_({ ok: false, error: 'Required fields are missing.' });
    }

    const subject = `【ヤモリ不動産Web】${type || 'お問い合わせ'} - ${name}`;
    const text = [
      `お名前：${name}`,
      `メール：${email}`,
      `電話番号：${phone || '未入力'}`,
      `ご相談内容：${type || '未選択'}`,
      '',
      message
    ].join('\n');

    MailApp.sendEmail({
      to,
      subject,
      body: text,
      replyTo: email
    });

    cache.put(rateKey, '1', 60);
    return json_({ ok: true });
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: 'Server error' });
  }
}

function verifyTurnstile_(secret, token) {
  const response = UrlFetchApp.fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'post',
    payload: {
      secret,
      response: token
    },
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
  return values.slice(1)
    .filter(row => row.some(cell => String(cell).trim() !== ''))
    .map(row => {
      const obj = {};
      headers.forEach((header, i) => obj[header] = row[i]);
      return obj;
    });
}

function truthy_(v) {
  return v === true || String(v).toLowerCase() === 'true' || String(v) === '1' || String(v).toUpperCase() === 'TRUE';
}

function json_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
