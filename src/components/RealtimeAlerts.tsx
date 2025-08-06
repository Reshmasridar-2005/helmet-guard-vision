import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock, CheckCircle, Mail, Bell } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SafetyAlert {
  id: string;
  alert_type: string;
  message: string;
  severity: string;
  email_sent: boolean;
  acknowledged: boolean;
  created_at: string;
  updated_at: string;
}

const RealtimeAlerts: React.FC = () => {
  const [alerts, setAlerts] = useState<SafetyAlert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    // Fetch existing alerts
    const fetchAlerts = async () => {
      const { data, error } = await supabase
        .from('safety_alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching alerts:', error);
        return;
      }

      if (data) {
        setAlerts(data);
        setUnreadCount(data.filter(alert => !alert.acknowledged).length);
      }
    };

    fetchAlerts();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('safety-alerts-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'safety_alerts'
        },
        (payload) => {
          console.log('New safety alert:', payload);
          const newAlert = payload.new as SafetyAlert;
          
          setAlerts(prev => [newAlert, ...prev.slice(0, 9)]);
          setUnreadCount(prev => prev + 1);
          
          // Show toast notification
          toast({
            title: "🚨 NEW SAFETY ALERT",
            description: newAlert.message,
            variant: "destructive",
          });

          // Send email notification if it's a critical alert
          if (newAlert.severity === 'critical' && !newAlert.email_sent) {
            sendEmailAlert(newAlert);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [toast]);

  const sendEmailAlert = async (alert: SafetyAlert) => {
    try {
      const { error } = await supabase.functions.invoke('send-safety-alert', {
        body: {
          alertId: alert.id,
          workerEmail: 'secejenish23@gmail.com',
          alertMessage: alert.message,
          severity: alert.severity,
          location: 'Mine Site',
          timestamp: alert.created_at,
        },
      });

      if (error) {
        console.error('Error sending email alert:', error);
        toast({
          title: "Email Alert Failed",
          description: "Could not send safety alert email",
          variant: "destructive",
        });
      } else {
        console.log('Email alert sent successfully');
      }
    } catch (error) {
      console.error('Error sending email alert:', error);
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    const { error } = await supabase
      .from('safety_alerts')
      .update({ acknowledged: true })
      .eq('id', alertId);

    if (error) {
      console.error('Error acknowledging alert:', error);
      return;
    }

    setAlerts(prev => 
      prev.map(alert => 
        alert.id === alertId 
          ? { ...alert, acknowledged: true }
          : alert
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));

    toast({
      title: "Alert Acknowledged",
      description: "Safety alert has been marked as acknowledged",
    });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-danger bg-danger/10 border-danger';
      case 'high': return 'text-warning bg-warning/10 border-warning';
      case 'medium': return 'text-primary bg-primary/10 border-primary';
      default: return 'text-muted-foreground bg-muted border-border';
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Bell className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Real-time Safety Alerts</h2>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="animate-pulse">
              {unreadCount} new
            </Badge>
          )}
        </div>
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
          Live monitoring active
        </div>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {alerts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="h-12 w-12 mx-auto mb-2 text-success" />
            <p>No safety alerts - All workers compliant</p>
          </div>
        ) : (
          alerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 rounded-lg border transition-all duration-200 ${
                getSeverityColor(alert.severity)
              } ${!alert.acknowledged ? 'ring-2 ring-current/20' : 'opacity-75'}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <AlertTriangle className={`h-5 w-5 mt-0.5 ${
                    alert.severity === 'critical' ? 'animate-bounce' : ''
                  }`} />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <Badge variant="outline" className="text-xs">
                        {alert.severity.toUpperCase()}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {alert.alert_type.replace('_', ' ').toUpperCase()}
                      </Badge>
                      {alert.email_sent && (
                        <Mail className="h-3 w-3 text-success" />
                      )}
                    </div>
                    <p className="text-sm font-medium mb-2">{alert.message}</p>
                    <div className="flex items-center space-x-2 text-xs opacity-75">
                      <Clock className="h-3 w-3" />
                      <span>{new Date(alert.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                {!alert.acknowledged && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => acknowledgeAlert(alert.id)}
                    className="text-xs"
                  >
                    Acknowledge
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
};

export default RealtimeAlerts;