import { type EmailOtpType } from '@supabase/supabase-js';
import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;

  // This endpoint is specifically for signup email verification.
  if (!tokenHash || type !== 'email') {
    return NextResponse.redirect(
      new URL('/auth/login?error=invalid_verification_link', request.url),
    );
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });

    if (error) {
      console.warn('Auth verifyOtp error:', error.message);
      return NextResponse.redirect(
        new URL('/auth/login?error=verification_failed', request.url),
      );
    }

    return NextResponse.redirect(
      new URL(
        '/auth/login?success=Email%20verified.%20Your%20account%20is%20now%20awaiting%20administrator%20approval.',
        request.url,
      ),
    );
  } catch (error) {
    console.warn('Auth confirmation error:', error);
    return NextResponse.redirect(
      new URL('/auth/login?error=verification_failed', request.url),
    );
  }
}
