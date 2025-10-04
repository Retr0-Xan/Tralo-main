import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface Achievement {
  id: string;
  achievement_code: string;
  unlocked_at: string;
  progress_data?: any;
}

interface AchievementDefinition {
  code: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  color_class: string;
}

const AchievementsGrid = () => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [definitions, setDefinitions] = useState<AchievementDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAchievements();
    fetchDefinitions();
  }, []);

  const fetchAchievements = async () => {
    try {
      const { data, error } = await supabase
        .from('user_achievements')
        .select('*')
        .order('unlocked_at', { ascending: false });

      if (error) throw error;
      setAchievements(data || []);
    } catch (error: any) {
      console.error('Error fetching achievements:', error);
      toast({
        title: "Error",
        description: "Failed to load achievements",
        variant: "destructive",
      });
    }
  };

  const fetchDefinitions = async () => {
    try {
      const { data, error } = await supabase
        .from('achievement_definitions')
        .select('*');

      if (error) throw error;
      setDefinitions(data || []);
    } catch (error: any) {
      console.error('Error fetching achievement definitions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getColorClasses = (colorClass: string) => {
    const colorMap: Record<string, string> = {
      yellow: 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200',
      green: 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200',
      blue: 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200',
      purple: 'bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-200',
      gold: 'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200',
      pink: 'bg-pink-50 dark:bg-pink-950 border-pink-200 dark:border-pink-800 text-pink-800 dark:text-pink-200',
      royal: 'bg-indigo-50 dark:bg-indigo-950 border-indigo-200 dark:border-indigo-800 text-indigo-800 dark:text-indigo-200',
    };
    return colorMap[colorClass] || colorMap.blue;
  };

  const getDescriptionColorClasses = (colorClass: string) => {
    const colorMap: Record<string, string> = {
      yellow: 'text-yellow-600 dark:text-yellow-400',
      green: 'text-green-600 dark:text-green-400',
      blue: 'text-blue-600 dark:text-blue-400',
      purple: 'text-purple-600 dark:text-purple-400',
      gold: 'text-amber-600 dark:text-amber-400',
      pink: 'text-pink-600 dark:text-pink-400',
      royal: 'text-indigo-600 dark:text-indigo-400',
    };
    return colorMap[colorClass] || colorMap.blue;
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="p-3 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  if (achievements.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-2">🏆</div>
        <p className="text-muted-foreground">No achievements unlocked yet</p>
        <p className="text-sm text-muted-foreground mt-1">
          Start making sales and managing inventory to unlock achievements!
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {achievements.map((achievement) => {
        const definition = definitions.find(d => d.code === achievement.achievement_code);
        if (!definition) return null;

        return (
          <div
            key={achievement.id}
            className={`p-3 rounded-lg border ${getColorClasses(definition.color_class)}`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{definition.icon}</span>
              <div className="text-sm font-medium">{definition.title}</div>
            </div>
            <div className={`text-xs mt-1 ${getDescriptionColorClasses(definition.color_class)}`}>
              {definition.description}
            </div>
            <div className={`text-xs mt-1 opacity-70 ${getDescriptionColorClasses(definition.color_class)}`}>
              Unlocked {new Date(achievement.unlocked_at).toLocaleDateString()}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AchievementsGrid;