// 2FA OTP API Routes
import { NextRequest, NextResponse } from 'next/server';
import { send2FAOTP, generateOTP } from '@/lib/email';

// Store OTPs temporarily (in production, use Redis or database)
const otpStore = new Map<string, { otp: string; expiresAt: number; attempts: number }>();

// Clean up expired OTPs periodically
setInterval(() => {
  const now = Date.now();
  for (const [email, data] of otpStore.entries()) {
    if (data.expiresAt < now) {
      otpStore.delete(email);
    }
  }
}, 60000); // Clean every minute

// POST /api/auth/2fa - Send OTP
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, userName, action } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    // Rate limiting - check if OTP was sent recently
    const existing = otpStore.get(email);
    if (existing && Date.now() - (existing.expiresAt - 10 * 60 * 1000) < 60000) {
      return NextResponse.json(
        { success: false, error: 'Please wait 1 minute before requesting another code' },
        { status: 429 }
      );
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Store OTP
    otpStore.set(email, { otp, expiresAt, attempts: 0 });

    // Send OTP via email
    const result = await send2FAOTP(email, otp, userName);

    if (!result.success) {
      console.error('Failed to send 2FA OTP:', result.error);
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to send verification code' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Verification code sent to your email',
      expiresIn: 600, // seconds
    });
  } catch (error) {
    console.error('2FA send error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/auth/2fa - Verify OTP
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, otp } = body;

    if (!email || !otp) {
      return NextResponse.json(
        { success: false, error: 'Email and OTP are required' },
        { status: 400 }
      );
    }

    const stored = otpStore.get(email);

    if (!stored) {
      return NextResponse.json(
        { success: false, error: 'No verification code found. Please request a new one.' },
        { status: 400 }
      );
    }

    // Check if expired
    if (Date.now() > stored.expiresAt) {
      otpStore.delete(email);
      return NextResponse.json(
        { success: false, error: 'Verification code has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // Check attempts
    if (stored.attempts >= 5) {
      otpStore.delete(email);
      return NextResponse.json(
        { success: false, error: 'Too many failed attempts. Please request a new code.' },
        { status: 429 }
      );
    }

    // Verify OTP
    if (stored.otp !== otp) {
      stored.attempts++;
      return NextResponse.json(
        { success: false, error: 'Invalid verification code' },
        { status: 400 }
      );
    }

    // OTP verified successfully - remove from store
    otpStore.delete(email);

    return NextResponse.json({
      success: true,
      message: 'Verification successful',
    });
  } catch (error) {
    console.error('2FA verify error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
