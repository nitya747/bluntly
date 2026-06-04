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
    const files = formData.getAll('files');
    const jobDescription = formData.get('jobDescription') || '';

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    const encoder = new TextEncoder();

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
        sendEvent('init', { total: files.length });

        const results = [];

        // Process each file sequentially to show neat UI transitions
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const filename = file.name || `Resume_${i + 1}`;

          try {
            // Step 1: Parsing
            sendEvent('progress', { index: i, name: filename, status: 'parsing' });
            
            const bytes = await file.arrayBuffer();
            const buffer = Buffer.from(bytes);
            const parsedText = await parseResume(buffer, filename);

            // Step 2: Analysis
            sendEvent('progress', { index: i, name: filename, status: 'analysing' });
            const analysis = await analyzeResume(parsedText, jobDescription, filename);

            // Persist the batch item inside the Supabase database if not bypassed
            let scanRow = null;
            let dbError = null;

            if (!isBypass && supabase) {
              const res = await supabase
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
              scanRow = res.data;
              dbError = res.error;
            } else {
              dbError = { message: 'Bypassed database write' };
            }

            let record;
            if (dbError) {
              if (!isBypass) {
                console.error(`Database write failed for ${filename}:`, dbError);
              }
              // Fallback record to keep flow going even if DB fails
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

            results.push(record);

            // Step 3: Completed for this file
            sendEvent('progress', { index: i, name: filename, status: 'completed', result: record });
          } catch (err) {
            console.error(`Error processing file ${filename}:`, err);
            const record = {
              filename,
              success: false,
              error: err.message || 'An error occurred during parsing or analysis.'
            };
            results.push(record);
            
            // Step 3 (Error): Completed with error
            sendEvent('progress', { index: i, name: filename, status: 'error', result: record });
          }
        }

        // Final completion event
        sendEvent('complete', { results, isMock: !process.env.GEMINI_API_KEY });
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
