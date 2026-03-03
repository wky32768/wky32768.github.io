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
        }
        // 默认高亮 About（index.html）
        else if (currentPage === '' && href === 'index.html') {
            link.classList.add('active');
        }
    });
}

// 移动端菜单切换
function setupMobileMenu() {
    const navToggle = document.getElementById('navToggle');
    const navSection = document.getElementById('navSection');
    const nav = document.querySelector('nav');

    if (navToggle && navSection && nav) {
        navToggle.addEventListener('click', function() {
            navToggle.classList.toggle('active');
            navSection.classList.toggle('active');
        });

        // 点击链接后关闭菜单
        const navLinks = navSection.querySelectorAll('a');
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                navToggle.classList.remove('active');
                navSection.classList.remove('active');
            });
        });

        // 点击页面其他区域关闭菜单
        document.addEventListener('click', function(event) {
            if (!nav.contains(event.target)) {
                navToggle.classList.remove('active');
                navSection.classList.remove('active');
            }
        });
    }
}

// 页面加载完成后加载组件
document.addEventListener('DOMContentLoaded', function() {
    // 并行加载所有组件
    Promise.all([
        loadComponent('components/header.html', 'header-container'),
        loadComponent('components/nav.html', 'nav-container'),
        loadComponent('components/footer.html', 'footer-container')
    ]).then(() => {
        // 所有组件加载完成后高亮当前页面
        highlightCurrentPage();
        // 设置移动端菜单
        setupMobileMenu();
    });
});