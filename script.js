document.addEventListener('DOMContentLoaded', () => {
    const pullChain = document.getElementById('pullChain');
    const nightScene = document.getElementById('nightScene');
    const body = document.body;
    let isNight = false;

    const clickSound = new Audio('music/swich.mp3');
    clickSound.volume = 0.5;
    clickSound.load(); // Keep this improvement

    // Initial state for day
    pullChain.classList.add('black-cord');

    pullChain.addEventListener('click', () => {
        clickSound.currentTime = 0;
        clickSound.play().catch(e => console.error("Audio play failed:", e));

        isNight = !isNight;

        // Keep the delay feature
        setTimeout(() => {
            if (isNight) {
                nightScene.style.opacity = 1;
                body.classList.add('night-background');
                pullChain.classList.remove('black-cord');
            } else {
                nightScene.style.opacity = 0;
                body.classList.remove('night-background');
                pullChain.classList.add('black-cord');
            }
        }, 500);

        pullChain.classList.add('pulled');
        setTimeout(() => {
            pullChain.classList.remove('pulled');
        }, 150);
    });
});
