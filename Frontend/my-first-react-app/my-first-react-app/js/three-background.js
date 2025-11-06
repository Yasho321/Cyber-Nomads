// Three.js Background Animation

(function() {
  document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('three-container');
    if (!container) return;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Create floating invoice cards
    const cards = [];
    const cardGeometry = new THREE.BoxGeometry(2, 3, 0.1);
    
    for (let i = 0; i < 20; i++) {
      const material = new THREE.MeshPhongMaterial({
        color: i % 2 === 0 ? 0x4F9CF9 : 0x0EA5E9,
        transparent: true,
        opacity: 0.15,
        shininess: 100,
      });
      
      const card = new THREE.Mesh(cardGeometry, material);
      
      // Random positions
      card.position.x = (Math.random() - 0.5) * 40;
      card.position.y = (Math.random() - 0.5) * 40;
      card.position.z = (Math.random() - 0.5) * 30 - 10;
      
      // Random rotations
      card.rotation.x = Math.random() * Math.PI;
      card.rotation.y = Math.random() * Math.PI;
      
      cards.push(card);
      scene.add(card);
    }

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const pointLight = new THREE.PointLight(0x4F9CF9, 1);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);

    camera.position.z = 15;

    // Animation
    function animate() {
      requestAnimationFrame(animate);

      cards.forEach((card, index) => {
        card.rotation.x += 0.001;
        card.rotation.y += 0.002;
        
        // Floating motion
        card.position.y += Math.sin(Date.now() * 0.001 + index) * 0.003;
        card.position.x += Math.cos(Date.now() * 0.0008 + index) * 0.002;
      });

      renderer.render(scene, camera);
    }

    animate();

    // Handle resize
    function handleResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }

    window.addEventListener('resize', handleResize);

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      window.removeEventListener('resize', handleResize);
      cards.forEach(card => {
        card.geometry.dispose();
        card.material.dispose();
      });
      renderer.dispose();
    });
  });
})();
