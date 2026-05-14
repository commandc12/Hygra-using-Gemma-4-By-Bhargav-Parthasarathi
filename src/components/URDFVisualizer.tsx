import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface URDFVisualizerProps {
  urdfXml: string;
  dof: number;
}

export const URDFVisualizer: React.FC<URDFVisualizerProps> = ({ urdfXml, dof }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = 400;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    
    renderer.setSize(width, height);
    containerRef.current.appendChild(renderer.domElement);

    // Grid
    const gridHelper = new THREE.GridHelper(10, 10, 0x444444, 0x222222);
    scene.add(gridHelper);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0xf27d26, 1);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);

    // Procedural Robot Structure
    const group = new THREE.Group();
    const material = new THREE.MeshPhongMaterial({ color: 0xf27d26, wireframe: true });
    
    // Base
    const baseGeom = new THREE.BoxGeometry(1, 0.2, 1);
    const base = new THREE.Mesh(baseGeom, material);
    group.add(base);

    // Links based on DOF
    let lastLink: THREE.Mesh | THREE.Group = base;
    for (let i = 0; i < dof; i++) {
      const linkGeom = new THREE.CylinderGeometry(0.1, 0.1, 1);
      const link = new THREE.Mesh(linkGeom, material);
      link.position.y = 0.5;
      
      const jointGroup = new THREE.Group();
      jointGroup.position.y = (i === 0) ? 0.1 : 1;
      jointGroup.rotation.z = Math.sin(Date.now() * 0.001 + i) * 0.2; // Idle animation
      
      jointGroup.add(link);
      lastLink.add(jointGroup);
      lastLink = link;
    }

    scene.add(group);
    camera.position.set(4, 4, 4);
    camera.lookAt(0, 1, 0);

    const animate = () => {
      requestAnimationFrame(animate);
      group.children.forEach((child, idx) => {
        if (child instanceof THREE.Group) {
           child.rotation.y += 0.005;
        }
      });
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      renderer.dispose();
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [urdfXml, dof]);

  return <div ref={containerRef} className="w-full bg-black/40 rounded-xl overflow-hidden border border-white/5" />;
};
