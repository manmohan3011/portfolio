(() => {
  'use strict';

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ============================================
     NAVBAR: scroll state, mobile menu, active link
  ============================================ */
  const navbar = document.getElementById('navbar');
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('nav-links');
  const navLinkEls = document.querySelectorAll('.nav-link');

  const onScrollNav = () => {
    navbar.classList.toggle('scrolled', window.scrollY > 40);
  };
  onScrollNav();
  window.addEventListener('scroll', onScrollNav, { passive: true });

  hamburger.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    hamburger.classList.toggle('open', isOpen);
    hamburger.setAttribute('aria-expanded', String(isOpen));
  });

  navLinkEls.forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
      hamburger.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
    });
  });

  const sections = document.querySelectorAll('main section[id]');
  const navObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute('id');
        navLinkEls.forEach(link => {
          link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
        });
      }
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach(sec => navObserver.observe(sec));

  /* ============================================
     SCROLL REVEAL
  ============================================ */
  const revealEls = document.querySelectorAll('.reveal');
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in-view');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  revealEls.forEach((el, i) => {
    el.style.transitionDelay = prefersReduced ? '0ms' : `${(i % 3) * 90}ms`;
    revealObserver.observe(el);
  });

  /* stagger + glow for traceroute hops specifically (reuses .reveal but also needs .in-view for marker style) */
  document.querySelectorAll('.trace-hop').forEach(hop => {
    revealObserver.observe(hop);
  });

  /* ============================================
     TYPING EFFECT — hero eyebrow + rotating role
  ============================================ */
  const typedWhoami = document.getElementById('typed-whoami');
  const typedRole = document.getElementById('typed-role');
  const whoamiText = 'root@manmohanselvam:~$ whoami';
  const roles = ['scalable web apps.', 'clean, efficient code.', 'full-stack products.', 'secure networks, too.'];

  function typeOnce(el, text, speed = 45) {
    return new Promise(resolve => {
      if (prefersReduced) { el.textContent = text; resolve(); return; }
      let i = 0;
      const tick = () => {
        el.textContent = text.slice(0, i);
        i++;
        if (i <= text.length) {
          setTimeout(tick, speed);
        } else {
          resolve();
        }
      };
      tick();
    });
  }

  async function runRoleLoop() {
    if (prefersReduced) { typedRole.textContent = roles[0]; return; }
    let idx = 0;
    while (true) {
      const word = roles[idx % roles.length];
      // type
      for (let i = 1; i <= word.length; i++) {
        typedRole.textContent = word.slice(0, i);
        await sleep(48);
      }
      await sleep(1600);
      // delete
      for (let i = word.length; i >= 0; i--) {
        typedRole.textContent = word.slice(0, i);
        await sleep(26);
      }
      await sleep(300);
      idx++;
    }
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  typeOnce(typedWhoami, whoamiText).then(() => {
    runRoleLoop();
  });

  /* ============================================
     COUNTER ANIMATION — stats & achievements
  ============================================ */
  const counters = document.querySelectorAll('[data-count]');
  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        counterObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });
  counters.forEach(c => counterObserver.observe(c));

  function animateCounter(el) {
    const target = parseFloat(el.getAttribute('data-count'));
    const isDecimal = el.getAttribute('data-decimal') === 'true';
    const prefix = el.getAttribute('data-prefix') || '';
    const suffix = el.getAttribute('data-suffix') || '';
    const duration = prefersReduced ? 0 : 1400;
    const startTime = performance.now();

    if (duration === 0) {
      el.textContent = prefix + (isDecimal ? target.toFixed(1) : Math.round(target).toLocaleString()) + suffix;
      return;
    }

    function frame(now) {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = target * eased;
      el.textContent = prefix + (isDecimal ? value.toFixed(1) : Math.round(value).toLocaleString()) + suffix;
      if (progress < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  /* ============================================
     HERO CANVAS — animated network with traveling packets
  ============================================ */
  const canvas = document.getElementById('hero-canvas');
  const ctx = canvas.getContext('2d');
  let hero = canvas.parentElement;
  let width, height, nodes, packets, animId;
  const LINK_DIST = 170;
  const mouse = { x: 0, y: 0, active: false };

  if (!prefersReduced) {
    hero.addEventListener('mousemove', (e) => {
      const rect = hero.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.active = true;
    });
    hero.addEventListener('mouseleave', () => { mouse.active = false; });
    hero.addEventListener('click', (e) => {
      if (!mouse.active || !nodes || !nodes.length) return;
      const rect = hero.getBoundingClientRect();
      const cx = e.clientX - rect.left, cy = e.clientY - rect.top;
      nodes
        .map(n => ({ n, d: Math.hypot(n.x - cx, n.y - cy) }))
        .sort((a, b) => a.d - b.d)
        .slice(0, 3)
        .forEach(({ n }) => packets.push({ a: { x: cx, y: cy }, b: n, t: 0, speed: 0.014 }));
    });
  }

  function resizeCanvas() {
    width = canvas.width = hero.clientWidth;
    height = canvas.height = hero.clientHeight;
  }

  function initNodes() {
    const count = Math.max(18, Math.floor((width * height) / 42000));
    nodes = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      r: Math.random() * 1.4 + 1.2
    }));
    packets = [];
  }

  function maybeSpawnPacket(edges) {
    if (prefersReduced) return;
    if (packets.length < 5 && Math.random() < 0.02 && edges.length) {
      const edge = edges[Math.floor(Math.random() * edges.length)];
      packets.push({ a: edge.a, b: edge.b, t: 0, speed: 0.006 + Math.random() * 0.006 });
    }
  }

  function drawFrame() {
    ctx.clearRect(0, 0, width, height);

    // move nodes
    nodes.forEach(n => {
      n.x += n.vx;
      n.y += n.vy;
      if (n.x < 0 || n.x > width) n.vx *= -1;
      if (n.y < 0 || n.y > height) n.vy *= -1;
    });

    // gently push nodes away from the cursor
    if (mouse.active && !prefersReduced) {
      const radius = 110;
      nodes.forEach(n => {
        const dx = n.x - mouse.x, dy = n.y - mouse.y;
        const dist = Math.hypot(dx, dy);
        if (dist < radius && dist > 0.01) {
          const force = ((radius - dist) / radius) * 0.7;
          n.x += (dx / dist) * force;
          n.y += (dy / dist) * force;
        }
      });
    }

    // draw edges within distance threshold
    const edges = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < LINK_DIST) {
          const opacity = (1 - dist / LINK_DIST) * 0.35;
          ctx.strokeStyle = `rgba(59,130,246,${opacity})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
          edges.push({ a, b });
        }
      }
    }

    // draw nodes
    nodes.forEach(n => {
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(148,178,255,0.55)';
      ctx.fill();
    });

    // cursor joins the network: link lines to nearby nodes + a small marker
    if (mouse.active && !prefersReduced) {
      nodes.forEach(n => {
        const dx = n.x - mouse.x, dy = n.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < LINK_DIST) {
          const opacity = (1 - dist / LINK_DIST) * 0.55;
          ctx.strokeStyle = `rgba(34,211,238,${opacity})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(mouse.x, mouse.y);
          ctx.lineTo(n.x, n.y);
          ctx.stroke();
        }
      });
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(34,211,238,0.85)';
      ctx.fill();
    }

    // packets traveling along edges
    maybeSpawnPacket(edges);
    packets.forEach(p => { p.t += p.speed; });
    packets = packets.filter(p => p.t < 1);
    packets.forEach(p => {
      const x = p.a.x + (p.b.x - p.a.x) * p.t;
      const y = p.a.y + (p.b.y - p.a.y) * p.t;
      const glow = ctx.createRadialGradient(x, y, 0, x, y, 6);
      glow.addColorStop(0, 'rgba(34,211,238,0.9)');
      glow.addColorStop(1, 'rgba(34,211,238,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fillStyle = '#22d3ee';
      ctx.fill();
    });

    animId = requestAnimationFrame(drawFrame);
  }

  function startCanvas() {
    resizeCanvas();
    initNodes();
    if (animId) cancelAnimationFrame(animId);
    if (prefersReduced) {
      // draw a single static frame, no loop
      drawFrame();
      cancelAnimationFrame(animId);
    } else {
      drawFrame();
    }
  }

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(startCanvas, 200);
  });

  startCanvas();

  /* ============================================
     CONTACT FORM — mailto handoff
  ============================================ */
  const contactForm = document.getElementById('contact-form');
  const formNote = document.getElementById('form-note');

  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const message = document.getElementById('message').value.trim();

    const subject = encodeURIComponent(`Portfolio contact from ${name}`);
    const body = encodeURIComponent(`${message}\n\n— ${name} (${email})`);
    window.location.href = `mailto:manmohan.s2022ece@sece.ac.in?subject=${subject}&body=${body}`;

    formNote.textContent = 'Opening your email client…';
    setTimeout(() => { formNote.textContent = ''; }, 4000);
  });

  /* ============================================
     BACK TO TOP
  ============================================ */
  const backToTop = document.getElementById('back-to-top');
  window.addEventListener('scroll', () => {
    backToTop.style.opacity = window.scrollY > 500 ? '1' : '0';
    backToTop.style.pointerEvents = window.scrollY > 500 ? 'auto' : 'none';
  }, { passive: true });
  backToTop.style.opacity = '0';
  backToTop.style.transition = 'opacity .3s ease';
  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: prefersReduced ? 'auto' : 'smooth' });
  });

  /* ============================================
     FOOTER YEAR
  ============================================ */
  document.getElementById('year').textContent = new Date().getFullYear();

  /* ============================================
     CUSTOM CURSOR — contextual label on hover
     (desktop pointers only, respects reduced motion)
  ============================================ */
  const hasFinePointer = window.matchMedia('(pointer: fine)').matches;

  if (hasFinePointer && !prefersReduced) {
    const dot = document.createElement('div');
    dot.className = 'cursor-dot';
    const ring = document.createElement('div');
    ring.className = 'cursor-ring';
    const label = document.createElement('span');
    label.className = 'cursor-label';
    ring.appendChild(label);
    document.body.append(dot, ring);
    document.body.classList.add('has-custom-cursor');

    let mx = window.innerWidth / 2, my = window.innerHeight / 2;
    let rx = mx, ry = my;

    window.addEventListener('mousemove', (e) => {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`;
    });

    (function ringLoop() {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
      requestAnimationFrame(ringLoop);
    })();

    document.addEventListener('mouseleave', () => { dot.style.opacity = '0'; ring.style.opacity = '0'; });
    document.addEventListener('mouseenter', () => { dot.style.opacity = '1'; ring.style.opacity = '1'; });

    const hoverTargets = document.querySelectorAll('a, button, .skill-chip, input, textarea');
    hoverTargets.forEach(el => {
      el.addEventListener('mouseenter', () => {
        const text = el.getAttribute('data-cursor');
        dot.classList.add('hidden-dot');
        if (text) {
          label.textContent = text;
          ring.classList.add('labeled');
        } else {
          ring.classList.add('hovering');
        }
      });
      el.addEventListener('mouseleave', () => {
        dot.classList.remove('hidden-dot');
        ring.classList.remove('labeled', 'hovering');
        label.textContent = '';
      });
    });
  }

  /* ============================================
     MAGNETIC BUTTONS — pull toward the cursor
  ============================================ */
  if (hasFinePointer && !prefersReduced) {
    document.querySelectorAll('.btn, .nav-cta, #back-to-top').forEach(btn => {
      btn.addEventListener('mousemove', (e) => {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        btn.style.transition = 'transform .1s ease-out';
        btn.style.transform = `translate(${x * 0.3}px, ${y * 0.3}px)`;
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.transition = 'transform .5s cubic-bezier(.22,.61,.36,1)';
        btn.style.transform = 'translate(0px, 0px)';
      });
    });
  }

  /* ============================================
     CARD TILT + SPOTLIGHT — follows the cursor
  ============================================ */
  if (hasFinePointer && !prefersReduced) {
    document.querySelectorAll('.exp-card, .project-card, .cert-card, .achieve-card').forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width;
        const py = (e.clientY - rect.top) / rect.height;
        const tiltX = (py - 0.5) * -7;
        const tiltY = (px - 0.5) * 7;
        card.style.transform = `translateY(-6px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
        card.style.setProperty('--mx', `${px * 100}%`);
        card.style.setProperty('--my', `${py * 100}%`);
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
    });
  }

})();
