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
    const { phone } = await request.json();

    if (!phone) {
      return NextResponse.json({ error: 'Phone number is required.' }, { status: 400 });
    }

    // Send OTP via Twilio Verify
    await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SID)
      .verifications.create({ to: phone, channel: 'sms' });

    // Log to Supabase
    await supabase.from('otp_log').insert([{ phone }]);

    return NextResponse.json({ success: true, message: 'OTP sent successfully!' });

  } catch (error) {
    console.log('Twilio error:', error.message, error.code);
    return NextResponse.json({ error: 'Failed to send OTP.', details: error.message }, { status: 500 });
}
}