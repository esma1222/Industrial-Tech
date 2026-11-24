// Public, client-side configuration. The publishable key is safe to ship:
// Row Level Security only lets it INSERT into public.whitepaper_requests.
window.WP_CONFIG = {
  supabaseUrl: 'https://abzzpobaifjmrxatvtry.supabase.co',
  supabasePublishableKey: 'sb_publishable_v3Ot3yNVsSsPbeLD0m8v-A_EbZFdcXl',
  table: 'whitepaper_requests',
  source: 'Industrial Tech M&A 2026 Whitepaper',
  // URL of the final PDF (e.g. a Supabase Storage object). Empty = download button hidden.
  pdfUrl: '',
  // Set to true once a double-opt-in / download email is actually sent (see README).
  emailDeliveryEnabled: false
};
