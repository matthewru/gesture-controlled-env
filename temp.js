import React, { useRef, useEffect } from 'react';
import * as handPoseDetection from '@tensorflow-models/hand-pose-detection';
import '@tensorflow/tfjs-backend-webgl';

function HandTracker({ onGestureDetected }) {
    const videoRef = useRef(null);

    useEffect(() => {
        async function setupCamera() {
            const video = videoRef.current;
            if (navigator.mediaDevices.getUserMedia) {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                video.srcObject = stream;
                await new Promise((resolve) => (video.onloadedmetadata = resolve));
                video.play();
            }
        }

        async function setupHandTracking() {
            const model = handPoseDetection.SupportedModels.MediaPipeHands;
            const detectorConfig = {
                runtime: 'mediapipe',
                solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/hands',
            };
            const detector = await handPoseDetection.createDetector(model, detectorConfig);

            setInterval(async () => {
                if (videoRef.current) {
                    const hands = await detector.estimateHands(videoRef.current);
                    if (hands.length > 0) {
                        const gesture = detectGesture(hands);
                        if (gesture) {
                            onGestureDetected(gesture); // Pass gesture to parent component
                        }
                    }
                }
            }, 100);
        }

        setupCamera().then(setupHandTracking);

        function detectGesture(hands) {
            const landmarks = hands[0].keypoints3D;
            const thumbTip = landmarks[4];
            const indexTip = landmarks[8];
            const distance = Math.sqrt(
                Math.pow(thumbTip.x - indexTip.x, 2) +
                Math.pow(thumbTip.y - indexTip.y, 2) +
                Math.pow(thumbTip.z - indexTip.z, 2)
            );
            return distance < 0.1 ? 'pinch' : null;
        }

    }, [onGestureDetected]);

    return <video ref={videoRef} style={{ display: 'none' }} />;
}

export default HandTracker;
