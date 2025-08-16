'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Flashlight, FlashlightOff, Loader2, Send, SwitchCameraIcon, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import Image from 'next/image';

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
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [hasFlash, setHasFlash] = useState(false);

  const cleanupCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
      });
    }
    setStream(null);
    setPhotoDataUrl(null);
    setHasFlash(false);
    setIsFlashOn(false);
  }, [stream]);
  
  const handleClose = useCallback(() => {
    cleanupCamera();
    onClose();
  }, [cleanupCamera, onClose]);


  useEffect(() => {
    const getCameraStream = async (front: boolean) => {
      try {
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }

        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: front ? 'user' : 'environment' },
        });

        if (videoRef.current) {
          videoRef.current.srcObject = newStream;
        }

        const videoTrack = newStream.getVideoTracks()[0];
        // @ts-ignore - 'torch' is a valid capability but not in all TS libs
        const capabilities = videoTrack.getCapabilities();
        // @ts-ignore
        setHasFlash(!!capabilities.torch);
        setStream(newStream);
        setHasPermission(true);
      
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasPermission(false);
        setHasFlash(false);
        toast({
          variant: 'destructive',
          title: 'Camera Access Denied',
          description: 'Please enable camera permissions in your browser settings.',
        });
        handleClose();
      }
    };
    
    if (isOpen) {
      setPhotoDataUrl(null);
      getCameraStream(isFrontCamera);
    }
    
    return () => {
      if (isOpen) {
        cleanupCamera();
      }
    }
  }, [isOpen, isFrontCamera, toast, handleClose, stream, cleanupCamera]);
  
  useEffect(() => {
    const applyFlash = async () => {
        if (stream && hasFlash && !isFrontCamera) {
            const videoTrack = stream.getVideoTracks()[0];
             try {
                await videoTrack.applyConstraints({
                    // @ts-ignore
                    advanced: [{ torch: isFlashOn }]
                });
            } catch (error) {
                console.error('Error toggling flash:', error);
                setHasFlash(false); // Assume flash is not supported if it errors
            }
        }
    };
    applyFlash();
  }, [isFlashOn, stream, hasFlash, isFrontCamera]);


  const handleSwitchCamera = () => {
    setIsFrontCamera(prev => !prev);
    setIsFlashOn(false);
  };
  
  const handleToggleFlash = async () => {
    if (!hasFlash || isFrontCamera) return;
    setIsFlashOn(prev => !prev);
  };

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (context) {
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

        if (isFlashOn) {
            setIsFlashOn(false);
        }
      }
    }
  };

  const handleRetake = () => {
    setPhotoDataUrl(null);
  };

  const handleSend = () => {
    if (photoDataUrl) {
      onSendPhoto(photoDataUrl);
      handleClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[450px] w-full h-[95vh] max-h-[950px] p-0 gap-0 flex flex-col bg-black text-white border-0">
          <DialogTitle className="sr-only">Camera</DialogTitle>
          <div className="p-4 absolute top-0 left-0 z-10 w-full flex justify-between items-center">
             <Button variant="ghost" size="icon" onClick={handleClose} className="bg-black/50 hover:bg-black/70 rounded-full">
                 <X className="w-6 h-6" />
             </Button>
          </div>

          <div className="relative flex-grow flex items-center justify-center overflow-hidden">
            <AnimatePresence>
              {hasPermission === null && (
                  <motion.div 
                    key="loader"
                    className="absolute inset-0 flex items-center justify-center"
                    exit={{ opacity: 0 }}
                  >
                      <Loader2 className="w-10 h-10 animate-spin" />
                  </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence mode="wait">
              {photoDataUrl ? (
                <motion.div 
                  key="preview"
                  className="w-full h-full"
                  initial={{ opacity: 0, scale: 1.1 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <Image src={photoDataUrl} alt="Captured photo" layout="fill" objectFit="contain" />
                </motion.div>
              ) : (
                <motion.video 
                  key="video"
                  ref={videoRef} 
                  className={cn("w-full h-full object-cover", hasPermission ? 'visible' : 'invisible', isFrontCamera && 'scale-x-[-1]')} 
                  autoPlay 
                  playsInline 
                  muted
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                />
              )}
            </AnimatePresence>
          </div>

          <div className="p-4 flex items-center justify-center bg-black">
              {photoDataUrl ? (
                  <div className="flex w-full justify-between items-center">
                      <Button variant="ghost" onClick={handleRetake} className="text-lg">Retake</Button>
                      <Button onClick={handleSend} size="lg" className="bg-primary hover:bg-primary/90 rounded-full">
                          Send
                          <Send className="w-5 h-5 ml-2" />
                      </Button>
                  </div>
              ) : (
                  <div className="flex w-full justify-between items-center">
                       <div className="w-12 h-12 flex items-center justify-center">
                         {hasFlash && !isFrontCamera && (
                            <Button variant="ghost" size="icon" onClick={handleToggleFlash} className="bg-white/20 hover:bg-white/30 rounded-full w-12 h-12" aria-label="Toggle Flash">
                                {isFlashOn ? <Flashlight className="w-6 h-6" /> : <FlashlightOff className="w-6 h-6" />}
                            </Button>
                         )}
                       </div>
                      <Button 
                          onClick={handleCapture} 
                          className="w-20 h-20 rounded-full border-4 border-white bg-transparent hover:bg-white/20 active:bg-white/30"
                          disabled={!hasPermission}
                          aria-label="Take Photo"
                      />
                      <Button variant="ghost" size="icon" onClick={handleSwitchCamera} className="bg-white/20 hover:bg-white/30 rounded-full w-12 h-12" disabled={!hasPermission} aria-label="Switch Camera">
                          <SwitchCameraIcon className="w-6 h-6" />
                      </Button>
                  </div>
              )}
          </div>
          <canvas ref={canvasRef} className="hidden" />
      </DialogContent>
    </Dialog>
  );
}
