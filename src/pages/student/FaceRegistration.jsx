import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';

// กำหนดมุมที่เราต้องการสแกน (4 มุม)
const poses = ['straight', 'left', 'right', 'up'];
const poseTexts = {
  straight: 'มองตรงมาที่กล้อง',
  left: 'หันหน้าไปทางซ้าย',
  right: 'หันหน้าไปทางขวา',
  up: 'เงยหน้าขึ้นเล็กน้อย',
};

const FaceRegistration = () => {
  const videoRef = useRef();
  const canvasRef = useRef();

  // --- State สำหรับ AI ---
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  // --- State สำหรับคุมสถานะ Multi-Pose ---
  const [currentPoseIndex, setCurrentPoseIndex] = useState(0);
  const [descriptors, setDescriptors] = useState({});

  // 1. โหลดโมเดล AI
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
        console.log('AI Models พร้อมใช้งานแล้วครับ! 🤖');
        startVideo();
      } catch (err) {
        console.error('โหลดโมเดลไม่สำเร็จ:', err);
      }
    };
    loadModels();
  }, []);

  // 2. เปิดกล้อง
  const startVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        console.log('กล้องเปิดใช้งานได้แล้ว! ✅');
      }
    } catch (err) {
      console.error('เปิดกล้องไม่ได้เพราะ:', err.name);
      if (err.name === 'NotAllowedError') {
        alert("กรุณากด 'อนุญาต' (Allow) ให้เข้าถึงกล้องบนเบราว์เซอร์ด้วยนะครับ");
      } else {
        alert('ไม่พบกล้องเว็บแคม หรือกล้องถูกโปรแกรมอื่นใช้งานอยู่ครับ');
      }
    }
  };

  // 3. จับภาพและสแกนหน้า (ทีละมุม)
  const handleCapturePose = async () => {
    if (!modelsLoaded || isCapturing) return;

    setIsCapturing(true);
    const detection = await faceapi
      .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (detection) {
      const currentPose = poses[currentPoseIndex];
      const descriptorArray = Array.from(detection.descriptor);

      setDescriptors((prev) => ({ ...prev, [currentPose]: descriptorArray }));
      console.log(`สแกนมุม ${currentPose} สำเร็จ!`);

      if (currentPoseIndex < poses.length - 1) {
        setCurrentPoseIndex(currentPoseIndex + 1);
        alert(
          `สแกนมุม ${currentPose} สำเร็จ! กรุณา ${poseTexts[poses[currentPoseIndex + 1]]}`
        );
      } else {
        alert('สแกนใบหน้าครบทุกมุมแล้วครับ! 🎉 พร้อมบันทึกข้อมูล');
      }
    } else {
      alert('ไม่พบใบหน้า กรุณาจัดมุมหน้าใหม่ให้ตรงกับที่ระบุครับ');
    }
    setIsCapturing(false);
  };

  // 4. เตรียมข้อมูลและส่ง Backend
  const handleSubmit = async () => {
    if (Object.keys(descriptors).length < 4) {
      return alert('กรุณาสแกนให้ครบทั้ง 4 มุมก่อนบันทึกข้อมูลครับ');
    }

    // [[128 ตัว], [128 ตัว], ...] รวม 4 ชุด
    const finalDescriptorArray = poses.map((pose) => descriptors[pose]);
    console.log('ข้อมูลใบหน้าแบบละเอียดพร้อมส่ง:', finalDescriptorArray);

    // TODO: ยิง API → POST /api/auth/register หรือ PUT /api/users/:id/face
    // body: { face_descriptor: finalDescriptorArray }
  };

  return (
    <div className="flex flex-col items-center p-8 bg-gray-50 rounded-2xl shadow-xl">
      <h2 className="text-3xl font-bold mb-2">ลงทะเบียนใบหน้าแบบละเอียด (4 มุม) 📸</h2>
      <p className="text-gray-600 mb-6">
        Follow the prompts to capture 4 different head poses for better accuracy.
      </p>

      {/* Multi-Pose Progress */}
      <div className="flex gap-4 mb-6">
        {poses.map((pose, index) => (
          <div
            key={pose}
            className={`flex flex-col items-center p-4 rounded-xl border-2 ${
              index === currentPoseIndex
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white mb-2 ${
                descriptors[pose] ? 'bg-green-500' : 'bg-gray-400'
              }`}
            >
              {descriptors[pose] ? '✓' : index + 1}
            </div>
            <p className="text-sm font-medium">{pose.toUpperCase()}</p>
          </div>
        ))}
      </div>

      <p className="text-xl font-semibold text-blue-600 mb-4 animate-pulse">
        👉 {poseTexts[poses[currentPoseIndex]]}
      </p>

      <div
        className="relative border-8 border-gray-900 rounded-3xl overflow-hidden shadow-inner"
        style={{ width: '400px', height: '400px' }}
      >
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        {/* Face overlay guide */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className="border-4 border-blue-400 rounded-full"
            style={{ width: '250px', height: '320px', borderStyle: 'dashed' }}
          />
        </div>
        <canvas ref={canvasRef} className="absolute top-0 left-0" />
      </div>

      <div className="mt-8 space-x-4">
        <button
          onClick={handleCapturePose}
          disabled={
            !modelsLoaded ||
            isCapturing ||
            Object.keys(descriptors).length >= 4
          }
          className="bg-orange-600 text-white font-bold px-10 py-3 rounded-full hover:bg-orange-700 disabled:bg-gray-400 text-lg shadow-md"
        >
          {isCapturing
            ? 'กำลังสแกน...'
            : descriptors[poses[currentPoseIndex]]
            ? 'สแกนมุมถัดไป'
            : `สแกนมุม ${poses[currentPoseIndex].toUpperCase()}`}
        </button>

        {Object.keys(descriptors).length === 4 && (
          <button
            className="bg-green-600 text-white font-bold px-10 py-3 rounded-full hover:bg-green-700 text-lg shadow-md"
            onClick={handleSubmit}
          >
            บันทึกใบหน้า (ครบ 4 มุม)
          </button>
        )}
      </div>

      {!modelsLoaded && (
        <p className="mt-4 text-orange-500">
          ระบบ AI กำลังเตรียมตัว รอสักครู่นะครับ...
        </p>
      )}
    </div>
  );
};

export default FaceRegistration;
