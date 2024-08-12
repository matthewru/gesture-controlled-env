import * as THREE from 'three'
import React, { useRef, useEffect } from 'react'

function VirtualEnvironment({gesture}) {
    const mountRef = useRef(null);

    useEffect(() => {
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer();
        renderer.setSize(window.innerWidth, window.innerHeight);
        mountRef.current.appendChild(renderer.domElement);

        const geometry = new THREE.BoxGeometry();
        const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
        const cube = new THREE.Mesh(geometry, material);
        scene.add(cube);

        camera.position.z = 5;

        const animate = () => {
            requestAnimationFrame(animate);
            // console.log("current gesture is: ", gesture)
            if (gesture === 'pinch')
            {
                cube.rotation.y += 0.01;
                cube.rotation.x += 0.02;
            }
            else
            {
                cube.rotation.y = 0;
                cube.rotation.x = 0;
            }
            renderer.render(scene, camera);
        };

        animate();

        return () => {
            mountRef.current.removeChild(renderer.domElement);
        };
    }, [gesture]);

    return <div ref={mountRef} />;
}

export default VirtualEnvironment;
