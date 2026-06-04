/**
 * Helper utility to fetch or create a user's credit profile.
 * Resolves edge cases where users registered before database triggers were set up.
 * @param {object} supabase - The Supabase server/client instance
 * @param {string} userId - The user's UUID
 * @returns {Promise<object>} The profile row containing credits
 */
export async function getOrCreateProfile(supabase, userId) {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('credits')
    .eq('id', userId)
    .single();

  if (error && error.code === 'PGRST116') {
    // Row not found - auto-insert on the fly
    const { data: newProfile, error: insertError } = await supabase
      .from('profiles')
      .insert({ id: userId, credits: 3 })
      .select('credits')
      .single();

    if (insertError) {
      console.error('Failed to auto-create user profile on the fly:', insertError);
      // Return a fallback object so user operations do not crash
      return { credits: 3 };
    }
    return newProfile;
  } else if (error) {
    console.error('Database profiles query error:', error);
    throw new Error(error.message || 'Profiles query failed');
  }

  return profile || { credits: 0 };
}
