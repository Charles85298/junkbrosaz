const IMAGE_EXTENSIONS = /\.(avif|gif|jpe?g|png|svg|webp)$/i;

const ALLOWED_SERVICES = new Set([
  'home-cleanouts',
  'furniture-removal',
  'construction-debris',
  'yard-and-outdoor-debris',
  'appliances-and-heavy-items',
  'business-and-office',
  'estate-cleanouts',
  'sheds-and-small-structures'
]);

function normalizePublicBaseUrl(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

function publicObjectUrl(baseUrl, key, version) {
  const encodedKey = key
    .split('/')
    .map(segment => encodeURIComponent(segment))
    .join('/');

  const url = new URL(`${baseUrl}/${encodedKey}`);
  if (version) url.searchParams.set('v', version);
  return url.toString();
}

async function listAll(bucket, prefix) {
  const objects = [];
  let cursor;

  do {
    const page = await bucket.list({ prefix, cursor, limit: 1000 });
    objects.push(...page.objects);
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);

  return objects;
}

export async function onRequestGet(context) {
  const { request, env } = context;

  if (!env.GALLERY_BUCKET) {
    return Response.json(
      {
        error: 'R2 binding not configured',
        setup: 'Bind the R2 bucket using the variable name GALLERY_BUCKET.'
      },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const publicBaseUrl = normalizePublicBaseUrl(env.GALLERY_PUBLIC_BASE_URL);
  if (!publicBaseUrl) {
    return Response.json(
      {
        error: 'Public R2 URL not configured',
        setup: 'Set GALLERY_PUBLIC_BASE_URL to your R2 custom domain or public r2.dev URL, without a trailing slash.'
      },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  let parsedBase;
  try {
    parsedBase = new URL(publicBaseUrl);
  } catch {
    return Response.json(
      {
        error: 'Invalid GALLERY_PUBLIC_BASE_URL',
        setup: 'Use a complete HTTPS URL such as https://gallery.azjunkbrothers.com.'
      },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  if (parsedBase.protocol !== 'https:') {
    return Response.json(
      { error: 'GALLERY_PUBLIC_BASE_URL must use HTTPS.' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const requestUrl = new URL(request.url);
  const requestedService = requestUrl.searchParams.get('service');

  if (requestedService && !ALLOWED_SERVICES.has(requestedService)) {
    return Response.json({ error: 'Invalid service name.' }, { status: 400 });
  }

  const prefix = requestedService ? `gallery/${requestedService}/` : 'gallery/';
  const objects = await listAll(env.GALLERY_BUCKET, prefix);
  const galleries = {};

  for (const object of objects) {
    if (!IMAGE_EXTENSIONS.test(object.key)) continue;

    const parts = object.key.split('/');
    if (parts.length < 3 || parts[0] !== 'gallery') continue;

    const service = parts[1];
    if (!ALLOWED_SERVICES.has(service)) continue;

    if (!galleries[service]) galleries[service] = [];
    galleries[service].push({
      key: object.key,
      name: parts.slice(2).join('/'),
      url: publicObjectUrl(
        publicBaseUrl,
        object.key,
        object.etag || object.uploaded?.getTime()
      ),
      size: object.size,
      uploaded: object.uploaded ? object.uploaded.toISOString() : null
    });
  }

  for (const images of Object.values(galleries)) {
    images.sort((a, b) => a.name.localeCompare(b.name, undefined, {
      numeric: true,
      sensitivity: 'base'
    }));
  }

  const body = requestedService
    ? { service: requestedService, images: galleries[requestedService] || [] }
    : { galleries };

  return Response.json(body, {
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Content-Type': 'application/json; charset=utf-8'
    }
  });
}
