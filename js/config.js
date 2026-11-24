// Public, client-side configuration. The publishable key is safe to ship:
// the page only calls the techspheres-signup Edge Function, and the table
// itself is closed to the public key.
window.WP_CONFIG = {
  supabaseUrl: 'https://abzzpobaifjmrxatvtry.supabase.co',
  supabasePublishableKey: 'sb_publishable_v3Ot3yNVsSsPbeLD0m8v-A_EbZFdcXl',
  signupFunction: 'techspheres-signup',
  source: 'Industrial Tech M&A 2026 Whitepaper'
  // The whitepaper is not linked on the page: it is emailed by Mailchimp
  // once the TechSpheres subscription is confirmed.
};
