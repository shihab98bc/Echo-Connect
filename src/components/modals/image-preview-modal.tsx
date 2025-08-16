'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Image from 'next/image';
import { SendIcon } from '@/components/icons';

interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (caption: string) => void;
  imageDataUrl: string;
}

export default function ImagePreviewModal({ isOpen, onClose, onSend, imageDataUrl }: ImagePreviewModalProps) {
  const [caption, setCaption] = useState('');

  const handleSend = () => {
    onSend(caption);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[450px] w-full p-0 gap-0">
        <DialogHeader className="p-4">
          <DialogTitle>Send Image</DialogTitle>
        </DialogHeader>
        <div className="relative aspect-video bg-black flex items-center justify-center">
            <Image src={imageDataUrl} alt="Image preview" layout="fill" objectFit="contain" />
        </div>
        <DialogFooter className="p-2 bg-secondary flex-row items-center gap-2">
            <div className="flex-grow">
                <Input 
                    placeholder="Add a caption..." 
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    className="bg-white"
                />
            </div>
          <Button onClick={handleSend} size="icon" className="w-12 h-12 rounded-full bg-button-color hover:bg-button-color/90">
            <SendIcon className="w-6 h-6 text-white" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
