import React, { useRef, useEffect } from 'react';
import '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import * as tfjsWasm from '@tensorflow/tfjs-backend-wasm';
import * as handpose from '@tensorflow-models/handpose'
import * as THREE from 'three';
import * as fp from 'fingerpose'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';


//  Set tensor flow backend path
tfjsWasm.setWasmPaths(
    `https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm@${
        tfjsWasm.version_wasm}/dist/`);


const STREAM_WIDTH = 320;
const STREAM_HEIGHT = 240

//  Set up three.js scene, adjust scene to camera size
const loader = new GLTFLoader();
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, (window.innerWidth - STREAM_WIDTH) / window.innerHeight, 0.1, 1000);
camera.position.z = 5;

//  Initialize default model
let currentModelFileURL = 'models/littletokyo.glb'
let changedFile = false
let currentModel = null

//  Initialize default settings
let showLandmarks = true
let showFPS = true
let pauseDetection = false


//  Load model based on file URL with the GLTF Loader (only .glb and .gltf files)
function loadModel(URL) {
    let model = null
    loader.load(
        URL,
        (obj) => {
            model = obj.scene
            if (URL === "models/littletokyo.glb")
                model.scale.set(0.01, 0.01, 0.01)
            else
            {
                model.scale.set(0.3, 0.3, 0.3)
            }
            scene.add(model)
            currentModel = model
        }, (xhr) => {
            console.log((xhr.loaded / xhr.total * 100) + '% loaded');
        },
        (error) => {
            console.error('An error happened while loading the model', error);
        }
    )
}

// Initialize the control panel component
function ControlPanel() {

    //  Handle the hand landmarks settings
    const toggleLandmarks = () => {
        showLandmarks = !showLandmarks
        const label = document.getElementById('landmarkLabel')
        const landmarksInput = document.getElementById('landmarks')
        label.removeChild(landmarksInput)
        const newLandmarkInput = document.createElement('input')
        newLandmarkInput.type = 'checkbox'
        newLandmarkInput.checked = showLandmarks
        newLandmarkInput.onchange = function() {toggleLandmarks()}
        newLandmarkInput.id = 'landmarks'
        label.insertBefore(newLandmarkInput, label.firstChild)
    }

    //  Handle the fps label setting
    const toggleFPSLabel = () => {
        showFPS = !showFPS
        const label = document.getElementById('fpsLabel')
        const fpsInput = document.getElementById('fps_label')
        label.removeChild(fpsInput)
        const newFPSInput = document.createElement('input')
        newFPSInput.type = 'checkbox'
        newFPSInput.checked = showFPS
        newFPSInput.onchange = function() {toggleFPSLabel()}
        newFPSInput.id = 'fps_label'
        label.insertBefore(newFPSInput, label.firstChild)
    }

    // Handle the pausing hand detection setting
    const toggleDetection = () => {
        pauseDetection = !pauseDetection
        const label = document.getElementById('detectionLabel')
        const detectionInput = document.getElementById('pause_detection')
        label.removeChild(detectionInput)
        const newDetectionInput = document.createElement('input')
        newDetectionInput.type = 'checkbox'
        newDetectionInput.checked = pauseDetection
        newDetectionInput.onchange = function() {toggleDetection()}
        newDetectionInput.id = 'pause_detection'
        label.insertBefore(newDetectionInput, label.firstChild)
    }

    // Handle the file upload feature
    const handleFileUpload = (event) => {
        changedFile = true
        const file = event.target.files[0]
        if (file)
        {
            currentModelFileURL = URL.createObjectURL(file)
        }
    }

    //  Handle the dropdown for sample files
    const handleSampleDropdown = (event) => {
        changedFile = true
        if (event.target.value === "tokyo")
        {
            currentModelFileURL = 'models/littletokyo.glb'
        }
        else if (event.target.value === "robot")
        {
            currentModelFileURL = 'models/warrobot.glb'
        }
        else if (event.target.value === "sucrose")
        {
            currentModelFileURL = 'models/sucrose_molecule.glb'
        }
    }

    return (
        <div style={{ position: 'absolute', width: STREAM_WIDTH, height: `calc(100% - ${STREAM_HEIGHT}px)`, top: STREAM_HEIGHT, color: 'white', backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
            <h2>Control Panel</h2>
            <p>Change settings:</p>
            <div>
                <label id= "fpsLabel" style={{ display: 'block', marginBottom: '10px' }}>
                    <input
                    type="checkbox"
                    name="fps_label"
                    id="fps_label"
                    checked={showFPS}
                    onChange={toggleFPSLabel}
                    style={{ marginRight: '8px' }}
                    />
                    FPS Label
                </label>
                <label id= "landmarkLabel" style={{ display: 'block', marginBottom: '10px' }}>
                    <input
                    type="checkbox"
                    name="landmarks"
                    id="landmarks"
                    checked={showLandmarks}
                    onChange={toggleLandmarks}
                    style={{ marginRight: '8px' }}
                    />
                    Show Hand Landmarks
                </label>
                <label id= "detectionLabel" style={{ display: 'block', marginBottom: '10px' }}>
                    <input
                    type="checkbox"
                    name="pause_detection"
                    id="pause_detection"
                    checked={pauseDetection}
                    onChange={toggleDetection}
                    style={{ marginRight: '8px' }}
                    />
                    Stop Gesture Detection
                </label>
                <label style={{ display: 'block', marginBottom: '10px', alignItems: "center" }}>
                    Model Upload (.glb)
                    <input
                    type="file"
                    accept=".glb"
                    onChange={handleFileUpload}
                    />
                </label>
                <label style={{ display: 'block', marginBottom: '10px' }}>
                    Select a sample model:
                    <select onChange={handleSampleDropdown}>
                        <option value='tokyo'>Little Tokyo</option>
                        <option value='robot'>War Robot</option>
                        <option value='sucrose'>Sucrose Molecule</option>
                    </select>
                </label>
                <div style={{
                    marginTop: '20px',
                    padding: '15px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    fontSize: '14px',
                    lineHeight: '1.5',
                    maxWidth: '100%',
                    boxSizing: 'border-box'
                }}>
                    <h3 style={{ marginBottom: '10px', fontSize: '16px', color: '#FFD700' }}>Instructions</h3>
                    <p>Use your open hand to the camera to rotate the model in the 3D environment. To scale the model up and down, create a fist like you're punching the sky and move it up and down.</p>
                    <p>You can upload a 3D model in the .glb format or select a sample model from the dropdown menu to display it in the scene.</p>
                </div>
            </div>
        </div>
    );
}


function HandTracker() {

    //  Set up React Refs
    const videoRef = useRef(null)
    const canvasRef = useRef(null);
    const threejsCavnasRef = useRef(null);
    const sceneRef = useRef(null);
    const currentGestureRef = useRef(null)  

    //  Smoothing function to decrease jitter between movements
    const smoothingInterpolation = (start, end, smoothingFactor) => (start + (end - start) * smoothingFactor)

    //  Settings for sensitivity
    const SMOOTHING_FACTOR = 0.02
    const GESTURE_DELAY = 500
    const SCALE_SENSITIVITY = 0.01
    const ROTATION_SENSITIVITY = 0.3

    useEffect(() => {
        let lastFrameTime = performance.now();
        let frameCount = 0;
        let fps = 0;
        const fpsLabel = document.createElement('div');

        //  Style FPS Label
        function initFPSLabel() {
            fpsLabel.style.position = 'absolute';
            fpsLabel.style.top = '10px';
            fpsLabel.style.right = '10px';
            fpsLabel.style.backgroundColor = 'rgba( 0, 0, 0, 0.7)';
            fpsLabel.style.color = 'white';
            fpsLabel.style.padding = '5px';
            fpsLabel.style.fontSize = '14px';
            fpsLabel.style.zIndex = '10'; // Ensure it's above other elements 
            document.body.appendChild(fpsLabel);
        }

        //  Calculate the FPS
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

        //  Return center of palm using a centroid calculation around outer palm landmarks
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

        //  Use fingerpose custom gestures to detect functions. Works on a delay.
        function setGesture(estimatedGestures) {
            setTimeout(() => {
                if (estimatedGestures["gestures"].length > 0)
                {
                    const gesture = estimatedGestures["gestures"][0]["name"]
                    const confidenceScore = estimatedGestures["gestures"][0]["score"]
                    if (gesture === "rotate" && confidenceScore >= 9.25)
                    {
                        currentGestureRef.current = "rotate";
                    }
                    else if (gesture === "scale" && confidenceScore >= 9.75)
                    {
                        currentGestureRef.current = "scale";
                    }
                    else
                    {
                        currentGestureRef.current = null
                    }
                }
                
            }, GESTURE_DELAY)
        }

        //  Initialize the rotate gesture to open hand using finger pose model
        function initRotateGesture() {
            const rotateGesture = new fp.GestureDescription('rotate');

            [fp.Finger.Thumb, fp.Finger.Index, fp.Finger.Middle, fp.Finger.Ring, fp.Finger.Pinky].forEach(finger => {
                rotateGesture.addCurl(finger, fp.FingerCurl.NoCurl, 1);
            }) 

            return rotateGesture
        }

        //  Initialize the scale gesture to closed fist with finger pose model
        function initScaleGesture() {
            const scaleGesture = new fp.GestureDescription('scale');

            [fp.Finger.Index, fp.Finger.Middle, fp.Finger.Ring, fp.Finger.Pinky].forEach(finger => {
                scaleGesture.addCurl(finger, fp.FingerCurl.FullCurl, 1);
            }) 
            scaleGesture.addCurl(fp.Finger.Thumb, fp.FingerCurl.HalfCurl, 1)

            return scaleGesture
        }

        // Access webcam stream
        async function setupCamera() {
            const video = videoRef.current;
            if (navigator.mediaDevices.getUserMedia) {
                const stream = await navigator.mediaDevices.getUserMedia({video: true});
                video.srcObject = stream;
                await new Promise((resolve) => (video.onloadedmetadata = resolve))
                video.play();
            }
        }


        //  Finish initializing the three.js scene: renderer, lighting, original scene model
        const renderer = new THREE.WebGLRenderer({ canvas: threejsCavnasRef.current });
        renderer.setSize(window.innerWidth - STREAM_WIDTH, window.innerHeight);
        sceneRef.current = scene;
        const light = new THREE.DirectionalLight(0xffffff, 5);
        light.position.set(0, 1, 2).normalize();
        scene.add(light);
        loadModel(currentModelFileURL)
 
        initFPSLabel()

        //  Start animation loop
        function animate() {
            requestAnimationFrame(animate);

            fps = calculateFPS()  
            renderer.render(scene, camera);
            updateFPSLabel(fps)
        }

        animate()

        //  Initialize palm at 0,0,0 to calculate position difference
        let lastPalm = [0, 0, 0]

        //  Main hand tracking loop
        async function setupHandTracking() {
            try {
                //  Initialize the canvas on top of the webcam
                const canvas = canvasRef.current;
                const ctx = canvas.getContext('2d');
                canvas.width = STREAM_WIDTH;
                canvas.height = STREAM_HEIGHT; 

                //  Set video dimensions
                videoRef.current.width = STREAM_WIDTH
                videoRef.current.height = STREAM_HEIGHT

                //  Initialize the hand tracking model
                const model = await handpose.load();

                // Initialize the functional gestures
                const rotateGesture = initRotateGesture()
                const scaleGesture = initScaleGesture()
                const GE = new fp.GestureEstimator([
                    rotateGesture,
                    scaleGesture
                ])

                //  Main function loop
                setInterval(async () => {
                    //  Check for any file and model updates
                    if (changedFile)
                    {
                        scene.remove(currentModel)
                        currentModel = loadModel(currentModelFileURL)
                        changedFile = false
                    }

                    //  Check for the fps visibility setting
                    if (!showFPS)
                    {
                        fpsLabel.style.visibility = 'hidden'
                    }
                    else
                    {
                        fpsLabel.style.visibility = 'visible'
                    }

                    if (videoRef.current) {
                        try {
                            //  Get hand landmark positions with the hand pose model
                            const predictions = await model.estimateHands(videoRef.current)

                            //  Clear the canvas for landmarks
                            ctx.clearRect(0, 0, canvas.width, canvas.height);
                            if (predictions.length > 0)
                            {
                                const keypoints = predictions[0].landmarks;

                                //  Draw landmarks based on the control panel setting
                                if (showLandmarks)
                                {
                                    drawLandmarks(ctx, keypoints)
                                    drawConnections(ctx, keypoints)
                                }
                                //  Get palm position
                                const [centerX, centerY, centerZ] = getCenterOfPalm(keypoints)

                                //  Find difference in movement
                                const difference = [centerX - lastPalm[0], centerY - lastPalm[1], centerZ - lastPalm[2]]

                                //  Update the previous position
                                lastPalm = [centerX, centerY, centerZ]

                                //  Find the current gesture
                                const estimatedGestures = GE.estimate(keypoints, 8.5);

                                //  Normalize coordinates to account for mirrored movement
                                const ndcX = difference[0]
                                const ndcY = -difference[1]
                                setGesture(estimatedGestures)

                                //  Only operate if the pause detection control panel setting is deactivated
                                if (!pauseDetection)
                                {

                                    //  Roatate based on radians, normalized palm coordinate, and sensitivity setting
                                    if (currentGestureRef.current === "rotate")
                                    {
                                        const newRotationX = currentModel.rotation.x + -ndcY * Math.PI * ROTATION_SENSITIVITY
                                        const newRotationY = currentModel.rotation.y + -ndcX * Math.PI * ROTATION_SENSITIVITY

                                        //  Smooth the adjustments to reduce jitter
                                        currentModel.rotation.x = smoothingInterpolation(currentModel.rotation.x, newRotationX, SMOOTHING_FACTOR)
                                        currentModel.rotation.y = smoothingInterpolation(currentModel.rotation.y, newRotationY, SMOOTHING_FACTOR)
                                    }
                                    //  Scale each dimension based on the palm's y coordinate, including a scaling sensitivity constant
                                    else if (currentGestureRef.current === "scale")
                                    {
                                        const scaleFactor = smoothingInterpolation(currentModel.scale.y, currentModel.scale.y + ndcY * SCALE_SENSITIVITY, SMOOTHING_FACTOR)
                                        if (scaleFactor > 0)
                                        currentModel.scale.set(scaleFactor, scaleFactor, scaleFactor)
                                    }
                                }
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

        //  Draw landmarks based on the keypoints
        function drawLandmarks(ctx, landmarks) {
            landmarks.forEach(([x, y, z]) => {
                ctx.beginPath()
                ctx.arc(x/2, y/2, 2.5, 0, 2 * Math.PI)
                ctx.fillStyle = 'red'
                ctx.fill()
            })
        }

        //  Draw each connection for the fingers
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

        
        function updateFPSLabel(fps) {
            fpsLabel.innerText = `FPS: ${fps}`;
        }

        //  Run the main loops
        setupCamera().then(setupHandTracking())

        return () => {
            if (fpsLabel) {
                fpsLabel.remove();
            }
        };

    })

    return <div style={{ height: '100vh', position: 'relative', top: 0, left: 0 }}>
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
                    zIndex: 2,
                }}
            />
        </div>
        <canvas
            ref={threejsCavnasRef}
            style={{
                position: "absolute", 
                left: STREAM_WIDTH, 
                top: 0,
                height: '100%',
            }}
        />
        <ControlPanel/>
    </div>
}

export default HandTracker;
