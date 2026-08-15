(function () {
    "use strict";

    // Tech Library — Safe Boot
    // يمنع شاشة التحميل من البقاء معلقة إذا حدث خطأ في JavaScript.

    function hideLoading() {
        const selectors = [
            "#load",
            "#loading-screen",
            "#loader",
            ".loading-screen",
            ".loader",
            ".loading-overlay",
            ".loading"
        ];

        selectors.forEach(function (selector) {
            document.querySelectorAll(selector).forEach(function (el) {
                el.style.opacity = "0";
                el.style.visibility = "hidden";
                el.style.pointerEvents = "none";
                setTimeout(function () {
                    el.style.display = "none";
                }, 450);
            });
        });

        document.documentElement.classList.add("tl-ready");
        if (document.body) document.body.classList.add("tl-ready");
    }

    function boot() { setTimeout(hideLoading, 250); }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot, { once: true });
    } else {
        boot();
    }

    window.addEventListener("load", function () {
        setTimeout(hideLoading, 250);
    }, { once: true });

    // حماية نهائية: لا تسمح للـLoading أن يظل عالقًا.
    setTimeout(hideLoading, 5000);

    window.addEventListener("error", function (event) {
        console.warn("[TL] JavaScript Error:", event.message, event.filename, event.lineno);
        hideLoading();
    });

    window.addEventListener("unhandledrejection", function (event) {
        console.warn("[TL] Promise Error:", event.reason);
        hideLoading();
    });
})();
