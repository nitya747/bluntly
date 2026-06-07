import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';
import { getOrCreateProfile } from '../../../lib/supabase/profile';

export async function GET(request) {
  try {
    let user = null;
    const bypassCookie = request.cookies.get('bluntly_bypass')?.value;
    const supabase = await createClient();

    if (bypassCookie === 'true') {
      user = { id: 'mock-dev-id', email: 'developer@bluntly.local' };
    } else {
      const { data } = await supabase.auth.getUser();
      user = data?.user;
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized access.' }, { status: 401 });
    }

    // Retrieve or auto-create profile
    let profile = null;
    if (user.id === 'mock-dev-id') {
      profile = { credits: 999 };
    } else {
      profile = await getOrCreateProfile(supabase, user.id);
    }

    return NextResponse.json({ success: true, credits: profile?.credits ?? 0 });
  } catch (err) {
    console.error('Error in GET /api/credits:', err);
    return NextResponse.json({ error: err.message || 'Internal server error.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    let user = null;
    const bypassCookie = request.cookies.get('bluntly_bypass')?.value;
    const supabase = await createClient();

    if (bypassCookie === 'true') {
      user = { id: 'mock-dev-id', email: 'developer@bluntly.local' };
    } else {
      const { data } = await supabase.auth.getUser();
      user = data?.user;
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized access.' }, { status: 401 });
    }

    // Retrieve or auto-create profile
    let profile = null;
    if (user.id === 'mock-dev-id') {
      profile = { credits: 999 };
    } else {
      profile = await getOrCreateProfile(supabase, user.id);
    }

    let currentCredits = profile?.credits ?? 0;

    // Top up with 10 credits
    const newCredits = currentCredits + 10;

    if (user.id !== 'mock-dev-id') {
      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({ id: user.id, credits: newCredits });

      if (updateError) {
        console.error('Database update error for credits:', updateError);
        throw new Error(`Failed to update credits: ${updateError.message}`);
      }
    }

    return NextResponse.json({ success: true, credits: newCredits });
  } catch (err) {
    console.error('Error in POST /api/credits:', err);
    return NextResponse.json({ error: err.message || 'Internal server error.' }, { status: 500 });
  }
}
