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
        this.color = ['0, 240, 255', '123, 47, 255', '255, 45, 149'][Math.floor(Math.random() * 3)];
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
            ctx.strokeStyle = `rgba(0, 240, 255, ${0.05 * (1 - dist / 150)})`;
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
      { output: '⚡ Initializing Help Desk Tzomp v3.0...', delay: 800 },
      { output: '📦 Loading AI modules...', delay: 600, class: 'warning' },
      { output: '   ✓ NLP Engine loaded', delay: 400, class: 'success' },
      { output: '   ✓ Sentiment Analysis ready', delay: 400, class: 'success' },
      { output: '   ✓ Auto-classification active', delay: 400, class: 'success' },
      { output: '   ✓ Knowledge Base synced', delay: 400, class: 'success' },
      { output: '🔐 Security protocols enabled (Zero Trust)', delay: 600, class: 'warning' },
      { output: '📊 Dashboard connected — real-time metrics active', delay: 500, class: 'success' },
      { output: '🌐 API Gateway: https://api.tzomp.lab/v3', delay: 500 },
      { prompt: '$ ', command: 'status --all', delay: 800 },
      { output: '──────────────────────────────────────', delay: 300 },
      { output: '  SYSTEM STATUS: ██████████████ ONLINE', delay: 400, class: 'success' },
      { output: '  AI ENGINE:     ██████████████ ACTIVE', delay: 400, class: 'success' },
      { output: '  TICKETS:       ██████████████ 0 PENDING', delay: 400, class: 'success' },
      { output: '  UPTIME:        99.97% (30 days)', delay: 400, class: 'success' },
      { output: '──────────────────────────────────────', delay: 300 },
      { output: '✅ All systems operational. Ready for requests.', delay: 600, class: 'success' },
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
    const heroWords = ['Inteligencia Artificial', 'Machine Learning', 'Automatización', 'Innovación'];
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
        <p className="loader-text">INITIALIZING SYSTEM</p>
      </div>

      {/* CUSTOM CURSOR - Disabled in React to avoid performance issues if not carefully handled, but included for completeness */}
      {/* <div className="cursor-dot" id="cursorDot"></div>
      <div className="cursor-ring" id="cursorRing"></div> */}

      <canvas ref={canvasRef} id="particles-canvas"></canvas>

      <div className={`mobile-overlay ${isMenuOpen ? 'active' : ''}`} onClick={toggleMenu}></div>

      {/* NAVBAR */}
      <nav className={`navbar ${isScrolled ? 'scrolled' : ''}`}>
        <a href="#inicio" className="nav-brand" onClick={(e) => scrollToSection(e, '#inicio')}>
          <img src="/favicon_io/android-chrome-192x192.png" alt="Tzomp" className="nav-logo" />
          <span className="nav-title">TZOMP LAB</span>
        </a>

        <ul className={`nav-links ${isMenuOpen ? 'open' : ''}`}>
          <li><a href="#inicio" onClick={(e) => scrollToSection(e, '#inicio')}>Inicio</a></li>
          <li><a href="#features" onClick={(e) => scrollToSection(e, '#features')}>Características</a></li>
          <li><a href="#ia" onClick={(e) => scrollToSection(e, '#ia')}>IA Engine</a></li>
          <li><a href="#modulos" onClick={(e) => scrollToSection(e, '#modulos')}>Módulos</a></li>
          <li><a href="#tech" onClick={(e) => scrollToSection(e, '#tech')}>Tecnología</a></li>
          <li><Link to="/app" className="nav-cta"><i className="fas fa-rocket"></i> Acceder</Link></li>
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

        <div className="hero-content">
          <div className="hero-text">
            <div className="hero-badge">
              <i className="fas fa-circle"></i>
              Sistema activo — v3.0
            </div>
            <h1>
              <span className="line">Help Desk</span>
              <span className="line gradient-text typing-text-target">Inteligencia Artificial</span>
              <span className="line gradient-text-2">Future Ready</span>
            </h1>
            <p className="hero-description">
              Plataforma de soporte técnico de nueva generación impulsada por
              inteligencia artificial. Automatiza, resuelve y aprende de cada
              interacción para ofrecer soluciones instantáneas.
            </p>
            <div className="hero-buttons">
              <Link to="/app" className="btn btn-primary">
                <i className="fas fa-play"></i> Iniciar Sistema
              </Link>
              <a href="#features" className="btn btn-outline" onClick={(e) => scrollToSection(e, '#features')}>
                <i className="fas fa-info-circle"></i> Explorar
              </a>
            </div>
          </div>

          <div className="hero-visual">
            <div className="hero-3d-container">
              <div className="floating-icon"><i className="fas fa-robot"></i></div>
              <div className="floating-icon"><i className="fas fa-brain"></i></div>
              <div className="floating-icon"><i className="fas fa-shield-halved"></i></div>
              <div className="floating-icon"><i className="fas fa-chart-line"></i></div>
              <div className="floating-icon"><i className="fas fa-database"></i></div>
              <div className="floating-icon"><i className="fas fa-cloud"></i></div>

              <div className="hologram-ring ring-1"></div>
              <div className="hologram-ring ring-2"></div>
              <div className="hologram-ring ring-3"></div>

              <img src="/favicon_io/android-chrome-512x512.png" alt="Tzomp System" className="hero-center-icon" />
            </div>
          </div>
        </div>
      </section>

      {/* STATS BAR */}
      <div className="stats-bar" ref={statsBarRef}>
        <div className="stats-grid stagger-children">
          <div className="stat-item">
            <div className="stat-number" data-count="99.9">0</div>
            <div className="stat-label">% Uptime</div>
          </div>
          <div className="stat-item">
            <div className="stat-number" data-count="500">0</div>
            <div className="stat-label">Tickets Resueltos</div>
          </div>
          <div className="stat-item">
            <div className="stat-number" data-count="50">0</div>
            <div className="stat-label">Módulos IA</div>
          </div>
          <div className="stat-item">
            <div className="stat-number" data-count="24">0</div>
            <div className="stat-label">/7 Disponibilidad</div>
          </div>
        </div>
      </div>

      {/* FEATURES SECTION */}
      <section className="features" id="features">
        <div className="section-header reveal">
          <div className="section-tag"><i className="fas fa-star"></i> Características</div>
          <h2>Funcionalidades <span className="gradient-text">Avanzadas</span></h2>
          <p>Descubre las herramientas que hacen de nuestro Help Desk la solución más completa del mercado</p>
        </div>

        <div className="features-grid stagger-children">
          <div className="feature-card">
            <div className="feature-icon-wrap fi-1"><i className="fas fa-robot"></i></div>
            <h3>Chatbot IA Avanzado</h3>
            <p>Asistente virtual con procesamiento de lenguaje natural que resuelve consultas de forma autónoma e inteligente.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon-wrap fi-2"><i className="fas fa-ticket"></i></div>
            <h3>Gestión de Tickets</h3>
            <p>Sistema completo de ticketing con priorización automática, asignación inteligente y seguimiento en tiempo real.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon-wrap fi-3"><i className="fas fa-chart-line"></i></div>
            <h3>Analytics Dashboard</h3>
            <p>Visualización de datos con gráficas interactivas, métricas de rendimiento y reportes automatizados.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon-wrap fi-4"><i className="fas fa-shield-halved"></i></div>
            <h3>Seguridad Zero Trust</h3>
            <p>Protección multicapa con autenticación biométrica, encriptación end-to-end y auditorías continuas.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon-wrap fi-5"><i className="fas fa-rotate"></i></div>
            <h3>Automatización Total</h3>
            <p>Workflows automatizados que reducen el tiempo de resolución hasta en un 80% con flujos inteligentes.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon-wrap fi-6"><i className="fas fa-globe"></i></div>
            <h3>Multi-plataforma</h3>
            <p>Acceso desde cualquier dispositivo con diseño responsivo y experiencia nativa en web, móvil y desktop.</p>
          </div>
        </div>
      </section>

      {/* AI SHOWCASE */}
      <section className="ai-showcase" id="ia">
        <div className="showcase-content">
          <div className="showcase-visual reveal-left">
            <div className="ai-brain">
              <svg className="brain-connections" viewBox="0 0 300 300">
                <line x1="150" y1="30" x2="45" y2="90" />
                <line x1="150" y1="30" x2="255" y2="90" />
                <line x1="45" y1="90" x2="24" y2="165" />
                <line x1="255" y1="90" x2="276" y2="165" />
                <line x1="45" y1="90" x2="135" y2="135" />
                <line x1="255" y1="90" x2="135" y2="135" />
                <line x1="24" y1="165" x2="75" y2="225" />
                <line x1="276" y1="165" x2="225" y2="225" />
                <line x1="135" y1="135" x2="75" y2="225" />
                <line x1="135" y1="135" x2="225" y2="225" />
                <line x1="75" y1="225" x2="225" y2="225" />
                <line x1="150" y1="30" x2="135" y2="135" />
              </svg>
              {[...Array(8)].map((_, i) => <div key={i} className="brain-node"></div>)}
            </div>
          </div>

          <div className="showcase-info reveal-right">
            <div className="section-tag"><i className="fas fa-microchip"></i> Motor IA</div>
            <h2>Inteligencia Artificial de <span className="gradient-text">Nueva Generación</span></h2>
            <p>Nuestro motor de IA utiliza modelos de aprendizaje profundo entrenados específicamente para soporte técnico, capaces de entender contexto, emociones y resolver problemas complejos.</p>
            <ul className="ai-features-list">
              <li><i className="fas fa-check-circle"></i><span>Procesamiento de Lenguaje Natural (NLP)</span></li>
              <li><i className="fas fa-check-circle"></i><span>Clasificación automática de incidencias</span></li>
              <li><i className="fas fa-check-circle"></i><span>Predicción de problemas recurrentes</span></li>
              <li><i className="fas fa-check-circle"></i><span>Base de conocimiento auto-evolutiva</span></li>
              <li><i className="fas fa-check-circle"></i><span>Análisis de sentimiento en tiempo real</span></li>
            </ul>
          </div>
        </div>
      </section>

      {/* TERMINAL SECTION */}
      <section className="terminal-section" ref={terminalRef}>
        <div className="section-header reveal">
          <div className="section-tag"><i className="fas fa-terminal"></i> Live Demo</div>
          <h2>Sistema en <span className="gradient-text-2">Acción</span></h2>
          <p>Observa cómo nuestro sistema procesa solicitudes en tiempo real</p>
        </div>
        <div className="terminal reveal">
          <div className="terminal-header">
            <div className="terminal-dot red"></div>
            <div className="terminal-dot yellow"></div>
            <div className="terminal-dot green"></div>
            <span className="terminal-title">tzomp-helpdesk@system ~ $</span>
          </div>
          <div className="terminal-body" ref={terminalBodyRef}></div>
        </div>
      </section>

      {/* MODULES SECTION */}
      <section className="services" id="modulos">
        <div className="section-header reveal">
          <div className="section-tag"><i className="fas fa-cubes"></i> Módulos</div>
          <h2>Módulos del <span className="gradient-text">Sistema</span></h2>
          <p>Cada módulo está diseñado para optimizar un área específica de tu operación de soporte</p>
        </div>
        <div className="services-grid stagger-children">
          <div className="service-card">
            <div className="service-number">01</div>
            <div className="service-info">
              <h3>Panel de Control Central</h3>
              <p>Dashboard unificado con vista 360° de todas las operaciones, métricas clave y alertas inteligentes.</p>
              <div className="service-tags"><span>Dashboard</span><span>Analytics</span><span>Real-time</span></div>
            </div>
          </div>
          <div className="service-card">
            <div className="service-number">02</div>
            <div className="service-info">
              <h3>Motor de Resolución IA</h3>
              <p>Algoritmos de machine learning que aprenden de cada interacción para ofrecer soluciones más precisas.</p>
              <div className="service-tags"><span>ML</span><span>Deep Learning</span><span>NLP</span></div>
            </div>
          </div>
          <div className="service-card">
            <div className="service-number">03</div>
            <div className="service-info">
              <h3>Gestión de Usuarios</h3>
              <p>Control completo de roles, permisos y perfiles con autenticación multifactor y SSO empresarial.</p>
              <div className="service-tags"><span>Auth</span><span>Roles</span><span>MFA</span></div>
            </div>
          </div>
          <div className="service-card">
            <div className="service-number">04</div>
            <div className="service-info">
              <h3>Centro de Reportes</h3>
              <p>Generación automática de reportes con exportación a múltiples formatos y envío programado.</p>
              <div className="service-tags"><span>PDF</span><span>Excel</span><span>Automático</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* TECH STACK */}
      <section className="tech-stack" id="tech">
        <div className="section-header reveal">
          <div className="section-tag"><i className="fas fa-code"></i> Stack Tecnológico</div>
          <h2>Tecnologías que <span className="gradient-text-2">Impulsan</span> el Sistema</h2>
          <p>Construido con las tecnologías más modernas y robustas del ecosistema</p>
        </div>
        <div className="tech-orbit reveal">
          <div className="orbit-ring orbit-ring-1"></div>
          <div className="orbit-ring orbit-ring-2"></div>
          <div className="orbit-ring orbit-ring-3"></div>
          <img src="/favicon_io/android-chrome-192x192.png" alt="Center" className="tech-center" />
          <div className="tech-planet orbit-c tp-1"><i className="fab fa-html5"></i></div>
          <div className="tech-planet orbit-c tp-2"><i className="fab fa-css3-alt"></i></div>
          <div className="tech-planet orbit-b tp-3"><i className="fab fa-js"></i></div>
          <div className="tech-planet orbit-a tp-4"><i className="fab fa-react"></i></div>
          <div className="tech-planet orbit-c tp-5"><i className="fab fa-node-js"></i></div>
          <div className="tech-planet orbit-b tp-6"><i className="fas fa-database"></i></div>
          <div className="tech-planet orbit-a tp-7"><i className="fab fa-git-alt"></i></div>
          <div className="tech-planet orbit-c tp-8"><i className="fab fa-github"></i></div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="cta-section">
        <div className="cta-glow"></div>
        <div className="cta-content reveal">
          <div className="section-tag"><i className="fas fa-rocket"></i> Comenzar Ahora</div>
          <h2>¿Listo para <span className="gradient-text">Transformar</span> tu Soporte?</h2>
          <p>Únete a la revolución del soporte técnico inteligente. Accede ahora al Help Desk más avanzado impulsado por IA.</p>
          <div className="cta-buttons">
            <Link to="/app" className="btn btn-primary"><i className="fas fa-arrow-right"></i> Acceder al Sistema</Link>
            <a href="https://github.com/sistemasc2tzomp-lab/Help-Desk" className="btn btn-outline" target="_blank" rel="noopener noreferrer">
              <i className="fab fa-github"></i> Ver en GitHub
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-grid">
          <div className="footer-brand">
            <img src="/favicon_io/android-chrome-192x192.png" alt="Tzomp" className="nav-logo" />
            <p>Help Desk Tzomp Lab — La plataforma de soporte técnico de nueva generación impulsada por inteligencia artificial.</p>
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
              <li><a href="#">API Reference</a></li>
              <li><a href="#">Guía de Inicio</a></li>
              <li><a href="#">Changelog</a></li>
            </ul>
          </div>
          <div className="footer-col">
            <h4>Soporte</h4>
            <ul>
              <li><a href="#">Centro de Ayuda</a></li>
              <li><a href="#">Contacto</a></li>
              <li><a href="#">Estado del Sistema</a></li>
              <li><a href="#">Reportar Bug</a></li>
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
