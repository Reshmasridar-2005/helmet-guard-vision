-- Fix security warnings by setting search_path for functions

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
$$ LANGUAGE plpgsql
SET search_path = public;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;