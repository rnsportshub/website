document.addEventListener("DOMContentLoaded", () => {

  // ── Navbar Scroll Effect ──────────────────────────────────────────────
  const navbar = document.getElementById("navbar");
  window.addEventListener("scroll", () => {
    if (window.scrollY > 50) {
      navbar.classList.add("scrolled");
    } else {
      navbar.classList.remove("scrolled");
    }
  }, { passive: true });

  // ── Mobile Menu ───────────────────────────────────────────────────────
  const menuToggle = document.getElementById("menu-toggle");
  const mobileMenu = document.getElementById("mobile-menu");
  const menuClose = document.getElementById("menu-close");

  if (menuToggle && mobileMenu) {
    menuToggle.addEventListener("click", () => {
      mobileMenu.classList.add("open");
      document.body.style.overflow = "hidden";
    });
  }
  if (menuClose && mobileMenu) {
    menuClose.addEventListener("click", () => {
      mobileMenu.classList.remove("open");
      document.body.style.overflow = "";
    });
  }

  // Close mobile menu on link click
  document.querySelectorAll(".mobile-nav-link").forEach(link => {
    link.addEventListener("click", () => {
      if (mobileMenu) mobileMenu.classList.remove("open");
      document.body.style.overflow = "";
    });
  });

  // ── Search Toggle ─────────────────────────────────────────────────────
  const searchToggle = document.getElementById("search-toggle");
  const searchBar = document.getElementById("search-bar");

  if (searchToggle && searchBar) {
    searchToggle.addEventListener("click", () => {
      searchBar.classList.toggle("open");
      if (searchBar.classList.contains("open")) {
        searchBar.querySelector("input")?.focus();
      }
    });

    document.addEventListener("click", (e) => {
      if (!searchBar.contains(e.target) && !searchToggle.contains(e.target)) {
        searchBar.classList.remove("open");
      }
    });
  }

  // ── Scroll Animations ─────────────────────────────────────────────────
  const revealElements = document.querySelectorAll(".reveal");
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("revealed");
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: "0px 0px -60px 0px" });

  revealElements.forEach(el => revealObserver.observe(el));

  // ── Stagger Children ──────────────────────────────────────────────────
  document.querySelectorAll(".stagger-children").forEach(parent => {
    const children = parent.children;
    Array.from(children).forEach((child, i) => {
      child.style.transitionDelay = `${i * 0.1}s`;
    });
  });

  // ── Ticker Tape Animation ─────────────────────────────────────────────
  const ticker = document.getElementById("ticker-content");
  if (ticker) {
    const clone = ticker.cloneNode(true);
    ticker.parentElement.appendChild(clone);
  }

  // ── Hero Counter Animation ────────────────────────────────────────────
  const counters = document.querySelectorAll(".count-up");
  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        counterObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(el => counterObserver.observe(el));

  function animateCounter(el) {
    const target = parseInt(el.getAttribute("data-target"));
    const suffix = el.getAttribute("data-suffix") || "";
    const duration = 1500;
    const step = target / (duration / 16);
    let current = 0;

    const timer = setInterval(() => {
      current += step;
      if (current >= target) {
        current = target;
        clearInterval(timer);
      }
      el.textContent = Math.floor(current).toLocaleString("en-IN") + suffix;
    }, 16);
  }

  // ── Smooth scroll for anchor links ───────────────────────────────────
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener("click", function(e) {
      const href = this.getAttribute("href");
      if (href === "#") return;
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) target.scrollIntoView({ behavior: "smooth" });
    });
  });

  // ── Category filter hover effect ──────────────────────────────────────
  document.querySelectorAll(".category-card").forEach(card => {
    card.addEventListener("mouseenter", function() {
      this.querySelector(".category-overlay")?.classList.add("hovered");
    });
    card.addEventListener("mouseleave", function() {
      this.querySelector(".category-overlay")?.classList.remove("hovered");
    });
  });

  // ── WhatsApp Float button pulse ───────────────────────────────────────
  const waBtn = document.getElementById("whatsapp-float");
  if (waBtn) {
    setTimeout(() => waBtn.classList.add("visible"), 2000);
  }

  // ── Review slider auto-scroll ─────────────────────────────────────────
  const reviewTrack = document.getElementById("review-track");
  if (reviewTrack) {
    let scrollAmount = 0;
    const scrollStep = 1;
    let paused = false;

    reviewTrack.addEventListener("mouseenter", () => paused = true);
    reviewTrack.addEventListener("mouseleave", () => paused = false);

    function autoScroll() {
      if (!paused) {
        scrollAmount += scrollStep;
        if (scrollAmount >= reviewTrack.scrollWidth / 2) {
          scrollAmount = 0;
        }
        reviewTrack.scrollLeft = scrollAmount;
      }
      requestAnimationFrame(autoScroll);
    }
    requestAnimationFrame(autoScroll);
  }

  // ── Render products ───────────────────────────────────────────────────
  if (typeof renderFeaturedProducts === "function") {
    renderFeaturedProducts();
  }

  // ── Active nav link ───────────────────────────────────────────────────
  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-link").forEach(link => {
    const href = link.getAttribute("href");
    if (href === currentPage || (currentPage === "" && href === "index.html")) {
      link.classList.add("active");
    }
  });

});
