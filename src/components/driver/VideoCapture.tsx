'use client';

import { useEffect, useRef, useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { Camera, Loader2, Square, Video } from 'lucide-react';
import toast from 'react-hot-toast';

interface VideoCaptureProps {
  bookingId: string;
  type: 'entry' | 'exit';
  onUploaded: (url: string) => void;
  onClose: () => void;
}

export default function VideoCapture({ bookingId, type, onUploaded, onClose }: VideoCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [recording, setRecording] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch {
        toast.error('Unable to access camera. Please allow permissions.');
      } finally {
        setInitializing(false);
      }
    };

    init();

    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const uploadRecording = async (blob: Blob) => {
    setUploading(true);
    try {
      const storageRef = ref(storage, `bookings/${bookingId}/${type}.webm`);
      const task = uploadBytesResumable(storageRef, blob);

      await new Promise<void>((resolve, reject) => {
        task.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(Math.round(progress));
          },
          reject,
          () => resolve()
        );
      });

      const url = await getDownloadURL(task.snapshot.ref);
      const field = type === 'entry' ? 'entryVideoURL' : 'exitVideoURL';
      await updateDoc(doc(db, 'bookings', bookingId), { [field]: url });

      toast.success(`${type === 'entry' ? 'Entry' : 'Exit'} video uploaded.`);
      onUploaded(url);
    } catch {
      toast.error('Failed to upload video.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const startRecording = () => {
    if (!streamRef.current) return;
    const chunks: BlobPart[] = [];
    const recorder = new MediaRecorder(streamRef.current, { mimeType: 'video/webm' });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };

    recorder.onstop = async () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      await uploadRecording(blob);
    };

    recorder.start();
    setRecording(true);
  };

  const stopRecording = () => {
    if (!mediaRecorderRef.current) return;
    mediaRecorderRef.current.stop();
    setRecording(false);
  };

  return (
    <div className="fixed inset-0 z-[1300] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-[#0a0a0a] border border-white/[0.1] p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3">
          <Camera className="w-4 h-4 text-[#00d4ff]" />
          <h3 className="text-white text-sm tracking-wider uppercase">
            Record {type === 'entry' ? 'Entry' : 'Exit'} 360° Video
          </h3>
        </div>
        <p className="text-white/35 text-xs mb-4">
          {type === 'entry'
            ? 'Please record your vehicle and surroundings before parking.'
            : 'Please record your vehicle condition before leaving.'}
        </p>

        <div className="bg-black border border-white/[0.08] overflow-hidden">
          <video ref={videoRef} className="w-full h-[280px] object-cover" muted playsInline />
        </div>

        {uploading && (
          <div className="mt-3">
            <div className="h-2 bg-white/[0.08]">
              <div className="h-2 bg-[#00d4ff] transition-all" style={{ width: `${uploadProgress}%` }} />
            </div>
            <p className="text-white/35 text-[10px] mt-1">Uploading... {uploadProgress}%</p>
          </div>
        )}

        <div className="flex gap-2 mt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={recording || uploading}
            className="px-4 py-2 border border-white/[0.1] text-white/60 text-xs uppercase tracking-wider disabled:opacity-50"
          >
            Skip for now
          </button>
          {!recording ? (
            <button
              type="button"
              onClick={startRecording}
              disabled={initializing || uploading}
              className="px-4 py-2 border border-[#00d4ff]/30 bg-[#00d4ff]/10 text-[#00d4ff] text-xs uppercase tracking-wider disabled:opacity-50 flex items-center gap-2"
            >
              {initializing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Video className="w-3.5 h-3.5" />}
              Start Recording
            </button>
          ) : (
            <button
              type="button"
              onClick={stopRecording}
              disabled={uploading}
              className="px-4 py-2 border border-red-500/30 bg-red-500/10 text-red-400 text-xs uppercase tracking-wider flex items-center gap-2"
            >
              <Square className="w-3.5 h-3.5" />
              Stop & Upload
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
