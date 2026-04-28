/**
 * DIPDoc Navigation Controller v2
 * Manages tab switching with smooth transitions. Supports forecast view.
 */
const Navigation = (() => {
  let tabs = [];
  let views = [];
  let currentTab = 'home';

  function init() {
    tabs = document.querySelectorAll('.nav-tab');
    views = document.querySelectorAll('.view');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.tab;
        if (target !== currentTab) switchTo(target);
      });
    });

    // Login Form logic
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        switchTo('home');
        Notifications.showToast('Signed in as Mr. Sharma', 'success');
      });
    }

    // Logout logic
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
      btnLogout.addEventListener('click', () => {
        switchTo('welcome');
        Notifications.showToast('Signed out successfully', 'info');
      });
    }

    // Hash-based routing
    const hash = window.location.hash.slice(1);
    if (hash && document.getElementById('view-' + hash)) {
      switchTo(hash);
    } else {
      switchTo('welcome');
    }

    window.addEventListener('hashchange', () => {
      const h = window.location.hash.slice(1);
      if (h && h !== currentTab) switchTo(h);
    });
  }

  function switchTo(tabName) {
    currentTab = tabName;

    // Update tabs
    tabs.forEach(t => {
      t.classList.toggle('active', t.dataset.tab === tabName);
    });

    // Update views
    views.forEach(v => {
      const isTarget = v.dataset.view === tabName;
      if (isTarget) {
        v.classList.add('active');
        v.style.animation = 'none';
        v.offsetHeight; // reflow
        v.style.animation = '';
      } else {
        v.classList.remove('active');
      }
    });

    // Bottom Nav Visibility
    const bottomNav = document.getElementById('bottom-nav');
    const topBar = document.getElementById('top-bar');
    if (bottomNav) {
      bottomNav.style.display = (tabName === 'welcome' || tabName === 'history') ? 'none' : 'flex';
    }
    if (topBar) {
      topBar.style.display = (tabName === 'welcome') ? 'none' : 'flex';
    }

    // Update hash
    history.replaceState(null, '', '#' + tabName);

    // Scroll to top
    const container = document.getElementById('views-container');
    if (container) container.scrollTop = 0;
    window.scrollTo(0, 0);
  }

  function getCurrent() { return currentTab; }

  return { init, switchTo, getCurrent };
})();
