import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import './LandingPage.css';

const LandingPage: React.FC = () => {
  const [isLoaderHidden, setIsLoaderHidden] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isBackToTopVisible, setIsBackToTopVisible] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const terminalBodyRef = useRef<HTMLDivElement>(null);
  const statsBarRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Loader timeout
    const loaderTimeout = setTimeout(() => {
      setIsLoaderHidden(true);
    }, 2200);

    // Scroll listener
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
      setIsBackToTopVisible(window.scrollY > 500);
      
      // Parallax for orbs
      const scrolled = window.scrollY;
      const orbs = document.querySelectorAll('.orb');
      orbs.forEach((orb: any, i) => {
        const speed = (i + 1) * 0.05;
        orb.style.transform = `translateY(${scrolled * speed}px)`;
      });
    };

    window.addEventListener('scroll', handleScroll);

    // Particles Animation
    initParticlesAnimation();

    // Intersection Observers for reveal animations
    initRevealObserver();
    initCounterObserver();
    initTerminalObserver();
    
    // Type effect
    initTypeEffect();

    return () => {
      clearTimeout(loaderTimeout);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const initParticlesAnimation = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let particles: Particle[] = [];

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    class Particle {
      x: number = 0;
      y: number = 0;
      size: number = 0;
      speedX: number = 0;
      speedY: number = 0;
      opacity: number = 0;
      color: string = '';

      constructor() {
        this.reset();
      }

      reset() {
        this.x = Math.random() * canvas!.width;
        this.y = Math.random() * canvas!.height;
        this.size = Math.random() * 2 + 0.5;
        this.speedX = (Math.random() - 0.5) * 0.5;
        this.speedY = (Math.random() - 0.5) * 0.5;
        this.opacity = Math.random() * 0.5 + 0.1;
        this.color = ['255, 255, 255', '200, 200, 200', '150, 150, 150'][Math.floor(Math.random() * 3)];
      }

      update() {
        this.x += this.speedX;
        this.y += this.speedY;

        if (this.x < 0 || this.x > canvas!.width) this.speedX *= -1;
        if (this.y < 0 || this.y > canvas!.height) this.speedY *= -1;
      }

      draw() {
        ctx!.beginPath();
        ctx!.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(${this.color}, ${this.opacity})`;
        ctx!.fill();
      }
    }

    const initParticles = () => {
      const count = Math.min(80, Math.floor(window.innerWidth / 15));
      particles = [];
      for (let i = 0; i < count; i++) {
        particles.push(new Particle());
      }
    };

    const connectParticles = () => {
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 150) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(255, 255, 255, ${0.05 * (1 - dist / 150)})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.update();
        p.draw();
      });
      connectParticles();
      requestAnimationFrame(animate);
    };

    initParticles();
    animate();
  };

  const initRevealObserver = () => {
    const revealElements = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .stagger-children');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });

    revealElements.forEach(el => observer.observe(el));
  };

  const initCounterObserver = () => {
    if (!statsBarRef.current) return;
    let statsCounted = false;
    const statNumbers = document.querySelectorAll('.stat-number');

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !statsCounted) {
          statsCounted = true;
          statNumbers.forEach((num: any) => {
            const target = parseFloat(num.dataset.count);
            const isDecimal = target % 1 !== 0;
            const duration = 2000;
            const steps = 60;
            const increment = target / steps;
            let current = 0;
            const interval = setInterval(() => {
              current += increment;
              if (current >= target) {
                current = target;
                clearInterval(interval);
              }
              num.textContent = isDecimal ? current.toFixed(1) : Math.floor(current);
              if (!isDecimal && current >= target) {
                num.textContent = target + '+';
              }
            }, duration / steps);
          });
        }
      });
    }, { threshold: 0.5 });

    observer.observe(statsBarRef.current);
  };

  const initTerminalObserver = () => {
    if (!terminalRef.current) return;
    let terminalStarted = false;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !terminalStarted) {
          terminalStarted = true;
          runTerminal();
        }
      });
    }, { threshold: 0.3 });

    observer.observe(terminalRef.current);
  };

  const runTerminal = () => {
    const terminalLines = [
      { prompt: '$ ', command: 'helpdesk --init --mode=production', delay: 300 },
      { output: '[-] Inicializando Help Desk Tzomp v3.0...', delay: 800 },
      { output: '[!] Cargando módulos principales...', delay: 600, class: 'output' },
      { output: '   + Motor de Sistema cargado', delay: 400, class: 'output' },
      { output: '   + Análisis listo', delay: 400, class: 'output' },
      { output: '   + Clasificación automática activa', delay: 400, class: 'output' },
      { output: '   + Base de conocimientos sincronizada', delay: 400, class: 'output' },
      { output: '[!] Protocolos de seguridad habilitados', delay: 600, class: 'output' },
      { output: '[+] Panel conectado — métricas en tiempo real activas', delay: 500, class: 'output' },
      { output: '[-] Puerta de enlace API: https://api.tzomp.lab/v3', delay: 500 },
      { prompt: '$ ', command: 'status --all', delay: 800 },
      { output: '──────────────────────────────────────', delay: 300 },
      { output: '  ESTADO DEL SISTEMA: ██████████████ EN LÍNEA', delay: 400, class: 'output' },
      { output: '  MOTOR DEL SISTEMA:  ██████████████ ACTIVO', delay: 400, class: 'output' },
      { output: '  TICKETS:           ██████████████ 0 PENDIENTES', delay: 400, class: 'output' },
      { output: '  TIEMPO ACTIVIDAD:  99.97% (30 días)', delay: 400, class: 'output' },
      { output: '──────────────────────────────────────', delay: 300 },
      { output: '[OK] Todos los sistemas operativos. Listo para solicitudes.', delay: 600, class: 'output' },
    ];

    const body = terminalBodyRef.current;
    if (!body) return;

    let totalDelay = 0;
    terminalLines.forEach((line, index) => {
      totalDelay += line.delay || 500;
      setTimeout(() => {
        const div = document.createElement('div');
        div.className = 'terminal-line';
        div.style.opacity = '1';
        div.style.transform = 'translateY(0)';

        if (line.prompt) {
          div.innerHTML = `<span class="prompt">${line.prompt}</span><span class="command">${line.command}</span>`;
        } else {
          const cls = line.class || 'output';
          div.innerHTML = `<span class="${cls}">${line.output}</span>`;
        }

        body.appendChild(div);

        if (index === terminalLines.length - 1) {
          setTimeout(() => {
            const cursorSpan = document.createElement('span');
            cursorSpan.className = 'cursor-blink';
            div.appendChild(cursorSpan);
          }, 500);
        }
        body.scrollTop = body.scrollHeight;
      }, totalDelay);
    });
  };

  const initTypeEffect = () => {
    const heroWords = ['Gestión Inteligente', 'Operación Eficiente', 'Automatización', 'Innovación'];
    let wordIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    const typingElement = document.querySelector('.typing-text-target');

    function typeEffect() {
      if (!typingElement) return;
      const currentWord = heroWords[wordIndex];

      if (isDeleting) {
        typingElement.textContent = currentWord.substring(0, charIndex - 1);
        charIndex--;
      } else {
        typingElement.textContent = currentWord.substring(0, charIndex + 1);
        charIndex++;
      }

      let typeSpeed = isDeleting ? 50 : 100;

      if (!isDeleting && charIndex === currentWord.length) {
        typeSpeed = 2000;
        isDeleting = true;
      } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        wordIndex = (wordIndex + 1) % heroWords.length;
        typeSpeed = 500;
      }

      setTimeout(typeEffect, typeSpeed);
    }

    setTimeout(typeEffect, 3000);
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const target = document.querySelector(id);
    if (target) {
      const offset = 80;
      const pos = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top: pos, behavior: 'smooth' });
    }
    if (isMenuOpen) toggleMenu();
  };

  return (
    <div className="landing-page-container">
      {/* LOADER */}
      <div className={`loader-screen ${isLoaderHidden ? 'hidden' : ''}`} id="loader">
        <img 
          src="/favicon_io/android-chrome-512x512.png" 
          alt="Tzomp Logo" 
          className="loader-logo" 
        />
        <div className="loader-bar"><div className="loader-bar-fill"></div></div>
        <p className="loader-text">INICIALIZANDO SISTEMA</p>
      </div>

      {/* CUSTOM CURSOR - Disabled in React to avoid performance issues if not carefully handled, but included for completeness */}
      {/* <div className="cursor-dot" id="cursorDot"></div>
      <div className="cursor-ring" id="cursorRing"></div> */}

      <canvas ref={canvasRef} id="particles-canvas"></canvas>

      <div className={`mobile-overlay ${isMenuOpen ? 'active' : ''}`} onClick={toggleMenu}></div>

      {/* NAVBAR */}
      <nav className={`navbar ${isScrolled ? 'scrolled' : ''}`}>
        <a href="#inicio" className="nav-brand" onClick={(e) => scrollToSection(e, '#inicio')}>
          <img src="/favicon_io/android-chrome-192x192.png" alt="Tzomp" className="nav-logo rounded-full border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.2)]" />
          <span className="nav-title uppercase tracking-tighter">Dto. Sistemas C2</span>
        </a>

        <ul className={`nav-links ${isMenuOpen ? 'open' : ''}`}>
          <li><Link to="/app" className="nav-cta btn-mega"><i className="fas fa-rocket"></i> Acceder</Link></li>
        </ul>

        <div className={`hamburger ${isMenuOpen ? 'active' : ''}`} onClick={toggleMenu}>
          <span></span>
          <span></span>
          <span></span>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="hero" id="inicio">
        <div className="hero-grid"></div>
        <div className="orb orb-1"></div>
        <div className="orb orb-2"></div>
        <div className="orb orb-3"></div>

        <div className="hero-content centered">
          <div className="hero-text full-width">
            <div className="hero-badge reveal">
              <i className="fas fa-shield-halved"></i>
              SISTEMA FEDERAL DE TZOMPANTEPEC — ACTIVO
            </div>
            <h1 className="reveal-up">
              <span className="line">HELP DESK</span>
              <span className="line gradient-text">INSTITUCIONAL</span>
            </h1>
            <p className="hero-description reveal-up stagger-1">
              Plataforma unificada para la gestión de incidencias, mantenimiento preventivo 
              y soporte técnico especializado del Dto. Sistemas C2 Tzompantepec.
            </p>
            <div className="hero-buttons-centered reveal-up stagger-2">
              <Link to="/app" className="btn btn-mega btn-primary pulse-glow">
                <i className="fas fa-sign-in-alt"></i> ACCEDER AL SISTEMA
              </Link>
            </div>
          </div>

          <div className="hero-visual">
            <div className="hero-3d-container reveal-right">
              <div className="system-preview-wrapper">
                <img src="/assets/system-preview.png" alt="Help Desk Dashboard" className="system-main-preview" />
                <div className="preview-glow"></div>
              </div>
              
              <div className="hologram-ring ring-1"></div>
              <div className="hologram-ring ring-2"></div>
              
              <div className="floating-badge fb-1"><i className="fas fa-check"></i> Eficiente</div>
              <div className="floating-badge fb-2"><i className="fas fa-shield-alt"></i> Seguro</div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS BAR */}
      <div className="stats-bar" ref={statsBarRef}>
        <div className="stats-grid stagger-children">
          <div className="stat-item">
            <div className="stat-number" data-count="99.9">0</div>
            <div className="stat-label">% Disponibilidad</div>
          </div>
          <div className="stat-item">
            <div className="stat-number" data-count="500">0</div>
            <div className="stat-label">Tickets Resueltos</div>
          </div>
          <div className="stat-item">
            <div className="stat-number" data-count="50">0</div>
            <div className="stat-label">Áreas de Atención</div>
          </div>
          <div className="stat-item">
            <div className="stat-number" data-count="24">0</div>
            <div className="stat-label">/7 Soporte</div>
          </div>
        </div>
      </div>

      {/* FEATURES SECTION SIMPLIFIED */}
      <section className="features" id="features">
        <div className="section-header reveal">
          <div className="section-tag"><i className="fas fa-star"></i> Características</div>
          <h2>Funcionalidades <span className="gradient-text">Avanzadas</span></h2>
          <div className="center-cta-wrap reveal">
            <Link to="/app" className="btn btn-giant btn-primary">
              <i className="fas fa-rocket"></i> Acceder al Sistema
            </Link>
          </div>
        </div>
      </section>

      {/* AI SHOWCASE SIMPLIFIED */}
      <section className="ai-showcase" id="ia">
        <div className="section-header reveal">
          <div className="section-tag"><i className="fas fa-microchip"></i> Motor IA</div>
          <h2>Inteligencia Artificial de <span className="gradient-text">Nueva Generación</span></h2>
          <div className="center-cta-wrap reveal">
            <Link to="/app" className="btn btn-giant btn-primary">
              <i className="fas fa-brain"></i> Acceder e Iniciar IA
            </Link>
          </div>
        </div>
      </section>

      {/* MODULES SECTION SIMPLIFIED */}
      <section className="services" id="modulos">
        <div className="section-header reveal">
          <div className="section-tag"><i className="fas fa-cubes"></i> Módulos</div>
          <h2>Módulos del <span className="gradient-text">Sistema</span></h2>
          <div className="center-cta-wrap reveal">
            <Link to="/app" className="btn btn-giant btn-primary">
              <i className="fas fa-layer-group"></i> Acceder a Módulos
            </Link>
          </div>
        </div>
      </section>

      {/* TECH STACK SIMPLIFIED */}
      <section className="tech-stack" id="tech">
        <div className="section-header reveal">
          <div className="section-tag"><i className="fas fa-code"></i> Stack Tecnológico</div>
          <h2>Tecnologías que <span className="gradient-text-2">Impulsan</span> el Sistema</h2>
          <div className="center-cta-wrap reveal">
            <Link to="/app" className="btn btn-giant btn-primary">
              <i className="fas fa-laptop-code"></i> Acceder al Entorno
            </Link>
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="cta-section">
        <div className="cta-glow"></div>
        <div className="cta-content reveal">
          <h2>¿Listo para <span className="gradient-text">Transformar</span> tu Soporte?</h2>
          <p>Únete a la gestión tecnológica inteligente del municipio. Accede ahora al Help Desk institucional.</p>
          <div className="cta-buttons-centered">
            <Link to="/app" className="btn btn-mega btn-primary">
              <i className="fas fa-sign-in-alt"></i> ACCEDER AHORA
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-grid">
          <div className="footer-brand">
            <img src="/favicon_io/android-chrome-192x192.png" alt="Tzomp" className="nav-logo" />
            <p>Help Desk Dto. Sistemas C2 Tzompantepec — Plataforma de soporte técnico institucional para la gestión tecnológica municipal.</p>
            <div className="footer-social">
              <a href="#"><i className="fab fa-github"></i></a>
              <a href="#"><i className="fab fa-linkedin-in"></i></a>
              <a href="#"><i className="fab fa-twitter"></i></a>
              <a href="#"><i className="fab fa-discord"></i></a>
            </div>
          </div>
          <div className="footer-col">
            <h4>Sistema</h4>
            <ul>
              <li><a href="#features" onClick={(e) => scrollToSection(e, '#features')}>Características</a></li>
              <li><a href="#ia" onClick={(e) => scrollToSection(e, '#ia')}>Motor IA</a></li>
              <li><a href="#modulos" onClick={(e) => scrollToSection(e, '#modulos')}>Módulos</a></li>
              <li><a href="#tech" onClick={(e) => scrollToSection(e, '#tech')}>Tecnología</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Recursos</h4>
            <ul>
              <li><a href="#">Documentación</a></li>
              <li><a href="#">Referencias API</a></li>
              <li><a href="#">Guía de Inicio</a></li>
              <li><a href="#">Registro de Cambios</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Soporte</h4>
            <ul>
              <li><a href="#">Centro de Ayuda</a></li>
              <li><a href="#">Contacto</a></li>
              <li><a href="#">Estado del Sistema</a></li>
              <li><a href="#">Reportar Error</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2025 <a href="#">Tzomp Lab</a>. Todos los derechos reservados.</p>
          <p>Hecho con <i className="fas fa-heart" style={{color: 'var(--accent)'}}></i> & IA</p>
        </div>
      </footer>

      {/* BACK TO TOP */}
      <button 
        className={`back-to-top ${isBackToTopVisible ? 'visible' : ''}`} 
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      >
        <i className="fas fa-chevron-up"></i>
      </button>
    </div>
  );
};

export default LandingPage;
