import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface Achievement {
  id: string;
  code: string;
  title: string;
  description: string;
  icon: string;
  color_class: string;
  category: string;
  unlocked_at?: string;
  progress_data?: any;
}

const colorClassMap = {
  yellow: 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200',
  green: 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200',
  blue: 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200',
  purple: 'bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-200',
  gold: 'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200',
  pink: 'bg-pink-50 dark:bg-pink-950 border-pink-200 dark:border-pink-800 text-pink-800 dark:text-pink-200',
  royal: 'bg-violet-50 dark:bg-violet-950 border-violet-200 dark:border-violet-800 text-violet-800 dark:text-violet-200'
};

export default function AchievementsSection() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAchievements();
  }, []);

  const fetchAchievements = async () => {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's unlocked achievements
      const { data: userAchievements } = await supabase
        .from('user_achievements')
        .select(`
          achievement_code,
          unlocked_at,
          progress_data,
          achievement_definitions!inner (
            id,
            code,
            title,
            description,
            icon,
            color_class,
            category
          )
        `)
        .eq('user_id', user.id);

      // Get all achievement definitions to show locked ones too
      const { data: allDefinitions } = await supabase
        .from('achievement_definitions')
        .select('*')
        .order('category', { ascending: true });

      if (allDefinitions) {
        const unlockedCodes = userAchievements?.map(ua => ua.achievement_code) || [];
        
        const formattedAchievements = allDefinitions.map(def => {
          const userAchievement = userAchievements?.find(ua => ua.achievement_code === def.code);
          return {
            ...def,
            unlocked_at: userAchievement?.unlocked_at,
            progress_data: userAchievement?.progress_data
          };
        });

        setAchievements(formattedAchievements);
      }
    } catch (error) {
      console.error('Error fetching achievements:', error);
      toast({
        title: "Error",
        description: "Failed to load achievements",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const triggerAchievementCheck = async () => {
    try {
      toast({
        title: "Checking for new achievements...",
        description: "This may take a moment",
      });

      const { data } = await supabase.functions.invoke('achievement-tracker');
      
      if (data) {
        toast({
          title: "Achievement check complete",
          description: `${data.achievements_unlocked || 0} new achievements unlocked!`,
        });
        
        // Refresh achievements after check
        fetchAchievements();
      }
    } catch (error) {
      console.error('Error checking achievements:', error);
      toast({
        title: "Error",
        description: "Failed to check for achievements",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            🏆 My Achievements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const unlockedAchievements = achievements.filter(a => a.unlocked_at);
  const lockedAchievements = achievements.filter(a => !a.unlocked_at);

  return (
    <Card>
      <CardHeader>
          <CardTitle className="flex items-center gap-2 justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
              🏆 My Achievements ({unlockedAchievements.length}/{achievements.length})
            </div>
            <button 
              onClick={triggerAchievementCheck}
              className="text-xs bg-primary text-primary-foreground px-3 py-1 rounded-md hover:bg-primary/90 transition-colors"
            >
              Check Progress
            </button>
          </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Unlocked Achievements */}
          {unlockedAchievements.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2 text-green-600 dark:text-green-400">
                ✅ Unlocked ({unlockedAchievements.length})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {unlockedAchievements.map((achievement) => (
                  <div 
                    key={achievement.code} 
                    className={`p-3 rounded-lg border ${colorClassMap[achievement.color_class as keyof typeof colorClassMap] || colorClassMap.blue} relative`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="text-sm font-medium flex items-center gap-1">
                          {achievement.icon} {achievement.title}
                        </div>
                        <div className="text-xs opacity-80 mt-1">{achievement.description}</div>
                        {achievement.unlocked_at && (
                          <div className="text-xs opacity-60 mt-1">
                            Unlocked {new Date(achievement.unlocked_at).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      <div className="text-xs bg-green-500 text-white px-2 py-1 rounded-full ml-2">
                        ✓
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Locked Achievements */}
          {lockedAchievements.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2 text-muted-foreground">
                🔒 Available ({lockedAchievements.length})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {lockedAchievements.slice(0, 4).map((achievement) => (
                  <div 
                    key={achievement.code} 
                    className="p-3 rounded-lg border bg-muted/30 border-muted text-muted-foreground relative opacity-60"
                  >
                    <div className="text-sm font-medium flex items-center gap-1">
                      {achievement.icon} {achievement.title}
                    </div>
                    <div className="text-xs mt-1">{achievement.description}</div>
                    <div className="absolute top-2 right-2 text-xs">
                      🔒
                    </div>
                  </div>
                ))}
              </div>
              {lockedAchievements.length > 4 && (
                <div className="text-xs text-muted-foreground mt-2 text-center">
                  +{lockedAchievements.length - 4} more achievements to unlock...
                </div>
              )}
            </div>
          )}

          {achievements.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No achievements available yet.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}