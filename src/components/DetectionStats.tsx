import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, AlertTriangle, Users, TrendingUp, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface DetectionStats {
  totalDetections: number;
  helmetCompliance: number;
  violationsToday: number;
  avgConfidence: number;
  lastDetection: string | null;
}

const DetectionStats: React.FC = () => {
  const [stats, setStats] = useState<DetectionStats>({
    totalDetections: 0,
    helmetCompliance: 0,
    violationsToday: 0,
    avgConfidence: 0,
    lastDetection: null,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Get total detections
        const { count: totalCount } = await supabase
          .from('helmet_detections')
          .select('*', { count: 'exact', head: true });

        // Get helmet compliance rate
        const { data: complianceData } = await supabase
          .from('helmet_detections')
          .select('has_helmet');

        // Get violations today
        const today = new Date().toISOString().split('T')[0];
        const { count: violationsCount } = await supabase
          .from('helmet_detections')
          .select('*', { count: 'exact', head: true })
          .eq('has_helmet', false)
          .gte('detection_timestamp', `${today}T00:00:00.000Z`);

        // Get average confidence
        const { data: confidenceData } = await supabase
          .from('helmet_detections')
          .select('confidence');

        // Get last detection
        const { data: lastDetectionData } = await supabase
          .from('helmet_detections')
          .select('detection_timestamp')
          .order('detection_timestamp', { ascending: false })
          .limit(1);

        const totalDetections = totalCount || 0;
        const helmetCompliant = complianceData?.filter(d => d.has_helmet).length || 0;
        const complianceRate = totalDetections > 0 ? (helmetCompliant / totalDetections) * 100 : 0;
        const avgConfidence = confidenceData?.length 
          ? confidenceData.reduce((sum, d) => sum + parseFloat(d.confidence.toString()), 0) / confidenceData.length 
          : 0;

        setStats({
          totalDetections,
          helmetCompliance: complianceRate,
          violationsToday: violationsCount || 0,
          avgConfidence: avgConfidence * 100,
          lastDetection: lastDetectionData?.[0]?.detection_timestamp || null,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchStats();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('detection-stats-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'helmet_detections'
        },
        () => {
          fetchStats(); // Refresh stats when new detection is added
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const StatCard = ({ 
    icon: Icon, 
    title, 
    value, 
    suffix = '', 
    trend,
    color = 'primary' 
  }: {
    icon: any;
    title: string;
    value: string | number;
    suffix?: string;
    trend?: 'up' | 'down' | 'neutral';
    color?: 'primary' | 'success' | 'danger' | 'warning';
  }) => (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg bg-${color}/10`}>
            <Icon className={`h-5 w-5 text-${color}`} />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-bold">{value}{suffix}</span>
              {trend && (
                <TrendingUp className={`h-4 w-4 ${
                  trend === 'up' ? 'text-success' : 
                  trend === 'down' ? 'text-danger' : 'text-muted-foreground'
                } ${trend === 'down' ? 'rotate-180' : ''}`} />
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Detection Analytics</h2>
        <Badge variant="outline" className="flex items-center space-x-1">
          <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
          <span>Live Data</span>
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Shield}
          title="Total Detections"
          value={stats.totalDetections}
          color="primary"
        />
        
        <StatCard
          icon={Users}
          title="Helmet Compliance"
          value={stats.helmetCompliance.toFixed(1)}
          suffix="%"
          trend={stats.helmetCompliance >= 90 ? 'up' : stats.helmetCompliance >= 70 ? 'neutral' : 'down'}
          color={stats.helmetCompliance >= 90 ? 'success' : stats.helmetCompliance >= 70 ? 'warning' : 'danger'}
        />
        
        <StatCard
          icon={AlertTriangle}
          title="Violations Today"
          value={stats.violationsToday}
          color={stats.violationsToday === 0 ? 'success' : 'danger'}
        />
        
        <StatCard
          icon={TrendingUp}
          title="Avg Confidence"
          value={stats.avgConfidence.toFixed(1)}
          suffix="%"
          color={stats.avgConfidence >= 80 ? 'success' : 'warning'}
        />
      </div>

      {stats.lastDetection && (
        <Card className="p-4">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Last detection: {new Date(stats.lastDetection).toLocaleString()}</span>
          </div>
        </Card>
      )}
    </div>
  );
};

export default DetectionStats;