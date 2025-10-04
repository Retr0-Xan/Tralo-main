import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface TrustScore {
  trustScore: number;
  loading: boolean;
  error: string | null;
}

export const useTrustScore = (): TrustScore => {
  const [trustScore, setTrustScore] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchTrustScore = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // First try to get existing trust score
        let { data: existingScore, error: fetchError } = await supabase
          .from('user_trust_scores')
          .select('trust_score')
          .eq('user_id', user.id)
          .maybeSingle();

        if (fetchError) {
          console.error('Error fetching trust score:', fetchError);
          setError(fetchError.message);
          setTrustScore(0);
          return;
        }

        // If no existing score, create one by calling the enhanced update function
        if (!existingScore) {
          const { error: updateError } = await supabase.rpc('update_user_trust_score_enhanced', {
            user_uuid: user.id
          });

          if (updateError) {
            console.error('Error creating trust score:', updateError);
            setError(updateError.message);
            setTrustScore(0);
            return;
          }

          // Fetch the newly created score
          const { data: newScore, error: newFetchError } = await supabase
            .from('user_trust_scores')
            .select('trust_score')
            .eq('user_id', user.id)
            .maybeSingle();

          if (newFetchError) {
            console.error('Error fetching new trust score:', newFetchError);
            setError(newFetchError.message);
            setTrustScore(0);
            return;
          }

          setTrustScore(newScore?.trust_score || 0);
        } else {
          setTrustScore(existingScore.trust_score);
        }
      } catch (err) {
        console.error('Unexpected error in trust score hook:', err);
        setError('Failed to load trust score');
        setTrustScore(0);
      } finally {
        setLoading(false);
      }
    };

    fetchTrustScore();
  }, [user]);

  return { trustScore, loading, error };
};