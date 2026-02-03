// ============================================
// DeviceDetector - Detect mobile vs desktop
// ============================================

export function isMobile() {
    // Check for touch capability and screen size
    const hasTouchScreen = (
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        navigator.msMaxTouchPoints > 0
    );
    
    // Check user agent for mobile keywords
    const mobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
    );
    
    // Check screen width
    const smallScreen = window.innerWidth <= 1024;
    
    return (hasTouchScreen && mobileUA) || (hasTouchScreen && smallScreen);
}

export function isTablet() {
    const ua = navigator.userAgent;
    return /iPad|Android(?!.*Mobile)/i.test(ua);
}

export function getDeviceType() {
    if (isMobile()) {
        return isTablet() ? 'tablet' : 'mobile';
    }
    return 'desktop';
}
