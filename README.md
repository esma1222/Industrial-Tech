# Industrial Tech M&A 2026 – Whitepaper Landing Page

A static landing page (no build step) for the atares *Industrial Tech M&A 2026* whitepaper.
Form submissions are stored in Supabase (project `Industrial-Tech`, ref `abzzpobaifjmrxatvtry`).

## Structure

| Path | What it is |
|---|---|
| `index.html` | The page, converted from the design export (`design/Main.dc.html`) |
| `css/site.css` | Overrides, lock/unlock states and the mobile layout (≤ 760 px) |
| `js/config.js` | Supabase URL, publishable key, PDF URL, email flag |
| `js/app.js` | Segment picker, form validation and submission |
| `assets/` | Images and logos from the design |
| `design/` | Original design export, kept for reference (not served) |
| `supabase/migrations/` | Database schema, already applied to the project |

## Run locally

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

## How a sign-up works

1. The visitor fills in the form (salutation, first and last name, e-mail, optional company and position) and must tick the TechSpheres consent box. The wording matches the official form at https://atares.team/en/atares-techspheres-newsletter-subscription/.
2. The page calls the Edge Function `techspheres-signup` (`supabase/functions/techspheres-signup/index.ts`).
3. The function stores the lead in `public.whitepaper_requests` and adds the person to the atares Mailchimp audience, the same one behind the atares.team newsletter form:
   - new contacts are added as **pending**, so Mailchimp sends its double opt-in confirmation e-mail;
   - the group **"atares TechSpheres"** is ticked;
   - merge fields FNAME, LNAME, SALUTATION, UNTERNEHMEN, POSITION and SPRACHE are filled where the audience has them;
   - the contact is tagged **"Industrial Tech M&A 2026 Whitepaper"**.
4. The whitepaper unlocks. The lead is kept even if Mailchimp fails; `mailchimp_status` and `mailchimp_error` show what happened.

### Mailchimp secrets (required)

Until these are set, leads are stored with `mailchimp_status = not_configured` and nobody is added to Mailchimp.
Set them in the Supabase dashboard: *Edge Functions → Secrets*.

| Secret | Value |
|---|---|
| `MAILCHIMP_API_KEY` | A Mailchimp API key (Account → Extras → API keys), e.g. `xxxx-us21` |
| `MAILCHIMP_AUDIENCE_ID` | The Audience ID used by the atares.team newsletter form (Audience → Settings → Audience name and defaults) |
| `MAILCHIMP_INTEREST_NAME` | Optional. Group name to tick; default `atares TechSpheres` |
| `ALLOWED_ORIGINS` | Optional. E.g. `https://industrial-tech.vercel.app` to accept calls only from the live site |

## Data

`public.whitepaper_requests` columns: `salutation`, `first_name`, `last_name`, `email`, `company`, `position`,
`newsletter_opt_in`, `consent_text`, `source`, `language`, `page_url`, `mailchimp_status`, `mailchimp_error`,
`mailchimp_synced_at`, `created_at`.

The table is closed to the public key: only the Edge Function (service role) writes to it.
To read the leads, use the Supabase dashboard (Table Editor).

## Before launch

1. **Mailchimp secrets**: see above.
2. **PDF**: upload the final PDF (for example to Supabase Storage) and put its URL in `pdfUrl` in `js/config.js`. Until then the download button is hidden after unlock.
3. **Legal review**: the whitepaper is only available with a TechSpheres subscription. Check this against GDPR Art. 7(4) (consent must be freely given).
4. Locked previews use CSS blur. In production, ship pre-blurred raster images instead.
5. Confirm the date and page count (PDF: October 2026 / 61 pages; brief: November 2026 / 62 pages).
6. German version: the DE toggle is disabled until the German copy is approved.
7. About section: insert the approved boilerplate (the placeholder text is still on the page).
