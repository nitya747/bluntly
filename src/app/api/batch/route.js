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
    const files = formData.getAll('files');
    const jobDescription = formData.get('jobDescription') || '';

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    // Retrieve user credits (retrieve or auto-create profile)
    const profile = await getOrCreateProfile(supabase, user.id);

    if (!profile) {
      return NextResponse.json({ error: 'Failed to retrieve user profile.' }, { status: 500 });
    }

    if (profile.credits < files.length) {
      return NextResponse.json(
        { error: `Insufficient credits. You need ${files.length} credits to process this batch, but you only have ${profile.credits}.` },
        { status: 403 }
      );
    }

    const encoder = new TextEncoder();
    let remainingCredits = profile.credits;

    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (event, data) => {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ event, ...data })}\n\n`));
          } catch (e) {
            console.error('Error enqueuing controller chunk:', e);
          }
        };

        // Notify client of initiation and total count
        sendEvent('init', { total: files.length, credits: remainingCredits });

        const results = [];

        // Process each file sequentially
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const filename = file.name || `Resume_${i + 1}`;

          try {
            // Step 1: Parsing
            sendEvent('progress', { index: i, name: filename, status: 'parsing', credits: remainingCredits });
            
            const bytes = await file.arrayBuffer();
            const buffer = Buffer.from(bytes);
            const parsedText = await parseResume(buffer, filename);

            // Step 2: Analysis
            sendEvent('progress', { index: i, name: filename, status: 'analysing', credits: remainingCredits });
            const analysis = await analyzeResume(parsedText, jobDescription, filename);

            // Persist the batch item inside the Supabase database
            const { data: scanRow, error: dbError } = await supabase
              .from('scans')
              .insert({
                filename,
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

            let record;
            if (dbError) {
              console.error(`Database write failed for ${filename}:`, dbError);
              // Fallback record to keep flow going
              record = {
                id: 'mock-' + Math.random().toString(36).substr(2, 9),
                filename,
                success: true,
                analysis,
                timestamp: new Date().toLocaleTimeString()
              };
            } else {
              record = {
                id: scanRow.id,
                filename,
                success: true,
                analysis: {
                  ...analysis,
                  id: scanRow.id,
                  timestamp: new Date(scanRow.created_at).toLocaleTimeString()
                }
              };
            }

            // Deduct 1 credit for this successfully processed file
            remainingCredits = Math.max(0, remainingCredits - 1);
            const { error: creditError } = await supabase
              .from('profiles')
              .update({ credits: remainingCredits })
              .eq('id', user.id);

            if (creditError) {
              console.error(`Failed to deduct credit for ${filename}:`, creditError);
            }

            results.push(record);

            // Step 3: Completed for this file
            sendEvent('progress', { 
              index: i, 
              name: filename, 
              status: 'completed', 
              result: record, 
              credits: remainingCredits 
            });
          } catch (err) {
            console.error(`Error processing file ${filename}:`, err);
            const record = {
              filename,
              success: false,
              error: err.message || 'An error occurred during parsing or analysis.'
            };
            results.push(record);
            
            // Note: We don't deduct credits for outright failure during parsing/analysis, 
            // but we still send progress update
            sendEvent('progress', { 
              index: i, 
              name: filename, 
              status: 'error', 
              result: record, 
              credits: remainingCredits 
            });
          }
        }

        // Final completion event
        sendEvent('complete', { results, credits: remainingCredits, isMock: !process.env.GEMINI_API_KEY });
        controller.close();
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error in batch API route:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to initialize batch process.' },
      { status: 500 }
    );
  }
}
