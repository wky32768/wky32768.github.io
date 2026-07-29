// 动态加载HTML组件
async function loadComponent(componentPath, containerId) {
    try {
        const response = await fetch(componentPath);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const html = await response.text();
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = html;
        }
        return html;
    } catch (error) {
        console.error(`Error loading component ${componentPath}:`, error);
        // 如果是本地文件协议错误，提供一个友好的提示
        if (error.message.includes('Failed to fetch') || window.location.protocol === 'file:') {
            console.warn('Components cannot be loaded via file:// protocol. Please use a local server or view on GitHub Pages.');
        }
        return null;
    }
}

// 高亮当前页面的导航链接
function highlightCurrentPage() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = document.querySelectorAll('nav a');

    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        // 检查是否匹配当前页面
        if (href === currentPage) {
            link.classList.add('active');
            link.setAttribute('aria-current', 'page');
        }
        // 默认高亮 About（index.html）
        else if (currentPage === '' && href === 'index.html') {
            link.classList.add('active');
            link.setAttribute('aria-current', 'page');
        }
    });
}

// 深色模式切换
function setupThemeToggle() {
    const toggle = document.getElementById('themeToggle');
    if (!toggle) return;

    const icon = toggle.querySelector('i');

    function render(theme) {
        const isDark = theme === 'dark';
        if (icon) {
            icon.classList.toggle('fa-sun', isDark);
            icon.classList.toggle('fa-moon', !isDark);
        }
        toggle.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    }

    // 初始状态由 <head> 内联脚本设置，这里只同步图标
    const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    render(current);

    toggle.addEventListener('click', function () {
        const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        if (next === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
        try { localStorage.setItem('theme', next); } catch (e) {}
        render(next);
    });
}

// 设置页脚版权年份
function setFooterYear() {
    const yearSpan = document.getElementById('footerYear');
    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }
}

// 设置页面最后修改日期（优先使用文件真实修改时间，自动更新）
function setLastModifiedDate() {
    let text = (typeof pageLastModified !== 'undefined') ? pageLastModified : '';

    // document.lastModified 反映 HTML 文件的最后修改时间（本地服务器 / GitHub Pages 均可用）
    try {
        const d = new Date(document.lastModified);
        if (!isNaN(d.getTime()) && d.getFullYear() > 1970) {
            text = d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        }
    } catch (e) {}

    const lastModifiedSpan = document.getElementById('lastModifiedDate');
    if (lastModifiedSpan) {
        lastModifiedSpan.textContent = text;
        return;
    }
    // 兼容旧的 .last-modified 结构
    const lastModifiedElement = document.querySelector('.last-modified');
    if (lastModifiedElement && text) {
        lastModifiedElement.textContent = 'Last Modified: ' + text;
    }
}

// 访客计数（不蒜子）。页脚是 innerHTML 注入的，其中的 <script> 不会执行，
// 所以在这里手动加载，并且只有拿到数字后才把整行显示出来。
function setupVisitorCounter() {
    const counter = document.getElementById('siteCounter');
    if (!counter) return;

    const script = document.createElement('script');
    script.src = 'https://busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js';
    script.async = true;
    document.head.appendChild(script);

    const pv = document.getElementById('busuanzi_container_site_pv');
    const uv = document.getElementById('busuanzi_container_site_uv');
    const filled = (container) => {
        const value = container && container.querySelector('span');
        return !!(value && value.textContent.trim());
    };

    const deadline = Date.now() + 8000;
    (function poll() {
        if (filled(pv) || filled(uv)) {
            // 只显示真正拿到数字的那部分
            if (!filled(pv)) { pv.remove(); document.querySelector('.counter-sep')?.remove(); }
            if (!filled(uv)) { uv.remove(); document.querySelector('.counter-sep')?.remove(); }
            counter.hidden = false;
            return;
        }
        if (Date.now() < deadline) setTimeout(poll, 300);
    })();
}

// 移动端菜单切换
function setupMobileMenu() {
    const navToggle = document.getElementById('navToggle');
    const navSection = document.getElementById('navSection');
    const nav = document.querySelector('nav');

    if (navToggle && navSection && nav) {
        // 设置 aria 属性
        const isExpanded = navToggle.getAttribute('aria-expanded') === 'true';
        navToggle.setAttribute('aria-label', 'Toggle navigation menu');
        navToggle.setAttribute('aria-expanded', 'false');
        navSection.setAttribute('aria-hidden', 'true');

        navToggle.addEventListener('click', function() {
            const expanded = navToggle.classList.toggle('active');
            navSection.classList.toggle('active');
            navToggle.setAttribute('aria-expanded', expanded);
            navSection.setAttribute('aria-hidden', !expanded);
        });

        // 点击链接后关闭菜单
        const navLinks = navSection.querySelectorAll('a');
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                navToggle.classList.remove('active');
                navSection.classList.remove('active');
                navToggle.setAttribute('aria-expanded', 'false');
                navSection.setAttribute('aria-hidden', 'true');
            });
        });

        // 点击页面其他区域关闭菜单
        document.addEventListener('click', function(event) {
            if (!nav.contains(event.target)) {
                navToggle.classList.remove('active');
                navSection.classList.remove('active');
                navToggle.setAttribute('aria-expanded', 'false');
                navSection.setAttribute('aria-hidden', 'true');
            }
        });

        // ESC 键关闭菜单
        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape' && navSection.classList.contains('active')) {
                navToggle.classList.remove('active');
                navSection.classList.remove('active');
                navToggle.setAttribute('aria-expanded', 'false');
                navSection.setAttribute('aria-hidden', 'true');
                navToggle.focus();
            }
        });
    }
}

// 返回顶部按钮
function setupBackToTop() {
    const backToTopButton = document.getElementById('backToTop');

    if (!backToTopButton) return;

    // 创建按钮（如果不存在）
    if (!document.body.contains(backToTopButton)) {
        const button = document.createElement('button');
        button.id = 'backToTop';
        button.className = 'back-to-top';
        button.setAttribute('aria-label', 'Scroll back to top');
        button.innerHTML = '<i class="fas fa-chevron-up"></i>';
        document.body.appendChild(button);
    }

    const btn = document.getElementById('backToTop');

    // 显示/隐藏按钮
    function toggleVisibility() {
        if (window.scrollY > 300) {
            btn.classList.add('visible');
        } else {
            btn.classList.remove('visible');
        }
    }

    // 滚动事件监听
    window.addEventListener('scroll', toggleVisibility, { passive: true });

    // 点击事件
    btn.addEventListener('click', function() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
        btn.focus();
    });

    // 初始状态
    toggleVisibility();
}

// 页面加载完成后加载组件
document.addEventListener('DOMContentLoaded', function() {
    // 并行加载所有组件
    Promise.all([
        loadComponent('components/header.html', 'header-container'),
        loadComponent('components/nav.html', 'nav-container'),
        loadComponent('components/footer.html', 'footer-container')
    ]).then(() => {
        // 所有组件加载完成后初始化功能
        highlightCurrentPage();
        setupMobileMenu();
        setupThemeToggle();
        setFooterYear();
        setLastModifiedDate();
        setupVisitorCounter();
        setupBackToTop();
        initAnimations();
        setupScrollReveal();
    });
});

// 滚动入场动画（用 JS 加 .reveal，关闭 JS 时内容照常可见）
function setupScrollReveal() {
    if (!('IntersectionObserver' in window)) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const targets = document.querySelectorAll(
        '.publication-card, .timeline-item, .award-card, .friend-card, .news-item, .internship-card, .skill-group'
    );
    if (!targets.length) return;

    const observer = new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                obs.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    targets.forEach(function (el, i) {
        el.classList.add('reveal');
        el.style.transitionDelay = (Math.min(i, 6) * 60) + 'ms';
        observer.observe(el);
    });
}

// 初始化动画
function initAnimations() {
    // 章节入场动画延迟
    const sections = document.querySelectorAll('section');
    sections.forEach((section, index) => {
        section.style.animationDelay = (index * 0.12) + 's';
    });

    // 标签动画
    const tags = document.querySelectorAll('.tag');
    tags.forEach((tag, index) => {
        tag.style.animationDelay = (index * 0.08 + 0.4) + 's';
    });

    // 社交链接动画
    const socialLinks = document.querySelectorAll('.social-link');
    socialLinks.forEach((link, index) => {
        link.style.animationDelay = (index * 0.08 + 0.5) + 's';
    });
}
