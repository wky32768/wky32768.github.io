// 动态加载HTML组件
async function loadComponent(componentPath, containerId) {
    try {
        const response = await fetch(componentPath);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const html = await response.text();
        document.getElementById(containerId).innerHTML = html;
    } catch (error) {
        console.error(`Error loading component ${componentPath}:`, error);
    }
}

// 页面加载完成后加载组件
document.addEventListener('DOMContentLoaded', function() {
    // 加载header
    loadComponent('components/header.html', 'header-container');
    
    // 加载nav
    loadComponent('components/nav.html', 'nav-container');
    
    // 加载footer
    loadComponent('components/footer.html', 'footer-container');
});