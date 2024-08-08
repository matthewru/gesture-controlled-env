import React, { useRef, useEffect } from 'react';
import * as handPoseDetection from '@tensorflow-models/hand-pose-detection';
import '@tensorflow/tfjs-backend-webgl';

function HandTracker() {
    const videoRef = useRef(null)
    const canvasRef = useRef(null);

    useEffect(() => {

        // access webcam stream
        async function setupCamera() {
            const video = videoRef.current;
            if (navigator.mediaDevices.getUserMedia) {
                const stream = await navigator.mediaDevices.getUserMedia({video: true});
                video.srcObject = stream;
                await new Promise((resolve) => (video.onloadedmetadata = resolve))
                video.play();
            }
        }

        async function setupHandTracking() {
            const model = handPoseDetection.SupportedModels.MediaPipeHands;
            const detectorConfig = {
                runtime: 'mediapipe',
                solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/hands'
            };
            const detector = await handPoseDetection.createDetector(model, detectorConfig);
            const canvas = canvasRef.current;
            const ctx = canvas.getContext('2d');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            setInterval(async () => {
                if (videoRef.current) {
                    const hands = await detector.estimateHands(videoRef.current)
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    hands.forEach(h => {
                        drawLandmarks(ctx, h.keypoints)
                        drawConnections(ctx, h.keypoints)
                    })
                }

            }, 100);
        }

        function drawLandmarks(ctx, landmarks) {
            landmarks.forEach(l => {
                ctx.beginPath()
                ctx.arc(l.x, l.y, 5, 0, 2 * Math.PI)
                ctx.fillStyle = 'red'
                ctx.fill()
            })
        }

        function drawConnections(ctx, landmarks) {
            const connections = [
                [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
                [0, 5], [5, 6], [6, 7], [7, 8], // Index finger
                [0, 9], [9, 10], [10, 11], [11, 12], // Middle finger
                [0, 13], [13, 14], [14, 15], [15, 16], // Ring finger
                [0, 17], [17, 18], [18, 19], [19, 20] // Pinky finger
            ];

            connections.forEach(([start, end]) => {
                ctx.beginPath()
                ctx.moveTo(landmarks[start].x, landmarks[start].y);
                ctx.lineTo(landmarks[end].x, landmarks[end].y);
                ctx.strokeStyle = 'white'
                ctx.stroke()
            })

        }

        setupCamera().then(setupHandTracking())
    })

    return <div style={{ position: 'relative', display: 'inline-block' }}>
    <video
        ref={videoRef}
        style={{
            transform: 'scaleX(-1)', // Flip the video horizontally
            width: '100%', // Set video to full width of the container
            display: 'block',
        }}
    />
    <canvas
        ref={canvasRef}
        style={{
            position: 'absolute',
            transform: 'scaleX(-1)',
            top: 0,
            left: 0,// Flip the canvas horizontally
            width: '100%',
            height: '100%',
        }}
    />
</div>

}

export default HandTracker;
