# paysera-donate-skaidrinam

Paysera donation signing endpoint for skaidrinam.lt (Webflow front-end).

## Endpoints

- `POST /api/donate` — accepts `{ amount: <cents> }`, returns `{ url }` to redirect the user to Paysera.
- `GET /api/callback` — Paysera server-to-server callback. Validates `ss1` (MD5) signature and logs confirmed payments.

## Environment variables

Set these in the Vercel project dashboard (Production + Preview):

- `PAYSERA_PROJECT_ID` — e.g. `256801`
- `PAYSERA_SIGN_PASSWORD` — from Paysera project settings

## Deploy

```sh
git init
git add .
git commit -m "init"
# push to GitHub, then "Import Project" in Vercel — or:
npx vercel --prod
```

## Webflow embed

```html
<div class="donate-buttons">
  <button onclick="donate(500)">5 €</button>
  <button onclick="donate(1000)">10 €</button>
  <button onclick="donate(2500)">25 €</button>
</div>

<script>
async function donate(cents) {
  const res = await fetch('https://paysera-donate-skaidrinam.vercel.app/api/donate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: cents })
  });
  const { url } = await res.json();
  window.location.href = url;
}
</script>
```

## Notes

- `accepturl` / `cancelurl` point to Webflow pages you create: `/aciu`, `/parama`.
- `callbackurl` points to this Vercel app's `/api/callback`.
- If the Vercel project URL differs, update `callbackurl` in `api/donate.ts`.
- Amount is in cents, validated to `100..1_000_000` (1 €..10 000 €).
