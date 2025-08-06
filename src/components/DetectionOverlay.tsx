import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Shield, CheckCircle } from 'lucide-react';

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  label: string;
}

interface DetectionOverlayProps {
  hasHelmet: boolean;
  confidence: number;
  boundingBoxes?: BoundingBox[];
  videoWidth: number;
  videoHeight: number;
}

const DetectionOverlay: React.FC<DetectionOverlayProps> = ({
  hasHelmet,
  confidence,
  boundingBoxes = [],
  videoWidth,
  videoHeight,
}) => {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Bounding boxes */}
      {boundingBoxes.map((box, index) => (
        <div
          key={index}
          className={`absolute border-2 ${
            box.label === 'helmet' ? 'border-success' : 'border-primary'
          }`}
          style={{
            left: `${(box.x / videoWidth) * 100}%`,
            top: `${(box.y / videoHeight) * 100}%`,
            width: `${(box.width / videoWidth) * 100}%`,
            height: `${(box.height / videoHeight) * 100}%`,
          }}
        >
          <div className={`absolute -top-6 left-0 ${
            box.label === 'helmet' ? 'bg-success' : 'bg-primary'
          } text-white px-2 py-1 text-xs rounded`}>
            {box.label} ({Math.round(box.confidence * 100)}%)
          </div>
        </div>
      ))}

      {/* Detection status overlay */}
      <div className="absolute top-4 left-4 right-4 pointer-events-auto">
        <Card className={`p-4 transition-all duration-300 ${
          hasHelmet 
            ? 'border-success bg-success/10 shadow-lg shadow-success/20' 
            : 'border-danger bg-danger/10 shadow-lg shadow-danger/20 animate-pulse'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {hasHelmet ? (
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-6 w-6 text-success" />
                  <Shield className="h-5 w-5 text-success" />
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-6 w-6 text-danger animate-bounce" />
                  <span className="text-danger font-bold text-lg">⚠️</span>
                </div>
              )}
              <div>
                <span className={`font-bold text-lg ${
                  hasHelmet ? 'text-success' : 'text-danger'
                }`}>
                  {hasHelmet ? '✅ HELMET DETECTED' : '❌ NO HELMET DETECTED'}
                </span>
                <p className={`text-sm ${
                  hasHelmet ? 'text-success-foreground' : 'text-danger-foreground'
                }`}>
                  {hasHelmet 
                    ? 'Safety compliance verified - Access granted' 
                    : 'SAFETY VIOLATION - Access denied'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <Badge 
                variant={hasHelmet ? "default" : "destructive"}
                className="text-lg px-3 py-1"
              >
                {Math.round(confidence * 100)}%
              </Badge>
              <p className="text-xs text-muted-foreground mt-1">
                Confidence
              </p>
            </div>
          </div>
          
          {!hasHelmet && confidence > 0.6 && (
            <div className="mt-3 p-3 bg-danger/20 rounded-md border border-danger/30">
              <p className="text-danger-foreground font-medium text-sm">
                🚨 CRITICAL SAFETY ALERT SENT
              </p>
              <p className="text-danger-foreground text-xs mt-1">
                Email notification dispatched to safety personnel
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default DetectionOverlay;