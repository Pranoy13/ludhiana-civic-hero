import React, { useState, useRef, useEffect } from "react";
import { Camera, Upload, AlertTriangle, FileText, Check, Loader2, Sparkles, MapPin } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ReportFormProps {
  tempLocation: { latitude: number; longitude: number } | null;
  onSubmitReport: (data: {
    photo: string; // base64 representation
    latitude: number;
    longitude: number;
    userNote: string;
  }) => Promise<void>;
  onCancel: () => void;
}

export default function ReportForm({ tempLocation, onSubmitReport, onCancel }: ReportFormProps) {
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [userNote, setUserNote] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Gemini loading steps sequence for visual flair
  const [loadingStep, setLoadingStep] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Steps to cycle through during Gemini analysis
  const loadingSteps = [
    "Uploading photo securely...",
    "Sending photo to Gemini Vision AI...",
    "Gemini is analyzing visual features...",
    "Auto-categorizing issue type...",
    "Estimating severity and impact...",
    "Generating report description...",
    "Writing to city database..."
  ];

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isSubmitting) {
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev < loadingSteps.length - 1 ? prev + 1 : prev));
      }, 1500);
    } else {
      setLoadingStep(0);
    }
    return () => clearInterval(interval);
  }, [isSubmitting]);

  // Turn off camera on component destruction
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setSubmitError("Please select a valid image file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setPhotoBase64(event.target.result as string);
        setSubmitError(null);
      }
    };
    reader.readAsDataURL(file);
  };

  // Camera capture handlers
  const startCamera = async () => {
    try {
      setSubmitError(null);
      setIsCameraActive(true);
      setPhotoBase64(null);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera access failed:", err);
      setIsCameraActive(false);
      setSubmitError("Could not access your camera. Please upload an image file instead.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const base64 = canvas.toDataURL("image/jpeg", 0.85);
        setPhotoBase64(base64);
        stopCamera();
      }
    }
  };

  // Form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!photoBase64) {
      setSubmitError("Please upload or capture a photo first.");
      return;
    }

    if (!tempLocation) {
      setSubmitError("Please set the issue location on the map first.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmitReport({
        photo: photoBase64,
        latitude: tempLocation.latitude,
        longitude: tempLocation.longitude,
        userNote: userNote.trim()
      });
    } catch (err: any) {
      console.error("Submission failed:", err);
      setSubmitError(err.message || "Failed to submit report. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl">
          <Sparkles className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Report a Civic Issue</h2>
          <p className="text-sm text-slate-500">Auto-categorized and detailed by Gemini Vision AI</p>
        </div>
      </div>

      {submitError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3 text-sm text-red-700">
          <AlertTriangle className="w-5 h-5 shrink-0 text-red-500" />
          <span>{submitError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Location Check */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${tempLocation ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700 animate-pulse"}`}>
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Report Location</p>
              <p className="text-sm font-semibold text-slate-800">
                {tempLocation 
                  ? `Placed pin at: [Lat: ${tempLocation.latitude}%, Lng: ${tempLocation.longitude}%]` 
                  : "No pin dropped on the map yet"}
              </p>
            </div>
          </div>
          {!tempLocation && (
            <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
              ACTION REQUIRED
            </span>
          )}
        </div>

        {/* Step 2: Image Input Selector */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <span>Issue Photo</span>
            <span className="text-xs font-normal text-slate-400">(Required)</span>
          </label>

          {/* Camera Viewport Active */}
          {isCameraActive && (
            <div className="relative aspect-video bg-black rounded-2xl overflow-hidden border border-slate-300 flex flex-col items-center justify-center">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3 z-10">
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-5 rounded-full shadow-lg flex items-center gap-2 transition-all duration-200"
                >
                  <Camera className="w-4 h-4" /> Snapshot
                </button>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="bg-slate-800/80 hover:bg-slate-900 text-white font-semibold py-2 px-4 rounded-full shadow-lg transition-all duration-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Hidden standard file input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />

          {/* Drag and drop panel */}
          {!isCameraActive && !photoBase64 && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center min-h-[220px] ${
                isDragOver 
                  ? "border-emerald-500 bg-emerald-50/50" 
                  : "border-slate-300 hover:border-slate-400 bg-slate-50/50"
              }`}
            >
              <div className="p-4 bg-white rounded-2xl shadow-sm mb-4 border border-slate-100 text-slate-400 group-hover:text-slate-600 transition-colors">
                <Upload className="w-8 h-8 text-slate-500" />
              </div>
              <p className="text-sm font-semibold text-slate-700">
                Drag and drop your photo here
              </p>
              <p className="text-xs text-slate-400 mt-1 mb-4">
                Supports JPEG, PNG, HEIC up to 10MB
              </p>
              
              <div className="flex items-center gap-3 w-full max-w-[320px]">
                <div className="h-[1px] bg-slate-200 flex-1" />
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">or</span>
                <div className="h-[1px] bg-slate-200 flex-1" />
              </div>

              <div className="flex gap-2.5 mt-4">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  className="bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs py-2 px-4 rounded-xl border border-slate-200 shadow-sm transition-colors"
                >
                  Browse Files
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    startCamera();
                  }}
                  className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold text-xs py-2 px-4 rounded-xl border border-emerald-100 flex items-center gap-1.5 transition-colors"
                >
                  <Camera className="w-3.5 h-3.5" /> Use Camera
                </button>
              </div>
            </div>
          )}

          {/* Image Selected Preview */}
          {photoBase64 && !isCameraActive && (
            <div className="relative aspect-video rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-inner group">
              <img 
                src={photoBase64} 
                alt="Civic report upload preview" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setPhotoBase64(null)}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-2 px-4 rounded-xl shadow-md transition-colors"
                >
                  Remove Photo
                </button>
                <button
                  type="button"
                  onClick={startCamera}
                  className="bg-slate-800 hover:bg-slate-950 text-white font-bold text-xs py-2 px-4 rounded-xl shadow-md transition-colors flex items-center gap-1.5"
                >
                  <Camera className="w-3.5 h-3.5" /> Retake
                </button>
              </div>
              <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-sm text-white text-[11px] font-semibold py-1 px-2.5 rounded-lg flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-emerald-400" /> Photo Loaded
              </div>
            </div>
          )}
        </div>

        {/* Step 3: Text Note */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-400" />
            <span>Optional User Notes</span>
          </label>
          <textarea
            value={userNote}
            onChange={(e) => setUserNote(e.target.value)}
            placeholder="Describe anything helpful (e.g. 'Outside House 24B', 'Happened after last night's storm'). Optional note helps Gemini identify specific details."
            maxLength={180}
            rows={3}
            className="w-full p-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm text-slate-800 transition-colors"
          />
          <div className="flex justify-end text-[10px] text-slate-400 font-medium">
            {userNote.length}/180 characters
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1 bg-slate-50 hover:bg-slate-100 text-slate-600 font-semibold py-3 rounded-2xl border border-slate-200 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !photoBase64 || !tempLocation}
            className="flex-[2] bg-slate-900 hover:bg-slate-850 text-white font-bold py-3 rounded-2xl flex items-center justify-center gap-2 transition-all duration-200 shadow-md shadow-slate-950/15 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Sparkles className="w-4 h-4 text-amber-400 fill-amber-400" /> Report with Gemini AI
          </button>
        </div>
      </form>

      {/* Canvas for rendering snapshot */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Gemini Analysis Processing Modal */}
      <AnimatePresence>
        {isSubmitting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-white/95 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-6 text-center"
          >
            <div className="relative mb-6">
              <div className="absolute inset-0 rounded-full bg-emerald-100 animate-pulse scale-150 opacity-40 w-16 h-16 -left-2 -top-2" />
              <div className="bg-slate-900 text-white p-4 rounded-3xl shadow-xl flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
              </div>
            </div>

            <motion.h3 
              key={loadingStep}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-lg font-bold text-slate-800 mb-2 flex items-center gap-1.5 justify-center"
            >
              <Sparkles className="w-5 h-5 text-amber-500 fill-amber-500 animate-bounce" />
              Gemini Vision AI Engine
            </motion.h3>

            <motion.p 
              key={loadingSteps[loadingStep]}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-sm font-semibold text-slate-500 max-w-xs"
            >
              {loadingSteps[loadingStep]}
            </motion.p>

            <div className="w-48 bg-slate-100 h-1 rounded-full overflow-hidden mt-6">
              <motion.div 
                className="bg-emerald-500 h-full rounded-full"
                animate={{ width: `${((loadingStep + 1) / loadingSteps.length) * 100}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
