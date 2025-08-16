'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Camera, Send, SwitchCamera, X } from 'lucide-react';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendPhoto: (photoDataUrl: string) => void;
}

export default function CameraModal({ isOpen, onClose, onSendPhoto }: CameraModalProps) {
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [isFrontCamera, setIsFrontCamera] = useState(true);

  const cleanupCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    setStream(null);
  }, [stream]);

  useEffect(() => {
    const getCameraStream = async (front: boolean) => {
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: front ? 'user' : 'environment' },
        });

        if (videoRef.current) {
          videoRef.current.srcObject = newStream;
        }

        setStream(newStream);
        setHasPermission(true);
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasPermission(false);
        toast({
          variant: 'destructive',
          title: 'Camera Access Denied',
          description: 'Please enable camera permissions in your browser settings.',
        });
        onClose();
      }
    };

    if (isOpen && !photoDataUrl) {
      getCameraStream(isFrontCamera);
    }

    return () => {
      if (stream) {
        cleanupCamera();
      }
    };
  }, [isOpen, isFrontCamera, photoDataUrl, toast, onClose, cleanupCamera, stream]);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
        // Flip the image horizontally if it's the front camera
        if (isFrontCamera) {
          context.save();
          context.scale(-1, 1);
          context.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
          context.restore();
        } else {
          context.drawImage(video, 0, 0, canvas.width, canvas.height);
        }
        
        const dataUrl = canvas.toDataURL('image/jpeg');
        setPhotoDataUrl(dataUrl);
        cleanupCamera(); // Stop the stream after taking photo
      }
    }
  };

  const handleRetake = () => {
    setPhotoDataUrl(null);
  };

  const handleSend = () => {
    if (photoDataUrl) {
      onSendPhoto(photoDataUrl);
      setPhotoDataUrl(null); // Reset for next time
      onClose();
    }
  };
  
  const handleClose = () => {
      cleanupCamera();
      setPhotoDataUrl(null);
      onClose();
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md w-full p-0 gap-0">
        <DialogHeader className="p-4">
          <DialogTitle>Send a Photo</DialogTitle>
          <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
        </DialogClose>
        </DialogHeader>

        <div className="relative aspect-square bg-black flex items-center justify-center">
          {photoDataUrl ? (
            <img src={photoDataUrl} alt="Captured" className="w-full h-full object-contain" />
          ) : (
            <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
          )}
          {hasPermission === false && (
            <p className="text-white">Camera permission denied.</p>
          )}
        </div>

        <div className="p-4 flex justify-center items-center gap-4">
          {photoDataUrl ? (
            <>
              <Button variant="outline" onClick={handleRetake}>Retake</Button>
              <Button onClick={handleSend}>
                Send <Send className="ml-2 h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
                <Button variant="ghost" size="icon" onClick={() => setIsFrontCamera(prev => !prev)} disabled={!hasPermission}>
                    <SwitchCamera />
                </Button>
                <Button size="icon" className="w-16 h-16 rounded-full" onClick={handleCapture} disabled={!hasPermission}>
                    <Camera className="w-8 h-8" />
                </Button>
                 <div className="w-10"></div>
            </>
          )}
        </div>
        <canvas ref={canvasRef} className="hidden" />
      </DialogContent>
    </Dialog>
  );
}
