# Password Reset Configuration

The password reset page has been created at `/reset-password`.

## Supabase Configuration Required

To make password reset work properly, you need to configure the redirect URL in your Supabase dashboard:

### Steps:

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Navigate to **Authentication** → **URL Configuration**
4. Add the following to **Redirect URLs**:
   - For local development: `http://localhost:3000/reset-password`
   - For production: `https://yourdomain.com/reset-password`

### How it works:

1. User requests password reset via Supabase dashboard or your forgot password page
2. Supabase sends an email with a reset link
3. Link redirects to `/reset-password` with token in URL hash
4. User enters new password
5. Password is updated via Supabase Auth API
6. User is redirected to login page

### Testing:

1. Configure the redirect URL in Supabase (step above)
2. Request a password reset from Supabase dashboard
3. Click the link in your email
4. You should now see the password reset page instead of being redirected to login

## Additional Feature: Forgot Password Page

You may also want to create a "Forgot Password" page where users can request a reset link themselves:

- Create `/forgot-password` page with email input
- Call `supabase.auth.resetPasswordForEmail(email, { redirectTo: 'http://localhost:3000/reset-password' })`
- Show success message

## Security Note:

The `/reset-password` route has been added to the public paths in middleware, allowing access without authentication (required for password reset flow).
