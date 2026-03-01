import React, { useEffect, useRef } from "react";

const GoldenRiceAnimation = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    let animationId;
    let hue = 45;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();

    // Adjust particle count based on screen size
    const particleCount =
      window.innerWidth < 768 ? 80 : 140; // mobile less, desktop more

    class Particle {
      constructor() {
        this.reset();
      }

      reset() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.size = Math.random() * 6 + 4;
        this.speedX = Math.random() * 0.6 + 0.2;
        this.speedY = Math.random() * 0.3 - 0.15;
        this.alpha = Math.random() * 0.5 + 0.5;
        this.rotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() - 0.5) * 0.008;
      }

      update() {
        this.x += this.speedX;
        this.y += this.speedY;
        this.rotation += this.rotationSpeed;

        if (
          this.x > canvas.width + 40 ||
          this.y < -40 ||
          this.y > canvas.height + 40
        ) {
          this.reset();
          this.x = -20;
        }
      }

      draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        ctx.fillStyle = `hsla(${hue}, 90%, 55%, ${this.alpha})`;
        ctx.shadowColor = `hsla(${hue}, 100%, 60%, 1)`;
        ctx.shadowBlur = 10;

        ctx.beginPath();
        ctx.ellipse(
          0,
          0,
          this.size * 0.25,
          this.size,
          Math.PI / 4,
          0,
          Math.PI * 2
        );
        ctx.fill();

        ctx.restore();
      }
    }

    const particles = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }

    // Create gradient only once
    const createBackground = () => {
      const gradient = ctx.createLinearGradient(
        0,
        0,
        canvas.width,
        canvas.height
      );
      gradient.addColorStop(0, "#000000");
      gradient.addColorStop(0.5, "#111111");
      gradient.addColorStop(1, "#000000");
      return gradient;
    };

    let background = createBackground();

    const animate = () => {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      hue += 0.2;
      if (hue > 55) hue = 45;

      particles.forEach((p) => {
        p.update();
        p.draw();
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      resizeCanvas();
      background = createBackground();
    };

    const handleVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(animationId);
      } else {
        animate();
      }
    };

    window.addEventListener("resize", handleResize);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return <canvas ref={canvasRef} className="block w-full h-full" />;
};

export default GoldenRiceAnimation;