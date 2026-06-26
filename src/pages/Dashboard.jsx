import React, { useState, useEffect, useRef } from 'react';
import dashboardPages from '../data/dashboardPages.json';

function Dashboard({ user, onLogout }) {
  const [tab, setTab] = useState('dashboard');
  const [openDropdowns, setOpenDropdowns] = useState({});
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSidebarMobileOpen, setIsSidebarMobileOpen] = useState(false);
  const containerRef = useRef(null);

  // Load and unload WhatsRay global stylesheets & scripts
  useEffect(() => {
    // Append WhatsRay CSS links
    const stylesheets = [
      "https://wpp.raybeamdigital.com/assets/global/css/bootstrap.min.css",
      "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css",
      "https://maxst.icons8.com/vue-static/landings/line-awesome/line-awesome/1.3.0/css/line-awesome.min.css",
      "https://wpp.raybeamdigital.com/assets/templates/basic/css/custom-animation.css?v=1",
      "https://wpp.raybeamdigital.com/assets/templates/basic/css/main.css?t=1782465659",
      "https://wpp.raybeamdigital.com/assets/templates/basic/css/custom-fixes.css?v=1782465659",
      "https://wpp.raybeamdigital.com/assets/templates/basic/css/color.php?color=00832e",
      "https://wpp.raybeamdigital.com/assets/templates/basic/css/apple-style.css?v=1782465659",
      "https://wpp.raybeamdigital.com/assets/templates/basic/css/custom.css?v=1782465659",
      "https://wpp.raybeamdigital.com/assets/global/css/iziToast.min.css",
      "https://wpp.raybeamdigital.com/assets/global/css/iziToast_custom.css"
    ];

    const linkElements = stylesheets.map(href => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.dataset.dashboardAsset = "true";
      document.head.appendChild(link);
      return link;
    });

    // Inject @font-face overrides pointing to CORS-enabled CDNs to bypass main.css relative CORS blocks
    const styleEl = document.createElement('style');
    styleEl.dataset.dashboardAsset = "true";
    styleEl.innerHTML = `
      @font-face {
        font-family: "Line Awesome Free";
        src: url("https://cdnjs.cloudflare.com/ajax/libs/line-awesome/1.3.0/line-awesome/fonts/la-solid-900.woff2") format("woff2");
        font-weight: 900;
        font-style: normal;
      }
      @font-face {
        font-family: "Line Awesome Brands";
        src: url("https://cdnjs.cloudflare.com/ajax/libs/line-awesome/1.3.0/line-awesome/fonts/la-brands-400.woff2") format("woff2");
        font-weight: normal;
        font-style: normal;
      }
      @font-face {
        font-family: "Line Awesome Free";
        src: url("https://cdnjs.cloudflare.com/ajax/libs/line-awesome/1.3.0/line-awesome/fonts/la-regular-400.woff2") format("woff2");
        font-weight: 400;
        font-style: normal;
      }
      @font-face {
        font-family: "Font Awesome 5 Free";
        src: url("https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/webfonts/fa-solid-900.woff2") format("woff2");
        font-weight: 900;
        font-style: normal;
      }
      @font-face {
        font-family: "Font Awesome 5 Free";
        src: url("https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/webfonts/fa-regular-400.woff2") format("woff2");
        font-weight: 400;
        font-style: normal;
      }
      @font-face {
        font-family: "Font Awesome 5 Brands";
        src: url("https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/webfonts/fa-brands-400.woff2") format("woff2");
        font-weight: normal;
        font-style: normal;
      }
      @font-face {
        font-family: "Font Awesome 6 Free";
        src: url("https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/webfonts/fa-solid-900.woff2") format("woff2");
        font-weight: 900;
        font-style: normal;
      }
    `;
    document.head.appendChild(styleEl);

    // Append script elements sequentially
    const scripts = [
      "https://wpp.raybeamdigital.com/assets/global/js/jquery-3.7.1.min.js",
      "https://wpp.raybeamdigital.com/assets/global/js/bootstrap.bundle.min.js",
      "https://wpp.raybeamdigital.com/assets/templates/basic/js/main.js?v=1782465659",
      "https://wpp.raybeamdigital.com/assets/global/js/iziToast.min.js"
    ];

    let mounted = true;
    const loadScripts = async () => {
      for (const src of scripts) {
        if (!mounted) break;
        await new Promise((resolve) => {
          const script = document.createElement('script');
          script.src = src;
          script.dataset.dashboardAsset = "true";
          script.onload = () => resolve();
          script.onerror = () => resolve();
          document.body.appendChild(script);
        });
      }
    };
    loadScripts();

    // Body classes to match dashboard styles
    document.body.classList.add('dashboard-body-active');

    return () => {
      mounted = false;
      document.body.classList.remove('dashboard-body-active');
      // Cleanup loaded stylesheets and scripts
      document.querySelectorAll('[data-dashboard-asset="true"]').forEach(el => el.remove());
    };
  }, []);

  // Intercept anchor clicks inside the dashboard body for routing
  useEffect(() => {
    const handleGlobalClick = (e) => {
      const anchor = e.target.closest('a');
      if (anchor && anchor.href) {
        const href = anchor.href;

        // Custom router mapping for URLs inside HTML contents
        if (href.includes('/user/dashboard')) { e.preventDefault(); setTab('dashboard'); }
        else if (href.includes('/user/inbox')) { e.preventDefault(); setTab('inbox'); }
        else if (href.includes('/user/campaign/index')) { e.preventDefault(); setTab('campaign_index'); }
        else if (href.includes('/user/campaign/create')) { e.preventDefault(); setTab('campaign_create'); }
        else if (href.includes('/user/customer/list')) { e.preventDefault(); setTab('customer_list'); }
        else if (href.includes('/user/customer/create')) { e.preventDefault(); setTab('customer_create'); }
        else if (href.includes('/user/agent/list')) { e.preventDefault(); setTab('agent_list'); }
        else if (href.includes('/user/agent/create')) { e.preventDefault(); setTab('agent_create'); }
        else if (href.includes('/user/saved-reply/index')) { e.preventDefault(); setTab('saved_reply_index'); }
        else if (href.includes('/user/saved-reply/create')) { e.preventDefault(); setTab('saved_reply_create'); }
        else if (href.includes('/user/whatsapp-account')) { e.preventDefault(); setTab('whatsapp_account'); }
        else if (href.includes('/user/subscription/index')) { e.preventDefault(); setTab('subscription_index'); }
        else if (href.includes('/user/profile-setting')) { e.preventDefault(); setTab('profile_setting'); }
        else if (href.includes('/user/development-credential')) { e.preventDefault(); setTab('development_credential'); }
        else if (href.includes('/user/ip-white-list/index')) { e.preventDefault(); setTab('ip_white_list'); }
        else if (href.includes('/user/twofactor')) { e.preventDefault(); setTab('twofactor'); }
        else if (href.includes('/user/change-password')) { e.preventDefault(); setTab('change_password'); }
        else if (href.includes('/user/logout')) {
          e.preventDefault();
          onLogout();
        } else if (href.includes('#') && (anchor.classList.contains('sidebar-menu-list__link') || anchor.closest('.has-dropdown'))) {
          // Keep dropdown logic functioning
        } else if (href.startsWith('http') && !href.includes('localhost')) {
          e.preventDefault();
          if (window.notify) {
            window.notify('info', 'This feature is running in demo mode.');
          } else {
            alert('This feature is running in demo mode.');
          }
        }
      }
    };

    const handleFormSubmit = (e) => {
      const form = e.target.closest('form');
      if (form) {
        e.preventDefault();
        // Redirect to list pages on submits where applicable for better UX flow
        if (tab === 'campaign_create') {
          setTab('campaign_index');
        } else if (tab === 'customer_create') {
          setTab('customer_list');
        } else if (tab === 'agent_create') {
          setTab('agent_list');
        } else if (tab === 'saved_reply_create') {
          setTab('saved_reply_index');
        }

        if (window.notify) {
          window.notify('success', 'Operation completed successfully (Demo Mode).');
        } else {
          alert('Operation completed successfully (Demo Mode).');
        }
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('click', handleGlobalClick);
      container.addEventListener('submit', handleFormSubmit);
    }
    return () => {
      if (container) {
        container.removeEventListener('click', handleGlobalClick);
        container.removeEventListener('submit', handleFormSubmit);
      }
    };
  }, [tab, onLogout]);

  const toggleDropdown = (key) => {
    setOpenDropdowns(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const getInitials = (name) => {
    if (!name) return 'CI';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const currentPage = dashboardPages[tab] || { title: 'Dashboard', body: '<h3>Page not found</h3>' };

  const userName = user?.name || "Cheak Imesh";
  const userEmail = user?.email || "i***@gmail.com";
  const userInitials = getInitials(userName);

  return (
    <div ref={containerRef} className="dashboard position-relative text-start">
      <div className="dashboard__inner flex-wrap">
        
        {/* Sidebar Menu */}
        <div className={`sidebar-menu sidebar-collapsed flex-between ${isSidebarMobileOpen ? 'sidebar-open' : ''}`}>
          <div className="sidebar-menu__inner">
            <span className="sidebar-menu__close d-lg-none d-block" onClick={() => setIsSidebarMobileOpen(false)}>
              <i className="fas fa-times"></i>
            </span>
            <div className="sidebar-logo">
              <a href="#" className="sidebar-logo__link" onClick={(e) => { e.preventDefault(); setTab('dashboard'); }}>
                <img src="https://wpp.raybeamdigital.com/assets/images/logo_icon/logo.png" alt="logo" />
              </a>
            </div>
            
            <ul className="sidebar-menu-list">
              <li className={`sidebar-menu-list__item ${tab === 'dashboard' ? 'active' : ''}`}>
                <a href="#" className="sidebar-menu-list__link" onClick={(e) => { e.preventDefault(); setTab('dashboard'); }}>
                  <span className="icon"><i className="las la-th-large"></i></span>
                  <span className="text">My Dashboard</span>
                </a>
              </li>
              
              <li className="sidebar-menu-list__title">
                <span className="text">CRM TOOLS</span>
              </li>
              <li className={`sidebar-menu-list__item ${tab === 'inbox' ? 'active' : ''}`}>
                <a href="#" className="sidebar-menu-list__link" onClick={(e) => { e.preventDefault(); setTab('inbox'); }}>
                  <span className="icon"><i className="las la-sms"></i></span>
                  <span className="text">Manage Inbox</span>
                </a>
              </li>
              <li className={`sidebar-menu-list__item ${tab === 'customer_list' || tab === 'customer_create' ? 'active' : ''}`}>
                <a href="#" className="sidebar-menu-list__link" onClick={(e) => { e.preventDefault(); setTab('customer_list'); }}>
                  <span className="icon"><i className="las la-users"></i></span>
                  <span className="text">Manage Customer</span>
                </a>
              </li>
              <li className={`sidebar-menu-list__item ${tab === 'agent_list' || tab === 'agent_create' ? 'active' : ''}`}>
                <a href="#" className="sidebar-menu-list__link" onClick={(e) => { e.preventDefault(); setTab('agent_list'); }}>
                  <span className="icon"><i className="las la-user-cog"></i></span>
                  <span className="text">Manage Agent</span>
                </a>
              </li>
              
              <li className="sidebar-menu-list__title">
                <span className="text">MARKETING TOOLS</span>
              </li>
              <li className={`sidebar-menu-list__item has-dropdown ${openDropdowns['contacts'] ? 'open' : ''}`}>
                <a href="#" className="sidebar-menu-list__link" onClick={(e) => { e.preventDefault(); toggleDropdown('contacts'); }}>
                  <span className="icon"><i className="las la-id-card"></i></span>
                  <span className="text">Manage Contacts</span>
                </a>
                <div className="sidebar-submenu" style={{ display: openDropdowns['contacts'] ? 'block' : 'none' }}>
                  <ul className="sidebar-submenu-list">
                    <li className="sidebar-submenu-list__item">
                      <a href="#" className="sidebar-submenu-list__link" onClick={(e) => { e.preventDefault(); alert('Manage Contacts is in Demo Mode.'); }}>
                        <span className="text">Contacts</span>
                      </a>
                    </li>
                    <li className="sidebar-submenu-list__item">
                      <a href="#" className="sidebar-submenu-list__link" onClick={(e) => { e.preventDefault(); alert('Manage Contact Tag is in Demo Mode.'); }}>
                        <span className="text">Contact Tag</span>
                      </a>
                    </li>
                    <li className="sidebar-submenu-list__item">
                      <a href="#" className="sidebar-submenu-list__link" onClick={(e) => { e.preventDefault(); alert('Manage Contact List is in Demo Mode.'); }}>
                        <span className="text">Contact List</span>
                      </a>
                    </li>
                  </ul>
                </div>
              </li>
              
              <li className={`sidebar-menu-list__item ${tab === 'saved_reply_index' || tab === 'saved_reply_create' ? 'active' : ''}`}>
                <a href="#" className="sidebar-menu-list__link" onClick={(e) => { e.preventDefault(); setTab('saved_reply_index'); }}>
                  <span className="icon"><i className="las la-bolt"></i></span>
                  <span className="text">Saved Replies</span>
                </a>
              </li>

              <li className={`sidebar-menu-list__item has-dropdown ${openDropdowns['templates'] ? 'open' : ''}`}>
                <a href="#" className="sidebar-menu-list__link" onClick={(e) => { e.preventDefault(); toggleDropdown('templates'); }}>
                  <span className="icon"><i className="las la-envelope"></i></span>
                  <span className="text">Manage Templates</span>
                </a>
                <div className="sidebar-submenu" style={{ display: openDropdowns['templates'] ? 'block' : 'none' }}>
                  <ul className="sidebar-submenu-list">
                    <li className="sidebar-submenu-list__item">
                      <a href="#" className="sidebar-submenu-list__link" onClick={(e) => { e.preventDefault(); alert('New Template creation is in Demo Mode.'); }}>
                        <span className="text">New Template</span>
                      </a>
                    </li>
                    <li className="sidebar-submenu-list__item">
                      <a href="#" className="sidebar-submenu-list__link" onClick={(e) => { e.preventDefault(); alert('Carousel Template creation is in Demo Mode.'); }}>
                        <span className="text">Carousel Template</span>
                      </a>
                    </li>
                    <li className="sidebar-submenu-list__item">
                      <a href="#" className="sidebar-submenu-list__link" onClick={(e) => { e.preventDefault(); alert('All Template view is in Demo Mode.'); }}>
                        <span className="text">All Template</span>
                      </a>
                    </li>
                  </ul>
                </div>
              </li>

              <li className={`sidebar-menu-list__item has-dropdown ${openDropdowns['campaigns'] || tab.startsWith('campaign_') ? 'open' : ''}`}>
                <a href="#" className="sidebar-menu-list__link" onClick={(e) => { e.preventDefault(); toggleDropdown('campaigns'); }}>
                  <span className="icon"><i className="las la-bullhorn"></i></span>
                  <span className="text">Manage Campaigns</span>
                </a>
                <div className="sidebar-submenu" style={{ display: (openDropdowns['campaigns'] || tab.startsWith('campaign_')) ? 'block' : 'none' }}>
                  <ul className="sidebar-submenu-list">
                    <li className={`sidebar-submenu-list__item ${tab === 'campaign_create' ? 'active' : ''}`}>
                      <a href="#" className="sidebar-submenu-list__link" onClick={(e) => { e.preventDefault(); setTab('campaign_create'); }}>
                        <span className="text">New Campaign</span>
                      </a>
                    </li>
                    <li className={`sidebar-submenu-list__item ${tab === 'campaign_index' ? 'active' : ''}`}>
                      <a href="#" className="sidebar-submenu-list__link" onClick={(e) => { e.preventDefault(); setTab('campaign_index'); }}>
                        <span className="text">All Campaign</span>
                      </a>
                    </li>
                  </ul>
                </div>
              </li>

              <li className="sidebar-menu-list__title">
                <span className="text">BILLING &amp; PROFILE</span>
              </li>
              <li className={`sidebar-menu-list__item ${tab === 'whatsapp_account' ? 'active' : ''}`}>
                <a href="#" className="sidebar-menu-list__link" onClick={(e) => { e.preventDefault(); setTab('whatsapp_account'); }}>
                  <span className="icon"><i className="las la-phone"></i></span>
                  <span className="text">Whatsapp Accounts</span>
                </a>
              </li>
              <li className={`sidebar-menu-list__item ${tab === 'subscription_index' ? 'active' : ''}`}>
                <a href="#" className="sidebar-menu-list__link" onClick={(e) => { e.preventDefault(); setTab('subscription_index'); }}>
                  <span className="icon"><i className="las la-dollar-sign"></i></span>
                  <span className="text">Subscription Info</span>
                </a>
              </li>
              <li className={`sidebar-menu-list__item ${tab === 'profile_setting' ? 'active' : ''}`}>
                <a href="#" className="sidebar-menu-list__link" onClick={(e) => { e.preventDefault(); setTab('profile_setting'); }}>
                  <span className="icon"><i className="las la-user"></i></span>
                  <span className="text">Manage Profile</span>
                </a>
              </li>
              
              <li className="sidebar-menu-list__item mt-4">
                <a href="#" className="sidebar-menu-list__link text--danger" onClick={(e) => { e.preventDefault(); onLogout(); }}>
                  <span className="icon text--danger"><i className="fa-solid fa-arrow-right-from-bracket"></i></span>
                  <span className="text text--danger">Sign Out</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Right Dashboard Body Content Area */}
        <div className="dashboard__right">
          <div className="container-fluid p-0">
            
            {/* Header/Navbar */}
            <div className="dashboard-header dashboard-nav">
              <div className="dashboard-header__inner flex-between">
                <div className="dashboard-header__left">
                  <div className="dashboard-body__bar d-lg-none d-block" onClick={() => setIsSidebarMobileOpen(true)}>
                    <span className="dashboard-body__bar-icon"><i className="fas fa-bars"></i></span>
                  </div>
                  <h3 className="title">{currentPage.title.replace('WhatsRay - ', '')}</h3>
                </div>
                
                <div className="dashboard-header__right">
                  <div className="user-info">
                    <div className="user-info__right" onClick={() => setIsProfileOpen(!isProfileOpen)}>
                      <div className="user-info__button" tabIndex="-1">
                        <div className="user-info__thumb">
                          <span>{userInitials}</span>
                        </div>
                        <div className="user-info__profile">
                          <p className="user-info__name">{userName}</p>
                          <span className="user-info__desc">
                            {userEmail} <span className="icon"><i className="fa-solid fa-caret-down"></i></span>
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* User profile dropdown list */}
                    <ul className="user-info-dropdown" style={{ display: isProfileOpen ? 'block' : 'none' }}>
                      <li className="user-info-dropdown__item">
                        <a className="user-info-dropdown__link" href="#" onClick={(e) => { e.preventDefault(); setTab('profile_setting'); setIsProfileOpen(false); }}>
                          <span className="icon"><i className="far fa-user"></i></span>
                          <span className="text">View Profile</span>
                        </a>
                      </li>
                      <li className="user-info-dropdown__item">
                        <a className="user-info-dropdown__link" href="#" onClick={(e) => { e.preventDefault(); setTab('subscription_index'); setIsProfileOpen(false); }}>
                          <span className="icon"><i className="fa-solid fa-dollar-sign"></i></span>
                          <span className="text">Subscription Info</span>
                        </a>
                      </li>
                      <li className="user-info-dropdown__item">
                        <a className="user-info-dropdown__link" href="#" onClick={(e) => { e.preventDefault(); setTab('whatsapp_account'); setIsProfileOpen(false); }}>
                          <span className="icon"><i className="fa-brands fa-whatsapp"></i></span>
                          <span className="text">WhatsApp Account</span>
                        </a>
                      </li>
                      <li className="user-info-dropdown__item">
                        <a className="user-info-dropdown__link" href="#" onClick={(e) => { e.preventDefault(); setTab('development_credential'); setIsProfileOpen(false); }}>
                          <span className="icon"><i className="fab fa-codepen"></i></span>
                          <span className="text">Developer Tool</span>
                        </a>
                      </li>
                      <li className="user-info-dropdown__item">
                        <a className="user-info-dropdown__link" href="#" onClick={(e) => { e.preventDefault(); setTab('ip_white_list'); setIsProfileOpen(false); }}>
                          <span className="icon"><i className="fas fa-mobile"></i></span>
                          <span className="text">IP White List</span>
                        </a>
                      </li>
                      <li className="user-info-dropdown__item">
                        <a className="user-info-dropdown__link" href="#" onClick={(e) => { e.preventDefault(); setTab('twofactor'); setIsProfileOpen(false); }}>
                          <span className="icon"><i className="fa-solid fa-shield-halved"></i></span>
                          <span className="text">2FA Setting</span>
                        </a>
                      </li>
                      <li className="user-info-dropdown__item">
                        <a className="user-info-dropdown__link" href="#" onClick={(e) => { e.preventDefault(); setTab('change_password'); setIsProfileOpen(false); }}>
                          <span className="icon"><i className="fas fa-key"></i></span>
                          <span className="text">Change Password</span>
                        </a>
                      </li>
                      <li className="user-info-dropdown__item">
                        <a className="user-info-dropdown__link text--danger" href="#" onClick={(e) => { e.preventDefault(); onLogout(); setIsProfileOpen(false); }}>
                          <span className="icon text--danger"><i className="fa-solid fa-arrow-right-from-bracket"></i></span>
                          <span className="text text--danger">Sign Out</span>
                        </a>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="dashboard-header__shape">
                <img src="https://wpp.raybeamdigital.com/assets/templates/basic/images/ds-1.png" alt="" />
              </div>
            </div>
            
            {/* Dynamic Scraped Page Content injection */}
            <div className="dashboard-body" dangerouslySetInnerHTML={{ __html: currentPage.body }} />
            
          </div>
        </div>
        
      </div>
    </div>
  );
}

export default Dashboard;
