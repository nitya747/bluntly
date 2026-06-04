import { NextResponse } from 'next/server';
import { parseResume } from '../../../lib/parsers';
import { analyzeResume } from '../../../lib/gemini';
import { createClient } from '../../../lib/supabase/server';
import { getOrCreateProfile } from '../../../lib/supabase/profile';

export async function POST(request) {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    const user = data?.user;
    
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

    // Verify user credits (retrieve or auto-create profile)
    const profile = await getOrCreateProfile(supabase, user.id);

    if (!profile || profile.credits < 1) {
      return NextResponse.json(
        { error: 'Insufficient credits. Please purchase more credits to continue.' },
        { status: 403 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Parse the file text based on its format (pdf / LaTeX / txt)
    const parsedText = await parseResume(buffer, file.name || 'Resume.pdf');

    // Run the analysis (Gemini or Mock fallback)
    const analysis = await analyzeResume(parsedText, jobDescription, file.name || 'Resume');

    // Persist scan result in Supabase scans table
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

    const scanId = scanRow.id;
    const createdAt = scanRow.created_at;

    // Deduct 1 credit from user profile
    const remainingCredits = Math.max(0, profile.credits - 1);
    const { error: creditError } = await supabase
      .from('profiles')
      .update({ credits: remainingCredits })
      .eq('id', user.id);

    if (creditError) {
      console.error('Failed to deduct credit:', creditError);
      // Log it but don't crash, so the user still gets their analysis report
    }

    // Return the response containing database ID, updated credits, & mock status
    return NextResponse.json({
      success: true,
      analysis: {
        ...analysis,
        id: scanId,
        timestamp: new Date(createdAt).toLocaleTimeString()
      },
      credits: remainingCredits,
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
