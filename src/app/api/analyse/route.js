import { NextResponse } from 'next/server';
import { parseResume } from '../../../lib/parsers';
import { analyzeResume } from '../../../lib/gemini';
import { createClient } from '../../../lib/supabase/server';

export async function POST(request) {
  try {
    const bypassCookie = request.cookies.get('blunlty_bypass')?.value;
    const isBypass = bypassCookie === 'true';

    let user = null;
    let supabase = null;

    if (isBypass) {
      user = { id: 'mock-dev-id' };
    } else {
      supabase = await createClient();
      const { data } = await supabase.auth.getUser();
      user = data?.user;
    }
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized access.' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const jobDescription = formData.get('jobDescription') || '';

    // Handle initial backend check ping (where no file is sent)
    if (!file) {
      return NextResponse.json({ 
        success: true, 
        isMock: !process.env.GEMINI_API_KEY 
      });
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Parse the file text based on its format (pdf / LaTeX / txt)
    const parsedText = await parseResume(buffer, file.name || 'Resume.pdf');

    // Run the analysis (Gemini or Mock fallback)
    const analysis = await analyzeResume(parsedText, jobDescription, file.name || 'Resume');

    // Persist scan result in Supabase scans table if not bypassed
    let scanId = 'mock-' + Math.random().toString(36).substr(2, 9);
    let createdAt = new Date().toISOString();

    if (!isBypass && supabase) {
      const { data: scanRow, error: dbError } = await supabase
        .from('scans')
        .insert({
          filename: file.name || 'Resume.pdf',
          candidate_name: analysis.candidateName,
          ats_score: analysis.atsScore,
          quality_score: analysis.qualityScore,
          skills: analysis.skills,
          sections: analysis.sections,
          feedback: analysis.feedback,
          job_description: jobDescription,
          user_id: user.id
        })
        .select('id, created_at')
        .single();

      if (dbError) {
        console.error('Database write error:', dbError);
        throw new Error(`Failed to save scan: ${dbError.message}`);
      }

      scanId = scanRow.id;
      createdAt = scanRow.created_at;
    }

    // Return the response containing database ID & mock state status
    return NextResponse.json({
      success: true,
      analysis: {
        ...analysis,
        id: scanId,
        timestamp: new Date(createdAt).toLocaleTimeString()
      },
      isMock: !process.env.GEMINI_API_KEY
    });
  } catch (error) {
    console.error('Error in /api/analyse:', error);
    return NextResponse.json(
      { error: error.message || 'An error occurred during resume analysis.' },
      { status: 500 }
    );
  }
}
