import React, { useRef, useEffect } from 'react';
import '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import * as tfjsWasm from '@tensorflow/tfjs-backend-wasm';
import * as handpose from '@tensorflow-models/handpose'
import * as tf from '@tensorflow/tfjs';
import * as fp from 'fingerpose'

tfjsWasm.setWasmPaths(
    `https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm@${
        tfjsWasm.version_wasm}/dist/`);

function PoseDetector() {
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

        function initGesture() {
            const grabGesture = new fp.GestureDescription('pinch');

            // pinchGesture.addCurl(fp.Finger.Index, fp.FingerCurl.NoCurl, 1.0);
            // pinchGesture.addCurl(fp.Finger.Thumb, fp.FingerCurl.NoCurl, 1.0);

            // pinchGesture.addDirection(fp.Finger.Index, fp.FingerDirection.HorizontalLeft, 0.8);
            // pinchGesture.addDirection(fp.Finger.Thumb, fp.FingerDirection.HorizontalLeft, 0.8);

            // all other fingers:
            [fp.Finger.Thumb, fp.Finger.Index, fp.Finger.Middle, fp.Finger.Ring, fp.Finger.Pinky].forEach(finger => {
                grabGesture.addCurl(finger, fp.FingerCurl.HalfCurl, 1);
            }) 


            // pinchGesture.addCurl(fp.Finger.Thumb, fp.FingerCurl.NoCurl, 1.0);
            // pinchGesture.addDirection(fp.Finger.Thumb, fp.FingerDirection.HorizontalLeft, 0.5);
            // pinchGesture.addDirection(fp.Finger.Thumb, fp.FingerDirection.DiagonalUpLeft, 0.5);

            // pinchGesture.addCurl(fp.Finger.Index, fp.FingerCurl.HalfCurl, 1.0);
            // pinchGesture.addDirection(fp.Finger.Index, fp.FingerDirection.DiagonalUpLeft, 0.8);

            // // all other fingers:
            // for (let finger of [fp.Finger.Middle, fp.Finger.Ring, fp.Finger.Pinky]) {
            // pinchGesture.addCurl(finger, fp.FingerCurl.FullCurl, 0.5);
            // }
            // pinchGesture.addCurl(fp.Finger.Thumb, fp.FingerCurl.NoCurl, 1.0)
            // pinchGesture.addDirection(fp.Finger.Thumb, fp.FingerDirection.HorizontalRight, .5);
            // pinchGesture.addDirection(fp.Finger.Thumb, fp.FingerDirection.DiagonalUpRight, .5);

            // // all other fingers:
            // [fp.Finger.Index, fp.Finger.Middle, fp.Finger.Ring, fp.Finger.Pinky].forEach(finger => {
            //     pinchGesture.addCurl(finger, fp.FingerCurl.HalfCurl, 1.0);
            //     pinchGesture.addDirection(fp.Finger.Thumb, fp.FingerDirection.HorizontalRight, .25);
            // }) 
            return grabGesture
        }


        async function setupHandTracking() {
            try {
                // await tf.setBackend('webgl');

                const canvas = canvasRef.current;
                const ctx = canvas.getContext('2d');
                const model = await handpose.load();

                const grabGesture = initGesture()
                const GE = new fp.GestureEstimator([
                    grabGesture
                ])
                canvas.width = 640;
                canvas.height = 480;
                videoRef.current.width = 640
                videoRef.current.height = 480
                setInterval(async () => {
                    if (videoRef.current) {
                        const predictions = await model.estimateHands(videoRef.current)
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                        if (predictions.length > 0) {
                            const keypoints = predictions[0].landmarks;
                            drawLandmarks(ctx, keypoints)
                            drawConnections(ctx, keypoints)
                            const estimatedGestures = GE.estimate(keypoints, 8.5);
                            if (estimatedGestures["gestures"].length > 0)
                            {
                                console.log(estimatedGestures["gestures"][0]["score"])
                                if (estimatedGestures["gestures"][0]["score"] >= 6.5)
                                    console.log(estimatedGestures["gestures"][0]["name"])
                                else
                                    console.log("open")
                            }
                            else
                            {
                                console.log("open")
                            }

                        }
                    }
            }, 50);
            }   catch (error) {
                console.error('Error setting up hand tracking:', error);
            }
        }
        setupCamera().then(setupHandTracking())
    })

    return <div style={{ position: 'relative', display: 'inline-block' }}>
    <video
        ref={videoRef}
        style={{
            transform: 'scaleX(-1)', // Flip the video horizontally
            width: '100%',
            height: '100%', // Set video to full width of the container
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

export default PoseDetector