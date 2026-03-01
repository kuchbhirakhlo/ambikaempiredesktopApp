// Navbar.js - Responsive left navigation component
document.addEventListener("DOMContentLoaded", function () {
  const navbarContainer = document.getElementById("navbar-container");

  if (navbarContainer) {
    // Get user info from session storage
    const userString = sessionStorage.getItem("user");
    const user = userString ? JSON.parse(userString) : null;
    const isAdmin = user && user.role === "admin";

    // Determine if we're in a subpage by checking the URL
    const isSubpage = window.location.pathname.includes('/reports/');
    const basePath = isSubpage ? '../../pages/' : '';
    const logoPath = isSubpage ? '../../public/logo.png' : '../public/logo.png';

    // Get user initials for avatar
    const getUserInitials = () => {
      if (!user || !user.username) return "U";
      const parts = user.username.split(/[ _.-]/);
      if (parts.length > 1) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return user.username.substring(0, 2).toUpperCase();
    };

    // Create navbar HTML structure
    navbarContainer.innerHTML = `
      <div class="navbar-backdrop"></div>
      <div class="navbar">
        <div class="navbar-header">
          <div class="logo-container">
            <img src="${logoPath}" alt="logo" class="logo">
          </div>
          <button id="navbar-toggle" class="navbar-toggle">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
        </div>
        <nav class="navbar-menu">
          <ul>
            <li data-page="dashboard">
              <a href="${basePath}dashboard.html">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                <span style="font-size: 16px;">Dashboard</span>
              </a>
            </li>
            <li data-page="vendor">
              <a href="${basePath}vendor.html">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                <span style="font-size: 16px;">Suppliers</span>
              </a>
            </li>
            <li data-page="customer">
              <a href="${basePath}customer.html">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                <span style="font-size: 16px;">Customers</span>
              </a>
            </li>
            <li data-page="agent">
              <a href="${basePath}agent.html">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                <span style="font-size: 16px;">Agents</span>
              </a>
            </li>
            <li data-page="product">
              <a href="${basePath}product.html">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
                <span style="font-size: 16px;">Products</span>
              </a>
            </li>
            <li data-page="inventory">
              <a href="${basePath}inventory.html">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>
                <span style="font-size: 16px;">Inventory</span>
              </a>
            </li>
            <li data-page="sales">
              <a href="${basePath}sales.html">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                <span style="font-size: 16px;">Sales</span>
              </a>
            </li>
            <li data-page="reports">
              <a href="${basePath}reports.html">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
                <span style="font-size: 16px;">Reports</span>
              </a>
            </li>
            ${
              isAdmin
                ? `
            <li data-page="users">
              <a href="${basePath}users.html">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                <span style="font-size: 16px;">User Management</span>
              </a>
            </li>
            <li data-page="settings">
              <a href="${basePath}settings.html">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                <span style="font-size: 16px;">Settings</span>
              </a>
            </li>
            `
                : ""
            }
          </ul>
        </nav>
        <div class="navbar-footer">
          <div class="user-info">
            <div class="user-avatar">
              ${getUserInitials()}
            </div>
            <div class="user-details">
              <span id="sidebar-user-name" class="user-name" style="font-size: 16px;">${
                user ? user.username : ""
              }</span>
              <span id="sidebar-user-role" class="user-role" style="font-size: 14px;">${
                user ? user.role : ""
              }</span>
            </div>
          </div>
          <button id="sidebar-logout-btn" class="logout-btn">Logout</button>
        </div>
      </div>
    `;

    // Handle navbar toggle for mobile devices
    const navbarToggle = document.getElementById("navbar-toggle");
    const navbar = document.querySelector(".navbar");
    const backdrop = document.querySelector(".navbar-backdrop");

    if (navbarToggle) {
      navbarToggle.addEventListener("click", function () {
        const isMobile = window.innerWidth <= 992;
        
        if (isMobile) {
          navbar.classList.toggle("navbar-mobile-open");
          document.body.classList.toggle("navbar-mobile-open");
        } else {
          navbar.classList.toggle("navbar-collapsed");
        }
      });
    }

    // Close mobile menu when clicking outside
    if (backdrop) {
      backdrop.addEventListener("click", function() {
        navbar.classList.remove("navbar-mobile-open");
        document.body.classList.remove("navbar-mobile-open");
      });
    }

    // Close mobile menu when clicking on a menu item (on mobile)
    const menuLinks = document.querySelectorAll('.navbar-menu a');
    menuLinks.forEach(link => {
      link.addEventListener('click', function() {
        if (window.innerWidth <= 992) {
          navbar.classList.remove("navbar-mobile-open");
          document.body.classList.remove("navbar-mobile-open");
        }
      });
    });

    // Set active page in navbar
    const currentPage = window.location.pathname.split("/").pop().split(".")[0];
    const activeMenuItem = document.querySelector(
      `[data-page="${currentPage}"]`
    );

    if (activeMenuItem) {
      activeMenuItem.classList.add("active");
    }

    // Add logout functionality to sidebar logout button
    const sidebarLogoutBtn = document.getElementById("sidebar-logout-btn");

    if (sidebarLogoutBtn) {
      sidebarLogoutBtn.addEventListener("click", () => {
        sessionStorage.removeItem("user");
        window.location.href = isSubpage ? "../../pages/login.html" : "login.html";
      });
    }
    
    // Handle window resize
    window.addEventListener('resize', function() {
      if (window.innerWidth > 992) {
        document.body.classList.remove("navbar-mobile-open");
        if (navbar.classList.contains("navbar-mobile-open")) {
          navbar.classList.remove("navbar-mobile-open");
        }
      }
    });
  }
});
