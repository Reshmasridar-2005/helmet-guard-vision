-- Create detection events table for real-time logging
CREATE TABLE public.helmet_detections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  worker_id TEXT,
  has_helmet BOOLEAN NOT NULL,
  confidence DECIMAL(3,2) NOT NULL,
  detection_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  location TEXT DEFAULT 'Mine Site',
  image_data TEXT,
  bounding_box JSONB,
  alert_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create safety alerts table
CREATE TABLE public.safety_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  detection_id UUID REFERENCES public.helmet_detections(id),
  alert_type TEXT NOT NULL DEFAULT 'helmet_violation',
  message TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'high',
  email_sent BOOLEAN DEFAULT false,
  acknowledged BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.helmet_detections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safety_alerts ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since this is a safety monitoring system)
CREATE POLICY "Anyone can view helmet detections" 
ON public.helmet_detections 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert helmet detections" 
ON public.helmet_detections 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can view safety alerts" 
ON public.safety_alerts 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert safety alerts" 
ON public.safety_alerts 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update safety alerts" 
ON public.safety_alerts 
FOR UPDATE 
USING (true);

-- Add realtime functionality
ALTER TABLE public.helmet_detections REPLICA IDENTITY FULL;
ALTER TABLE public.safety_alerts REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.helmet_detections;
ALTER PUBLICATION supabase_realtime ADD TABLE public.safety_alerts;

-- Create function to automatically create alerts for helmet violations
CREATE OR REPLACE FUNCTION create_helmet_violation_alert()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create alert if no helmet detected and confidence is high
  IF NOT NEW.has_helmet AND NEW.confidence > 0.6 THEN
    INSERT INTO public.safety_alerts (
      detection_id, 
      alert_type, 
      message, 
      severity
    ) VALUES (
      NEW.id,
      'helmet_violation',
      'SAFETY ALERT: Worker detected without helmet at ' || NEW.location || ' with ' || ROUND(NEW.confidence * 100) || '% confidence',
      'critical'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic alert creation
CREATE TRIGGER helmet_violation_trigger
  AFTER INSERT ON public.helmet_detections
  FOR EACH ROW
  EXECUTE FUNCTION create_helmet_violation_alert();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_safety_alerts_updated_at
  BEFORE UPDATE ON public.safety_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();