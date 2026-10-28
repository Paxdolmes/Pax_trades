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

The apps now use native features (camera, photos, Stripe), so Expo Go can't run them. You need a test build of each app.

1. Create a free Expo account at https://expo.dev/signup.
2. Ask Claude to link the project. That needs an Expo access token, which you add in GitHub secrets as `EXPO_TOKEN`, never in chat.
3. These are the build profiles in `mobile/eas.json`:
   - `development` and `development-traders`: for testing, with live reload
   - `preview` and `preview-traders`: shareable test builds
   - `production` and `production-traders`: store builds

   iPhone builds need an Apple Developer account, which costs $99 a year. Android test builds are free.

## Still to build before real customers

- **Sign-up and sign-in screens.** The apps have no login yet, and live mode needs one.
- **A profile record for each new user.** It should be created automatically when they sign up.
- **The pros' live offers list.** In live mode it should read from the database, not the demo data.
- **Push notifications** for new offers and messages.
- **An admin screen** for handling problem reports and approving pros. Until then, the Supabase table editor will do.
