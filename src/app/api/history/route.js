import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';

export async function GET(request) {
  try {
    const bypassCookie = request.cookies.get('blunlty_bypass')?.value;
    if (bypassCookie === 'true') {
      return NextResponse.json({
        success: true,
        history: []
      });
    }

    const supabase = await createClient();

    // Check user authenticated context
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized access.' }, { status: 401 });
    }

    // Retrieve user-specific scans from database, ordered newest first
    const { data: scans, error: dbError } = await supabase
      .from('scans')
      .select('*')
      .order('created_at', { ascending: false });

    if (dbError) {
      console.error('Database history select error:', dbError);
      throw new Error(`Failed to fetch scan history: ${dbError.message}`);
    }

    // Format rows for frontend history state list
    const historyList = scans.map((row) => ({
      id: row.id,
      filename: row.filename,
      timestamp: new Date(row.created_at).toLocaleTimeString(),
      analysis: {
        candidateName: row.candidate_name,
        atsScore: row.ats_score,
        qualityScore: row.quality_score,
        skills: row.skills,
        sections: row.sections,
        feedback: row.feedback,
        jobDescription: row.job_description
      }
    }));

    return NextResponse.json({
      success: true,
      history: historyList
    });
  } catch (error) {
    console.error('Error in /api/history:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred while fetching history.' },
      { status: 500 }
    );
  }
}
