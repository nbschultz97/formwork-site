(function () {
    'use strict';

    // Scroll-triggered reveals (.rv fade-up, .rv-stamp stamp-in)
    var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.rv, .rv-stamp').forEach(function (el) {
        observer.observe(el);
    });

    // Mobile nav toggle
    var topbar = document.querySelector('.topbar');
    var toggle = document.getElementById('nav-toggle');
    if (topbar && toggle) {
        toggle.addEventListener('click', function () {
            var open = topbar.classList.toggle('nav-open');
            toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        });
        document.querySelectorAll('.nav-mobile a').forEach(function (link) {
            link.addEventListener('click', function () {
                topbar.classList.remove('nav-open');
                toggle.setAttribute('aria-expanded', 'false');
            });
        });
    }
})();
