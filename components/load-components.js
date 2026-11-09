// 动态加载HTML组件
async function loadComponent(componentPath, containerId) {
    try {
        const response = await fetch(componentPath, { cache: 'no-cache' });
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

// Use the editorial date, rather than a file timestamp changed by deployment.
function setLastModifiedDate() {
    const target = document.getElementById('lastModifiedDate');
    if (!target) return;
    const value = typeof pageLastModified !== 'undefined' ? pageLastModified : '';
    if (value) target.textContent = value;
    else target.closest('.last-modified')?.remove();
}

// 移动端菜单切换
function setupMobileMenu() {
    const toggle = document.getElementById('navToggle');
    const menu = document.getElementById('navSection');
    const nav = document.querySelector('nav');
    if (!toggle || !menu || !nav) return;
    const mobile = window.matchMedia('(max-width: 1024px)');
    toggle.setAttribute('aria-label', 'Toggle navigation menu');
    function sync() {
        const hidden = mobile.matches && !menu.classList.contains('active');
        menu.setAttribute('aria-hidden', String(hidden));
        menu.inert = hidden;
    }
    function close() {
        toggle.classList.remove('active');
        menu.classList.remove('active');
        toggle.setAttribute('aria-expanded', 'false');
        sync();
    }
    toggle.addEventListener('click', () => {
        const expanded = menu.classList.toggle('active');
        toggle.classList.toggle('active', expanded);
        toggle.setAttribute('aria-expanded', String(expanded));
        sync();
    });
    menu.querySelectorAll('a').forEach(link => link.addEventListener('click', close));
    document.addEventListener('click', event => { if (!nav.contains(event.target)) close(); });
    document.addEventListener('keydown', event => {
        if (event.key !== 'Escape') return;
        if (mobile.matches && menu.classList.contains('active')) {
            close();
            toggle.focus();
        }
    });
    mobile.addEventListener('change', close);
    close();
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
        setupBackToTop();
        initAnimations();
    });
});

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

// Full-size publication figures, with native Escape and focus restoration.
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.citation-toggle').forEach(button => {
        const panel = document.getElementById(button.getAttribute('aria-controls'));
        if (!panel) return;
        button.addEventListener('click', () => {
            panel.hidden = !panel.hidden;
            button.setAttribute('aria-expanded', String(!panel.hidden));
        });
    });
    document.querySelectorAll('.citation-copy').forEach(button => {
        button.addEventListener('click', async () => {
            const panel = button.closest('.citation-panel');
            const text = panel.querySelector('code').textContent;
            const feedback = panel.querySelector('.citation-feedback');
            let copied = false;
            try {
                await navigator.clipboard.writeText(text);
                copied = true;
            } catch (error) {
                const field = document.createElement('textarea');
                field.value = text;
                field.style.cssText = 'position:fixed;left:-9999px;top:0';
                document.body.append(field);
                field.select();
                try { copied = document.execCommand('copy'); } catch (copyError) {}
                field.remove();
                button.focus();
            }
            feedback.textContent = copied ? 'Citation copied to clipboard.' : 'Copy was unavailable. Select the citation text and copy it manually.';
        });
    });
});

document.addEventListener('DOMContentLoaded', () => {
    const dialog = document.getElementById('figure-dialog');
    if (!dialog) return;
    const image = document.getElementById('figure-dialog-image');
    const title = document.getElementById('figure-dialog-title');
    let figureOpener = null;
    document.querySelectorAll('.figure-trigger').forEach(button => {
        const original = button.querySelector('img');
        const heading = button.closest('.publication-card').querySelector('.publication-title').textContent.trim();
        button.setAttribute('aria-label', 'View figure: ' + heading);
        button.addEventListener('click', () => {
            figureOpener = button;
            image.src = original.src;
            image.alt = original.alt;
            title.textContent = heading;
            dialog.showModal();
        });
    });
    dialog.querySelector('.figure-close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => figureOpener?.focus());
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
});
