import React, { useRef, useEffect } from 'react';
import '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import * as tfjsWasm from '@tensorflow/tfjs-backend-wasm';
import * as handpose from '@tensorflow-models/handpose'
import * as tf from '@tensorflow/tfjs';
import { useCallback } from 'react';
import _ from 'lodash';


tfjsWasm.setWasmPaths(
    `https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm@${
        tfjsWasm.version_wasm}/dist/`);

function HandTracker({onGesture}) {
    const videoRef = useRef(null)
    const canvasRef = useRef(null);
    const debouncedOnGesture = useCallback(_.debounce(onGesture, 100), [onGesture]);
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
            try {
                // await tf.setBackend('webgl');
                const canvas = canvasRef.current;
                const ctx = canvas.getContext('2d');
                canvas.width = 640;
                canvas.height = 480; 
                videoRef.current.width = 640
                videoRef.current.height = 480
                const model = await handpose.load();
                setInterval(async () => {
                    if (videoRef.current) {
                        try {
                            const predictions = await model.estimateHands(videoRef.current)
                            ctx.clearRect(0, 0, canvas.width, canvas.height);
                            for (let i = 0; i < predictions.length; i++)
                            {
                                const keypoints = predictions[i].landmarks;
                                // console.log(keypoints)
                                drawLandmarks(ctx, keypoints)
                                // console.log("drawn landmarks")
                                drawConnections(ctx, keypoints)
                                // const gesture = detectGesture(keypoints)
                                console.log(detectGesture(keypoints))
                                // onGesture(gesture)
                                // if (gesture)
                                //     
                                // console.log(gesture)   
                            }
                        }
                        catch (error ){
                            console.log(error)
                        }
                    }
            }, 30);
            }   catch (error) {
                console.error('Error setting up hand tracking:', error);
            }
        }

        function drawLandmarks(ctx, landmarks) {
            landmarks.forEach(([x, y, z]) => {
                ctx.beginPath()
                ctx.arc(x, y, 5, 0, 2 * Math.PI)
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
                ctx.moveTo(landmarks[start][0], landmarks[start][1]);
                ctx.lineTo(landmarks[end][0], landmarks[end][1]);
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
            // console.log(thumbTip)
            const dist = Math.sqrt(
                Math.pow(thumbTip[0] - indextTip[0], 2) +
                Math.pow(thumbTip[1] - indextTip[1], 2) + 
                Math.pow(thumbTip[2] - indextTip[2], 2))
            // console.log(dist)
            const gesture = dist < 30 ? 'pinch' : 'open';
            debouncedOnGesture(gesture);
            return gesture
        }
        // setupHandTracking()
        setupCamera().then(setupHandTracking())
    }, [onGesture])

    return <div style={{ position: 'absolute', top: 0, left: 0 }}>
    <video
        ref={videoRef}
        style={{
            transform: 'scaleX(-1)', // Flip the video horizontally
            width: '100%',
            display: 'block',
            top: 0,
            left: 0,
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
