import React, { useRef, useEffect } from 'react';
import '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import * as tfjsWasm from '@tensorflow/tfjs-backend-wasm';
import * as handpose from '@tensorflow-models/handpose'
import * as THREE from 'three';
import * as fp from 'fingerpose'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';



tfjsWasm.setWasmPaths(
    `https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm@${
        tfjsWasm.version_wasm}/dist/`);

function HandTracker() {
    const fpsLabel = document.createElement('div');
    const videoRef = useRef(null)
    const canvasRef = useRef(null);
    const threejsCavnasRef = useRef(null);
    const sceneRef = useRef(null);
    const currentGestureRef = useRef(null)

    const STREAM_WIDTH = 320;
    const STREAM_HEIGHT = 240

    const FRAME_LIMIT = 60;

    const smoothingInterpolation = (start, end, smoothingFactor) => (start + (end - start) * smoothingFactor)
    const SMOOTHING_FACTOR = 0.02
    const GESTURE_DELAY = 500
    const SCALE_SENSITIVITY = 0.5
    const ROTATION_SENSITIVITY = 0.1

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

        function getCenterOfPalm(keypoints)
        {
            let x = 0, y = 0, z = 0
            const palmLandmarks = [5, 9, 13, 17, 1, 0]
            palmLandmarks.forEach(landmark => {
                x += keypoints[landmark][0]
                y += keypoints[landmark][1]
                z += keypoints[landmark][2]
            })
            return [x/6, y/6, z/6]
        }

        function setGesture(estimatedGestures) {
            setTimeout(() => {
                if (estimatedGestures["gestures"].length > 0)
                {
                    const gesture = estimatedGestures["gestures"][0]["name"]
                    const confidenceScore = estimatedGestures["gestures"][0]["score"]
                    if (gesture === "grab" && confidenceScore >= 5.5)
                    {
                        currentGestureRef.current = "grab";
                    }
                    else if (gesture === "pan" && confidenceScore >= 9.25)
                    {
                        currentGestureRef.current = "pan";
                    }
                    else if (gesture === "scale" && confidenceScore >= 9.75)
                    {
                        // currentGestureRef.current = "scale";
                    }
                }
                
            }, GESTURE_DELAY)
        }

        function initGrabGesture() {
            const grabGesture = new fp.GestureDescription('grab');

            [fp.Finger.Thumb, fp.Finger.Index, fp.Finger.Middle, fp.Finger.Ring, fp.Finger.Pinky].forEach(finger => {
                grabGesture.addCurl(finger, fp.FingerCurl.HalfCurl, 1);
            }) 

            return grabGesture
        }

        function initPanGesture() {
            const panGesture = new fp.GestureDescription('pan');

            [fp.Finger.Thumb, fp.Finger.Index, fp.Finger.Middle, fp.Finger.Ring, fp.Finger.Pinky].forEach(finger => {
                panGesture.addCurl(finger, fp.FingerCurl.NoCurl, 1);
            }) 

            return panGesture
        }

        function initScaleGesture() {
            const scaleGesture = new fp.GestureDescription('scale');

            [fp.Finger.Index, fp.Finger.Middle, fp.Finger.Ring, fp.Finger.Pinky].forEach(finger => {
                scaleGesture.addCurl(finger, fp.FingerCurl.FullCurl, 1);
            }) 
            scaleGesture.addCurl(fp.Finger.Thumb, fp.FingerCurl.HalfCurl, 1)

            return scaleGesture
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
        const loader = new OBJLoader();
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, (window.innerWidth - STREAM_WIDTH) / window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({ canvas: threejsCavnasRef.current });
        // renderer.shadowMap.enabled = true;
        // renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.setSize(window.innerWidth - STREAM_WIDTH, window.innerHeight);
        camera.position.z = 5;
        sceneRef.current = scene;
        const light = new THREE.DirectionalLight(0xffffff, 1);
        light.position.set(0, 1, 2).normalize();
        scene.add(light);

        // Add a basic cube
        const geometry = new THREE.BoxGeometry();
        const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        const cube = new THREE.Mesh(geometry, material);
        // scene.add(cube);
        let currentModel = cube
        loader.load(
            'models/ambulance.obj',
            (obj) => {
                currentModel = obj
                currentModel.scale.set(0.01, 0.01, 0.01)
                console.log("added")
                obj.traverse((child) => {
                    if (child.isMesh) {
                        child.material.side = THREE.DoubleSide; // Ensure both sides are rendered
                    }
                });
                console.log(currentModel.position)
                scene.add(currentModel)
            }, (xhr) => {
                console.log((xhr.loaded / xhr.total * 100) + '% loaded');
            },
            (error) => {
                console.error('An error happened while loading the model', error);
            }
        )
        // scene.add(currentModel)

        function animate() {
            requestAnimationFrame(animate);

            fps = calculateFPS()
            renderer.render(scene, camera);
            updateFPSLabel(fps)
        }

        animate()

        let lastRotation = new THREE.Vector3()
        let lastScale = new THREE.Vector3()
        let lastPosition = new THREE.Vector3()
        let lastPalm = [0, 0, 0]


        async function setupHandTracking() {
            try {
                const canvas = canvasRef.current;
                const ctx = canvas.getContext('2d');
                canvas.width = STREAM_WIDTH;
                canvas.height = STREAM_HEIGHT; 
                videoRef.current.width = STREAM_WIDTH
                videoRef.current.height = STREAM_HEIGHT
                const model = await handpose.load();
                const grabGesture = initGrabGesture()
                const panGesture = initPanGesture()
                const scaleGesture = initScaleGesture()
                const GE = new fp.GestureEstimator([
                    grabGesture,
                    panGesture,
                    scaleGesture
                ])
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

                                const [centerX, centerY, centerZ] = getCenterOfPalm(keypoints)
                                const difference = [centerX - lastPalm[0], centerY - lastPalm[1], centerZ - lastPalm[2]]
                                lastPalm = [centerX, centerY, centerZ]
                                const estimatedGestures = GE.estimate(keypoints, 8.5);
                                const ndcX = difference[0]
                                const ndcY = -difference[1]
                                // const ndcX = (difference[0] / videoRef.current.videoWidth) * 2 - 1;
                                // const ndcY = -(difference[1] / videoRef.current.videoHeight) * 2 + 1;
                                // const ndcZ = (centerZ / videoRef.current.videoHeight) * 2 + 1;
                                setGesture(estimatedGestures)
                                if (currentGestureRef.current === "pan")
                                {
                                    const newPosX = currentModel.position.x - ndcX
                                    const newPosY = currentModel.position.y + ndcY
                                    currentModel.position.x = smoothingInterpolation(currentModel.position.x, newPosX, SMOOTHING_FACTOR);
                                    currentModel.position.y = smoothingInterpolation(currentModel.position.y, newPosY, SMOOTHING_FACTOR);
                                    lastPosition = currentModel.position
                                    // currentModel.position.z = smoothingInterpolation(currentModel.position.z, ndcZ * 8, SMOOTHING_FACTOR);
                                }
                                else if (currentGestureRef.current === "grab")
                                {
                                    // current
                                    const newRotationX = currentModel.rotation.x + -ndcY * Math.PI * ROTATION_SENSITIVITY
                                    const newRotationY = currentModel.rotation.y + -ndcX * Math.PI * ROTATION_SENSITIVITY
                                    currentModel.rotation.x = smoothingInterpolation(currentModel.rotation.x, newRotationX, SMOOTHING_FACTOR)
                                    currentModel.rotation.y = smoothingInterpolation(currentModel.rotation.y, newRotationY, SMOOTHING_FACTOR)
                                }
                                else if (currentGestureRef.current === "scale")
                                {
                                    const scaleFactor = smoothingInterpolation(currentModel.scale.y, ndcY * SCALE_SENSITIVITY, SMOOTHING_FACTOR)
                                    currentModel.scale.set(scaleFactor, scaleFactor, scaleFactor)
                                }

                                // console.log(currentModel.scale)
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
