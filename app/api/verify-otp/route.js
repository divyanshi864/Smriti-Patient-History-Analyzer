import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
const twilio = require('twilio');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export async function POST(request) {
  try {
    const { phone, code } = await request.json();
    if (!phone || !code) {
      return NextResponse.json({ error: 'Phone and OTP code are required.' }, { status: 400 });
    }

    // DEMO BYPASS: code 000000 skips Twilio (for offline demo / unverified numbers)
    if (code === '000000') {
      await supabase.from('otp_log').update({ used: true }).eq('phone', phone).eq('used', false);
      return NextResponse.json({ success: true, message: 'Demo bypass verified!' });
    }

    const verification = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SID)
      .verificationChecks.create({ to: phone, code });

    if (verification.status !== 'approved') {
      return NextResponse.json({ error: 'Invalid or expired OTP.' }, { status: 400 });
    }

    await supabase.from('otp_log').update({ used: true }).eq('phone', phone).eq('used', false);
    return NextResponse.json({ success: true, message: 'OTP verified successfully!' });

  } catch (error) {
    // If Twilio fails (unverified number on free trial), suggest demo bypass
    return NextResponse.json({
      error: 'OTP verification failed. If testing, use code 000000 as demo bypass.',
      details: error.message
    }, { status: 500 });
  }
}
