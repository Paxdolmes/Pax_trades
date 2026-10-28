# Going live

Setting the Relay apps up with real accounts. Until this is done, both apps run in demo mode.

Never paste a secret into chat, an email or the code. Secret keys start with `sb_secret_` or `sk_`, and the database password and access tokens are secrets too. Each secret has one home, listed below.

## 1. Supabase (database, logins and photos)

Project: `qfpujvfopbgnslylsquf`. Its URL and publishable key are already in `mobile/eas.json` and `mobile/.env.example`. Both are public.

1. **Replace the secret key that was shared in chat.** Go to Project Settings → API Keys → Secret keys, create a new key, then delete the old one (ending `AkGoV`). Nothing needs the new key: Edge Functions get theirs from Supabase automatically.
2. **Create an access token.** Go to https://supabase.com/dashboard/account/tokens → Generate new token, and name it `github-deploy`. Copy the token.
3. **Find the database password.** Use the one you chose when you created the project. If you've lost it, go to Project Settings → Database → Reset database password.
4. **Add both to GitHub.** Go to https://github.com/Paxdolmes/Pax_trades/settings/secrets/actions and click "New repository secret" twice:
   - `SUPABASE_ACCESS_TOKEN`: the token from step 2
   - `SUPABASE_DB_PASSWORD`: the password from step 3
5. From then on, every merge to `main` that changes `supabase/` updates the live database and server functions. To run it by hand, go to the Actions tab → Deploy Supabase → Run workflow.

### Sign-in emails

People sign in with their email and a 6-digit code. Two settings make that work:

1. **Put the code in the email.** Go to Authentication → Emails → Templates → **Magic Link** (Supabase uses this one for codes) and replace the message with:
   ```html
   <h2>Your Relay code</h2>
   <p>Enter this code in the app to sign in: <strong>{{ .Token }}</strong></p>
   <p>It works for 1 hour. If you didn't ask for it, you can ignore this email.</p>
   ```
   Do the same for the **Confirm signup** template. Under Authentication → Sign In / Providers → Email, check the email code length is **6**.
2. **Send from your own email service before real users.** Supabase's built-in email only reaches members of your Supabase team and sends a few an hour, which is fine for testing. For real customers, sign up for an email service such as Resend (https://resend.com, free for 3,000 emails a month), verify your domain, and enter its SMTP details under Authentication → Emails → SMTP Settings. Its password goes there, not in chat.

## 2. Stripe (card payments and paying pros)

1. Sign up at https://dashboard.stripe.com/register. Stay in **test mode**, where no real money moves.
2. Turn on Connect: go to https://dashboard.stripe.com/connect and choose **Marketplace**. This lets pros add their bank account through Stripe.
3. Done: the test publishable key is in `mobile/eas.json` and `mobile/.env.example`.
4. Add the **secret key** (`sk_test_…`) to Supabase, not to chat: go to Supabase → Edge Functions → Secrets → Add new secret, with the name `STRIPE_SECRET_KEY`.
5. Add the webhook. In Stripe, go to Developers → Webhooks → Add destination and set:
   - URL: `https://qfpujvfopbgnslylsquf.supabase.co/functions/v1/stripe-webhook`
   - Events: `setup_intent.succeeded`, `payment_intent.succeeded`, `payment_intent.payment_failed`
   - Connected accounts: off ("Your account" only)

   Copy its **signing secret** (`whsec_…`) into Supabase Edge Functions → Secrets as `STRIPE_WEBHOOK_SECRET`.

## 3. The 5-minute charging job

Confirmed jobs, including ones that confirm themselves after 48 hours, are charged by a timer that runs inside the database. It needs a shared password so that only the timer can trigger charges.

1. Make up a long random password. A password manager's generator works.
2. In Supabase → Edge Functions → Secrets, add it as `RELAY_CRON_SECRET`.
3. In Supabase → SQL Editor, run the following, putting your password in place of `YOUR-PASSWORD`:
   ```sql
   select vault.create_secret('https://qfpujvfopbgnslylsquf.supabase.co', 'relay_project_url');
   select vault.create_secret('YOUR-PASSWORD', 'relay_cron_secret');
   ```

The other timers need no setup. These are:
- offering jobs to the next pros (every 30 seconds)
- moving late pros' jobs to someone else (every 2 minutes)
- the 48-hour auto-confirm (every 15 minutes)

## 4. Test builds on your phone

The apps use native features (camera, photos, location, notifications, Stripe), so Expo Go can't run them. You need a test build of each app. Expo is set up: the organisation is `relay-trades`, with the projects `relay` and `relay-traders`, and the `EXPO_TOKEN` secret is in GitHub.

To make test builds:

1. On GitHub, open **Actions**, then **Build apps** on the left.
2. Click **Run workflow**. Pick the platform (`android` is free; `ios` needs an Apple Developer account at $99 a year) and which apps.
3. Each build takes 10 to 20 minutes on Expo's servers. When it's done, open https://expo.dev/accounts/relay-trades/projects, pick the project, then **Builds**, and scan the QR code with your phone to install it.

The build profiles in `mobile/eas.json`:
- `preview` and `preview-traders`: shareable test builds (what the workflow makes)
- `development` and `development-traders`: for testing with live reload
- `production` and `production-traders`: store builds

## 5. Making yourself an admin

The admin screen (approving pros and sorting out problem reports) is in Relay Traders, for accounts with the admin role.

1. Sign up in Relay Traders with your email, and enter your name.
2. In Supabase, open **SQL Editor** and run this, with your email:

   ```sql
   update public.profiles set role = 'admin'
    where id = (select id from auth.users where email = 'you@example.com');
   ```
3. Close and reopen Relay Traders. It opens on the admin screen.

## Still to do before real customers

- **Your own email domain in Resend.** `onboarding@resend.dev` only delivers to the email you signed up to Resend with. Add and verify a domain in Resend, then change the sender in Supabase.
- **Failed charges are followed up by hand.** When a card is declined or the bank asks the customer to approve the payment, the job is marked with `payment_failed_at` in the jobs table. Contact the customer and charge them from the Stripe dashboard.
- **Extra work on fixed-price and quoted jobs** isn't approved in the app yet. Those jobs are charged at the agreed price; if the pro and customer agree more in chat, add it by hand in Stripe. Callout jobs are charged for the pro's time, which can include parts.
- **Refunds** are made in the Stripe dashboard first, then marked as refunded on the admin screen.
