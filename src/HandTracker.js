import React, { useRef, useEffect } from 'react';
import '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import * as tfjsWasm from '@tensorflow/tfjs-backend-wasm';
import * as handpose from '@tensorflow-models/handpose'
import * as THREE from 'three';

tfjsWasm.setWasmPaths(
    `https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm@${
        tfjsWasm.version_wasm}/dist/`);

function HandTracker() {
    const fpsLabel = document.createElement('div');
    const videoRef = useRef(null)
    const canvasRef = useRef(null);
    const threejsCavnasRef = useRef(null);
    const sceneRef = useRef(null);

    const STREAM_WIDTH = 320;
    const STREAM_HEIGHT = 240

    const FRAME_LIMIT = 60;

    const smoothingInterpolation = (start, end, smoothingFactor) => (start + (end - start) * smoothingFactor)
    const SMOOTHING_FACTOR = 0.1


    useEffect(() => {

        let lastFrameTime = performance.now();
        let frameCount = 0;
        let fps = 0;
        const frameInterval = 1000/FRAME_LIMIT

        function calculateFPS() {
            const now = performance.now();
            const deltaTime = now - lastFrameTime;
            frameCount++;

            if (deltaTime >= 1000) {
                fps = frameCount;
                frameCount = 0;
                lastFrameTime = now;
            }

            return fps;
        }

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

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, (window.innerWidth - STREAM_WIDTH) / window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ canvas: threejsCavnasRef.current });
        // renderer.shadowMap.enabled = true;
        // renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.setSize(window.innerWidth - STREAM_WIDTH, window.innerHeight);
        camera.position.z = 5;
        sceneRef.current = scene;

        // Add a basic cube
        const geometry = new THREE.BoxGeometry();
        const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        const cube = new THREE.Mesh(geometry, material);
        scene.add(cube);



        function animate() {
            requestAnimationFrame(animate);

            fps = calculateFPS()
            renderer.render(scene, camera);
            updateFPSLabel(fps)

        }

        animate()

        async function setupHandTracking() {
            try {
                const canvas = canvasRef.current;
                const ctx = canvas.getContext('2d');
                canvas.width = STREAM_WIDTH;
                canvas.height = STREAM_HEIGHT; 
                videoRef.current.width = STREAM_WIDTH
                videoRef.current.height = STREAM_HEIGHT
                const model = await handpose.load();
                setInterval(async () => {
                    if (videoRef.current) {
                        try {
                            const predictions = await model.estimateHands(videoRef.current)
                            ctx.clearRect(0, 0, canvas.width, canvas.height);
                            if (predictions.length > 0)
                            {
                                const keypoints = predictions[0].landmarks;
                                drawLandmarks(ctx, keypoints)
                                drawConnections(ctx, keypoints)
                                const [idxTipX, idxTipY, idxTipZ] = keypoints[8]

                                const ndcX = (idxTipX / videoRef.current.videoWidth) * 2 - 1;
                                const ndcY = -(idxTipY / videoRef.current.videoHeight) * 2 + 1;
                                // const ndcZ = (idxTipY / videoRef.current.videoHeight) * 2 + 1;

                                const currentGesture = detectGesture(keypoints)

                                if (currentGesture === "open")
                                {
                                    cube.position.x = smoothingInterpolation(cube.position.x, ndcX * -8, SMOOTHING_FACTOR);
                                    cube.position.y = smoothingInterpolation(cube.position.y, ndcY * 8, SMOOTHING_FACTOR);
                                }
                                else if (currentGesture === "pinch")
                                {
                                    cube.rotation.x = smoothingInterpolation(cube.rotation.x, -1 * ndcY * Math.PI, SMOOTHING_FACTOR)
                                    cube.rotation.y = smoothingInterpolation(cube.rotation.y, -1 * ndcX * Math.PI, SMOOTHING_FACTOR)
                                }
                                // cube.position.z = ndcZ * -4;
                                // console.log(detectGesture(keypoints))
                            }

                        }
                        catch (error ){
                            console.log(error)
                        }
                    }
            }, 10);
            }   catch (error) {
                console.error('Error setting up hand tracking:', error);
            }
        }

        function drawLandmarks(ctx, landmarks) {
            landmarks.forEach(([x, y, z]) => {
                ctx.beginPath()
                ctx.arc(x/2, y/2, 2.5, 0, 2 * Math.PI)
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
                ctx.moveTo(landmarks[start][0]/2, landmarks[start][1]/2);
                ctx.lineTo(landmarks[end][0]/2, landmarks[end][1]/2);
                ctx.strokeStyle = 'white'
                ctx.stroke()
            })
        }

        function detectGesture(keypoints) {
            if (keypoints.length === 0)
            {
                return null
            }
            const thumbTip = keypoints[4];
            const indextTip = keypoints[8];
            const dist = Math.sqrt(
                Math.pow(thumbTip[0] - indextTip[0], 2) +
                Math.pow(thumbTip[1] - indextTip[1], 2) + 
                Math.pow(thumbTip[2] - indextTip[2], 2))
            const gesture = dist < 100 ? 'pinch' : 'open';
            return gesture
        }

        
        fpsLabel.style.position = 'absolute';
        fpsLabel.style.top = '10px';
        fpsLabel.style.right = '10px';
        fpsLabel.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        fpsLabel.style.color = 'white';
        fpsLabel.style.padding = '5px';
        fpsLabel.style.fontSize = '14px';
        fpsLabel.style.zIndex = '10'; // Ensure it's above other elements
        document.body.appendChild(fpsLabel);

        function updateFPSLabel(fps) {
            fpsLabel.innerText = `FPS: ${fps}`;
        }

        setupCamera().then(setupHandTracking())

        return () => {
            // Clean up FPS label
            if (fpsLabel) {
                fpsLabel.remove();
            }
        };

    })


    return <div style={{ height: '100vh', position: 'relative', top: 0, left: 0 }}>
        {/* Container for video and first canvas */}
        <div style={{ position: 'absolute', width: STREAM_WIDTH, height: STREAM_HEIGHT }}>
            <video
                ref={videoRef}
                style={{
                    transform: 'scaleX(-1)', // Flip the video horizontally
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: `${STREAM_WIDTH}`,
                    height: `${STREAM_HEIGHT}`,
                    zIndex: 1,
                }}
            />
            <canvas
                ref={canvasRef}
                style={{
                    position: 'absolute',
                    transform: 'scaleX(-1)', // Flip the canvas horizontally
                    top: 0,
                    left: 0,
                    width: `${STREAM_WIDTH}`,
                    height: `${STREAM_HEIGHT}`,
                    zIndex: 2, // Ensures it overlays on top of the video
                }}
            />
        </div>

        {/* Second canvas to the right of the video */}
        <canvas
            ref={threejsCavnasRef}
            style={{
                position: "absolute", // Changed to relative for flexbox positioning
                left: STREAM_WIDTH, // No need for additional left offset, flexbox handles this
                top: 0,
                height: '100%',
            }}
        />
    </div>
}

export default HandTracker;
