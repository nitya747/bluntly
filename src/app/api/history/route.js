import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';

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

    let scans = [];
    if (user.id !== 'mock-dev-id') {
      // Retrieve user-specific scans from database, ordered newest first
      const { data, error: dbError } = await supabase
        .from('scans')
        .select('*')
        .order('created_at', { ascending: false });

      if (dbError) {
        console.error('Database history select error:', dbError);
        throw new Error(`Failed to fetch scan history: ${dbError.message}`);
      }
      scans = data || [];
    }

    // Format rows for frontend history state list
    const historyList = scans.map((row) => {
      const fb = row.feedback || {};
      const structuredResume = row.structured_resume || fb.structuredResume || null;
      
      const feedback = {
        summary: fb.summary || '',
        strengths: fb.strengths || [],
        improvements: fb.improvements || [],
        wordingImprovements: fb.wordingImprovements || [],
        careerAdvice: fb.careerAdvice || '',
        detailedMarkdown: fb.detailedMarkdown || ''
      };

      return {
        id: row.id,
        filename: row.filename,
        timestamp: new Date(row.created_at).toLocaleTimeString(),
        analysis: {
          candidateName: row.candidate_name,
          atsScore: row.ats_score,
          qualityScore: row.quality_score,
          skills: row.skills,
          sections: row.sections,
          feedback: feedback,
          jobDescription: row.job_description,
          structuredResume: structuredResume,
          ruleViolations: fb.ruleViolations || [],
          passedRules: fb.passedRules || [],
          experienceMatch: fb.experienceMatch || null
        }
      };
    });

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
