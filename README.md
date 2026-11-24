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

## Data

Each submission is stored as a row in `public.whitepaper_requests`:
`full_name`, `email`, `newsletter_opt_in`, `source`, `language`, `page_url`, `created_at`.

Row Level Security lets the publishable key **insert only**. Visitors cannot read, change or delete rows.
To read the leads, use the Supabase dashboard (Table Editor) or the service role.

## Before launch

1. **PDF**: upload the final PDF (for example to Supabase Storage) and put its URL in `pdfUrl` in `js/config.js`. Until then the download button is hidden after unlock.
2. **Emails / TechSphere double opt-in**: nothing is emailed yet. The design note says to reuse ExitIQ's
   `newsletter-signup` function (Resend, double opt-in), but that function is not in this project.
   Once it is deployed here (or a webhook on `whitepaper_requests` calls it), set `emailDeliveryEnabled: true`
   so the page shows the "check your inbox" messages again.
3. Locked previews use CSS blur. In production, ship pre-blurred raster images instead.
4. Confirm the date and page count (PDF: October 2026 / 61 pages; brief: November 2026 / 62 pages).
5. Check the privacy policy, imprint and LinkedIn URLs. They currently point to atares.team / linkedin.com.
6. German version: the DE toggle is disabled until the German copy is approved.
7. About section: insert the approved boilerplate (the placeholder text is still on the page).
