-- Database Schema for blunlty Resume Analyser
-- Paste this script directly into the Supabase SQL Editor to initialize the scans table.

-- Create scans table
CREATE TABLE IF NOT EXISTS public.scans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  filename TEXT NOT NULL,
  candidate_name TEXT,
  ats_score INTEGER,
  quality_score INTEGER,
  skills JSONB,
  sections JSONB,
  feedback JSONB,
  job_description TEXT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;

-- Create policies to secure user scans
CREATE POLICY "Users can insert their own scans" 
  ON public.scans 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own scans" 
  ON public.scans 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own scans" 
  ON public.scans 
  FOR DELETE 
  USING (auth.uid() = user_id);
