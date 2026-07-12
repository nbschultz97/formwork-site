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
    // Interactive hours-back planning estimate
    var calculator = document.querySelector('[data-hours-calculator]');
    if (calculator) {
        var hoursInput = calculator.querySelector('[data-hours]');
        var rateInput = calculator.querySelector('[data-rate]');
        var recoveryInput = calculator.querySelector('[data-recovery]');
        var currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
        var integer = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

        function setTrack(input) {
            var minimum = Number(input.min);
            var maximum = Number(input.max);
            var fill = ((Number(input.value) - minimum) / (maximum - minimum)) * 100;
            var track = input.parentElement.querySelector('i');
            if (track) track.style.setProperty('--fill', fill.toFixed(1) + '%');
        }

        function updateEstimate() {
            var hours = Number(hoursInput.value);
            var rate = Number(rateInput.value);
            var recovery = Number(recoveryInput.value);
            var annualHours = hours * 52 * (recovery / 100);
            var annualValue = annualHours * rate;

            calculator.querySelector('[data-hours-output]').textContent = hours + ' hrs/wk';
            calculator.querySelector('[data-rate-output]').textContent = currency.format(rate) + '/hr';
            calculator.querySelector('[data-recovery-output]').textContent = recovery + '%';
            calculator.querySelector('[data-annual-hours]').textContent = integer.format(annualHours);
            calculator.querySelector('[data-annual-value]').textContent = currency.format(annualValue);
            [hoursInput, rateInput, recoveryInput].forEach(setTrack);
        }

        [hoursInput, rateInput, recoveryInput].forEach(function (input) {
            input.addEventListener('input', updateEstimate);
        });
        updateEstimate();
    }

    // Measured blueprint parallax on pointer devices
    var plan = document.querySelector('[data-plan-parallax]');
    if (plan && window.matchMedia('(hover: hover)').matches && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        plan.addEventListener('pointermove', function (event) {
            var rect = plan.getBoundingClientRect();
            var x = (event.clientX - rect.left) / rect.width - 0.5;
            var y = (event.clientY - rect.top) / rect.height - 0.5;
            plan.style.setProperty('--plan-rx', (-y * 2).toFixed(2) + 'deg');
            plan.style.setProperty('--plan-ry', (x * 2.5).toFixed(2) + 'deg');
        });
        plan.addEventListener('pointerleave', function () {
            plan.style.removeProperty('--plan-rx');
            plan.style.removeProperty('--plan-ry');
        });
    }

    // Persistent CTA appears after intent is established, then yields near the final CTA
    var rail = document.querySelector('[data-conversion-rail]');
    var contact = document.getElementById('contact');
    if (rail) {
        var dismissed = false;
        var updateRail = function () {
            if (dismissed) return;
            var show = window.scrollY > Math.min(700, window.innerHeight * 0.75);
            if (contact) {
                var contactTop = contact.getBoundingClientRect().top;
                if (contactTop < window.innerHeight * 0.85) show = false;
            }
            rail.classList.toggle('is-visible', show);
        };
        window.addEventListener('scroll', updateRail, { passive: true });
        var dismiss = rail.querySelector('[data-dismiss-rail]');
        if (dismiss) dismiss.addEventListener('click', function () {
            dismissed = true;
            rail.classList.remove('is-visible');
        });
        updateRail();
    }

})();
