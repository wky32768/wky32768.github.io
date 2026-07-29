/* Live numbers (Bilibili + Google Scholar).
 *
 * assets/stats.json is refreshed weekly by .github/workflows/update-stats.yml,
 * so nothing here ever needs a manual edit. Markup opts in declaratively:
 *
 *   <span data-stat="scholar.citations">—</span>      value, formatted
 *   <span data-stat-date="scholar.updated_at"></span> "29 Jul 2026"
 *   <li data-stat-requires="scholar">…</li>           removed if that source
 *                                                     is missing from the file
 *   <span data-stat-hide-zero="scholar.i10_index">    removed while the value
 *                                                     is still 0
 *
 * If the fetch fails, whatever the HTML already contains simply stays put.
 */
(function () {
    'use strict';

    var STATS_URL = 'assets/stats.json';

    function resolve(root, path) {
        return path.split('.').reduce(function (obj, key) {
            return (obj === null || obj === undefined) ? undefined : obj[key];
        }, root);
    }

    function formatNumber(value) {
        return Number(value).toLocaleString('en-US');
    }

    function formatDate(value) {
        var d = new Date(value);
        if (isNaN(d.getTime())) return '';
        return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Count up to the final value; the element ends on the exact number either way.
    function animate(el, target) {
        if (reduceMotion || target < 10 || !('requestAnimationFrame' in window)) {
            el.textContent = formatNumber(target);
            return;
        }
        var duration = 900;
        var start = null;
        function step(now) {
            if (start === null) start = now;
            var t = Math.min((now - start) / duration, 1);
            var eased = 1 - Math.pow(1 - t, 3);
            el.textContent = formatNumber(Math.round(target * eased));
            if (t < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
    }

    function render(stats) {
        document.querySelectorAll('[data-stat-requires]').forEach(function (el) {
            var required = el.getAttribute('data-stat-requires').split(/\s+/);
            var missing = required.some(function (key) {
                return resolve(stats, key) === undefined;
            });
            if (missing) el.remove();
        });

        document.querySelectorAll('[data-stat-hide-zero]').forEach(function (el) {
            if (Number(resolve(stats, el.getAttribute('data-stat-hide-zero'))) === 0) el.remove();
        });

        document.querySelectorAll('[data-stat]').forEach(function (el) {
            var value = resolve(stats, el.getAttribute('data-stat'));
            if (value === undefined || value === null) return;
            if (typeof value === 'number') {
                animate(el, value);
            } else {
                el.textContent = value;
            }
            el.classList.add('stat-live');
        });

        document.querySelectorAll('[data-stat-date]').forEach(function (el) {
            var value = resolve(stats, el.getAttribute('data-stat-date'));
            var text = value ? formatDate(value) : '';
            if (text) {
                el.textContent = text;
            } else {
                var holder = el.closest('[data-stat-date-wrapper]') || el;
                holder.remove();
            }
        });
    }

    function load() {
        if (!('fetch' in window)) return;
        fetch(STATS_URL, { cache: 'no-cache' })
            .then(function (response) {
                if (!response.ok) throw new Error('HTTP ' + response.status);
                return response.json();
            })
            .then(render)
            .catch(function (error) {
                // Keep the static fallback numbers already in the markup.
                console.warn('Live stats unavailable, showing last known values:', error);
            });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', load);
    } else {
        load();
    }
})();
