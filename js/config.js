// Public, client-side configuration. The publishable key is safe to ship:
// the page only calls the techspheres-signup Edge Function, and the table
// itself is closed to the public key.
window.WP_CONFIG = {
  supabaseUrl: 'https://abzzpobaifjmrxatvtry.supabase.co',
  supabasePublishableKey: 'sb_publishable_v3Ot3yNVsSsPbeLD0m8v-A_EbZFdcXl',
  signupFunction: 'techspheres-signup',
  source: 'Industrial Tech M&A 2026 Whitepaper',
  // URL of the final PDF (e.g. a Supabase Storage object). Empty = download button hidden.
  pdfUrl: 'https://abzzpobaifjmrxatvtry.supabase.co/storage/v1/object/public/whitepapers/industrial-tech-ma-2026-a2880890906723de.pdf'
};
