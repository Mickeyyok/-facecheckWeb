import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';

const FaceRegistration = () => {
  const videoRef = useRef();
  const canvasRef = useRef();
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [descriptor, setDescriptor] = useState(null);

  // --- 1. โหลดโมเดล AI เมื่อเปิดหน้าเว็บ ---
  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = '/models';
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        setModelsLoaded(true);
        console.log("AI Models พร้อมใช้งานแล้วครับ! 🤖");
        startVideo(); // โหลดเสร็จแล้วเปิดกล้องเลย
      } catch (err) {
        console.error("โหลดโมเดลไม่สำเร็จ:", err);
      }
    };
    loadModels();
  }, []);

  // --- 2. ฟังก์ชันเปิดกล้องเว็บแคม ---
  const startVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        console.log("กล้องเปิดใช้งานได้แล้ว! ✅");
      }
    } catch (err) {
      console.error("เปิดกล้องไม่ได้เพราะ:", err.name);
      if (err.name === 'NotAllowedError') {
        alert("กรุณากด 'อนุญาต' (Allow) ให้เข้าถึงกล้องบนเบราว์เซอร์ด้วยนะครับ");
      } else {
        alert("ไม่พบกล้องเว็บแคม หรือกล้องถูกโปรแกรมอื่นใช้งานอยู่ครับ");
      }
    }
  };

  // --- 3. ฟังก์ชันสแกนใบหน้าและดึงตัวเลข 128 ตัว ---
  const handleCaptureFace = async () => {
    if (!modelsLoaded) return;

    setIsCapturing(true);
    // ตรวจจับใบหน้าเดียว พร้อมหาจุดเด่นและคำนวณตัวเลข (Descriptor)
    const detection = await faceapi.detectSingleFace(
      videoRef.current, 
      new faceapi.TinyFaceDetectorOptions()
    ).withFaceLandmarks().withFaceDescriptor();

    if (detection) {
      console.log("สแกนหน้าสำเร็จ! ชุดตัวเลขคือ:", detection.descriptor);
      setDescriptor(Array.from(detection.descriptor)); // แปลงเป็น Array ธรรมดาเพื่อเตรียมส่ง Backend
      alert("สแกนใบหน้าเรียบร้อย! พร้อมบันทึกข้อมูลครับ");
    } else {
      alert("ไม่พบใบหน้าในกล้อง กรุณาขยับหน้าให้อยู่กลางจอครับ");
    }
    setIsCapturing(false);
  };

  return (
    <div className="flex flex-col items-center p-8">
      <h2 className="text-2xl font-bold mb-4">ลงทะเบียนใบหน้า 📸</h2>
      
      <div className="relative border-4 border-blue-500 rounded-lg overflow-hidden" style={{ width: '640px', height: '480px' }}>
        <video 
          ref={videoRef} 
          autoPlay 
          muted 
          playsInline
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <canvas ref={canvasRef} className="absolute top-0 left-0" />
      </div>

      <div className="mt-6 space-x-4">
        <button 
          onClick={handleCaptureFace}
          disabled={!modelsLoaded || isCapturing}
          className="bg-blue-600 text-white px-6 py-2 rounded-full hover:bg-blue-700 disabled:bg-gray-400"
        >
          {isCapturing ? "กำลังสแกน..." : "กดเพื่อสแกนใบหน้า"}
        </button>

        {descriptor && (
          <button 
            className="bg-green-600 text-white px-6 py-2 rounded-full hover:bg-green-700"
            onClick={() => console.log("เตรียมยิง API ไปเซฟ:", descriptor)}
          >
            บันทึกลงฐานข้อมูล
          </button>
        )}
      </div>
      
      {!modelsLoaded && <p className="mt-4 text-orange-500">ระบบ AI กำลังเตรียมตัว รอสักครู่นะครับ...</p>}
    </div>
  );
};

export default FaceRegistration;
