console.log('PrecioScout Content Script Loaded');

const init = () => {
    const url = window.location.href;
    console.log('Monitoring price on:', url);
};

init();
