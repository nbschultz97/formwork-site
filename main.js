// ============================================
// FORMWORK — Main JavaScript
// ============================================

(function () {
    'use strict';

    // ----------------------------------------
    // Scroll-triggered fade-in animations
    // ----------------------------------------
    var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -40px 0px'
    });

    document.querySelectorAll('.fade-up').forEach(function (el) {
        observer.observe(el);
    });

    // ----------------------------------------
    // Nav scroll shadow
    // ----------------------------------------
    var nav = document.querySelector('nav');
    var scrollThreshold = 10;

    function updateNav() {
        if (window.scrollY > scrollThreshold) {
            nav.classList.add('scrolled');
        } else {
            nav.classList.remove('scrolled');
        }
    }

    window.addEventListener('scroll', updateNav, { passive: true });
    updateNav();

    // ----------------------------------------
    // Mobile nav toggle
    // ----------------------------------------
    var toggle = document.getElementById('nav-toggle');
    var mobileNav = document.getElementById('nav-mobile');

    if (toggle && mobileNav) {
        toggle.addEventListener('click', function () {
            mobileNav.classList.toggle('open');
        });

        document.querySelectorAll('.nav-mobile a').forEach(function (link) {
            link.addEventListener('click', function () {
                mobileNav.classList.remove('open');
            });
        });
    }

    // ----------------------------------------
    // Animated stat counters
    // ----------------------------------------
    var statElements = document.querySelectorAll('[data-count]');
    var statObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                animateCounter(entry.target);
                statObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    statElements.forEach(function (el) {
        statObserver.observe(el);
    });

    function animateCounter(el) {
        var target = parseInt(el.getAttribute('data-count'), 10);
        var suffix = el.getAttribute('data-suffix') || '';
        var duration = 1200;
        var start = 0;
        var startTime = null;

        function step(timestamp) {
            if (!startTime) startTime = timestamp;
            var progress = Math.min((timestamp - startTime) / duration, 1);
            // Ease-out cubic
            var eased = 1 - Math.pow(1 - progress, 3);
            var current = Math.round(eased * target);
            el.textContent = current + suffix;
            if (progress < 1) {
                requestAnimationFrame(step);
            }
        }

        requestAnimationFrame(step);
    }

    // ----------------------------------------
    // Waitlist form — Formspree AJAX
    // ----------------------------------------
    var form = document.getElementById('waitlist-form');

    if (form) {
        form.addEventListener('submit', async function (e) {
            e.preventDefault();
            var email = document.getElementById('email-input').value;
            var msg = document.getElementById('form-msg');
            var btn = form.querySelector('button[type="submit"]');
            var originalHTML = btn.innerHTML;

            btn.disabled = true;
            btn.textContent = 'Joining...';
            msg.style.display = 'none';

            try {
                // TODO: Replace FORM_ID with your Formspree form ID
                // 1. Sign up at https://formspree.io
                // 2. Create a new form, set notification email to contact@tryformwork.com
                // 3. Copy your form ID and replace FORM_ID below
                var response = await fetch('https://formspree.io/f/FORM_ID', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    body: JSON.stringify({ email: email })
                });

                if (response.ok) {
                    msg.style.color = '#CC9933';
                    msg.textContent = "You\u2019re on the list. We\u2019ll be in touch soon.";
                    msg.style.display = 'block';
                    form.reset();
                    if (window.goatcounter && goatcounter.count) {
                        goatcounter.count({ path: 'waitlist-signup', title: 'Waitlist Signup', event: true });
                    }
                } else {
                    throw new Error('Submission failed');
                }
            } catch (err) {
                msg.style.color = '#C0392B';
                msg.textContent = 'Something went wrong. Email us at hello@tryformwork.com';
                msg.style.display = 'block';
            }

            btn.disabled = false;
            btn.innerHTML = originalHTML;
        });
    }
})();
