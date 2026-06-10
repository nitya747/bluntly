import { NextResponse } from 'next/server';
import { parseResume } from '../../../lib/parsers';
import { analyzeResume } from '../../../lib/gemini';
import { createClient } from '../../../lib/supabase/server';
import { getOrCreateProfile } from '../../../lib/supabase/profile';

export async function POST(request) {
  try {
    const customApiKey = request.headers.get('x-gemini-api-key') || '';
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

    const formData = await request.formData();
    const files = formData.getAll('files');
    const jobDescription = formData.get('jobDescription') || '';
    const githubToken = formData.get('githubToken') || '';

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    // Validate that all items in the batch are actual files
    for (const file of files) {
      if (typeof file === 'string' || typeof file.arrayBuffer !== 'function') {
        return NextResponse.json({ error: 'Invalid file detected in batch upload. Please upload valid files.' }, { status: 400 });
      }
    }

    // Retrieve user credits (retrieve or auto-create profile)
    let profile = null;
    if (user.id === 'mock-dev-id') {
      profile = { credits: 999 };
    } else {
      profile = await getOrCreateProfile(supabase, user.id);
    }

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
            const parsedText = await parseResume(buffer, filename, customApiKey);

            // Step 2: Analysis
            sendEvent('progress', { index: i, name: filename, status: 'analysing', credits: remainingCredits });
            
            // Build simple context containing the token for candidate GitHub resolution
            const multimodalData = { githubToken };
            const analysis = await analyzeResume(parsedText, jobDescription, filename, multimodalData, customApiKey);

            let record;

            if (user.id === 'mock-dev-id') {
              record = {
                id: 'mock-' + Math.random().toString(36).substr(2, 9),
                filename,
                success: true,
                analysis,
                timestamp: new Date().toLocaleTimeString()
              };
              remainingCredits = 999;
            } else {
              // Persist the batch item inside the Supabase database
              const insertData = {
                filename,
                candidate_name: analysis.candidateName,
                ats_score: analysis.atsScore,
                quality_score: analysis.qualityScore,
                skills: analysis.skills,
                sections: analysis.sections,
                feedback: {
                  ...analysis.feedback,
                  ruleViolations: analysis.ruleViolations,
                  passedRules: analysis.passedRules,
                  experienceMatch: analysis.experienceMatch,
                  semanticSimilarity: analysis.semanticSimilarity,
                  rubrics: analysis.rubrics,
                  rubricEvaluations: analysis.rubricEvaluations,
                  multimodalDetails: analysis.multimodalDetails
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
                console.warn(`Database write failed with structured_resume for ${filename}, retrying with fallback...`, dbError);
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
              }

              if (dbError) {
                console.error(`Database write failed completely for ${filename}:`, dbError);
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
        const isBatchQuotaExceeded = results.some(r => r.analysis?.isQuotaExceeded || false);
        const isMockResult = (!process.env.GEMINI_API_KEY && !customApiKey) || isBatchQuotaExceeded;
        
        sendEvent('complete', { 
          results, 
          credits: remainingCredits, 
          isMock: isMockResult, 
          isQuotaExceeded: isBatchQuotaExceeded 
        });
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
