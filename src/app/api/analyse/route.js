import { NextResponse } from 'next/server';
import { parseResume } from '../../../lib/parsers';
import { analyzeResume } from '../../../lib/gemini';
import { createClient } from '../../../lib/supabase/server';
import { getOrCreateProfile } from '../../../lib/supabase/profile';

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

    // Handle initial backend check ping (where no multipart form is sent)
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ 
        success: true, 
        isMock: !process.env.GEMINI_API_KEY 
      });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const jobDescription = formData.get('jobDescription') || '';

    if (!file) {
      return NextResponse.json({ 
        success: true, 
        isMock: !process.env.GEMINI_API_KEY 
      });
    }

    if (typeof file === 'string' || typeof file.arrayBuffer !== 'function') {
      return NextResponse.json({ 
        error: 'Invalid file upload. Please select a valid PDF, LaTeX, or text file.' 
      }, { status: 400 });
    }

    // Verify user credits (retrieve or auto-create profile)
    let profile = null;
    if (user.id === 'mock-dev-id') {
      profile = { credits: 999 };
    } else {
      profile = await getOrCreateProfile(supabase, user.id);
    }

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

    let scanId = 'dummy-scan-id';
    let createdAt = new Date().toISOString();
    let remainingCredits = Math.max(0, profile.credits - 1);

    if (user.id !== 'mock-dev-id') {
      // Persist scan result in Supabase scans table
      const insertData = {
        filename: file.name || 'Resume.pdf',
        candidate_name: analysis.candidateName,
        ats_score: analysis.atsScore,
        quality_score: analysis.qualityScore,
        skills: analysis.skills,
        sections: analysis.sections,
        feedback: {
          ...analysis.feedback,
          ruleViolations: analysis.ruleViolations,
          passedRules: analysis.passedRules,
          experienceMatch: analysis.experienceMatch
        },
        job_description: jobDescription,
        user_id: user.id,
        structured_resume: analysis.structuredResume
      };

      let scanRow = null;
      let dbError = null;

      const dbResult = await supabase
        .from('scans')
        .insert(insertData)
        .select('id, created_at')
        .single();
      
      dbError = dbResult.error;
      scanRow = dbResult.data;

      if (dbError) {
        console.warn('Database write error with structured_resume column. Retrying with fallback placement...', dbError);
        // Fallback: Store structuredResume inside feedback column and retry insert
        const fallbackInsertData = { ...insertData };
        delete fallbackInsertData.structured_resume;
        fallbackInsertData.feedback = {
          ...fallbackInsertData.feedback,
          structuredResume: analysis.structuredResume
        };

        const retryResult = await supabase
          .from('scans')
          .insert(fallbackInsertData)
          .select('id, created_at')
          .single();

        dbError = retryResult.error;
        scanRow = retryResult.data;

        if (dbError) {
          console.error('Database write error on retry fallback:', dbError);
          throw new Error(`Failed to save scan: ${dbError.message}`);
        }
      }

      scanId = scanRow.id;
      createdAt = scanRow.created_at;

      // Deduct 1 credit from user profile
      const { error: creditError } = await supabase
        .from('profiles')
        .update({ credits: remainingCredits })
        .eq('id', user.id);

      if (creditError) {
        console.error('Failed to deduct credit:', creditError);
        // Log it but don't crash, so the user still gets their analysis report
      }
    } else {
      remainingCredits = 999;
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
