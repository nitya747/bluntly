import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';
import { getOrCreateProfile } from '../../../lib/supabase/profile';

export async function GET(request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized access.' }, { status: 401 });
    }

    // Retrieve or auto-create profile
    const profile = await getOrCreateProfile(supabase, user.id);

    return NextResponse.json({ success: true, credits: profile?.credits ?? 0 });
  } catch (err) {
    console.error('Error in GET /api/credits:', err);
    return NextResponse.json({ error: err.message || 'Internal server error.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized access.' }, { status: 401 });
    }

    // Retrieve or auto-create profile
    const profile = await getOrCreateProfile(supabase, user.id);

    let currentCredits = profile?.credits ?? 0;

    // Top up with 10 credits
    const newCredits = currentCredits + 10;

    const { error: updateError } = await supabase
      .from('profiles')
      .upsert({ id: user.id, credits: newCredits });

    if (updateError) {
      console.error('Database update error for credits:', updateError);
      throw new Error(`Failed to update credits: ${updateError.message}`);
    }

    return NextResponse.json({ success: true, credits: newCredits });
  } catch (err) {
    console.error('Error in POST /api/credits:', err);
    return NextResponse.json({ error: err.message || 'Internal server error.' }, { status: 500 });
  }
}
